/**
 * generateHelpManifest.mjs
 * ------------------------------------------------------------
 * Recursively scans /help and writes /help/manifest.json.
 *
 * OUTPUT SHAPE (YOUR ORIGINAL SHAPE, BUT RECURSIVE)
 * -------------------------------------------------
 * - Every directory becomes an object key.
 * - Leaf directories produce an ARRAY of filenames (NO extension).
 * - NO ids.
 * - NO invented keys like "_files".
 * - Root-level index.html is stored as: manifest.root = ["index"]
 *
 * Example:
 * {
 *   "root": ["index"],
 *   "Overview": ["fileLayer", "manifest", ...],
 *   "draw": ["inEllipse", "inverseStar"],
 *   "gallery": {
 *     "Scripts": {
 *       "Elliptical": ["ellipseDemo.js"]
 *     }
 *   }
 * }
 *
 * Runs before Vite:
 *   "dev": "node help/generateHelpManifest.mjs && vite"
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "..");
const HELP_ROOT    = path.join(PROJECT_ROOT, "help");
const OUTPUT_FILE  = path.join(HELP_ROOT, "manifest.json");

console.log(">>> HELP ROOT:", HELP_ROOT);
console.log(">>> HELP MANIFEST FILE:", OUTPUT_FILE);

if (!fs.existsSync(HELP_ROOT)) {
  throw new Error("generateHelpManifest: HELP_ROOT not found: " + HELP_ROOT);
}
if (!fs.statSync(HELP_ROOT).isDirectory()) {
  throw new Error("generateHelpManifest: HELP_ROOT is not a directory: " + HELP_ROOT);
}

function isHtmlFile(name) {
  return name.toLowerCase().endsWith(".html");
} // end isHtmlFile

function isSkippableDir(name) {
  return name === "node_modules" || name === ".git";
} // end isSkippableDir

function sortCaseInsensitive(a, b) {
  return a.toLowerCase().localeCompare(b.toLowerCase());
} // end sortCaseInsensitive

function scanDir(absDir, relDir) {

  const entries = fs.readdirSync(absDir, { withFileTypes: true });

  const htmlFiles = [];
  const subdirs   = [];

  for (const ent of entries) {

    const name = ent.name;

    if (ent.isDirectory()) {
      if (isSkippableDir(name)) continue;
      subdirs.push(name);
      continue;
    }

    if (ent.isFile() && isHtmlFile(name)) {
      htmlFiles.push(name);
      continue;
    }
  }

  htmlFiles.sort(sortCaseInsensitive);
  subdirs.sort(sortCaseInsensitive);

  // If directory contains ONLY html files -> leaf array of BASENAMES (no extension)
  if (htmlFiles.length > 0 && subdirs.length === 0) {

    const out = [];

    for (const f of htmlFiles) {
      const base = path.basename(f, ".html");  // keep ".js" if present (ellipseDemo.js.html -> ellipseDemo.js)
      out.push(base);
    }

    return out;
  }

  // If directory contains ONLY subdirectories -> nested object
  if (subdirs.length > 0 && htmlFiles.length === 0) {

    const obj = {};

    for (const d of subdirs) {
      const absChild = path.join(absDir, d);
      const relChild = relDir ? (relDir + "/" + d) : d;

      obj[d] = scanDir(absChild, relChild);
    }

    return obj;
  }

  // Empty directory -> empty array
  if (subdirs.length === 0 && htmlFiles.length === 0) {
    return [];
  }

  // Mixed content (both html files and subdirs) is ambiguous without inventing a key.
  // Fail-fast so you see the directory that violates the layout.
  throw new Error(
    "generateHelpManifest: directory contains BOTH .html files and subdirectories (unsupported): " +
    (relDir || "(help root)")
  );

} // end scanDir


// ------------------------------------------------------------
// Build manifest
// ------------------------------------------------------------
const manifest = {};

// Root-level html files become manifest.root = ["index", ...]
const rootEntries = fs.readdirSync(HELP_ROOT, { withFileTypes: true });

const rootHtml = rootEntries
  .filter(e => e.isFile())
  .map(e => e.name)
  .filter(isHtmlFile)
  .sort(sortCaseInsensitive);

manifest.root = rootHtml.map(f => path.basename(f, ".html"));

// Top-level directories under /help become manifest keys
const topDirs = rootEntries
  .filter(e => e.isDirectory())
  .map(e => e.name)
  .filter(n => !isSkippableDir(n))
  .sort(sortCaseInsensitive);

for (const d of topDirs) {
  const absChild = path.join(HELP_ROOT, d);
  manifest[d] = scanDir(absChild, d);
}

// ------------------------------------------------------------
// Write manifest.json
// ------------------------------------------------------------
fs.writeFileSync(
  OUTPUT_FILE,
  JSON.stringify(manifest, null, 2) + "\n",
  "utf8"
);

console.log(">>> WROTE:", OUTPUT_FILE);
