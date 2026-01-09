/* node/maintain_manifests.mjs
   ============================================================
   SINGLE PASS Maintenance:
     1) Discover new files and append to manifests with:
          status: "new"
          title:  "<filename.ext>"   (exact filename)
     2) Validate manifest entries against disk:
          missing or invalid paths -> "broken" virtual items (Home only)
          no fix-mode; no manifest rewrite for broken
     3) Rebuild /home/manifest.json from ALL status-bearing entries
        plus "broken" virtual items.

   DrawRegistry (Home integration):
     4) Do NOT import drawRegistry.js in Node (browser-only imports).
        Instead scan ./drawRegistry/*.js as TEXT and extract:
          id, name, category, status
        Include ONLY status-bearing registry entries in Home as launchers:
          sourceType: "drawRegistry"
          registryKey: <id>
          path: "/drawRegistry/<fileName>"

   ALSO:
     - Patterns: when a new .js is added, write a DUMMY thumb:
         /patterns/thumb.png  -> /patterns/<cat>/images/thumb_<base>.png
     - Gallery Images: thumbnails written via sharp (36x36) only for NEW items
     - Write manifest.json ONLY if changed
     - Always write a logfile; return a structured report
   ============================================================
*/

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const PROJECT_ROOT = path.dirname(new URL(import.meta.url).pathname);
const LOG_DIR      = path.resolve("./utilities/logfiles");
const HOME_DIR     = path.resolve("./home");
const HOME_FILE    = path.join(HOME_DIR, "manifest.json");

const THUMB_SIZE = 36;

/* ============================================================
   Public entry point
============================================================ */
export async function runManifestMaintenance() {

  ensureDir(LOG_DIR, "log dir missing: " + LOG_DIR);

  const timestamp = new Date().toISOString().replace(/[:]/g, "-").replace(/\..+/, "");
  const logName   = "manifestMaintenance_" + timestamp + ".txt";
  const logPath   = path.join(LOG_DIR, logName);

  const log = [];
  log.push("Manifest Maintenance Log - " + new Date().toString());
  log.push("");

  const report = {
    request: "manifestMaintenance",
    status: "ok",
    logName,
    logPath,
    manifestsWritten: [],
    homeWritten: false,

    added: {},           // grouped by "domain/subdir"
    broken: {},          // grouped by "domain/subdir"

    drawRegistry: {
      scanned: 0,
      statusItems: 0
    },

    homeCounts: {
      statusItems: 0,
      brokenItems: 0,
      drawRegistryItems: 0,
      total: 0
    }
  };

  try {

    await processPatterns(report, log);
    await processGalleryScripts(report, log);
    await processGalleryImages(report, log);
    await processUtilities(report, log);

    // DrawRegistry scan as TEXT (no Node import)
    await processDrawRegistry(report, log);

    // Build Home from:
    //   - all status entries in manifest.json files
    //   - all drawRegistry status entries (from report.drawRegistryStatus)
    //   - plus broken virtual items collected during validation
    const homeList = buildHomeListFromReport(report);

    report.homeCounts.statusItems       = countStatusItems(homeList);
    report.homeCounts.brokenItems       = countBrokenItems(homeList);
    report.homeCounts.drawRegistryItems = countDrawRegistryItems(homeList);
    report.homeCounts.total             = homeList.length;

    ensureDir(HOME_DIR, "home dir missing: " + HOME_DIR);

    const wroteHome = writeJsonIfChanged(HOME_FILE, homeList);
    report.homeWritten = wroteHome;

    log.push("");
    log.push("HOME MANIFEST:");
    log.push("  items: " + homeList.length);
    log.push("  wrote: " + (wroteHome ? "YES" : "NO (no diff)"));
    log.push("");

    fs.writeFileSync(logPath, log.join("\n"), "utf8");

    return report;

  } catch (err) {

    report.status = "error";
    report.error  = String(err && err.stack ? err.stack : err);

    log.push("");
    log.push("FATAL ERROR:");
    log.push(String(err && err.stack ? err.stack : err));
    fs.writeFileSync(logPath, log.join("\n"), "utf8");

    throw err;
  }

} // end runManifestMaintenance


