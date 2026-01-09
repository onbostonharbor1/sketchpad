/*
  update_gallery_manifests.js
  --------------------------------------------------------------
  Correct version — manifest paths are ALWAYS relative to domain.
  Examples:
      gallery/Ideabook/ (domain root)
          path: "3D/400.jpg"  -> full path = domainPath + "3D/400.jpg"
          path: "ok/001.jpg"  -> full path = domainPath + "ok/001.jpg"

  Features:
    • DRY-RUN mode (--dry-run)
    • Add new images to manifest
    • Thumbnail writing (or dry-run simulation)
    • Log malformed images
    • Log missing-manifest entries (no deletion)
    • Alphabetize manifest before write
    • Log stored in utilities/logfiles/
--------------------------------------------------------------
*/

import fs from "fs";
import path from "path";
import sharp from "sharp";

const GALLERY_ROOT = path.resolve("gallery");
const DOMAINS = ["Ideabook", "Patterns"];
const LOG_DIR = path.resolve("utilities/logfiles");
const THUMB_SIZE = 36;

// DRY-RUN MODE
let DRY_RUN = false;
if (process.argv.includes("--dry-run")) DRY_RUN = true;

function ensureDir(p) {
  if (!fs.existsSync(p)) throw new Error("Missing directory: " + p);
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function listImageFiles(dir) {
  const allowed = /\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i;
  return fs
    .readdirSync(dir)
    .filter((f) => allowed.test(f) && fs.statSync(path.join(dir, f)).isFile());
}

function logHeader(log, domain, subdir) {
  log.push(`\n=== ${domain}/${subdir} ===`);
}

function logAdd(log, msg) {
  log.push(msg);
}

async function tryMakeThumbnail(src, dst, log) {
  if (DRY_RUN) {
    logAdd(log, `[DRY-RUN] Would create thumbnail: ${dst}`);
    return true;
  }
  try {
    await sharp(src)
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover" })
      .png()
      .toFile(dst);
    return true;
  } catch (err) {
    logAdd(log, `[MALFORMED] ${src}`);
    return false;
  }
}

async function processSubdir(domainPath, domain, subdir, log) {
  const subdirPath = path.join(domainPath, subdir);
  ensureDir(subdirPath);

  const manifestPath = path.join(subdirPath, "manifest.json");
  const imagesDir = path.join(subdirPath, "images");

  ensureDir(imagesDir);

  const manifest = readJSON(manifestPath);
  if (!Array.isArray(manifest))
    throw new Error("Invalid manifest structure in " + manifestPath);

  logHeader(log, domain, subdir);

  // Map of manifest paths for lookup
  const manifestMap = new Map();
  for (const e of manifest) {
    if (!e.filename || !e.path)
      throw new Error("Malformed manifest entry: " + manifestPath);
    manifestMap.set(e.path.replace(/\\/g, "/"), true);
  }

  // Existing images in *this subdir*
  const diskLocalImages = listImageFiles(subdirPath);

  let updated = false;

  // ------------------------------------------------------------
  // 1. NEW IMAGES ON DISK (not in manifest)
  // ------------------------------------------------------------
  for (const file of diskLocalImages) {
    const rel = file;               // "400.jpg"
    const key = rel.replace(/\\/g, "/");

    // Manifest paths ALWAYS start with the subdir name: "3D/400.jpg"
    const manifestPathKey = `${subdir}/${key}`;

    if (!manifestMap.has(manifestPathKey)) {
      const base = path.parse(file).name;

      const src = path.join(subdirPath, file);
      const dst = path.join(imagesDir, `thumb_${base}.png`);

      const ok = await tryMakeThumbnail(src, dst, log);
      if (ok) {
        manifest.push({ filename: base, path: manifestPathKey });
        logAdd(log, `[ADDED] ${manifestPathKey}`);
        updated = true;
      }
    }
  }

  // ------------------------------------------------------------
  // 2. MANIFEST ENTRIES THAT DO NOT EXIST ON DISK (log only)
  // ------------------------------------------------------------
  for (const entry of manifest) {
    const src = path.join(domainPath, entry.path);
    if (!fs.existsSync(src)) {
      logAdd(log, `[MISSING] ${entry.path}`);
    }
  }

  // ------------------------------------------------------------
  // 3. WRITE UPDATED MANIFEST (or simulate in dry run)
  // ------------------------------------------------------------
  if (updated) {
    manifest.sort((a, b) => a.filename.localeCompare(b.filename));

    if (DRY_RUN) {
      logAdd(log, `[DRY-RUN] Would update manifest: ${manifestPath}`);
    } else {
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    }
  } else {
    logAdd(log, "No new images.");
  }
}

async function processDomain(domain, log) {
  const domainPath = path.join(GALLERY_ROOT, domain);
  ensureDir(domainPath);

  const registry = readJSON(path.join(domainPath, "directoryRegistry.json"));
  if (!Array.isArray(registry))
    throw new Error("Invalid directoryRegistry.json in " + domain);

  for (const subdir of registry) {
    await processSubdir(domainPath, domain, subdir, log);
  }
}

/* ============================================================
   NEW: prune logfiles (keep only most recent N)
=========================================================== */
function pruneLogFiles(dir, keepCount) {
  if (typeof dir !== "string" || dir.trim() === "") {
    throw new Error("pruneLogFiles: dir missing/invalid");
  }
  if (typeof keepCount !== "number" || keepCount < 1) {
    throw new Error("pruneLogFiles: keepCount missing/invalid");
  }

  // Only prune the logs created by THIS script.
  const re = /^newGalleryImages_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.txt$/;

  const files = fs
    .readdirSync(dir)
    .filter((name) => re.test(name))
    .sort((a, b) => a.localeCompare(b)); // timestamp is in filename → lexical sort works

  // Keep newest keepCount; delete the rest (oldest first).
  const toDelete = files.slice(0, Math.max(0, files.length - keepCount));

  for (const name of toDelete) {
    const full = path.join(dir, name);

    // fail-fast: must be a file we can delete
    if (!fs.statSync(full).isFile()) {
      throw new Error("pruneLogFiles: not a file: " + full);
    }

    fs.unlinkSync(full);
  }
} // end pruneLogFiles



async function main() {
  ensureDir(LOG_DIR);

  const timestamp = new Date()
    .toISOString()
    .replace(/[:]/g, "-")
    .replace(/\..+/, "");

  const logPath = path.join(LOG_DIR, `newGalleryImages_${timestamp}.txt`);
  const log = [];

  log.push(`Gallery Update Log - ${new Date().toString()}`);
  if (DRY_RUN) log.push("\n*** DRY-RUN MODE (no files written) ***");

  try {
    for (const domain of DOMAINS) {
      await processDomain(domain, log);
    }
  } catch (err) {
    log.push("\nFATAL ERROR:\n" + err.toString());
    fs.writeFileSync(logPath, log.join("\n"), "utf8");

    // NEW: keep only the most recent 10 log files
    pruneLogFiles(LOG_DIR, 10);

    throw err;
  }

  fs.writeFileSync(logPath, log.join("\n"), "utf8");

  // NEW: keep only the most recent 10 log files
  pruneLogFiles(LOG_DIR, 10);
}

main();
