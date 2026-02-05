/* ===========================================================
   sketchpadService.mjs  (Node.js)
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
     • writePatternThumbnail    (write 50x50 thumb PNG from browser)

   Placeholders (NO-OP, future expansion):
     • deletePackageScript
     • editPackageScript
     • renamePackageScript

   -----------------------------------------------------------


   IMPORTANT CONSTRAINTS
   ---------------------
     • There is NEVER a ./patterns/manifest.json
     • Each category owns its own manifest.json
     • directoryRegistry.json is the ONLY source of categories
     • Titles cannot be inferred → filename used as placeholder



   =========================================================== */

import fs   from "fs";
import path from "path";
import { runManifestMaintenance } from "./maintain_manifests.mjs";


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

case "manifestMaintenance":
  return await runManifestMaintenance({ mode: "ui" });

    // case "addPatternScripts":
      // return await addPatternScripts(payload);

    /* backward-compatible alias */
    // case "updatePatternManifests":
      // return await addPatternScripts(payload);

    case "writePatternThumbnail":
      return await writePatternThumbnail(payload);

    case "editManifestEntry":
      return await editManifestEntry(payload);

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

    case "archiveItem":
      return await archiveItem(payload);

    case "writePatternFromDrawRegistry":
      return await writePatternFromDrawRegistry(payload);


    case "writeHelpFile":
      return await writeHelpFile(payload);

    case "writeGalleryPatternPng":
      return await writeGalleryPatternPng(payload);


    default:
      throw new Error(`dispatchService: unknown requestName: ${requestName}`);
  }
} // end dispatchService




/* ============================================================
   TASK: editManifestEntry  (FIX: do NOT overwrite status:"ok")
=========================================================== */
/*
  Payload:
    {
      manifestPath : "/home/manifest.json" | "/patterns/.../manifest.json" | "/gallery/.../manifest.json" | "/utilities/.../manifest.json",
      matchField   : "path" | "filename" | "file",
      matchValue   : "<string>",
      title        : "<string>",
      status       : "<string>"   // "" == clear
    }
*/
/* ============================================================
   TASK: editManifestEntry  (FIX: if Home manifest is edited, update the ORIGINAL manifest)
=========================================================== */
/*
  Payload:
    {
      manifestPath : "/home/manifest.json" | "/patterns/.../manifest.json" | "/gallery/.../manifest.json" | "/utilities/.../manifest.json",
      matchField   : "path" | "filename" | "file",
      matchValue   : "<string>",
      title        : "<string>",
      status       : "<string>"   // "" == clear
    }

  FIX BEHAVIOR
  ------------
  If the UI calls editManifestEntry with manifestPath pointing to ./home/manifest.json,
  that is a *virtual* aggregate manifest.

  In that case:
    1) We locate the ORIGINAL per-folder manifest entry by matching the rooted path.
    2) We update THAT original manifest.json.
    3) We ALSO update ./home/manifest.json so the Home UI is immediately consistent.
*/
export async function editManifestEntry(payload = {}) {

  const manifestPathInput = payload.manifestPath;
  const matchField        = payload.matchField;
  const matchValue        = payload.matchValue;
  const newTitle          = String(payload.title || "");
  let   newStatus         = payload.status;

  if (!manifestPathInput) throw new Error("editManifestEntry: manifestPath missing");
  if (!matchField)        throw new Error("editManifestEntry: matchField missing");
  if (!matchValue)        throw new Error("editManifestEntry: matchValue missing");

  if (newStatus == null) newStatus = "";
  newStatus = String(newStatus);

  const allowedRoots = [
    path.resolve("./home"),
    path.resolve("./patterns"),
    path.resolve("./gallery"),
    path.resolve("./utilities")
  ];

  const manifestPath = resolveManifestPathAllowed(
    allowedRoots,
    manifestPathInput,
    "editManifestEntry"
  );

  const homeManifestPath = path.resolve("./home/manifest.json");
  const isHomeManifest   = (manifestPath === homeManifestPath);

  // ------------------------------------------------------------
  // Case A: Editing a real manifest directly (patterns/gallery/utilities/home-but-not-virtual use case)
  // ------------------------------------------------------------
  if (!isHomeManifest) {

    const report = editManifestEntryInSingleFile({
      manifestPath,
      matchField,
      matchValue,
      newTitle,
      newStatus
    });

    return {
      request: "editManifestEntry",
      status: "ok",
      manifestPath: report.manifestPath,
      indexUpdated: report.indexUpdated,
      oldTitle: report.oldTitle,
      newTitle: report.newTitle,
      oldStatus: report.oldStatus,
      newStatus: report.newStatus
    };
  }

  // ------------------------------------------------------------
  // Case B: Editing via Home (virtual aggregate) — MUST update original manifest
  // ------------------------------------------------------------

  // Home uses rooted paths ("/gallery/Ideabook/3D/IMG_9649.PNG", etc.)
  const rootedPath = String(matchValue);
  if (!rootedPath.startsWith("/")) {
    throw new Error("editManifestEntry: Home edits require matchValue to be rooted path starting with '/'");
  }

  // 1) Find + update the original manifest entry that produced this Home item.
  const original = findOriginalManifestEntryByRootedPath(rootedPath);

  const originalReport = editManifestEntryInSingleFile({
    manifestPath: original.manifestPath,
    matchField:   original.matchField,
    matchValue:   original.matchValue,
    newTitle,
    newStatus
  });

  // 2) Also update the Home manifest entry (so UI is consistent immediately).
  //    (Home will be rebuilt later by your maintenance script anyway.)
  const homeReport = editManifestEntryInSingleFile({
    manifestPath: homeManifestPath,
    matchField,
    matchValue,
    newTitle,
    newStatus
  });

  return {
    request: "editManifestEntry",
    status: "ok",

    // IMPORTANT: report the REAL target that was fixed
    manifestPath: originalReport.manifestPath,
    indexUpdated: originalReport.indexUpdated,

    oldTitle: originalReport.oldTitle,
    newTitle: originalReport.newTitle,
    oldStatus: originalReport.oldStatus,
    newStatus: originalReport.newStatus,

    // Extra diagnostics (useful while validating)
    homeManifestAlsoUpdated: true,
    homeIndexUpdated: homeReport.indexUpdated,
    homeManifestPath: homeManifestPath
  };

} // end editManifestEntry