/* ============================================================
   Patterns
============================================================ */
async function processPatterns(report, log) {

  const patternsRoot = path.resolve("./patterns");
  ensureDir(patternsRoot, "patterns root missing: " + patternsRoot);

  const registryPath = path.join(patternsRoot, "directoryRegistry.json");
  ensureFile(registryPath, "patterns directoryRegistry.json missing: " + registryPath);

  const categories = readJson(registryPath);
  if (!Array.isArray(categories)) throw new Error("patterns directoryRegistry.json must be array");

  log.push("=== PATTERNS ===");

  const dummyThumb = path.join(patternsRoot, "thumb.png");
  ensureFile(dummyThumb, "patterns dummy thumb missing: " + dummyThumb);

  for (const category of categories) {

    const catDir = path.join(patternsRoot, category);
    ensureDir(catDir, "patterns category dir missing: " + catDir);

    const manifestPath = path.join(catDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      log.push("  [SKIP] no manifest: " + category);
      continue;
    }

    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest)) throw new Error("patterns manifest must be array: " + manifestPath);

    const byPath     = indexByPath(manifest);
    const byFilename = indexByFilename(manifest);

    const jsFiles = listFilesByExt(catDir, ".js", { exclude: ["manifest.json", "directoryRegistry.json"] });

    let changed = false;

    // DISCOVERY
    for (const fileName of jsFiles) {

      const baseName = stripExt(fileName, ".js");
      const relPath  = normalizePath(fileName);

      if (byPath.has(relPath) || byFilename.has(baseName)) continue;

      const entry = {
        filename: baseName,
        path: relPath,
        title: fileName,
        status: "new"
      };

      manifest.push(entry);
      byPath.add(relPath);
      byFilename.add(baseName);

      addGrouped(report.added, "patterns/" + category, fileName);
      log.push("  [ADDED] " + category + "/" + fileName);

      ensurePatternDummyThumb(catDir, baseName, dummyThumb);

      changed = true;
    }

    // VALIDATION
    for (const entry of manifest) {

      const rel = inferEntryRelPath(entry, ".js");
      const abs = path.join(catDir, rel);

      if (!fs.existsSync(abs)) {
        const rooted = "/patterns/" + category + "/" + normalizePath(rel);

        addBrokenVirtual(report, "patterns/" + category, {
          file: path.posix.basename(rooted),
          path: rooted,
          title: String(entry.title || rel),
          status: "broken"
        });

        log.push("  [BROKEN] " + category + "/" + rel);
      }
    }

    if (changed) {
      const wrote = writeJsonIfChanged(manifestPath, manifest);
      if (wrote) report.manifestsWritten.push(manifestPath);
      else log.push("  [NOTE] no-op write avoided: " + manifestPath);
    }

  } // end categories loop

  log.push("");

} // end processPatterns


function ensurePatternDummyThumb(catDir, baseName, dummyThumbAbs) {

  const imagesDir = path.join(catDir, "images");
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
  ensureDir(imagesDir, "patterns images dir invalid: " + imagesDir);

  const out = path.join(imagesDir, "thumb_" + baseName + ".png");

  if (fs.existsSync(out)) return;

  fs.copyFileSync(dummyThumbAbs, out);
  ensureFile(out, "dummy thumb copy failed: " + out);

} // end ensurePatternDummyThumb


