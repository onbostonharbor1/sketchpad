/* ===========================================================
   sketchpadService.js  (Node.js)
   -----------------------------------------------------------
   Central background service for Sketchpad.

   PURPOSE
   -------
   This file hosts a single DISPATCH SERVICE that can execute
   multiple filesystem / manifest maintenance tasks on behalf
   of the Sketchpad UI.

   The service is designed so that:
     • tasks can be added without restructuring the file
     • results are returned as structured JSON
     • results can be displayed immediately in the Utilities
       tab (#text div) via a browser → nodeLayer → service call

   -----------------------------------------------------------
   CURRENT TASKS

   Implemented:
     • addPatternScripts   (scan + update per-category manifests)

   Placeholders (NO-OP, future expansion):
     • deletePackageScript
     • editPackageScript
     • renamePackageScript

   -----------------------------------------------------------
   DIRECTORY MODEL (PATTERNS)

   ./patterns/
     directoryRegistry.json      ← authoritative category list
     circles/
       manifest.json
       *.js
     curve_stitch/
       manifest.json
       *.js
     ...

   IMPORTANT CONSTRAINTS
   ---------------------
     • There is NEVER a ./patterns/manifest.json
     • Each category owns its own manifest.json
     • directoryRegistry.json is the ONLY source of categories
     • Titles cannot be inferred → filename used as placeholder

   =========================================================== */

import fs   from "fs";
import path from "path";

/* ===========================================================
   DISPATCH SERVICE (PUBLIC API)

   dispatchService(requestName, payload)

   DESCRIPTION
   -----------
   Central entry point for all Sketchpad background tasks.
   The browser (via nodeLayer.js) calls this function, passing:

     • requestName : string identifying the task
     • payload     : task-specific parameters

   The dispatcher routes the request to a specific handler
   function and returns that function’s result object.

   This allows:
     • a stable browser-facing API
     • internal expansion without rewrites
     • consistent reporting back to Sketchpad

   =========================================================== */

export async function dispatchService(requestName, payload = {}) {
  if (typeof requestName !== "string" || requestName.trim() === "") {
    throw new Error(`dispatchService: invalid requestName: ${String(requestName)}`);
  }

  switch (requestName) {

    case "addPatternScripts":
      return await addPatternScripts(payload);

    /* backward-compatible alias */
    case "updatePatternManifests":
      return await addPatternScripts(payload);

    case "deletePackageScript":
      return await deletePackageScript(payload);

    case "editPackageScript":
      return await editPackageScript(payload);

    case "renamePackageScript":
      return await renamePackageScript(payload);

    default:
      throw new Error(`dispatchService: unknown requestName: ${requestName}`);
  }
} // end dispatchService


/* ===========================================================
   TASK: addPatternScripts

   DESCRIPTION
   -----------
   Implements the Utilities command “Add Pattern Files”.

   For each category listed in ./patterns/directoryRegistry.json:

     • If ./patterns/<category>/manifest.json exists:
         - scan directory for *.js files
         - find files NOT listed in manifest.json
         - append placeholder entries to manifest.json

     • If a category has no manifest.json:
         - it is skipped silently (by design)

   REPORTING
   ---------
   Returns a structured report listing:
     • which categories changed
     • which files were added per category

   This report is intended to be rendered directly
   into the Utilities #text div.

   =========================================================== */

export async function addPatternScripts(payload = {}) {
  const patternsRoot = payload.patternsRoot || "./patterns";
  const absRoot = path.resolve(patternsRoot);

  /* ---- validate patterns root ---- */
  assertDirectoryExists(
    absRoot,
    `Patterns root not found or not a directory: ${absRoot}`
  );

  /* ---- load category registry ---- */
  const registryPath = path.join(absRoot, "directoryRegistry.json");
  assertFileExists(
    registryPath,
    `directoryRegistry.json not found: ${registryPath}`
  );

  const categories = readJsonFileSync(registryPath);
  if (!Array.isArray(categories)) {
    throw new Error("directoryRegistry.json must contain a JSON array");
  }

  const updatedCategories = [];

  /* ---- process each category ---- */
  for (const category of categories) {

    if (typeof category !== "string" || category.trim() === "") {
      throw new Error(`Invalid category name in registry: ${String(category)}`);
    }

    const categoryDir = path.join(absRoot, category);
    assertDirectoryExists(
      categoryDir,
      `Category directory missing: ${categoryDir}`
    );

    const manifestPath = path.join(categoryDir, "manifest.json");

    /* ---- no manifest → nothing to update ---- */
    if (!fs.existsSync(manifestPath)) {
      continue;
    }

    /* ---- load and validate manifest ---- */
    const manifest = readJsonFileSync(manifestPath);
    if (!Array.isArray(manifest)) {
      throw new Error(`Manifest must be an array: ${manifestPath}`);
    }

    /* ---- build lookup indices ---- */
    const indexByPath     = buildIndexByPath(manifest);
    const indexByFilename = buildIndexByFilename(manifest);

    /* ---- scan directory for JS files ---- */
    const jsFiles = listJsFiles(categoryDir);

    const result = {
      category,
      manifestPath,
      totalBefore: manifest.length,
      totalAfter:  manifest.length,
      added: []
    };

    /* ---- compare filesystem vs manifest ---- */
    for (const fileName of jsFiles) {
      const baseName = fileName.replace(/\.js$/i, "");
      const relPath  = normalizePath(fileName); // per-category short path

      const alreadyPresent =
        indexByPath.has(relPath) ||
        indexByFilename.has(baseName);

      if (alreadyPresent) {
        continue;
      }

      /* ---- missing file → add placeholder entry ---- */
      const entry = makeManifestEntry(relPath);
      manifest.push(entry);

      indexByPath.add(relPath);
      indexByFilename.add(baseName);

      result.added.push(entry);
    }

    /* ---- persist only if changed ---- */
    if (result.added.length > 0) {
      writeJsonFileSync(manifestPath, manifest);
      result.totalAfter = manifest.length;
      updatedCategories.push(result);
    }
  }

  /* ---- final report returned to caller ---- */
  return {
    request: "addPatternScripts",
    patternsRoot: absRoot,
    categoriesScanned: categories.slice(),
    updatedCategories
  };
} // end addPatternScripts