/* ============================================================
   editManifestEntryInSingleFile(params)

   Updates exactly one manifest file in place (array of entries).
=========================================================== */
function editManifestEntryInSingleFile(params) {

  const manifestPath = params.manifestPath;
  const matchField   = params.matchField;
  const matchValue   = params.matchValue;
  const newTitle     = params.newTitle;
  const newStatus    = params.newStatus;

  if (!manifestPath) throw new Error("editManifestEntryInSingleFile: manifestPath missing");
  if (!matchField)   throw new Error("editManifestEntryInSingleFile: matchField missing");
  if (!matchValue)   throw new Error("editManifestEntryInSingleFile: matchValue missing");

  const manifest = readJsonFileSync(manifestPath);
  if (!Array.isArray(manifest)) {
    throw new Error("editManifestEntryInSingleFile: manifest is not an array");
  }

  let indexFound = -1;

  for (let i = 0; i < manifest.length; i++) {
    const entry = manifest[i];
    if (!entry || typeof entry !== "object") continue;

    if (String(entry[matchField]) === String(matchValue)) {
      indexFound = i;
      break;
    }
  }

  if (indexFound < 0) {
    throw new Error(
      `editManifestEntryInSingleFile: entry not found (${matchField}=${matchValue}) in ${manifestPath}`
    );
  }

  const entry     = manifest[indexFound];
  const oldTitle  = String(entry.title || "");
  const oldStatus = ("status" in entry) ? String(entry.status) : "";

  entry.title = String(newTitle);

  if (String(newStatus) === "") {
    delete entry.status;
  } else {
    entry.status = String(newStatus);
  }

  writeJsonFileSync(manifestPath, manifest);

  return {
    manifestPath,
    indexUpdated: indexFound,
    oldTitle,
    newTitle: String(newTitle),
    oldStatus,
    newStatus: String(newStatus)
  };

} // end editManifestEntryInSingleFile


/* ============================================================
   findOriginalManifestEntryByRootedPath(rootedPath)

   Searches ALL real manifests under:
     ./patterns, ./gallery, ./utilities

   For each entry, computes its rooted path using the same
   rule you already use for Home:
     makeRootedPath(manifestDirAbs, entry)

   When it finds a match, it returns:
     {
       manifestPath : "<absolute manifest.json path>",
       matchField   : "path",
       matchValue   : "<original entry.path value>"
     }

   Why matchField/path?
   Because the original manifests store entry.path as a relative
   value (local filename or cat/file), not the rooted path.
=========================================================== */
function findOriginalManifestEntryByRootedPath(rootedPath) {

  if (!rootedPath || typeof rootedPath !== "string") {
    throw new Error("findOriginalManifestEntryByRootedPath: rootedPath missing/invalid");
  }
  if (!rootedPath.startsWith("/")) {
    throw new Error("findOriginalManifestEntryByRootedPath: rootedPath must start with '/'");
  }

  const roots = [
    path.resolve("./patterns"),
    path.resolve("./gallery"),
    path.resolve("./utilities")
  ];

  const manifestFiles = [];

  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    walkFindManifests(r, manifestFiles);
  }

  for (let k = 0; k < manifestFiles.length; k++) {

    const mf = manifestFiles[k];
    const list = readJsonFileSync(mf);
    if (!Array.isArray(list)) throw new Error("findOriginalManifestEntryByRootedPath: manifest must be array: " + mf);

    const manifestDir = path.dirname(mf);

    for (let i = 0; i < list.length; i++) {

      const entry = list[i];
      if (!entry || typeof entry !== "object") continue;

      const rp = makeRootedPath(manifestDir, entry);

      if (rp === rootedPath) {

        // We will edit the original entry by its local "path" value,
        // because that is what editManifestEntryInSingleFile understands.
        const localPath = entry.path;
        if (!localPath || typeof localPath !== "string") {
          throw new Error("findOriginalManifestEntryByRootedPath: matched entry has no entry.path in " + mf);
        }

        return {
          manifestPath: mf,
          matchField: "path",
          matchValue: String(localPath)
        };
      }
    }
  }

  throw new Error("findOriginalManifestEntryByRootedPath: no original manifest entry found for " + rootedPath);

} // end findOriginalManifestEntryByRootedPath






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
   Writes a 50x50 PNG thumbnail provided by the browser.

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

