/**
 * generateHelpManifest.mjs
 * ------------------------------------------------------------
 * Node script that scans the /help/<helpDir>/ directories and
 * builds manifest.json listing which help files actually exist.
 *
 * This runs BEFORE dev server startup:
 *   "dev": "node help/generateHelpManifest.mjs && vite"
 *
 * The browser then imports manifest.json and enables/disables
 * the Help menu item based purely on manifest data.
 *
 * You do NOT run this manually unless you want to.
 * Node has full access to the filesystem; the browser does not.
 */

// Node built-ins (ESM)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const HELP_ROOT    = path.join(PROJECT_ROOT, "help");

const HELP_MANIFEST = "manifest.json";
const OUTPUT_FILE   = path.join(HELP_ROOT, HELP_MANIFEST);
console.log(`>>> HELP MANIFEST FILE: ${OUTPUT_FILE} `);

// Top-level help subdirectories you plan to support
const HELP_DIRS = ["Overview", "draw", "patterns", "gallery", "utilities", "figures" ];

// Output structure
const manifest = {};

// ------------------------------------------------------------
// For each helpDir:
//   1. Look for /help/<helpDir>/
//   2. If it exists, list *.html files
//   3. Store names WITHOUT extension in manifest
// ------------------------------------------------------------
HELP_DIRS.forEach((helpDir) => {
  const helpDirectory = path.join(HELP_ROOT, helpDir);

  if (!fs.existsSync(helpDirectory)) {
    // No such directory → leave empty list
    manifest[helpDir] = [];
    return;
  }

  const files = fs.readdirSync(helpDirectory);
  const htmlFiles = files.filter((f) => f.endsWith(".html"));

  // Strip .html to get itemName
  const itemNames = htmlFiles.map((file) =>
    path.basename(file, ".html")
  );

  manifest[helpDir] = itemNames;
});

// ------------------------------------------------------------
// Write manifest to disk
// ------------------------------------------------------------
fs.writeFileSync(
  OUTPUT_FILE,
  JSON.stringify(manifest, null, 2),
  "utf8"
);
