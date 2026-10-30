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
   CURRENT TASKS  (the request names the dispatcher accepts)

   Manifests
     • manifestMaintenance            rebuild every manifest (maintain_manifests.mjs)
     • editManifestEntry              change one entry's title and status
     • editPackageScript              edit an entry in a manifest
     • archiveItem                    move a file to archive/ and drop its entry

   Writers (data comes from the browser)
     • writePatternThumbnail          50x50 thumbnail PNG for a pattern
     • writePatternFromDrawRegistry   a Pattern script plus thumbnail
     • writeGalleryPatternPng         a Gallery PNG plus thumbnail
     • writeHelpFile                  one help page under ./help
     • createFigure                   a figure file (createFigureService.mjs)

   Secondary objects (saved Draw settings)
     • saveSecondaryObject, readSecondaryObject, archiveSecondaryObject,
       getSecondaryManifest, getPrimaryObjectsWithSecondaries

   Logs and editor
     • listLogFiles, readLogFile      the files in ./utilities/logfiles
     • openInEditor                   open a project file in VS Code

   Placeholders (NO-OP, future expansion)
     • deletePackageScript
     • renamePackageScript

   Every path built from request text is checked by safePaths.mjs.

   -----------------------------------------------------------


   IMPORTANT CONSTRAINTS
   ---------------------
     • There is NEVER a ./patterns/manifest.json
     • Each category owns its own manifest.json
     • directoryRegistry.json is the ONLY source of categories
     • Titles cannot be inferred → filename used as placeholder


   =========================================================== */

import fs   from "fs";
import { spawn } from "child_process";
import path from "path";
import { runManifestMaintenance } from "./maintain_manifests.mjs";
import { createFigure }           from "./createFigureService.mjs";
import { RequestError, assertSimpleName, isInside } from "./safePaths.mjs";


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

    case "writePatternThumbnail":
      return await writePatternThumbnail(payload);

    case "createFigure":
      return await createFigure(payload);

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

    case "openInEditor":
      return await openInEditor(payload);

    case "archiveItem":
      return await archiveItem(payload);

    case "writePatternFromDrawRegistry":
      return await writePatternFromDrawRegistry(payload);


    case "writeHelpFile":
      return await writeHelpFile(payload);

    case "writeGalleryPatternPng":
      return await writeGalleryPatternPng(payload);

    case "saveSecondaryObject":
      return await saveSecondaryObject(payload);

    case "archiveSecondaryObject":
      return await archiveSecondaryObject(payload);

    case "getSecondaryManifest":
      return await getSecondaryManifest(payload);

    case "getPrimaryObjectsWithSecondaries":
      return await getPrimaryObjectsWithSecondaries(payload);

    case "readSecondaryObject":
      return await readSecondaryObject(payload);

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

    // Mirror the change into ./home/manifest.json.
    // Home only tracks status-bearing entries, so we must handle
    // three cases: add (newly has status), update (status changed),
    // remove (status cleared).
    let homeMirrorResult = "skipped";
    try {
      const editedList  = readJsonFileSync(manifestPath);
      const editedEntry = editedList[report.indexUpdated];
      const rootedPath  = makeRootedPath(path.dirname(manifestPath), editedEntry);

      if (fs.existsSync(homeManifestPath)) {
        const homeList  = readJsonFileSync(homeManifestPath);
        const homeIdx   = homeList.findIndex(e => e && e.path === rootedPath);
        const hasStatus = typeof newStatus === "string" && newStatus.trim() !== "";

        if (hasStatus && homeIdx >= 0) {
          // Update existing home entry
          homeList[homeIdx].title  = newTitle;
          homeList[homeIdx].status = newStatus;
          writeJsonFileSync(homeManifestPath, homeList);
          homeMirrorResult = "updated";
        } else if (hasStatus && homeIdx < 0) {
          // Add new home entry — item now has a status for the first time
          homeList.push({
            file:   String(editedEntry.file || editedEntry.filename || path.posix.basename(rootedPath)),
            path:   rootedPath,
            title:  newTitle || String(editedEntry.title || ""),
            status: newStatus
          });
          writeJsonFileSync(homeManifestPath, homeList);
          homeMirrorResult = "added";
        } else if (!hasStatus && homeIdx >= 0) {
          // Remove — status was cleared
          homeList.splice(homeIdx, 1);
          writeJsonFileSync(homeManifestPath, homeList);
          homeMirrorResult = "removed";
        }
        // else: no status, not in home — nothing to do
      }
    } catch (mirrorErr) {
      console.error("editManifestEntry: home mirror FAILED:", mirrorErr.message);
      homeMirrorResult = "error";
    }

    return {
      request: "editManifestEntry",
      status: "ok",
      manifestPath: report.manifestPath,
      indexUpdated: report.indexUpdated,
      oldTitle:  report.oldTitle,
      newTitle:  report.newTitle,
      oldStatus: report.oldStatus,
      newStatus: report.newStatus,
      homeMirrorResult
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
   TASK: openInEditor

   DESCRIPTION
   -----------
   Opens a source file of this project in a desktop editor.

   payload: { editor: "vscode", file: "/drawRegistry/x.js" }

   SAFETY
   ------
   The service listens on localhost only, but it still refuses
   anything that is not an existing file inside the project folder
   (the current directory), anything under node_modules or .git,
   and any file name with characters other than letters, digits
   and  _ . - / space. The editor command comes from a fixed list,
   never from the request.
   =========================================================== */
// To offer another editor, add its command name(s) here and a button
// in makeNotesItem (ui/menuCmds.js).
const EDITOR_COMMANDS = {
  vscode: ["code"]
};

export async function openInEditor(payload = {}) {

  const editor = payload.editor;
  const file   = payload.file;

  if (!Object.prototype.hasOwnProperty.call(EDITOR_COMMANDS, editor)) {
    throw new Error("openInEditor: unknown editor: " + editor);
  }
  if (typeof file !== "string" || !/^[A-Za-z0-9_.\-\/ ]+$/.test(file)) {
    throw new Error("openInEditor: invalid file name");
  }
  if (file.split("/").includes("..")) {
    throw new Error("openInEditor: invalid file name");
  }

  const root = path.resolve(".");
  const full = path.resolve(root, "." + (file.startsWith("/") ? file : "/" + file));
  const rel  = path.relative(root, full);

  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("openInEditor: file is outside the project");
  }
  const parts = rel.split(path.sep);
  if (parts.includes("node_modules") || parts.includes(".git")) {
    throw new Error("openInEditor: file not allowed: " + rel);
  }
  assertFileExists(full, "openInEditor: file missing: " + full);

  // Try each command name in turn; the first one that starts wins.
  const candidates = EDITOR_COMMANDS[editor];
  let lastError = null;

  for (const cmd of candidates) {
    const outcome = await launchDetached(cmd, [full]);
    if (outcome === "ok") {
      return { request: "openInEditor", status: "ok", editor, file: rel };
    }
    lastError = outcome;
  }

  throw new Error(
    "openInEditor: could not start " + candidates.join(" or ") +
    " (" + lastError + "). Is it on the PATH?"
  );

} // end openInEditor