export async function rebuildAndValidateManifests(payload = {}) {

  const log = [];
  const t0 = Date.now();

  const logDir = path.resolve("./utilities/logfiles");
  ensureDir(logDir, "rebuildAndValidateManifests: log dir missing: " + logDir);

  const stamp = new Date().toISOString().replace(/[:]/g, "-").replace(/\..+/, "");
  const logFile = path.join(logDir, `rebuildValidate_${stamp}.txt`);

  // Reporting structures (grouped by subdir)
  const addedMap  = new Map();  // group -> [items...]
  const brokenMap = new Map();  // group -> [items...]

  // For Home output: collect status-bearing items from manifests + virtual broken items
  const homeOut = [];

  // ------------------------------------------------------------
  // 1) Discover + Add (Patterns, Gallery, Utilities)
  // ------------------------------------------------------------
  await scanPatternsAddNew({ addedMap, log });
  await scanGalleryScriptsAddNew({ addedMap, log });
  await scanGalleryImagesAddNew({ addedMap, log });
  await scanUtilitiesAddNew({ addedMap, log });

  // ------------------------------------------------------------
  // 2) Validate (all manifests) -> broken virtual home items
  //    Also collect existing status-marked items for Home.
  // ------------------------------------------------------------
  await scanAllManifestsForHomeAndBroken({ homeOut, brokenMap, log });

  // ------------------------------------------------------------
  // 3) Write /home/manifest.json (always)
  // ------------------------------------------------------------
  writeHomeManifest(homeOut);

  const ms = Date.now() - t0;

  // ------------------------------------------------------------
  // 4) Write logfile (always)
  // ------------------------------------------------------------
  log.unshift("Rebuild + Validate - " + new Date().toString());
  log.push("");
  log.push("Elapsed ms: " + ms);
  fs.writeFileSync(logFile, log.join("\n"), "utf8");

  // ------------------------------------------------------------
  // 5) Build grouped report (Added + Broken only)
  // ------------------------------------------------------------
  const addedGroups  = mapToGroups(addedMap);
  const brokenGroups = mapToGroups(brokenMap);

  return {
    request: "rebuildAndValidateManifests",
    status: "ok",
    logFile,
    elapsedMs: ms,
    addedGroups,
    brokenGroups
  };

} // end rebuildAndValidateManifests


function mapToGroups(map) {
  const groups = [];
  for (const [group, items] of map.entries()) {
    groups.push({ group, items: items.slice() });
  }
  groups.sort((a, b) => a.group.localeCompare(b.group));
  return groups;
} // end mapToGroups


function addGrouped(map, group, item) {
  if (!map.has(group)) map.set(group, []);
  map.get(group).push(item);
} // end addGrouped


function ensureDir(dir, message) {
  if (!fs.existsSync(dir)) throw new Error(message);
  if (!fs.statSync(dir).isDirectory()) throw new Error(message);
} // end ensureDir


function readJson(absPath) {
  return JSON.parse(fs.readFileSync(absPath, "utf8"));
} // end readJson


function writeJsonIfChanged(absPath, data) {

  const next = JSON.stringify(data, null, 2) + "\n";

  if (!fs.existsSync(absPath)) {
    fs.writeFileSync(absPath, next, "utf8");
    return true;
  }

  const cur = fs.readFileSync(absPath, "utf8");
  if (cur === next) return false;

  fs.writeFileSync(absPath, next, "utf8");
  return true;

} // end writeJsonIfChanged


function listFilesByExt(dir, ext) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];

  for (const ent of entries) {
    if (!ent.isFile()) continue;

    const name = ent.name;
    if (name.startsWith(".")) continue;
    if (name === "manifest.json") continue;
    if (name === "directoryRegistry.json") continue;

    if (name.toLowerCase().endsWith(ext)) out.push(name);
  }

  out.sort((a, b) => a.localeCompare(b));
  return out;
} // end listFilesByExt


function indexByPath(manifest) {
  const set = new Set();
  for (const e of manifest) {
    if (!e || typeof e !== "object") continue;
    if (typeof e.path !== "string") continue;
    set.add(String(e.path).replace(/\\/g, "/"));
  }
  return set;
} // end indexByPath


function indexByFilename(manifest) {
  const set = new Set();
  for (const e of manifest) {
    if (!e || typeof e !== "object") continue;
    if (typeof e.filename !== "string") continue;
    set.add(e.filename);
  }
  return set;
} // end indexByFilename


function makeNewScriptEntry(fileName) {

  // You requested: title should be file name (ex: "foo.js")
  const base = fileName.replace(/\.js$/i, "");

  return {
    filename: base,
    path: fileName,       // scripts: manifest path is local filename (or relPath within category)
    title: fileName,
    status: "new"
  };

} // end makeNewScriptEntry


function makeNewImageEntry(relPathKey, fileName) {

  // relPathKey includes subdir prefix for gallery images (ex: "3D/401.jpg")
  // For images, filename base is used in existing system; keep it.
  const base = path.parse(fileName).name;

  return {
    filename: base,
    path: relPathKey,
    title: fileName,
    status: "new"
  };

} // end makeNewImageEntry


function ensurePatternsDummyThumb(category, baseName) {

  const src = path.resolve("./patterns/thumb.png");
  if (!fs.existsSync(src)) throw new Error("Dummy thumbnail missing: " + src);
  if (!fs.statSync(src).isFile()) throw new Error("Dummy thumbnail is not a file: " + src);

  const imagesDir = path.resolve("./patterns", category, "images");
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
  if (!fs.statSync(imagesDir).isDirectory()) throw new Error("images dir not directory: " + imagesDir);

  const dst = path.join(imagesDir, "thumb_" + baseName + ".png");

  // Only create if missing (your preference)
  if (fs.existsSync(dst)) return;

  fs.copyFileSync(src, dst);

  if (!fs.existsSync(dst)) throw new Error("copyFileSync failed: " + dst);

} // end ensurePatternsDummyThumb