/* ============================================================
   Gallery Scripts
============================================================ */
async function processGalleryScripts(report, log) {

  const scriptsRoot = path.resolve("./gallery/Scripts");
  if (!fs.existsSync(scriptsRoot)) return;

  ensureDir(scriptsRoot, "gallery scripts root invalid: " + scriptsRoot);

  const registryPath = path.join(scriptsRoot, "directoryRegistry.json");
  ensureFile(registryPath, "gallery Scripts directoryRegistry.json missing: " + registryPath);

  const categories = readJson(registryPath);
  if (!Array.isArray(categories)) throw new Error("gallery Scripts directoryRegistry.json must be array");

  log.push("=== GALLERY / SCRIPTS ===");

  for (const category of categories) {

    const catDir = path.join(scriptsRoot, category);
    ensureDir(catDir, "gallery Scripts category dir missing: " + catDir);

    const manifestPath = path.join(catDir, "manifest.json");
    ensureFile(manifestPath, "gallery Scripts category manifest missing: " + manifestPath);

    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest)) throw new Error("gallery Scripts manifest must be array: " + manifestPath);

    const byPath     = indexByPath(manifest);
    const byFilename = indexByFilename(manifest);

    const jsFiles = listFilesByExt(catDir, ".js", { exclude: ["manifest.json", "directoryRegistry.json"] });

    let changed = false;

    // DISCOVERY
    for (const fileName of jsFiles) {

      const baseName = stripExt(fileName, ".js");
      const relPath  = normalizePath(fileName); // category-local

      if (byPath.has(relPath) || byFilename.has(baseName)) continue;

      const entry = {
        filename: baseName,
        path: relPath,
        title: fileName,
        status: "new"
      };

      manifest.push(entry);
      byPath.add(relPath);
      byFilename.add(baseName);

      addGrouped(report.added, "gallery/Scripts/" + category, fileName);
      log.push("  [ADDED] Scripts/" + category + "/" + fileName);

      changed = true;
    }

    // VALIDATION
    for (const entry of manifest) {

      const rel = inferEntryRelPath(entry, ".js");
      const abs = path.join(catDir, rel);

      if (!fs.existsSync(abs)) {

        const rooted = "/gallery/Scripts/" + category + "/" + normalizePath(rel);

        addBrokenVirtual(report, "gallery/Scripts/" + category, {
          file: path.posix.basename(rooted),
          path: rooted,
          title: String(entry.title || rel),
          status: "broken"
        });

        log.push("  [BROKEN] Scripts/" + category + "/" + rel);
      }
    }

    if (changed) {
      const wrote = writeJsonIfChanged(manifestPath, manifest);
      if (wrote) report.manifestsWritten.push(manifestPath);
      else log.push("  [NOTE] no-op write avoided: " + manifestPath);
    }

  } // end categories loop

  log.push("");

} // end processGalleryScripts


/* ============================================================
   Gallery Images
============================================================ */
async function processGalleryImages(report, log) {

  const galleryRoot = path.resolve("./gallery");
  if (!fs.existsSync(galleryRoot)) return;

  ensureDir(galleryRoot, "gallery root invalid: " + galleryRoot);

  const domains = ["Ideabook", "Patterns"];

  log.push("=== GALLERY / IMAGES ===");

  for (const domain of domains) {

    const domainDir = path.join(galleryRoot, domain);
    if (!fs.existsSync(domainDir)) continue;

    ensureDir(domainDir, "gallery domain dir invalid: " + domainDir);

    const registryPath = path.join(domainDir, "directoryRegistry.json");
    if (!fs.existsSync(registryPath)) throw new Error("gallery " + domain + " directoryRegistry.json missing: " + registryPath);

    const categories = readJson(registryPath);
    if (!Array.isArray(categories)) throw new Error("gallery " + domain + " directoryRegistry.json must be array");

    for (const category of categories) {

      const catDir = path.join(domainDir, category);
      ensureDir(catDir, "gallery category dir missing: " + catDir);

      const manifestPath = path.join(catDir, "manifest.json");
      if (!fs.existsSync(manifestPath)) continue;

      const manifest = readJson(manifestPath);
      if (!Array.isArray(manifest)) throw new Error("gallery manifest must be array: " + manifestPath);

      const byPath = indexByPath(manifest);

      const imagesDir = path.join(catDir, "images");
      if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
      ensureDir(imagesDir, "gallery images dir invalid: " + imagesDir);

      const diskImages = listImageFiles(catDir);

      let changed = false;

      for (const fileName of diskImages) {

        const relKey = normalizePath(fileName); // category-local only

        if (byPath.has(relKey)) continue;

        const base = path.parse(fileName).name;

        const entry = {
          filename: base,
          path: relKey,
          title: fileName,
          status: "new"
        };

        manifest.push(entry);
        byPath.add(relKey);

        const src = path.join(catDir, fileName);
        const dst = path.join(imagesDir, "thumb_" + base + ".png");

        await makeThumbOrFail(src, dst);

        addGrouped(report.added, "gallery/" + domain + "/" + category, fileName);
        log.push("  [ADDED] " + domain + "/" + category + "/" + fileName);

        changed = true;
      }

      // VALIDATION
      for (const entry of manifest) {

        if (!entry || typeof entry !== "object") continue;

        if (typeof entry.path !== "string" || entry.path.trim() === "") {
          const rootedBad = "/gallery/" + domain + "/" + category + "/(missing-path)";
          addBrokenVirtual(report, "gallery/" + domain + "/" + category, {
            file: "(missing)",
            path: rootedBad,
            title: "(missing path)",
            status: "broken"
          });
          log.push("  [BROKEN] " + domain + "/" + category + " (missing path)");
          continue;
        }

        const p = normalizePath(entry.path);

        if (p.indexOf("/") >= 0) {
          const rooted = "/gallery/" + domain + "/" + category + "/" + p;

          addBrokenVirtual(report, "gallery/" + domain + "/" + category, {
            file: path.posix.basename(rooted),
            path: rooted,
            title: String(entry.title || entry.path),
            status: "broken"
          });

          log.push("  [BROKEN] " + domain + "/" + category + " INVALID PATH: " + p);
          continue;
        }

        const abs = path.join(catDir, p);
        if (!fs.existsSync(abs)) {
          const rooted = "/gallery/" + domain + "/" + category + "/" + p;

          addBrokenVirtual(report, "gallery/" + domain + "/" + category, {
            file: path.posix.basename(rooted),
            path: rooted,
            title: String(entry.title || entry.path),
            status: "broken"
          });

          log.push("  [BROKEN] " + domain + "/" + category + "/" + p);
        }
      }

      if (changed) {
        const wrote = writeJsonIfChanged(manifestPath, manifest);
        if (wrote) report.manifestsWritten.push(manifestPath);
      }
    }
  }

  log.push("");

} // end processGalleryImages


