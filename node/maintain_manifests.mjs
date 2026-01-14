console.log(">>> Script Loaded");

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// --- PATH SETUP ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const LOG_DIR   = path.join(PROJECT_ROOT, "utilities", "logfiles");
const HOME_DIR  = path.join(PROJECT_ROOT, "home");
const HOME_FILE = path.join(HOME_DIR, "manifest.json");

const GALLERY_DIR   = path.join(PROJECT_ROOT, "gallery");
const UTILITIES_DIR = path.join(PROJECT_ROOT, "utilities");
const PATTERNS_DIR  = path.join(PROJECT_ROOT, "patterns");
const DRAW_REGISTRY = path.join(PROJECT_ROOT, "drawRegistry");

/**
 * Main entry point for the maintenance script.
 * Coordinates scanning of all project domains, builds reports, and writes logs.
 */
export async function runManifestMaintenance() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:]/g, "-").replace(/\..+/, "");
  const logName   = "manifestMaintenance_" + timestamp + ".txt";
  const logPath   = path.join(LOG_DIR, logName);

  const log = ["Manifest Maintenance Log - " + new Date().toString(), ""];
  const report = {
    request: "manifestMaintenance", status: "ok", logName, logPath,
    manifestsWritten: [], homeWritten: false,
    added: {}, broken: {},
    drawRegistry: { scanned: 0, statusItems: 0 },
    drawRegistryStatus: [],
    homeCounts: { statusItems: 0, total: 0 }
  };

  try {
    await processPatterns(report, log);
    await processGalleryScripts(report, log);
    await processGalleryImages(report, log);
    await processUtilities(report, log);
    await processDrawRegistry(report, log);

    const homeList = buildHomeListFromReport(report);

    report.homeCounts.statusItems = countStatusItems(homeList);
    report.homeCounts.total = homeList.length;

    if (!fs.existsSync(HOME_DIR)) fs.mkdirSync(HOME_DIR, { recursive: true });
    report.homeWritten = writeJsonIfChanged(HOME_FILE, homeList);

    fs.writeFileSync(logPath, log.join("\n"), "utf8");
    return report;
  } catch (err) {
    report.status = "error";
    log.push("\nFATAL ERROR:\n" + String(err.stack || err));
    fs.writeFileSync(logPath, log.join("\n"), "utf8");
    throw err;
  }
} // end runManifestMaintenance

/**
 * Scans the patterns directory and updates local manifest.json files.
 * Generates dummy thumbnails for new patterns if a master thumb exists.
 */
