/* ===========================================================
   manifestRequests.mjs  (Node.js)
   -----------------------------------------------------------
   Requests that edit manifests: editManifestEntry and archiveItem. Also holds the
   manifest path checks these requests share.
   Called by the dispatcher in sketchpadService.mjs.
   =========================================================== */

import fs from "fs";
import path from "path";
import { RequestError, assertSimpleName, isInside, manifestRoots, MANIFEST_FOLDERS_ORIGINALS } from "./safePaths.mjs";
import { readJsonFileSync, writeJsonFileSync, assertFileExists } from "./serviceFileHelpers.mjs";


/* ============================================================
   TASK: editManifestEntry

   Changes one entry's title and status in a manifest.
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

  HOME MANIFEST
  -------------
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

  const manifestPath = resolveManifestPathAllowed(
    manifestRoots(),
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

  const roots = manifestRoots(MANIFEST_FOLDERS_ORIGINALS);

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
export async function archiveItem(payload) {

  if (!payload) throw new Error("archiveItem: payload missing");

  const manifestPathInput = payload.manifestPath;
  const filename          = payload.filename;

  if (typeof manifestPathInput !== "string" || manifestPathInput.trim() === "") {
    throw new Error("archiveItem: manifestPath missing");
  }

  assertSimpleName(filename, "archiveItem: filename");

  const manifestAbs = resolveManifestPathAllowed(
    manifestRoots(MANIFEST_FOLDERS_ORIGINALS),
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
    writeJsonFileSync(manifestAbs, afterList);
  } catch (writeErr) {
    fs.renameSync(destAbs, srcAbs);
    throw writeErr;
  }

  // Mirror the removal into ./home/manifest.json so the Home tab
  // stays consistent without requiring a full rebuild.
  try {
    const archivedEntry = list.find((e) => !afterList.includes(e));
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
