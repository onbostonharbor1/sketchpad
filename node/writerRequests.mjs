/* ===========================================================
   writerRequests.mjs  (Node.js)
   -----------------------------------------------------------
   Requests that write files from data the browser sends: pattern thumbnails, help pages,
   Gallery PNGs, and Pattern scripts made from the Draw registry.
   Called by the dispatcher in sketchpadService.mjs.
   =========================================================== */

import fs from "fs";
import path from "path";
import { RequestError, assertSimpleName, isInside } from "./safePaths.mjs";
import { readJsonFileSync, writeJsonFileSync, assertDirectoryExists, assertFileExists, makeTimestampForFilename } from "./serviceFileHelpers.mjs";


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
export async function writeHelpFile(payload = {}) {

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
