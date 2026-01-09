/* node/build_home_manifest.mjs
   ============================================================
   Build Home manifest from all manifest.json files under:
     /patterns, /gallery, /utilities

   Collects only entries that contain: status

   Output:
     /home/manifest.json

   Output format (COMPATIBLE WITH manifest.js flat loader):
     [
       { file, path, title, status },
       ...
     ]

   Notes:
   - Keeps title exactly as-is.
   - Rewrites path to a fully-rooted path from project root,
     e.g. "/patterns/circles/foo.js" or "/gallery/Ideabook/3D/401.jpg"
   - Sorts output by:
       status, then title || file || path
   ============================================================
*/

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Project root assumed to be parent of /node
const PROJECT_ROOT = path.resolve(__dirname, "..");

// Scan roots (relative to project root)
const SCAN_ROOTS = [
  "patterns",
  "gallery",
  "utilities"
];

const OUT_DIR  = path.join(PROJECT_ROOT, "home");
const OUT_FILE = path.join(OUT_DIR, "manifest.json");

async function main() {
  const manifestFiles = [];

  for (let i = 0; i < SCAN_ROOTS.length; i++) {
    const absRoot = path.join(PROJECT_ROOT, SCAN_ROOTS[i]);
    const found = await findManifestsUnder(absRoot);
    for (let j = 0; j < found.length; j++) {
      manifestFiles.push(found[j]);
    }
  }

  // Flat output list (manifest.js compatible)
  const outList = [];

  for (let i = 0; i < manifestFiles.length; i++) {
    const mf = manifestFiles[i];
    await collectStatusEntriesFromManifest(mf, outList);
  }

  // Sort by status, then title||file||path
  outList.sort(compareHomeEntries);

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(outList, null, 2) + "\n", "utf8");

  console.log("Home manifest written:", OUT_FILE);
  console.log("Manifest files scanned:", manifestFiles.length);

  const statuses = new Set();
  for (let i = 0; i < outList.length; i++) {
    statuses.add(outList[i].status);
  }

  console.log("Status groups:", statuses.size);
  console.log("Status items:", outList.length);
} // end main


async function findManifestsUnder(absRootDir) {
  const out = [];
  await walkDir(absRootDir, out);
  return out;
} // end findManifestsUnder


async function walkDir(absDir, out) {
  const entries = await fs.readdir(absDir, { withFileTypes: true });

  for (let i = 0; i < entries.length; i++) {
    const ent = entries[i];
    const full = path.join(absDir, ent.name);

    if (ent.isDirectory()) {
      await walkDir(full, out);
      continue;
    }

    if (ent.isFile() && ent.name === "manifest.json") {
      out.push(full);
      continue;
    }
  }
} // end walkDir


async function collectStatusEntriesFromManifest(absManifestPath, outList) {
  const list = await readJsonFile(absManifestPath);

  if (!Array.isArray(list)) {
    throw new Error("Home manifest builder: manifest.json must contain an array: " + absManifestPath);
  }

  const manifestDirAbs = path.dirname(absManifestPath);

  for (let i = 0; i < list.length; i++) {
    const entry = list[i];

    if (!entry || typeof entry !== "object") {
      throw new Error("Home manifest builder: invalid entry (not object) in " + absManifestPath);
    }

    if (!entry.status) {
      continue; // only collect status-marked items
    }

    const status = String(entry.status).trim();
    if (!status) {
      throw new Error("Home manifest builder: empty status in " + absManifestPath);
    }

    const title = entry.title || "";
    const rootedPath = makeRootedPath(manifestDirAbs, entry);

    const file = entry.file || entry.filename || path.posix.basename(rootedPath);

    const normalized = {
      file: String(file),
      path: rootedPath,
      title: String(title),
      status: status
    };

    outList.push(normalized);
  }
} // end collectStatusEntriesFromManifest


async function readJsonFile(absPath) {
  const txt = await fs.readFile(absPath, "utf8");
  const data = JSON.parse(txt);
  return data;
} // end readJsonFile


function makeRootedPath(manifestDirAbs, entry) {
  // entry.path is preferred if present; else use filename/file
  const rel = entry.path || entry.filename || entry.file;

  if (!rel || typeof rel !== "string") {
    throw new Error("Home manifest builder: entry missing path/filename/file in manifest at " + manifestDirAbs);
  }

  // If entry.path already begins with "/", we assume it is already rooted.
  if (rel.startsWith("/")) {
    return rel;
  }

  // Interpret rel as relative to the folder that contains manifest.json.
  // Then convert to a project-rooted POSIX path: "/patterns/..../x.js"
  const absItem = path.resolve(manifestDirAbs, rel);
  const relToRoot = path.relative(PROJECT_ROOT, absItem);

  // Convert to forward-slash and ensure leading "/"
  const posixRel = relToRoot.split(path.sep).join(path.posix.sep);

  return "/" + posixRel;
} // end makeRootedPath


function compareHomeEntries(a, b) {
  // 1) status
  const as = ((a.status || "") + "").toLowerCase();
  const bs = ((b.status || "") + "").toLowerCase();

  if (as < bs) return -1;
  if (as > bs) return 1;

  // 2) title || file || path
  const ak = ((a.title || a.file || a.path) + "").toLowerCase();
  const bk = ((b.title || b.file || b.path) + "").toLowerCase();

  if (ak < bk) return -1;
  if (ak > bk) return 1;
  return 0;
} // end compareHomeEntries


main().catch((err) => {
  console.error(err);
  process.exit(1);
});
