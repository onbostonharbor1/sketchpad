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
     • addPatternScripts        (scan + update per-category manifests)
     • writePatternThumbnail    (write 36x36 thumb PNG from browser)

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
       images/
         thumb_<filename>.png
     curve_stitch/
       manifest.json
       *.js
       images/
         thumb_<filename>.png
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
  console.log("dispatchService file:", import.meta.url, "request:", requestName);

  switch (requestName) {

    case "addPatternScripts":
      return await addPatternScripts(payload);

    /* backward-compatible alias */
    case "updatePatternManifests":
      return await addPatternScripts(payload);

    case "writePatternThumbnail":
      return await writePatternThumbnail(payload);

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
   TASK: writePatternThumbnail

   DESCRIPTION
   -----------
   Writes a 36x36 PNG thumbnail provided by the browser.

   Payload:
     {
       category  : "<category>",
       filename  : "<base filename>",
       pngBase64 : "<base64 png bytes>"
     }

   Output path:
     ./patterns/<category>/images/thumb_<filename>.png

   =========================================================== */

export async function writePatternThumbnail(payload = {}) {

  const category  = payload.category;
  const filename  = payload.filename;
  const pngBase64 = payload.pngBase64;

  /* ---- validate payload ---- */
  if (typeof category !== "string" || category.trim() === "") {
    throw new Error("writePatternThumbnail: category missing or invalid");
  }

  if (typeof filename !== "string" || filename.trim() === "") {
    throw new Error("writePatternThumbnail: filename missing or invalid");
  }

  if (typeof pngBase64 !== "string" || pngBase64.trim() === "") {
    throw new Error("writePatternThumbnail: pngBase64 missing or invalid");
  }

  /* ---- validate patterns root ---- */
  const patternsRoot = path.resolve("./patterns");
  assertDirectoryExists(
    patternsRoot,
    "writePatternThumbnail: patterns root missing: " + patternsRoot
  );

  /* ---- validate category directory ---- */
  const categoryDir = path.join(patternsRoot, category);
  assertDirectoryExists(
    categoryDir,
    "writePatternThumbnail: category dir missing: " + categoryDir
  );

  /* ---- ensure images dir exists ---- */
  const imagesDir = path.join(categoryDir, "images");

  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  assertDirectoryExists(
    imagesDir,
    "writePatternThumbnail: images dir not a directory: " + imagesDir
  );

  /* ---- write thumbnail file ---- */
  const outName = "thumb_" + filename + ".png";
  const outPath = path.join(imagesDir, outName);

  const buf = Buffer.from(pngBase64, "base64");
  fs.writeFileSync(outPath, buf);

  assertFileExists(outPath, "writePatternThumbnail: write failed: " + outPath);

  /* ---- report ---- */
  return {
    request: "writePatternThumbnail",
    status: "ok",
    category,
    filename,
    outPath
  };

} // end writePatternThumbnail


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

/* ===========================================================
   TASK: editPackageScript

   DESCRIPTION
   -----------
   Updates the title of a single manifest entry identified
   by filename within a per-category manifest.json.

   Payload:
     {
       manifestPath : "/patterns/<category>/manifest.json",
       filename     : "<base filename>",
       title        : "<new title>"
     }

   =========================================================== */

export async function editPackageScript(payload = {}) {
  console.log("editPackageScript file:", import.meta.url);

  const manifestPathInput = payload.manifestPath;
  const filename          = payload.filename;
  const newTitleRaw       = payload.title;

  /* ---- validate payload ---- */
  if (typeof manifestPathInput !== "string" || manifestPathInput.trim() === "") {
    throw new Error("editPackageScript: manifestPath missing or invalid");
  }

  if (typeof filename !== "string" || filename.trim() === "") {
    throw new Error("editPackageScript: filename missing or invalid");
  }

  if (typeof newTitleRaw !== "string") {
    throw new Error("editPackageScript: title must be a string");
  }

  const newTitle = newTitleRaw.trim();

  /* ---- resolve and validate manifest path ---- */
  const patternsRoot = path.resolve("./patterns");
  const manifestPath = resolveManifestPath(patternsRoot, manifestPathInput);

  /* ---- load manifest ---- */
  const manifest = readJsonFileSync(manifestPath);
  if (!Array.isArray(manifest)) {
    throw new Error("editPackageScript: manifest is not an array");
  }

  /* ---- locate entry ---- */
  let indexFound = -1;

  for (let i = 0; i < manifest.length; i++) {
    const entry = manifest[i];
    if (!entry || typeof entry !== "object") continue;

    if (entry.filename === filename) {
      indexFound = i;
      break;
    }
  }

  if (indexFound < 0) {
    throw new Error(`editPackageScript: entry not found: ${filename}`);
  }

  /* ---- update entry ---- */
  const entry    = manifest[indexFound];
  const oldTitle = entry.title || "";

  entry.title = newTitle;

  /* ---- persist ---- */
  writeJsonFileSync(manifestPath, manifest);

  /* ---- report ---- */
  return {
    request: "editPackageScript",
    status: "ok",
    manifestPath,
    filename,
    indexUpdated: indexFound,
    oldTitle,
    newTitle
  };

} // end editPackageScript

/* -----------------------------------------------------------
   resolveManifestPath(patternsRoot, manifestPathInput)

   DESCRIPTION
   -----------
   Resolves a UI-provided manifest path safely and ensures
   it remains inside the patterns root.

   Examples accepted:
     "/patterns/circles/manifest.json"
     "patterns/circles/manifest.json"

----------------------------------------------------------- */
function resolveManifestPath(patternsRoot, manifestPathInput) {

  let rel = String(manifestPathInput);

  /* ---- normalize leading slash ---- */
  if (rel.startsWith("/")) {
    rel = rel.slice(1);
  }

  const abs = path.resolve(rel);

  /* ---- fail-fast traversal protection ---- */
  if (!abs.startsWith(patternsRoot)) {
    throw new Error(
      "editPackageScript: manifestPath escapes patterns root: " + abs
    );
  }

  assertFileExists(abs, "Manifest file not found: " + abs);

  return abs;

} // end resolveManifestPath


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