async function scanPatternsAddNew({ addedMap, log }) {

  const patternsRoot = path.resolve("./patterns");
  ensureDir(patternsRoot, "patterns root missing: " + patternsRoot);

  const registryPath = path.join(patternsRoot, "directoryRegistry.json");
  if (!fs.existsSync(registryPath)) throw new Error("patterns directoryRegistry.json missing: " + registryPath);

  const cats = readJson(registryPath);
  if (!Array.isArray(cats)) throw new Error("patterns directoryRegistry.json must be array");

  for (const cat of cats) {

    const catDir = path.join(patternsRoot, cat);
    ensureDir(catDir, "patterns category dir missing: " + catDir);

    const manifestPath = path.join(catDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;

    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest)) throw new Error("patterns manifest must be array: " + manifestPath);

    const byPath = indexByPath(manifest);
    const byFn   = indexByFilename(manifest);

    const jsFiles = listFilesByExt(catDir, ".js");

    let changed = false;

    for (const f of jsFiles) {
      const base = f.replace(/\.js$/i, "");

      if (byPath.has(f)) continue;
      if (byFn.has(base)) continue;

      const entry = makeNewScriptEntry(f);
      entry.path = f; // local filename inside category folder

      manifest.push(entry);

      byPath.add(f);
      byFn.add(base);

      ensurePatternsDummyThumb(cat, base);

      addGrouped(addedMap, "patterns/" + cat, f);
      log.push("[PATTERNS ADDED] " + cat + "/" + f);

      changed = true;
    }

    if (changed) {
      const wrote = writeJsonIfChanged(manifestPath, manifest);
      if (!wrote) log.push("[PATTERNS NOTE] no-op write avoided: " + manifestPath);
    }
  }

} // end scanPatternsAddNew


async function scanGalleryScriptsAddNew({ addedMap, log }) {

  // NEW gallery model: /gallery/Scripts/directoryRegistry.json and per-category manifest.json
  const scriptsRoot = path.resolve("./gallery/Scripts");
  if (!fs.existsSync(scriptsRoot)) return;

  ensureDir(scriptsRoot, "gallery scripts root invalid: " + scriptsRoot);

  const registryPath = path.join(scriptsRoot, "directoryRegistry.json");
  if (!fs.existsSync(registryPath)) throw new Error("gallery/Scripts directoryRegistry.json missing: " + registryPath);

  const cats = readJson(registryPath);
  if (!Array.isArray(cats)) throw new Error("gallery/Scripts directoryRegistry.json must be array");

  for (const cat of cats) {

    const catDir = path.join(scriptsRoot, cat);
    ensureDir(catDir, "gallery scripts category dir missing: " + catDir);

    const manifestPath = path.join(catDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;

    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest)) throw new Error("gallery scripts manifest must be array: " + manifestPath);

    const byPath = indexByPath(manifest);
    const byFn   = indexByFilename(manifest);

    const jsFiles = listFilesByExt(catDir, ".js");

    let changed = false;

    for (const f of jsFiles) {
      const base = f.replace(/\.js$/i, "");

      if (byPath.has(f)) continue;
      if (byFn.has(base)) continue;

      const entry = makeNewScriptEntry(f);
      entry.path = f;

      manifest.push(entry);

      byPath.add(f);
      byFn.add(base);

      addGrouped(addedMap, "gallery/Scripts/" + cat, f);
      log.push("[GALLERY SCRIPTS ADDED] " + cat + "/" + f);

      changed = true;
    }

    if (changed) {
      const wrote = writeJsonIfChanged(manifestPath, manifest);
      if (!wrote) log.push("[GALLERY SCRIPTS NOTE] no-op write avoided: " + manifestPath);
    }
  }

} // end scanGalleryScriptsAddNew


async function scanGalleryImagesAddNew({ addedMap, log }) {

  // This is the “update_gallery_manifests” behavior but simplified:
  // - add new images
  // - write NO thumbnails here (you already have sharp logic elsewhere);
  //   if you still want thumbs, we can plug sharp back in next.
  // For now: discovery only + status:new, and missing files go to broken via validator.

  const galleryRoot = path.resolve("./gallery");
  ensureDir(galleryRoot, "gallery root missing: " + galleryRoot);

  const domains = ["Ideabook", "Patterns"];

  for (const domain of domains) {

    const domainDir = path.join(galleryRoot, domain);
    if (!fs.existsSync(domainDir)) continue;
    ensureDir(domainDir, "gallery domain dir missing: " + domainDir);

    const registryPath = path.join(domainDir, "directoryRegistry.json");
    if (!fs.existsSync(registryPath)) throw new Error("gallery " + domain + " directoryRegistry.json missing: " + registryPath);

    const cats = readJson(registryPath);
    if (!Array.isArray(cats)) throw new Error("gallery " + domain + " directoryRegistry.json must be array");

    for (const cat of cats) {

      const catDir = path.join(domainDir, cat);
      ensureDir(catDir, "gallery category dir missing: " + catDir);

      const manifestPath = path.join(catDir, "manifest.json");
      if (!fs.existsSync(manifestPath)) continue;

      const manifest = readJson(manifestPath);
      if (!Array.isArray(manifest)) throw new Error("gallery manifest must be array: " + manifestPath);

      const byPath = indexByPath(manifest);

      // Images are in the category folder (per your current gallery.js path logic)
      const imgs = listImageFiles(catDir);

      let changed = false;

      for (const fileName of imgs) {

        const key = cat + "/" + fileName;  // manifest paths are domain-relative with category prefix

        if (byPath.has(key)) continue;

        const entry = makeNewImageEntry(key, fileName);
        manifest.push(entry);
        byPath.add(key);

        addGrouped(addedMap, "gallery/" + domain + "/" + cat, fileName);
        log.push("[GALLERY IMAGES ADDED] " + domain + "/" + cat + "/" + fileName);

        changed = true;
      }

      if (changed) {
        const wrote = writeJsonIfChanged(manifestPath, manifest);
        if (!wrote) log.push("[GALLERY IMAGES NOTE] no-op write avoided: " + manifestPath);
      }
    }
  }

} // end scanGalleryImagesAddNew


