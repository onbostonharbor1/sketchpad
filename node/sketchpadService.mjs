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

    case "listLogFiles":
      return await listLogFiles(payload);

    case "readLogFile":
      return await readLogFile(payload);



    default:
      throw new Error(`dispatchService: unknown requestName: ${requestName}`);
  }
} // end dispatchService


/* ===========================================================
   TASK: listLogFiles

   DESCRIPTION
   -----------
   Returns newest N log files from ./utilities/logfiles.

   Payload (optional):
     { limit : 10 }

   Returns:
     {
       request: "listLogFiles",
       status: "ok",
       dir: "<absolute dir>",
       limit: <number>,
       files: [
         { name, mtimeMs, mtimeIso, size }
       ]
     }
=========================================================== */
export async function listLogFiles(payload = {}) {

  const limitRaw = payload.limit;
  const limit = (typeof limitRaw === "number" && limitRaw > 0) ? limitRaw : 10;

  const logDir = path.resolve("./utilities/logfiles");
  assertDirectoryExists(logDir, "listLogFiles: log dir missing: " + logDir);

  const entries = fs.readdirSync(logDir, { withFileTypes: true });

  const files = [];

  for (const ent of entries) {
    if (!ent.isFile()) continue;

    const name = ent.name;

    // You can broaden this later if needed.
    if (!name.toLowerCase().endsWith(".txt")) continue;

    const full = path.join(logDir, name);
    const st = fs.statSync(full);

    files.push({
      name,
      mtimeMs: st.mtimeMs,
      mtimeIso: new Date(st.mtimeMs).toISOString(),
      size: st.size
    });
  }

  // newest first
  files.sort((a, b) => b.mtimeMs - a.mtimeMs);

  const sliced = files.slice(0, limit);

  return {
    request: "listLogFiles",
    status: "ok",
    dir: logDir,
    limit,
    files: sliced
  };

} // end listLogFiles


/* ===========================================================
   TASK: readLogFile

   DESCRIPTION
   -----------
   Reads one logfile from ./utilities/logfiles and returns text.

   Payload:
     { name : "<filename>" }

   Returns:
     {
       request: "readLogFile",
       status: "ok",
       name: "<filename>",
       text: "<file contents>"
     }
=========================================================== */
export async function readLogFile(payload = {}) {

  const name = payload.name;

  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("readLogFile: name missing/invalid");
  }

  // fail-fast: disallow path separators
  if (name.indexOf("/") >= 0 || name.indexOf("\\") >= 0) {
    throw new Error("readLogFile: invalid name (no path separators allowed): " + name);
  }

  const logDir = path.resolve("./utilities/logfiles");
  assertDirectoryExists(logDir, "readLogFile: log dir missing: " + logDir);

  const full = path.join(logDir, name);
  assertFileExists(full, "readLogFile: file missing: " + full);

  const text = fs.readFileSync(full, "utf8");

  return {
    request: "readLogFile",
    status: "ok",
    name,
    text
  };

} // end readLogFile


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

/* ===========================================================
   TASK: addPatternScripts  (AUGMENTED)

   Adds support for Gallery Scripts in addition to Patterns.

   NEW BEHAVIOR
   ------------
   In addition to scanning ./patterns/* categories, this function
   now also scans:

     ./gallery/Scripts/
       manifest.json
       *.js

   Differences vs Patterns:
     • No directoryRegistry.json
     • Single manifest.json
     • Flat directory (no categories)

   Gallery entries are appended using the same placeholder logic
   (filename → title).

   =========================================================== */