// Starts a command detached from this service. Resolves "ok" when it
// started (or is still running after a moment), else a short reason.
function launchDetached(cmd, args) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };

    // On Windows, "code" is a .cmd file, which needs a shell. The file
    // name was validated above, and the command name is from a fixed list.
    const child = spawn(cmd, args, {
      detached: true,
      stdio: "ignore",
      shell: process.platform === "win32",
      windowsHide: true
    });

    child.on("error", (e) => finish(e.code || "error"));
    child.on("exit", (code) => finish(code === 0 || code === null ? "ok" : "exit code " + code));
    setTimeout(() => { child.unref(); finish("ok"); }, 1200);
  });
}


/* ===========================================================
   TASK: addPatternScripts  (AUGMENTED)

   Adds support for Gallery Scripts in addition to Patterns.

   NEW BEHAVIOR
   ------------
   In addition to scanning ./patterns


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
  assertSimpleName(category, "writePatternThumbnail: category");

  assertSimpleName(filename, "writePatternThumbnail: filename");

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
    if (isInside(root, abs)) {
      ok = true;
      break;
    }
  }

  if (!ok) {
    throw new RequestError(`${tag}: manifestPath escapes allowed roots: ${abs}`);
  }

  /* ---- only a file named manifest.json may be edited through this path ---- */
  if (path.basename(abs) !== "manifest.json") {
    throw new RequestError(`${tag}: manifestPath must name a manifest.json: ${abs}`);
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

  assertSimpleName(filename, "archiveItem: filename");

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

  // Work out the new manifest BEFORE moving anything, so a request that
  // cannot be finished leaves every file where it was.
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
    throw new RequestError("archiveItem: no manifest entry matched filename: " + filename);
  }

  // Now move the file, then write the manifest. If the manifest cannot be
  // written, put the file back.
  const archiveDirAbs = path.join(manifestDir, "archive");
  if (!fs.existsSync(archiveDirAbs)) {
    fs.mkdirSync(archiveDirAbs, { recursive: true });
  }

  const destAbs = path.join(archiveDirAbs, filename);

  fs.renameSync(srcAbs, destAbs);

  try {
    fs.writeFileSync(
      manifestAbs,
      JSON.stringify(afterList, null, 2) + "\n",
      "utf8"
    );
  } catch (writeErr) {
    fs.renameSync(destAbs, srcAbs);
    throw writeErr;
  }

  // Mirror the removal into ./home/manifest.json so the Home tab
  // stays consistent without requiring a full rebuild.
  try {
    const archivedEntry = list.find((e, i) => !afterList.includes(e));
    if (archivedEntry) {
      const rootedPath      = makeRootedPath(manifestDir, archivedEntry);
      const homeManifestPath = path.resolve("./home/manifest.json");

      if (fs.existsSync(homeManifestPath)) {
        const homeList   = readJsonFileSync(homeManifestPath);
        const homeAfter  = homeList.filter(e => e && e.path !== rootedPath);

        if (homeAfter.length !== homeList.length) {
          writeJsonFileSync(homeManifestPath, homeAfter);
          console.log("archiveItem: removed from home manifest:", rootedPath);
        }
      }
    }
  } catch (mirrorErr) {
    console.error("archiveItem: home mirror FAILED:", mirrorErr.message);
  }

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

  if (abs === helpRoot || !isInside(helpRoot, abs)) {
    throw new RequestError("writeHelpFile: path escapes ./help: " + abs);
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

  assertSimpleName(category, "writeGalleryPatternPng: category");

  assertSimpleName(idName, "writeGalleryPatternPng: idName");

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

  assertSimpleName(category, "writePatternFromDrawRegistry: category");

  assertSimpleName(idName, "writePatternFromDrawRegistry: idName");

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


/* ===========================================================
   FIXED: saveSecondaryObject

   This is the replacement for the saveSecondaryObject function
   in sketchpadService.mjs (around line 2441)

   Changes:
   - Now updates drawRegistry/directoryRegistry.json when creating
     a new primaryId directory for the first time
=========================================================== */

export async function saveSecondaryObject(payload = {}) {
  const primaryId   = payload.primaryId;
  const name        = payload.name;
  const jsonContent = payload.payload;
  const thumbBase64 = payload.thumbBase64;

  assertSimpleName(primaryId, "saveSecondaryObject: primaryId");
  assertSimpleName(name, "saveSecondaryObject: name");
  if (!jsonContent) throw new Error("saveSecondaryObject: payload (json) missing");
  if (!thumbBase64) throw new Error("saveSecondaryObject: thumbBase64 missing");

  const registryRoot = path.resolve("./drawRegistry");

  // Check if this is a new primaryId (directory doesn't exist yet)
  const primaryDir = path.join(registryRoot, primaryId);
  const isNewPrimaryId = !fs.existsSync(primaryDir);

  if (isNewPrimaryId) {
    fs.mkdirSync(primaryDir, { recursive: true });
  }

  const imagesDir = path.join(primaryDir, "images");
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const safeName = name.trim();
  const jsonFilename = safeName.endsWith(".json") ? safeName : safeName + ".json";
  const jsonPath = path.join(primaryDir, jsonFilename);

  writeJsonFileSync(jsonPath, jsonContent);

  const thumbFilename = "thumb_" + safeName + ".png";
  const thumbPath = path.join(imagesDir, thumbFilename);
  fs.writeFileSync(thumbPath, Buffer.from(thumbBase64, "base64"), { flag: "w" });

  // Update Manifest
  const manifestPath = path.join(primaryDir, "manifest.json");
  let manifest = [];
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = readJsonFileSync(manifestPath);
      if (!Array.isArray(manifest)) manifest = [];
    } catch (e) { manifest = []; }
  }

  const entryIndex = manifest.findIndex(e => e.filename === safeName);
  const entry = {
    filename: safeName,
    path: jsonFilename,
    title: name,
    thumb: "images/" + thumbFilename
  };

  if (entryIndex >= 0) {
    manifest[entryIndex] = entry;
  } else {
    manifest.push(entry);
  }

  writeJsonFileSync(manifestPath, manifest);

  // *** NEW: Update directoryRegistry.json if this is a new primaryId ***
  if (isNewPrimaryId) {
    const directoryRegistryPath = path.join(registryRoot, "directoryRegistry.json");
    let directoryRegistry = [];

    // Load existing registry if it exists
    if (fs.existsSync(directoryRegistryPath)) {
      try {
        directoryRegistry = readJsonFileSync(directoryRegistryPath);
        if (!Array.isArray(directoryRegistry)) {
          console.warn("directoryRegistry.json is not an array, creating new one");
          directoryRegistry = [];
        }
      } catch (e) {
        console.warn("Error reading directoryRegistry.json, creating new one:", e.message);
        directoryRegistry = [];
      }
    }

    // Add primaryId if not already present
    if (!directoryRegistry.includes(primaryId)) {
      directoryRegistry.push(primaryId);
      // Sort alphabetically for consistency
      directoryRegistry.sort();
      writeJsonFileSync(directoryRegistryPath, directoryRegistry);
      console.log(`Added '${primaryId}' to directoryRegistry.json`);
    }
  }

  return {
    request: "saveSecondaryObject",
    status: "ok",
    primaryId,
    name,
    isNewPrimaryId // Include this info in response for debugging
  };
}