async function processPatterns(report, log) {
  if (!fs.existsSync(PATTERNS_DIR)) return;
  const categories = readJson(path.join(PATTERNS_DIR, "directoryRegistry.json"));
  const dummyThumb = path.join(PATTERNS_DIR, "thumb.png");

  for (const category of categories) {
    const catDir = path.join(PATTERNS_DIR, category);
    const manifestPath = path.join(catDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;

    const manifest = readJson(manifestPath);
    const byPath = new Set(manifest.map(e => e.path));
    const jsFiles = listFilesByExt(catDir, ".js", { exclude: ["manifest.json"] });

    for (const fileName of jsFiles) {
      if (byPath.has(fileName)) continue;
      const baseName = stripExt(fileName, ".js");
      manifest.push({ filename: baseName, path: fileName, title: fileName, status: "new" });
      if (fs.existsSync(dummyThumb)) ensurePatternDummyThumb(catDir, baseName, dummyThumb);
    }
    if (writeJsonIfChanged(manifestPath, manifest)) report.manifestsWritten.push(manifestPath);
  }
} // end processPatterns

/**
 * Scans the gallery/Scripts directory and updates local manifests.
 */
async function processGalleryScripts(report, log) {
  const scriptsRoot = path.join(GALLERY_DIR, "Scripts");
  if (!fs.existsSync(scriptsRoot)) return;
  const categories = readJson(path.join(scriptsRoot, "directoryRegistry.json"));

  for (const category of categories) {
    const catDir = path.join(scriptsRoot, category);
    const manifestPath = path.join(catDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;

    const manifest = readJson(manifestPath);
    const byPath = new Set(manifest.map(e => e.path));
    const jsFiles = listFilesByExt(catDir, ".js");

    for (const fileName of jsFiles) {
      if (byPath.has(fileName)) continue;
      manifest.push({ filename: stripExt(fileName, ".js"), path: fileName, title: fileName, status: "new" });
    }
    if (writeJsonIfChanged(manifestPath, manifest)) report.manifestsWritten.push(manifestPath);
  }
} // end processGalleryScripts

/**
 * Scans Ideabook and Patterns domains in the gallery for image files.
 */
async function processGalleryImages(report, log) {
  if (!fs.existsSync(GALLERY_DIR)) return;
  for (const domain of ["Ideabook", "Patterns"]) {
    const domainDir = path.join(GALLERY_DIR, domain);
    if (!fs.existsSync(domainDir)) continue;
    const categories = readJson(path.join(domainDir, "directoryRegistry.json"));

    for (const category of categories) {
      const catDir = path.join(domainDir, category);
      const manifestPath = path.join(catDir, "manifest.json");
      if (!fs.existsSync(manifestPath)) continue;

      const manifest = readJson(manifestPath);
      const byPath = new Set(manifest.map(e => e.path));
      const diskImages = listImageFiles(catDir);

      for (const fileName of diskImages) {
        if (byPath.has(fileName)) continue;
        manifest.push({ filename: path.parse(fileName).name, path: fileName, title: fileName, status: "new" });
      }
      if (writeJsonIfChanged(manifestPath, manifest)) report.manifestsWritten.push(manifestPath);
    }
  }
} // end processGalleryImages

/**
 * Scans Utilities/Tools and Utilities/Lab directories for script files.
 */
async function processUtilities(report, log) {
  for (const domain of ["Tools", "Lab"]) {
    const domainDir = path.join(UTILITIES_DIR, domain);
    if (!fs.existsSync(domainDir)) continue;
    const categories = readJson(path.join(domainDir, "directoryRegistry.json"));

    for (const category of categories) {
      const catDir = path.join(domainDir, category);
      const manifestPath = path.join(catDir, "manifest.json");
      if (!fs.existsSync(manifestPath)) continue;

      const manifest = readJson(manifestPath);
      const byPath = new Set(manifest.map(e => e.path));
      const jsFiles = listFilesByExt(catDir, ".js");

      for (const fileName of jsFiles) {
        if (byPath.has(fileName)) continue;
        manifest.push({ filename: stripExt(fileName, ".js"), path: fileName, title: fileName, status: "new" });
      }
      if (writeJsonIfChanged(manifestPath, manifest)) report.manifestsWritten.push(manifestPath);
    }
  }
} // end processUtilities

/**
 * Performs text analysis on DrawRegistry files to extract metadata (id, status, name).
 */
async function processDrawRegistry(report, log) {
  if (!fs.existsSync(DRAW_REGISTRY)) return;
  const files = listFilesByExt(DRAW_REGISTRY, ".js", { exclude: ["drawRegistry.js"] });
  report.drawRegistry.scanned = files.length;

  for (const file of files) {
    const src = fs.readFileSync(path.join(DRAW_REGISTRY, file), "utf8");
    const idM = src.match(/id\s*:\s*["']([^"']+)["']/);
    const stM = src.match(/status\s*:\s*["']([^"']+)["']/);
    const nmM = src.match(/name\s*:\s*["']([^"']+)["']/);

    if (idM && stM) {
      report.drawRegistryStatus.push({
        file, path: `/drawRegistry/${file}`,
        title: nmM ? nmM[1] : file, status: stM[1],
        sourceType: "drawRegistry", registryKey: idM[1]
      });
      report.drawRegistry.statusItems++;
    }
  }
} // end processDrawRegistry

/**
 * Aggregates all entries with a 'status' from local manifests into a single Home list.
 */
function buildHomeListFromReport(report) {
  const out = [];
  const manifestFiles = [];
  [PATTERNS_DIR, GALLERY_DIR, UTILITIES_DIR].forEach(r => {
    if (fs.existsSync(r)) walkFindManifestJson(r, manifestFiles);
  });

  for (const mf of manifestFiles) {
    const list = readJson(mf);
    if (!Array.isArray(list)) continue;
    list.filter(e => e.status).forEach(entry => {
      out.push({
        file: entry.filename || entry.file || "unknown",
        path: makeRootedPathFromManifest(mf.split(path.sep).join("/"), entry),
        title: entry.title || entry.filename || "Untitled",
        status: entry.status
      });
    });
  }
  report.drawRegistryStatus.forEach(e => out.push(e));

  out.sort((a, b) => String(a.title).toLowerCase().localeCompare(String(b.title).toLowerCase()));
  return out;
} // end buildHomeListFromReport

/**
 * Recursively searches a directory for manifest.json files.
 */
function walkFindManifestJson(absDir, out) {
  fs.readdirSync(absDir, { withFileTypes: true }).forEach(ent => {
    const full = path.join(absDir, ent.name);
    if (ent.isDirectory()) walkFindManifestJson(full, out);
    else if (ent.name === "manifest.json") out.push(full);
  });
} // end walkFindManifestJson

/**
 * Converts a filesystem path from a manifest entry into a browser-rooted web path.
 */
function makeRootedPathFromManifest(absManifestPosix, entry) {
  const rel = entry.path || entry.filename || entry.file;
  const projectRootPosix = PROJECT_ROOT.split(path.sep).join("/");
  return "/" + path.posix.relative(projectRootPosix, path.posix.join(path.posix.dirname(absManifestPosix), rel));
} // end makeRootedPathFromManifest

/**
 * Alphabetizes and stringifies JSON data. Writes to disk only if the content (or order) has changed.
 */
function writeJsonIfChanged(filePath, data) {
  if (Array.isArray(data)) {
    data.sort((a, b) => {
      const tA = String(a.title || a.filename || a.file || "").toLowerCase();
      const tB = String(b.title || b.filename || b.file || "").toLowerCase();
      return tA.localeCompare(tB);
    });
  }
  const next = JSON.stringify(data, null, 2) + "\n";
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === next) return false;
  fs.writeFileSync(filePath, next, "utf8");
  return true;
} // end writeJsonIfChanged

/**
 * Ensures a thumbnail image exists for a pattern by copying a dummy file.
 */
function ensurePatternDummyThumb(catDir, baseName, dummyThumbAbs) {
  const imgDir = path.join(catDir, "images");
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
  const out = path.join(imgDir, `thumb_${baseName}.png`);
  if (!fs.existsSync(out)) fs.copyFileSync(dummyThumbAbs, out);
} // end ensurePatternDummyThumb

/**
 * Synchronously reads and parses a JSON file.
 */
function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); } // end readJson

/**
 * Lists files in a directory that match a specific extension, with exclusion support.
 */
function listFilesByExt(dir, ext, opts = {}) {
  const exclude = opts.exclude || [];
  return fs.readdirSync(dir).filter(f => f.endsWith(ext) && !exclude.includes(f));
} // end listFilesByExt

/**
 * Lists image files in a directory based on standard web extensions.
 */
function listImageFiles(dir) {
  return fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
} // end listImageFiles

/**
 * Removes the specified extension from a string.
 */
function stripExt(name, ext) { return name.endsWith(ext) ? name.slice(0, -ext.length) : name; } // end stripExt

/**
 * Counts entries in an array that have a defined status property.
 */
function countStatusItems(l) { return l.filter(e => e.status).length; } // end countStatusItems

// --- EXECUTION ---
runManifestMaintenance()
  .then(report => console.log(`>>> SUCCESS: ${report.homeCounts.total} items sorted.`))
  .catch(err => { console.error("!!! FAILED", err); process.exit(1); });