export async function addPatternScripts(payload = {}) {

  const patternsRoot = payload.patternsRoot || "./patterns";
  const galleryRoot  = payload.galleryRoot  || "./gallery/Scripts";

  const absPatternsRoot = path.resolve(patternsRoot);
  const absGalleryRoot  = path.resolve(galleryRoot);

  assertDirectoryExists(
    absPatternsRoot,
    `Patterns root not found or not a directory: ${absPatternsRoot}`
  );

  const registryPath = path.join(absPatternsRoot, "directoryRegistry.json");
  assertFileExists(
    registryPath,
    `directoryRegistry.json not found: ${registryPath}`
  );

  const categories = readJsonFileSync(registryPath);
  if (!Array.isArray(categories)) {
    throw new Error("directoryRegistry.json must contain a JSON array");
  }

  const updatedCategories = [];

  for (const category of categories) {

    const categoryDir = path.join(absPatternsRoot, category);
    assertDirectoryExists(categoryDir, `Category directory missing: ${categoryDir}`);

    const manifestPath = path.join(categoryDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;

    const manifest = readJsonFileSync(manifestPath);
    if (!Array.isArray(manifest)) {
      throw new Error(`Manifest must be an array: ${manifestPath}`);
    }

    const indexByPath     = buildIndexByPath(manifest);
    const indexByFilename = buildIndexByFilename(manifest);

    const jsFiles = listJsFiles(categoryDir);

    const result = {
      domain: "patterns",
      category,
      manifestPath,
      totalBefore: manifest.length,
      totalAfter:  manifest.length,
      added: []
    };

    for (const fileName of jsFiles) {
      const baseName = fileName.replace(/\.js$/i, "");
      const relPath  = normalizePath(fileName);

      if (indexByPath.has(relPath) || indexByFilename.has(baseName)) continue;

      const entry = makeManifestEntry(relPath);
      manifest.push(entry);

      indexByPath.add(relPath);
      indexByFilename.add(baseName);

      result.added.push(entry);
    }

    if (result.added.length > 0) {
      writeJsonFileSync(manifestPath, manifest);
      result.totalAfter = manifest.length;
      updatedCategories.push(result);
    }
  }

  const updatedGallery = [];

  if (fs.existsSync(absGalleryRoot)) {

    assertDirectoryExists(absGalleryRoot, `Gallery Scripts dir invalid: ${absGalleryRoot}`);

    const galleryManifestPath = path.join(absGalleryRoot, "manifest.json");
    assertFileExists(galleryManifestPath, `Gallery Scripts manifest missing: ${galleryManifestPath}`);

    const manifest = readJsonFileSync(galleryManifestPath);
    if (!Array.isArray(manifest)) {
      throw new Error("Gallery Scripts manifest must be an array");
    }

    const indexByPath     = buildIndexByPath(manifest);
    const indexByFilename = buildIndexByFilename(manifest);

    const jsFiles = listJsFiles(absGalleryRoot);

    const result = {
      domain: "gallery",
      section: "Scripts",
      manifestPath: galleryManifestPath,
      totalBefore: manifest.length,
      totalAfter:  manifest.length,
      added: []
    };

    for (const fileName of jsFiles) {
      const baseName = fileName.replace(/\.js$/i, "");
      const relPath  = normalizePath(fileName);

      if (indexByPath.has(relPath) || indexByFilename.has(baseName)) continue;

      const entry = makeManifestEntry(relPath);
      manifest.push(entry);

      indexByPath.add(relPath);
      indexByFilename.add(baseName);

      result.added.push(entry);
    }

    if (result.added.length > 0) {
      writeJsonFileSync(galleryManifestPath, manifest);
      result.totalAfter = manifest.length;
      updatedGallery.push(result);
    }
  }

  const hasUpdates =
    updatedCategories.length > 0 ||
    updatedGallery.length > 0;

  return {
    request: "addPatternScripts",
    patternsRoot: absPatternsRoot,
    galleryRoot:  absGalleryRoot,
    categoriesScanned: categories.slice(),
    updatedCategories,
    updatedGallery,
    hasUpdates
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

  /* ---- write thumbnail file (force overwrite) ---- */
  const outName = "thumb_" + filename + ".png";
  const outPath = path.join(imagesDir, outName);

  if (fs.existsSync(outPath)) {
    fs.unlinkSync(outPath);    // fail fast if locked or read-only
  }

  const buf = Buffer.from(pngBase64, "base64");
  fs.writeFileSync(outPath, buf, { flag: "w" });

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

/* ===========================================================
   TASK: editPackageScript

   DESCRIPTION
   -----------
   Updates the title of a single manifest entry identified
   by filename within a manifest.json.

   Allowed manifest locations:
     • ./patterns/../manifest.json
     • ./gallery/../manifest.json

   Payload:
     {
       manifestPath : "/patterns/<category>/manifest.json"  OR "/gallery/Scripts/manifest.json",
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

  /* ---- resolve and validate manifest path (patterns OR gallery) ---- */
  const patternsRoot = path.resolve("./patterns");
  const galleryRoot  = path.resolve("./gallery");

  const manifestPath = resolveManifestPathAllowed(
    [patternsRoot, galleryRoot],
    manifestPathInput,
    "editPackageScript"
  );

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
   resolveManifestPathAllowed(allowedRoots, manifestPathInput, tag)

   DESCRIPTION
   -----------
   Resolves a UI-provided manifest path safely and ensures it
   remains inside ONE of the allowed roots.

   Examples accepted:
     "/patterns/circles/manifest.json"
     "patterns/circles/manifest.json"
     "/gallery/Scripts/manifest.json"
     "gallery/Scripts/manifest.json"
----------------------------------------------------------- */
function resolveManifestPathAllowed(allowedRoots, manifestPathInput, tag) {

  if (!Array.isArray(allowedRoots) || allowedRoots.length === 0) {
    throw new Error("resolveManifestPathAllowed: allowedRoots missing/invalid");
  }

  let rel = String(manifestPathInput);

  /* ---- normalize leading slash ---- */
  if (rel.startsWith("/")) {
    rel = rel.slice(1);
  }

  const abs = path.resolve(rel);

  /* ---- fail-fast traversal protection: must be inside one allowed root ---- */
  let ok = false;

  for (const root of allowedRoots) {
    if (typeof root !== "string" || root.trim() === "") {
      throw new Error("resolveManifestPathAllowed: invalid root");
    }
    if (abs.startsWith(root)) {
      ok = true;
      break;
    }
  }

  if (!ok) {
    throw new Error(`${tag}: manifestPath escapes allowed roots: ${abs}`);
  }

  assertFileExists(abs, "Manifest file not found: " + abs);

  return abs;

} // end resolveManifestPathAllowed



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

   Files beginning with "." are ignored.
----------------------------------------------------------- */
function listJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const ent of entries) {
    if (!ent.isFile()) continue;

    const name = ent.name;

    // ignore dotfiles
    if (name.startsWith(".")) continue;

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