async function makeThumbOrFail(srcAbs, dstAbs) {

  if (fs.existsSync(dstAbs)) return;

  try {
    await sharp(srcAbs)
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover" })
      .png()
      .toFile(dstAbs);
  } catch (err) {
    throw new Error("thumbnail failed: " + srcAbs + " => " + String(err && err.message ? err.message : err));
  }

  ensureFile(dstAbs, "thumb write failed: " + dstAbs);

} // end makeThumbOrFail


/* ============================================================
   Utilities (Tools + Lab)
============================================================ */
async function processUtilities(report, log) {

  const utilitiesRoot = path.resolve("./utilities");
  if (!fs.existsSync(utilitiesRoot)) return;

  ensureDir(utilitiesRoot, "utilities root invalid: " + utilitiesRoot);

  log.push("=== UTILITIES ===");

  await processUtilitiesDomain(report, log, "Tools");
  await processUtilitiesDomain(report, log, "Lab");

  log.push("");

} // end processUtilities


async function processUtilitiesDomain(report, log, domainName) {

  const root = path.resolve("./utilities/" + domainName);
  if (!fs.existsSync(root)) return;

  ensureDir(root, "utilities domain dir invalid: " + root);

  const registryPath = path.join(root, "directoryRegistry.json");
  ensureFile(registryPath, "utilities " + domainName + " directoryRegistry.json missing: " + registryPath);

  const categories = readJson(registryPath);
  if (!Array.isArray(categories)) throw new Error("utilities " + domainName + " directoryRegistry.json must be array");

  for (const category of categories) {

    const catDir = path.join(root, category);
    ensureDir(catDir, "utilities category dir missing: " + catDir);

    const manifestPath = path.join(catDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;

    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest)) throw new Error("utilities manifest must be array: " + manifestPath);

    const byPath     = indexByPath(manifest);
    const byFilename = indexByFilename(manifest);

    const jsFiles = listFilesByExt(catDir, ".js", { exclude: ["manifest.json", "directoryRegistry.json"] });

    let changed = false;

    // DISCOVERY
    for (const fileName of jsFiles) {

      const baseName = stripExt(fileName, ".js");
      const relPath  = normalizePath(fileName);

      if (byPath.has(relPath) || byFilename.has(baseName)) continue;

      const entry = {
        filename: baseName,
        path: relPath,
        title: fileName,
        status: "new"
      };

      manifest.push(entry);
      byPath.add(relPath);
      byFilename.add(baseName);

      addGrouped(report.added, "utilities/" + domainName + "/" + category, fileName);
      log.push("  [ADDED] " + domainName + "/" + category + "/" + fileName);

      changed = true;
    }

    // VALIDATION
    for (const entry of manifest) {

      const rel = inferEntryRelPath(entry, ".js");
      const abs = path.join(catDir, rel);

      if (!fs.existsSync(abs)) {
        const rooted = "/utilities/" + domainName + "/" + category + "/" + normalizePath(rel);

        addBrokenVirtual(report, "utilities/" + domainName + "/" + category, {
          file: path.posix.basename(rooted),
          path: rooted,
          title: String(entry.title || rel),
          status: "broken"
        });

        log.push("  [BROKEN] " + domainName + "/" + category + "/" + rel);
      }
    }

    if (changed) {
      const wrote = writeJsonIfChanged(manifestPath, manifest);
      if (wrote) report.manifestsWritten.push(manifestPath);
    }
  }

} // end processUtilitiesDomain