/* ===========================================================
   TASK: archiveSecondaryObject
=========================================================== */
export async function archiveSecondaryObject(payload = {}) {
  const primaryId = payload.primaryId;
  const filename  = payload.filename;

  assertSimpleName(primaryId, "archiveSecondaryObject: primaryId");
  assertSimpleName(filename, "archiveSecondaryObject: filename");

  const registryRoot = path.resolve("./drawRegistry");
  const primaryDir = path.join(registryRoot, primaryId);
  const srcPath = path.join(primaryDir, filename);

  if (!fs.existsSync(srcPath)) throw new Error("File not found: " + srcPath);

  const archiveDir = path.join(primaryDir, "archive");
  if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

  const destPath = path.join(archiveDir, filename);
  fs.renameSync(srcPath, destPath);

  const manifestPath = path.join(primaryDir, "manifest.json");
  if (fs.existsSync(manifestPath)) {
    let manifest = readJsonFileSync(manifestPath);
    if (Array.isArray(manifest)) {
      manifest = manifest.filter(e => e.path !== filename && e.filename !== filename);
      writeJsonFileSync(manifestPath, manifest);
    }
  }

  return { request: "archiveSecondaryObject", status: "ok" };
}

/* ===========================================================
   TASK: getSecondaryManifest
=========================================================== */
export async function getSecondaryManifest(payload = {}) {
  const primaryId = payload.primaryId;
  assertSimpleName(primaryId, "getSecondaryManifest: primaryId");

  const registryRoot = path.resolve("./drawRegistry");
  const manifestPath = path.join(registryRoot, primaryId, "manifest.json");

  let manifest = [];
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = readJsonFileSync(manifestPath);
      if (!Array.isArray(manifest)) manifest = [];
    } catch (e) { manifest = []; }
  }

  return {
    request: "getSecondaryManifest",
    status: "ok",
    primaryId,
    manifest
  };
}