function listImageFiles(dir) {
  const allowed = /\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];

  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const name = ent.name;
    if (allowed.test(name)) out.push(name);
  }

  out.sort((a, b) => a.localeCompare(b));
  return out;
} // end listImageFiles


async function scanUtilitiesAddNew({ addedMap, log }) {

  const utilitiesRoot = path.resolve("./utilities");
  ensureDir(utilitiesRoot, "utilities root missing: " + utilitiesRoot);

  const domains = ["Tools", "Lab"];

  for (const domain of domains) {

    const domainDir = path.join(utilitiesRoot, domain);
    if (!fs.existsSync(domainDir)) continue;
    ensureDir(domainDir, "utilities domain dir missing: " + domainDir);

    const registryPath = path.join(domainDir, "directoryRegistry.json");
    if (!fs.existsSync(registryPath)) throw new Error("utilities/" + domain + " directoryRegistry.json missing: " + registryPath);

    const cats = readJson(registryPath);
    if (!Array.isArray(cats)) throw new Error("utilities/" + domain + " directoryRegistry.json must be array");

    for (const cat of cats) {

      const catDir = path.join(domainDir, cat);
      ensureDir(catDir, "utilities category dir missing: " + catDir);

      const manifestPath = path.join(catDir, "manifest.json");
      if (!fs.existsSync(manifestPath)) continue;

      const manifest = readJson(manifestPath);
      if (!Array.isArray(manifest)) throw new Error("utilities manifest must be array: " + manifestPath);

      const byPath = indexByPath(manifest);
      const byFn   = indexByFilename(manifest);

      const jsFiles = listFilesByExt(catDir, ".js");

      let changed = false;

      for (const f of jsFiles) {
        const base = f.replace(/\.js$/i, "");

        if (byPath.has(f)) continue;
        if (byFn.has(base)) continue;

        const entry = makeNewScriptEntry(f);
        entry.path = f;

        manifest.push(entry);

        byPath.add(f);
        byFn.add(base);

        addGrouped(addedMap, "utilities/" + domain + "/" + cat, f);
        log.push("[UTILITIES ADDED] " + domain + "/" + cat + "/" + f);

        changed = true;
      }

      if (changed) {
        const wrote = writeJsonIfChanged(manifestPath, manifest);
        if (!wrote) log.push("[UTILITIES NOTE] no-op write avoided: " + manifestPath);
      }
    }
  }

} // end scanUtilitiesAddNew


async function scanAllManifestsForHomeAndBroken({ homeOut, brokenMap, log }) {

  const roots = [
    path.resolve("./patterns"),
    path.resolve("./gallery"),
    path.resolve("./utilities")
  ];

  const manifestFiles = [];

  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    walkFindManifests(r, manifestFiles);
  }

  for (const mf of manifestFiles) {

    const list = readJson(mf);
    if (!Array.isArray(list)) throw new Error("manifest must be array: " + mf);

    const manifestDir = path.dirname(mf);

    for (const entry of list) {

      if (!entry || typeof entry !== "object") continue;

      // Collect status-bearing entries for Home (as-is status)
      if (entry.status) {
        const rooted = makeRootedPath(manifestDir, entry);
        homeOut.push({
          file: String(entry.file || entry.filename || path.posix.basename(rooted)),
          path: rooted,
          title: String(entry.title || ""),
          status: String(entry.status).trim()
        });
      }

      // Validate referenced file exists; if missing, create VIRTUAL broken home item.
      const rooted = makeRootedPath(manifestDir, entry);
      const absItem = path.resolve("." + rooted); // rooted begins with "/"
      if (!fs.existsSync(absItem)) {

        const group = groupFromManifestPath(mf);

        const file = String(entry.file || entry.filename || path.posix.basename(rooted));
        const title = String(entry.title || entry.filename || file || "");
        const broken = {
          file,
          path: rooted,
          title,
          status: "broken"
        };

        homeOut.push(broken);

        const label = rooted;
        addGrouped(brokenMap, group, label);

        log.push("[BROKEN] " + rooted + " (from " + mf + ")");
      }
    }
  }

  // Sort Home output deterministically
  homeOut.sort((a, b) => {
    const as = String(a.status || "").toLowerCase();
    const bs = String(b.status || "").toLowerCase();
    if (as < bs) return -1;
    if (as > bs) return 1;

    const ak = String(a.title || a.file || a.path).toLowerCase();
    const bk = String(b.title || b.file || b.path).toLowerCase();
    if (ak < bk) return -1;
    if (ak > bk) return 1;
    return 0;
  });

} // end scanAllManifestsForHomeAndBroken


function walkFindManifests(dir, out) {

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const ent of entries) {
    const full = path.join(dir, ent.name);

    if (ent.isDirectory()) {
      // skip node_modules if it exists anywhere
      if (ent.name === "node_modules") continue;
      walkFindManifests(full, out);
      continue;
    }

    if (ent.isFile() && ent.name === "manifest.json") {
      out.push(full);
      continue;
    }
  }

} // end walkFindManifests


function groupFromManifestPath(absManifestPath) {

  // Group by the directory containing the manifest, relative to project root.
  const rel = path.relative(path.resolve("."), path.dirname(absManifestPath));
  const posixRel = rel.split(path.sep).join(path.posix.sep);
  return posixRel;

} // end groupFromManifestPath


function makeRootedPath(manifestDirAbs, entry) {

  const rel = entry.path || entry.filename || entry.file;
  if (!rel || typeof rel !== "string") {
    throw new Error("makeRootedPath: entry missing path/filename/file in " + manifestDirAbs);
  }

  if (rel.startsWith("/")) return rel;

  const absItem = path.resolve(manifestDirAbs, rel);
  const relToRoot = path.relative(path.resolve("."), absItem);
  const posixRel = relToRoot.split(path.sep).join(path.posix.sep);

  return "/" + posixRel;

} // end makeRootedPath