/* ============================================================
   Draw Registry (Home integration)
   - Scan ./drawRegistry/*.js as text.
============================================================ */
async function processDrawRegistry(report, log) {

  const drRoot = path.resolve("./drawRegistry");
  if (!fs.existsSync(drRoot)) return;

  ensureDir(drRoot, "drawRegistry root invalid: " + drRoot);

  log.push("=== DRAW REGISTRY ===");

  const files = listFilesByExt(drRoot, ".js", { exclude: ["drawRegistry.js"] });

  report.drawRegistry.scanned = files.length;

  for (const fileName of files) {

    const abs = path.join(drRoot, fileName);
    ensureFile(abs, "drawRegistry file missing: " + abs);

    const src = fs.readFileSync(abs, "utf8");

    const meta = extractDrawRegistryMetaOrNull(src, fileName);
    if (!meta) continue;

    if (!meta.status) continue; // only status-bearing entries for Home

    addDrawRegistryStatusItem(report, meta);
    report.drawRegistry.statusItems += 1;

    log.push("  [STATUS] " + fileName + "  status=" + meta.status);
  }

  log.push("");

} // end processDrawRegistry


function extractDrawRegistryMetaOrNull(srcText, fileName) {

  // Fail-soft inside this extractor ONLY:
  // If we cannot find an id, we return null and skip the file.

  const id = matchQuotedStringProp(srcText, "id");
  if (!id) return null;

  const name     = matchQuotedStringProp(srcText, "name") || fileName;
  const category = matchQuotedStringProp(srcText, "category") || "";
  const status   = matchQuotedStringProp(srcText, "status") || "";

  return {
    file: fileName,
    path: "/drawRegistry/" + fileName,
    title: name,
    status: status,
    category: category,
    sourceType: "drawRegistry",
    registryKey: id
  };

} // end extractDrawRegistryMetaOrNull


function matchQuotedStringProp(srcText, propName) {

  // Matches: propName: "value"  OR  propName: 'value'
  const re = new RegExp(propName + "\\s*:\\s*([\"'])([^\"']+)\\1");
  const m = srcText.match(re);
  if (!m) return null;

  const value = String(m[2]).trim();
  return value ? value : null;

} // end matchQuotedStringProp


function addDrawRegistryStatusItem(report, entry) {

  if (!report.drawRegistryStatus) report.drawRegistryStatus = [];
  report.drawRegistryStatus.push(entry);

} // end addDrawRegistryStatusItem


/* ============================================================
   Home list builder (derived)
============================================================ */
function buildHomeListFromReport(report) {

  const out = [];

  // 1) Status entries from manifest.json files (strict)
  const statusEntries = collectAllStatusEntriesStrict();
  for (const e of statusEntries) out.push(e);

  // 2) DrawRegistry status entries (from scan)
  const dr = report.drawRegistryStatus || [];
  for (const e of dr) out.push(e);

  // 3) broken virtual items
  const brokenGroups = report.broken || {};
  for (const k of Object.keys(brokenGroups)) {
    for (const e of brokenGroups[k]) out.push(e);
  }

  out.sort(compareHomeEntries);

  return out;

} // end buildHomeListFromReport


function collectAllStatusEntriesStrict() {

  const scanRoots = [
    path.resolve("./patterns"),
    path.resolve("./gallery"),
    path.resolve("./utilities")
  ];

  const manifestFiles = [];

  for (const root of scanRoots) {
    if (!fs.existsSync(root)) continue;
    walkFindManifestJson(root, manifestFiles);
  }

  const out = [];

  for (const mf of manifestFiles) {

    const list = readJson(mf);
    if (!Array.isArray(list)) throw new Error("manifest.json must contain array: " + mf);

    const mfPosix = mf.split(path.sep).join(path.posix.sep);

    for (const entry of list) {

      if (!entry || typeof entry !== "object") continue;
      if (!entry.status) continue;

      const status = String(entry.status).trim();
      if (!status) continue;

      const rooted = makeRootedPathFromManifest(mfPosix, entry);
      const file   = String(entry.file || entry.filename || path.posix.basename(rooted));
      const title  = String(entry.title || "");

      out.push({
        file,
        path: rooted,
        title,
        status
      });
    }
  }

  return out;

} // end collectAllStatusEntriesStrict


