// tests/idCheck.mjs
// Checks that every id the code looks up with document.getElementById("literal")
// exists in index.html, or is on the list of ids that code creates itself.
// index.html is the single source of truth for page structure; an id that is in
// neither place is a bug or an undocumented region.
//
// Run: npm run check:ids
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));

// Ids that code creates. Keep in step with "Built by code" in index.html.
const builtByCode = new Set([
  "sharedCanvas",         // draw/drawState.js
  "categories",           // ui/categories.js
  "drawControls",         // ui/controls/rendering/renderer.js
  "canvasOverlayLayers",  // ui/home/homeResults.js (only if missing)
]);

// Known problems, listed so the check stays green but they are not forgotten.
const knownProblems = {
  "next-prev-overlay": "ui/interactor.js looks for this id, but the element is overlay-nextprev, so the lookup never finds it. " +
                       "Fixing it would start setting pointer-events on the overlay while dragging, so it needs a look at dragging first.",
};

const skipDirs = new Set(["node_modules", "dist", "dist-static", ".git", "help", "public", "archive", "tests"]);
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".js") || e.name.endsWith(".mjs")) files.push(p);
  }
})(root);

// An id also counts as "created by code" when some source file writes it as id="..."
// inside an HTML string, or assigns it with .id = "...". Those are the dialogs and
// panels that modules build; the listing below is for the ids with no source at all.
const createdInCode = new Map();   // id -> first file that creates it
for (const f of files) {
  const text = fs.readFileSync(f, "utf8");
  for (const m of text.matchAll(/\bid\s*=\s*\\?["']([A-Za-z][\w-]*)\\?["']|\.id\s*=\s*["']([^"']+)["']/g)) {
    const id = m[1] || m[2];
    if (!createdInCode.has(id)) createdInCode.set(id, path.relative(root, f));
  }
}

const unknown = new Map();   // id -> [file:line]
for (const f of files) {
  const lines = fs.readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;   // comment line
    for (const m of line.matchAll(/getElementById\(\s*["']([^"']+)["']\s*\)/g)) {
      const id = m[1];
      // Control ids are built as "<tab id>-<parameter name>", for example tab-tools-width.
      if (id.startsWith("tab-")) continue;
      if (htmlIds.has(id) || builtByCode.has(id) || createdInCode.has(id)) continue;
      if (!unknown.has(id)) unknown.set(id, []);
      unknown.get(id).push(path.relative(root, f) + ":" + (i + 1));
    }
  });
}

const newProblems = [...unknown.keys()].filter(id => !(id in knownProblems));
for (const id of Object.keys(knownProblems)) {
  if (unknown.has(id)) console.log("known problem: " + id + ": " + knownProblems[id]);
}
if (newProblems.length === 0) {
  console.log("id check: every looked-up id is in index.html, on the built-by-code list, or created by a module (" + createdInCode.size + " such ids)");
} else {
  console.log("id check: " + newProblems.length + " id(s) are looked up but not in index.html, the built-by-code list, or any module:");
  for (const id of newProblems) { const where = unknown.get(id); console.log("  " + id + "   " + where.slice(0, 3).join(", ") + (where.length > 3 ? " (+" + (where.length - 3) + ")" : "")); }
  process.exit(1);
}