function writeHomeManifest(homeOut) {

  const outDir = path.resolve("./home");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  ensureDir(outDir, "home dir not directory: " + outDir);

  const outPath = path.join(outDir, "manifest.json");
  fs.writeFileSync(outPath, JSON.stringify(homeOut, null, 2) + "\n", "utf8");

} // end writeHomeManifest

/* ============================================================
   TASK: archiveItem  (GENERIC)

   Payload:
     {
       manifestPath : "/patterns/<cat>/manifest.json"
                  OR "/gallery/<Domain>/<cat>/manifest.json"
                  OR "/gallery/Scripts/<cat>/manifest.json"
                  OR "/utilities/<domain>/<cat>/manifest.json",
       filename     : "<full filename including extension>"
                    // examples: "foo.js", "IMG_9649.PNG", "316 - Copy.js"
     }

   Behavior:
     - resolve manifestPath safely inside allowed roots
     - baseDir = directory containing manifest.json
     - move baseDir/<filename>  ->  baseDir/archive/<filename>
     - remove manifest entry matching either:
         entry.path basename === filename
         OR entry.filename      === baseName(filename)
=========================================================== */
async function archiveItem(payload) {

  if (!payload) throw new Error("archiveItem: payload missing");

  const manifestPathInput = payload.manifestPath;
  const filename          = payload.filename;

  if (typeof manifestPathInput !== "string" || manifestPathInput.trim() === "") {
    throw new Error("archiveItem: manifestPath missing");
  }

  if (typeof filename !== "string" || filename.trim() === "") {
    throw new Error("archiveItem: filename missing");
  }

  const patternsRoot  = path.resolve("./patterns");
  const galleryRoot   = path.resolve("./gallery");
  const utilitiesRoot = path.resolve("./utilities");

  const manifestAbs = resolveManifestPathAllowed(
    [patternsRoot, galleryRoot, utilitiesRoot],
    manifestPathInput,
    "archiveItem"
  );

  const manifestDir = path.dirname(manifestAbs);

  // Source file is EXACTLY what the caller sent (full filename + ext).
  const srcAbs = path.join(manifestDir, filename);

  if (!fs.existsSync(srcAbs)) {
    throw new Error("archiveItem: source file not found: " + srcAbs);
  }

  const archiveDirAbs = path.join(manifestDir, "archive");
  if (!fs.existsSync(archiveDirAbs)) {
    fs.mkdirSync(archiveDirAbs, { recursive: true });
  }

  const destAbs = path.join(archiveDirAbs, filename);

  fs.renameSync(srcAbs, destAbs);

  // Update manifest: remove matching entry.
  const raw  = fs.readFileSync(manifestAbs, "utf8");
  const list = JSON.parse(raw);

  if (!Array.isArray(list)) {
    throw new Error("archiveItem: manifest is not an array: " + manifestAbs);
  }

  const wantBase = path.parse(filename).name;

  const before = list.length;

  const afterList = list.filter((e) => {
    if (!e || typeof e !== "object") return true;

    const entryPath = (typeof e.path === "string") ? e.path : "";
    const entryFile = (typeof e.filename === "string") ? e.filename : "";

    // Match either:
    //   - entry.path basename equals the full filename (incl ext)
    //   - entry.filename equals the base name (no ext)
    const pathBase = entryPath ? path.posix.basename(entryPath.replace(/\\/g, "/")) : "";

    if (pathBase && pathBase === filename) return false;
    if (entryFile && entryFile === wantBase) return false;

    return true;
  });

  if (afterList.length === before) {
    throw new Error("archiveItem: no manifest entry matched filename: " + filename);
  }

  fs.writeFileSync(
    manifestAbs,
    JSON.stringify(afterList, null, 2) + "\n",
    "utf8"
  );

  return {
    request: "archiveItem",
    status: "ok",
    manifestPath: manifestPathInput,
    filename
  };

} // end archiveItem


/* ===========================================================
   TASK: writeHelpFile  (CREATE OR OVERWRITE)

   DESCRIPTION
   -----------
   Writes Help HTML back to disk. Creates the file if missing.

   Payload:
     {
       helpPath : "/help/<tab>/<name>.html"   // rooted path from UI
       html     : "<full html text>"         // full file contents to write
     }

   Rules:
     - Path is restricted to ./help (fail-fast)
     - Parent directory must exist (fail-fast)
     - File is written with overwrite semantics (create or replace)
=========================================================== */
async function writeHelpFile(payload = {}) {

  if (!payload) throw new Error("writeHelpFile: payload missing");

  const helpPathInput = payload.helpPath;
  const html          = payload.html;

  if (typeof helpPathInput !== "string" || helpPathInput.trim() === "") {
    throw new Error("writeHelpFile: helpPath missing/invalid");
  }

  if (typeof html !== "string") {
    throw new Error("writeHelpFile: html missing/invalid");
  }

  const helpRoot = path.resolve("./help");

  // Resolve rooted UI path safely inside ./help
  let rel = String(helpPathInput);
  if (rel.startsWith("/")) rel = rel.slice(1);

  const abs = path.resolve(rel);

  if (!abs.startsWith(helpRoot)) {
    throw new Error("writeHelpFile: path escapes ./help: " + abs);
  }

  // Parent directory MUST exist (fail-fast, no silent mkdirs)
  const parentDir = path.dirname(abs);
  assertDirectoryExists(parentDir, "writeHelpFile: parent dir missing: " + parentDir);

  // Write file (create or overwrite)
  fs.writeFileSync(abs, html, "utf8");

  // Verify write succeeded
  assertFileExists(abs, "writeHelpFile: write failed: " + abs);

  return {
    request: "writeHelpFile",
    status: "ok",
    helpPath: helpPathInput
  };

} // end writeHelpFile