function walkFindManifestJson(absDir, out) {

  const entries = fs.readdirSync(absDir, { withFileTypes: true });

  for (const ent of entries) {

    const full = path.join(absDir, ent.name);

    if (ent.isDirectory()) {
      walkFindManifestJson(full, out);
      continue;
    }

    if (ent.isFile() && ent.name === "manifest.json") {
      out.push(full);
      continue;
    }
  }

} // end walkFindManifestJson


function makeRootedPathFromManifest(absManifestPosix, entry) {

  const rel = entry.path || entry.filename || entry.file;
  if (!rel || typeof rel !== "string") {
    throw new Error("Home builder: entry missing path/filename/file for manifest: " + absManifestPosix);
  }

  if (rel.startsWith("/")) return rel;

  // Patterns category manifest: /patterns/<cat>/manifest.json
  if (absManifestPosix.indexOf("/patterns/") >= 0) {
    const cat = path.posix.basename(path.posix.dirname(absManifestPosix));
    return "/patterns/" + cat + "/" + normalizePath(rel);
  }

  // Gallery Scripts category manifest: /gallery/Scripts/<cat>/manifest.json
  if (absManifestPosix.indexOf("/gallery/Scripts/") >= 0) {
    const cat = path.posix.basename(path.posix.dirname(absManifestPosix));
    return "/gallery/Scripts/" + cat + "/" + normalizePath(rel);
  }

  // Gallery Images: /gallery/<Domain>/<Category>/manifest.json
  if (absManifestPosix.indexOf("/gallery/Ideabook/") >= 0 || absManifestPosix.indexOf("/gallery/Patterns/") >= 0) {

    const category = path.posix.basename(path.posix.dirname(absManifestPosix));
    const domain   = path.posix.basename(path.posix.dirname(path.posix.dirname(absManifestPosix)));

    return "/gallery/" + domain + "/" + category + "/" + normalizePath(rel);
  }

  // Utilities: /utilities/<Tools|Lab>/<cat>/manifest.json
  if (absManifestPosix.indexOf("/utilities/") >= 0) {
    const cat    = path.posix.basename(path.posix.dirname(absManifestPosix));
    const domain = path.posix.basename(path.posix.dirname(path.posix.dirname(absManifestPosix)));
    return "/utilities/" + domain + "/" + cat + "/" + normalizePath(rel);
  }

  // fallback: manifest-dir-relative to project root
  const absManifestFs = absManifestPosix.split(path.posix.sep).join(path.sep);
  const manifestDir   = path.dirname(absManifestFs);
  const absItem       = path.resolve(manifestDir, rel);
  const relToRoot     = path.relative(PROJECT_ROOT, absItem).split(path.sep).join(path.posix.sep);

  return "/" + relToRoot;

} // end makeRootedPathFromManifest


function compareHomeEntries(a, b) {

  const as = String(a.status || "").toLowerCase();
  const bs = String(b.status || "").toLowerCase();

  if (as < bs) return -1;
  if (as > bs) return 1;

  const ak = String(a.title || a.file || a.path || "").toLowerCase();
  const bk = String(b.title || b.file || b.path || "").toLowerCase();

  if (ak < bk) return -1;
  if (ak > bk) return 1;
  return 0;

} // end compareHomeEntries


function countStatusItems(list) {
  let n = 0;
  for (const e of list) {
    if (e && e.status && String(e.status).trim() !== "") n++;
  }
  return n;
} // end countStatusItems


function countBrokenItems(list) {
  let n = 0;
  for (const e of list) {
    if (!e) continue;
    if (String(e.status || "").toLowerCase() === "broken") n++;
  }
  return n;
} // end countBrokenItems


function countDrawRegistryItems(list) {
  let n = 0;
  for (const e of list) {
    if (!e) continue;
    if (String(e.sourceType || "") === "drawRegistry") n++;
  }
  return n;
} // end countDrawRegistryItems