/* ===========================================================
   TASK: deletePackageScript  (NO-OP PLACEHOLDER)

   DESCRIPTION
   -----------
   Reserved for future functionality to delete a pattern script
   and remove its manifest entry.

   Currently implemented as a no-op to stabilize the dispatcher
   interface early.

   =========================================================== */

export async function deletePackageScript(payload = {}) {
  return {
    request: "deletePackageScript",
    status: "noop",
    payload
  };
} // end deletePackageScript


/* ===========================================================
   TASK: editPackageScript  (NO-OP PLACEHOLDER)

   DESCRIPTION
   -----------
   Reserved for future functionality to edit metadata for a
   pattern script (title, tags, notes, etc.).

   =========================================================== */

export async function editPackageScript(payload = {}) {
  return {
    request: "editPackageScript",
    status: "noop",
    payload
  };
} // end editPackageScript


/* ===========================================================
   TASK: renamePackageScript  (NO-OP PLACEHOLDER)

   DESCRIPTION
   -----------
   Reserved for future functionality to rename a script file
   and update its manifest entry accordingly.

   =========================================================== */

export async function renamePackageScript(payload = {}) {
  return {
    request: "renamePackageScript",
    status: "noop",
    payload
  };
} // end renamePackageScript


/* ===========================================================
   HELPER FUNCTIONS
=========================================================== */

/* -----------------------------------------------------------
   listJsFiles(dir)

   Returns a sorted list of *.js filenames in the given
   directory, excluding:
     • manifest.json
     • directoryRegistry.json
----------------------------------------------------------- */
function listJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const ent of entries) {
    if (!ent.isFile()) continue;

    const name = ent.name;
    if (name === "manifest.json") continue;
    if (name === "directoryRegistry.json") continue;
    if (!name.toLowerCase().endsWith(".js")) continue;

    files.push(name);
  }

  files.sort((a, b) => a.localeCompare(b));
  return files;
} // end listJsFiles


/* -----------------------------------------------------------
   makeManifestEntry(relPath)

   Creates a placeholder manifest entry for a script file.
   Since titles cannot be inferred, the filename is used.
----------------------------------------------------------- */
function makeManifestEntry(relPath) {
  const file = relPath.split("/").pop();
  const base = file.replace(/\.js$/i, "");

  return {
    filename: base,
    path: relPath,
    title: base
  };
} // end makeManifestEntry


/* -----------------------------------------------------------
   buildIndexByPath(manifest)

   Builds a lookup structure for manifest entry paths.
----------------------------------------------------------- */
function buildIndexByPath(manifest) {
  const set = new Set();

  for (const e of manifest) {
    if (!e || typeof e !== "object") continue;
    if (typeof e.path !== "string") continue;
    set.add(normalizePath(e.path));
  }

  return {
    has(p) { return set.has(normalizePath(p)); },
    add(p) { set.add(normalizePath(p)); }
  };
} // end buildIndexByPath


/* -----------------------------------------------------------
   buildIndexByFilename(manifest)

   Builds a lookup structure for manifest entry filenames.
----------------------------------------------------------- */
function buildIndexByFilename(manifest) {
  const set = new Set();

  for (const e of manifest) {
    if (!e || typeof e !== "object") continue;
    if (typeof e.filename !== "string") continue;
    set.add(e.filename);
  }

  return {
    has(f) { return set.has(f); },
    add(f) { set.add(f); }
  };
} // end buildIndexByFilename


/* -----------------------------------------------------------
   readJsonFileSync(filePath)

   Reads and parses a JSON file.
----------------------------------------------------------- */
function readJsonFileSync(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
} // end readJsonFileSync


/* -----------------------------------------------------------
   writeJsonFileSync(filePath, data)

   Writes formatted JSON with a trailing newline.
----------------------------------------------------------- */
function writeJsonFileSync(filePath, data) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2) + "\n",
    "utf8"
  );
} // end writeJsonFileSync


/* -----------------------------------------------------------
   normalizePath(p)

   Normalizes paths to use forward slashes.
----------------------------------------------------------- */
function normalizePath(p) {
  return String(p).replace(/\\/g, "/");
} // end normalizePath


/* -----------------------------------------------------------
   assertDirectoryExists(dir, message)

   Fail-fast directory existence check.
----------------------------------------------------------- */
function assertDirectoryExists(dir, message) {
  if (!fs.existsSync(dir)) throw new Error(message);
  if (!fs.statSync(dir).isDirectory()) throw new Error(message);
} // end assertDirectoryExists


/* -----------------------------------------------------------
   assertFileExists(file, message)

   Fail-fast file existence check.
----------------------------------------------------------- */
function assertFileExists(file, message) {
  if (!fs.existsSync(file)) throw new Error(message);
  if (!fs.statSync(file).isFile()) throw new Error(message);
} // end assertFileExists