/* ===========================================================
   TASK: writeGalleryPatternPng

   DESCRIPTION
   -----------
   Writes TWO PNGs provided by the browser into:

     ./gallery/Patterns/<category>/
     ./gallery/Patterns/<category>/images/

   Files:
     <idName><timestamp>.png
     images/thumb_<idName><timestamp>.png

   ALSO UPDATES MANIFEST
   ---------------------
   Updates:
     ./gallery/Patterns/<category>/manifest.json

   Adds a new entry:
     {
       filename: "<baseName>",                 // no extension
       path:     "<category>/<pngName>",       // matches Gallery model
       title:    "<pngName>",                  // placeholder title
       status:   "new"
     }

   Payload:
     {
       category      : "<category>",        // ex: "circles"
       idName        : "<drawRegistryId>",  // ex: "ellipse"
       pngBase64     : "<base64 png bytes>",
       thumbBase64   : "<base64 png bytes>"
     }
=========================================================== */

export async function writeGalleryPatternPng(payload = {}) {

  const category    = payload.category;
  const idName      = payload.idName;
  const pngBase64   = payload.pngBase64;
  const thumbBase64 = payload.thumbBase64;

  if (typeof category !== "string" || category.trim() === "") {
    throw new Error("writeGalleryPatternPng: category missing or invalid");
  }

  if (typeof idName !== "string" || idName.trim() === "") {
    throw new Error("writeGalleryPatternPng: idName missing or invalid");
  }

  if (typeof pngBase64 !== "string" || pngBase64.trim() === "") {
    throw new Error("writeGalleryPatternPng: pngBase64 missing or invalid");
  }

  if (typeof thumbBase64 !== "string" || thumbBase64.trim() === "") {
    throw new Error("writeGalleryPatternPng: thumbBase64 missing or invalid");
  }

  const galleryRoot = path.resolve("./gallery");
  assertDirectoryExists(galleryRoot, "writeGalleryPatternPng: gallery root missing: " + galleryRoot);

  const patternsRoot = path.join(galleryRoot, "Patterns");
  assertDirectoryExists(patternsRoot, "writeGalleryPatternPng: ./gallery/Patterns missing: " + patternsRoot);

  const categoryDir = path.join(patternsRoot, category);
  assertDirectoryExists(categoryDir, "writeGalleryPatternPng: category dir missing: " + categoryDir);

  const imagesDir = path.join(categoryDir, "images");
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  assertDirectoryExists(imagesDir, "writeGalleryPatternPng: images dir missing: " + imagesDir);

  const manifestPath = path.join(categoryDir, "manifest.json");
  assertFileExists(manifestPath, "writeGalleryPatternPng: manifest missing: " + manifestPath);

  const stamp = makeTimestampForFilename();
  const base  = String(idName).trim() + stamp;

  const pngName   = base + ".png";
  const thumbName = "thumb_" + base + ".png";

  const pngPath   = path.join(categoryDir, pngName);
  const thumbPath = path.join(imagesDir, thumbName);

  if (fs.existsSync(pngPath)) fs.unlinkSync(pngPath);
  fs.writeFileSync(pngPath, Buffer.from(pngBase64, "base64"), { flag: "w" });
  assertFileExists(pngPath, "writeGalleryPatternPng: write failed: " + pngPath);

  if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
  fs.writeFileSync(thumbPath, Buffer.from(thumbBase64, "base64"), { flag: "w" });
  assertFileExists(thumbPath, "writeGalleryPatternPng: write failed: " + thumbPath);

  const manifest = readJsonFileSync(manifestPath);
  if (!Array.isArray(manifest)) {
    throw new Error("writeGalleryPatternPng: manifest must be an array: " + manifestPath);
  }

  const entryPath = category + "/" + pngName;

  manifest.push({
    filename: base,
    path:     entryPath,
    title:    pngName,
    status:   "new"
  });

  writeJsonFileSync(manifestPath, manifest);

  return {
    request: "writeGalleryPatternPng",
    status: "ok",
    category,
    idName,
    stamp,
    filenameBase: base,
    pngPath,
    thumbPath,
    manifestPath,
    manifestIndexAdded: manifest.length - 1
  };

} // end writeGalleryPatternPng


/* ===========================================================
   TASK: writePatternFromDrawRegistry

   DESCRIPTION
   -----------
   Writes:
     ./patterns/<category>/<idName><timestamp>.js
     ./patterns/<category>/images/thumb_<idName><timestamp>.png

   ALSO UPDATES MANIFEST
   ---------------------
   Updates:
     ./patterns/<category>/manifest.json

   Adds a new entry (Patterns model: local filename path):
     {
       filename: "<baseName>",        // no extension
       path:     "<jsName>",          // local filename inside category folder
       title:    "<jsName>",          // placeholder title
       status:   "new"
     }

   Payload:
     {
       category    : "<category>",        // ex: "fundamental"
       idName      : "<drawRegistryId>",  // ex: "parabola"
       scriptText  : "<full js file text>",
       thumbBase64 : "<base64 png bytes>" // already sized in UI (your choice)
     }
=========================================================== */

/*************************************************************
   writePatternFromDrawRegistry(spec)
   -----------------------------------------------------------
   UI worker for "Create Pattern" (Draw tab).

   Responsibilities:
     1) Validate spec + canvas
     2) Build pattern script text
     3) Convert canvas to PNG base64 + 50x50 thumb base64
     4) Dispatch Node request: writePatternFromDrawRegistry
     5) Force manifest refresh (same pattern as archive/edit/png)
     6) Display a clear completion message

   Expected spec:
     {
       category : "<patterns category>",
       idName   : "<drawRegistry id>",
       entry    : <drawRegistry entry object>,
       parameters : <current parameters object>,
       canvas   : HTMLCanvasElement
     }
*************************************************************/