/* ============================================================
   Broken virtual helper
============================================================ */
function addBrokenVirtual(report, groupKey, entry) {

  if (!report.broken) report.broken = {};
  if (!report.broken[groupKey]) report.broken[groupKey] = [];

  entry.status = "broken";

  report.broken[groupKey].push(entry);

} // end addBrokenVirtual


/* ============================================================
   Grouped add helper
============================================================ */
function addGrouped(map, groupKey, itemName) {

  if (!map[groupKey]) map[groupKey] = [];
  map[groupKey].push(itemName);

} // end addGrouped


/* ============================================================
   Filesystem helpers (fail-fast)
============================================================ */
function ensureDir(p, msg) {
  if (!fs.existsSync(p)) throw new Error(msg);
  if (!fs.statSync(p).isDirectory()) throw new Error(msg);
} // end ensureDir


function ensureFile(p, msg) {
  if (!fs.existsSync(p)) throw new Error(msg);
  if (!fs.statSync(p).isFile()) throw new Error(msg);
} // end ensureFile


function readJson(p) {
  const txt = fs.readFileSync(p, "utf8");
  return JSON.parse(txt);
} // end readJson


function writeJsonIfChanged(filePath, data) {

  const next = JSON.stringify(data, null, 2) + "\n";

  if (fs.existsSync(filePath)) {
    const prev = fs.readFileSync(filePath, "utf8");
    if (prev === next) return false;
  }

  fs.writeFileSync(filePath, next, "utf8");
  return true;

} // end writeJsonIfChanged


function normalizePath(p) {
  return String(p).replace(/\\/g, "/");
} // end normalizePath


function stripExt(name, ext) {
  if (!name.toLowerCase().endsWith(ext.toLowerCase())) return name;
  return name.slice(0, name.length - ext.length);
} // end stripExt


function inferEntryRelPath(entry, ext) {

  if (!entry || typeof entry !== "object") throw new Error("inferEntryRelPath: entry missing/invalid");

  if (typeof entry.path === "string" && entry.path.trim() !== "") return entry.path;

  if (typeof entry.filename === "string" && entry.filename.trim() !== "") {
    return entry.filename + ext;
  }

  if (typeof entry.file === "string" && entry.file.trim() !== "") return entry.file;

  throw new Error("inferEntryRelPath: entry missing path/filename/file");

} // end inferEntryRelPath


function indexByPath(manifest) {

  const set = new Set();

  for (const e of manifest) {
    if (!e || typeof e !== "object") continue;
    if (typeof e.path !== "string") continue;
    set.add(normalizePath(e.path));
  }

  return {
    has(p) { return set.has(normalizePath(p)); }, // end has
    add(p) { set.add(normalizePath(p)); }         // end add
  };

} // end indexByPath


function indexByFilename(manifest) {

  const set = new Set();

  for (const e of manifest) {
    if (!e || typeof e !== "object") continue;
    if (typeof e.filename !== "string") continue;
    set.add(e.filename);
  }

  return {
    has(f) { return set.has(f); }, // end has
    add(f) { set.add(f); }         // end add
  };

} // end indexByFilename


function listFilesByExt(dir, ext, opts) {

  if (!opts) opts = {};
  const exclude = opts.exclude || [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];

  for (const ent of entries) {
    if (!ent.isFile()) continue;

    const name = ent.name;

    if (exclude.indexOf(name) >= 0) continue;
    if (name.startsWith(".")) continue;

    if (name.toLowerCase().endsWith(ext.toLowerCase())) out.push(name);
  }

  out.sort((a, b) => a.localeCompare(b));
  return out;

} // end listFilesByExt


function listImageFiles(dir) {

  const allowed = /\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];

  for (const ent of entries) {

    if (!ent.isFile()) continue;

    const name = ent.name;

    if (name.startsWith(".")) continue;
    if (!allowed.test(name)) continue;

    out.push(name);
  }

  out.sort((a, b) => a.localeCompare(b));
  return out;

} // end listImageFiles


/* ============================================================
   CLI runner
============================================================ */
async function main() {

  const rep = await runManifestMaintenance();

  console.log("OK: log =", rep.logName);
  console.log("manifestsWritten =", rep.manifestsWritten.length);
  console.log("homeWritten =", rep.homeWritten ? "YES" : "NO");
  console.log("brokenGroups =", Object.keys(rep.broken || {}).length);
  console.log("drawRegistryItems =", rep.homeCounts.drawRegistryItems);

} // end main


if (import.meta.url === "file://" + process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} // end cli gate