/* ===========================================================
   TASK: getPrimaryObjectsWithSecondaries
=========================================================== */
export async function getPrimaryObjectsWithSecondaries(payload = {}) {
  const registryRoot = path.resolve("./drawRegistry");
  const registryFile = path.join(registryRoot, "directoryRegistry.json");

  let ids = [];
  if (fs.existsSync(registryFile)) {
    try {
      ids = readJsonFileSync(registryFile);
    } catch(e) {}
  }

  if (!Array.isArray(ids)) ids = [];

  const withSecondaries = [];
  for (const id of ids) {
    const manifestPath = path.join(registryRoot, id, "manifest.json");
    if (fs.existsSync(manifestPath)) {
       try {
         const m = readJsonFileSync(manifestPath);
         if (Array.isArray(m) && m.length > 0) withSecondaries.push(id);
       } catch(e) {}
    }
  }

  return {
    request: "getPrimaryObjectsWithSecondaries",
    status: "ok",
    ids: withSecondaries
  };
}

/* ===========================================================
   TASK: readSecondaryObject
=========================================================== */
export async function readSecondaryObject(payload = {}) {
  const primaryId = payload.primaryId;
  const filename  = payload.filename;

  assertSimpleName(primaryId, "readSecondaryObject: primaryId");
  assertSimpleName(filename, "readSecondaryObject: filename");

  const registryRoot = path.resolve("./drawRegistry");
  const filePath = path.join(registryRoot, primaryId, filename);

  if (!fs.existsSync(filePath)) throw new Error("File not found: " + filePath);

  let content = null;
  try {
    content = readJsonFileSync(filePath);
  } catch (e) {
    throw new Error("Failed to parse JSON: " + filePath);
  }

  return {
      request: "readSecondaryObject",
      status: "ok",
      content
  };
}