/*************************************************************
   writePatternFromDrawRegistry(spec)
   -----------------------------------------------------------
   UI worker for "Create Pattern" (Draw tab).

   IMPORTANT:
   - The Node service error you are seeing ("entry missing/invalid")
     is NOT about the drawRegistry entry object.
     It means the NODE handler expects a manifest entry object named
     payload.entry, and we were not sending it.

   This function sends BOTH:
     - payload.entry      (manifest entry object)
     - payload.scriptText (the JS file text)

   Expected spec:
     {
       category    : "<patterns category>",
       idName      : "<drawRegistry id>",
       title       : "<optional title override>",
       canvas      : HTMLCanvasElement
     }
*************************************************************/

/*************************************************************
   writePatternFromDrawRegistry(spec)
   -----------------------------------------------------------
   UI worker for "Create Pattern" (Draw tab).

   IMPORTANT:
   - The Node service error you are seeing ("entry missing/invalid")
     is NOT about the drawRegistry entry object.
     It means the NODE handler expects a manifest entry object named
     payload.entry, and we were not sending it.

   This function sends BOTH:
     - payload.entry      (manifest entry object)
     - payload.scriptText (the JS file text)

   Expected spec:
     {
       category    : "<patterns category>",
       idName      : "<drawRegistry id>",
       title       : "<optional title override>",
       canvas      : HTMLCanvasElement
     }
*************************************************************/


/* ===========================================================
   TASK: writePatternFromDrawRegistry

   Payload:
     {
       category    : "<category>",
       idName      : "<drawRegistryId>",
       scriptText  : "<full js file text>",
       thumbBase64 : "<base64 png bytes>"
     }

   Writes:
     ./patterns/<category>/<idName><stamp>.js
     ./patterns/<category>/images/thumb_<idName><stamp>.png

   Updates:
     ./patterns/<category>/manifest.json
=========================================================== */
export async function writePatternFromDrawRegistry(payload = {}) {

  const category    = payload.category;
  const idName      = payload.idName;
  const scriptText  = payload.scriptText;
  const thumbBase64 = payload.thumbBase64;

  if (typeof category !== "string" || category.trim() === "") {
    throw new Error("writePatternFromDrawRegistry: category missing/invalid");
  }

  if (typeof idName !== "string" || idName.trim() === "") {
    throw new Error("writePatternFromDrawRegistry: idName missing/invalid");
  }

  if (typeof scriptText !== "string" || scriptText.trim() === "") {
    throw new Error("writePatternFromDrawRegistry: scriptText missing/invalid");
  }

  if (typeof thumbBase64 !== "string" || thumbBase64.trim() === "") {
    throw new Error("writePatternFromDrawRegistry: thumbBase64 missing/invalid");
  }

  const patternsRoot = path.resolve("./patterns");
  assertDirectoryExists(patternsRoot, "writePatternFromDrawRegistry: patterns root missing: " + patternsRoot);

  const categoryDir = path.join(patternsRoot, category);
  assertDirectoryExists(categoryDir, "writePatternFromDrawRegistry: category dir missing: " + categoryDir);

  const imagesDir = path.join(categoryDir, "images");
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  assertDirectoryExists(imagesDir, "writePatternFromDrawRegistry: images dir missing: " + imagesDir);

  const manifestPath = path.join(categoryDir, "manifest.json");
  assertFileExists(manifestPath, "writePatternFromDrawRegistry: manifest missing: " + manifestPath);

  const stamp = makeTimestampForFilename();
  const base  = String(idName).trim() + stamp;

  const jsName    = base + ".js";
  const thumbName = "thumb_" + base + ".png";

  const scriptPath = path.join(categoryDir, jsName);
  const thumbPath  = path.join(imagesDir, thumbName);

  if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
  fs.writeFileSync(scriptPath, scriptText, "utf8");
  assertFileExists(scriptPath, "writePatternFromDrawRegistry: write failed: " + scriptPath);

  if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
  fs.writeFileSync(thumbPath, Buffer.from(thumbBase64, "base64"), { flag: "w" });
  assertFileExists(thumbPath, "writePatternFromDrawRegistry: write failed: " + thumbPath);

  const manifest = readJsonFileSync(manifestPath);
  if (!Array.isArray(manifest)) {
    throw new Error("writePatternFromDrawRegistry: manifest must be an array: " + manifestPath);
  }

  manifest.push({
    filename: base,
    path:     jsName,    // Patterns model: local filename within category folder
    title:    jsName,    // placeholder title (your documented rule)
    status:   "new"
  });

  writeJsonFileSync(manifestPath, manifest);

  return {
    request: "writePatternFromDrawRegistry",
    status: "ok",
    category,
    idName,
    stamp,
    filenameBase: base,
    scriptPath,
    thumbPath,
    manifestPath,
    manifestIndexAdded: manifest.length - 1
  };

} // end writePatternFromDrawRegistry




/* -----------------------------------------------------------
   makeTimestampForFilename()

   Returns: YYYYMMDD_HHMMSS
----------------------------------------------------------- */
function makeTimestampForFilename() {

  const d = new Date();

  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");

  const hh   = String(d.getHours()).padStart(2, "0");
  const min  = String(d.getMinutes()).padStart(2, "0");
  const ss   = String(d.getSeconds()).padStart(2, "0");

  return mm + dd + "_" + hh + min + ss;

} // end makeTimestampForFilename
