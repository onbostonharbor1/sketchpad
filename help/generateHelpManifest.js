/**
 * generateHelpManifest.js
 * ------------------------------------------------------------
 * Node script that scans the /help/<TabName>/ directories and
 * builds helpManifest.json listing which help files actually exist.
 *
 * This runs BEFORE dev server startup:
 *   "dev": "node help/generateHelpManifest.js && vite"
 *
 * The browser then imports helpManifest.json and enables/disables
 * the Help menu item based purely on manifest data.
 *
 * You do NOT run this manually unless you want to.
 * Node has full access to the filesystem; the browser does not.
 */

// Node built-ins
const fs = require("fs");
const path = require("path");

// Location of the help directory (relative to project root)
const HELP_ROOT = path.join(__dirname);          // …/help/
const OUTPUT_FILE = path.join(HELP_ROOT, "helpManifest.json");

// Top-level help subdirectories you plan to support
const TAB_NAMES = ["Draw", "Patterns", "Gallery", "Utilities", "Figures"];

// Output structure
const manifest = {};

// ------------------------------------------------------------
// For each tab:
//   1. Look for /help/<TabName>/
//   2. If it exists, list *.html files
//   3. Store names WITHOUT extension in manifest
// ------------------------------------------------------------
TAB_NAMES.forEach((tab) => {
  const tabDir = path.join(HELP_ROOT, tab);

  if (!fs.existsSync(tabDir)) {
    // No such directory → leave empty list
    manifest[tab] = [];
    return;
  }

  const files = fs.readdirSync(tabDir);
  const htmlFiles = files.filter((f) => f.endsWith(".html"));

  // Strip .html to get itemName
  const itemNames = htmlFiles.map((file) =>
    path.basename(file, ".html")
  );

  manifest[tab] = itemNames;
});

// ------------------------------------------------------------
// Write manifest to disk
// ------------------------------------------------------------
fs.writeFileSync(
  OUTPUT_FILE,
  JSON.stringify(manifest, null, 2),
  "utf8"
);

console.log("helpManifest.json updated.");
