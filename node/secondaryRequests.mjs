/* ===========================================================
   secondaryRequests.mjs  (Node.js)
   -----------------------------------------------------------
   Requests for secondary objects (saved Draw settings): save, read, archive, and the
   two manifest listings.
   Called by the dispatcher in sketchpadService.mjs.
   =========================================================== */

import fs from "fs";
import path from "path";
import { assertSimpleName } from "./safePaths.mjs";
import { readJsonFileSync, writeJsonFileSync } from "./serviceFileHelpers.mjs";


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
