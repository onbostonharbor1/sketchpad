/* ===========================================================
   extractBootstrapCss.mjs
   -----------------------------------------------------------
   One-time tool. Reads Bootstrap's full stylesheet and writes
   css/base.css containing only the rules this app can use:
     - rules whose class names appear in the app's own files
       (or were seen on the page at run time), and
     - the tag-level "Reboot" rules for tags the app uses,
     - the --bs-* variables those rules refer to.
   Run: node scripts/extractBootstrapCss.mjs [classes.json]
   classes.json (optional): { "classes": [...], "tags": [...] }
   from a pixel run, to add classes created only at run time.
   =========================================================== */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const postcss = require("postcss");

const root = process.cwd();
const bootstrapPath = path.join(root, "node_modules/bootstrap/dist/css/bootstrap.min.css");
const outPath = path.join(root, "css/base.css");

// ---- 1. words and tags used by the app's own source ----
const skip = new Set(["node_modules", "dist", "dist-static", ".git", "archive", "docs", "tests", "scripts", "public"]);
const sourceFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|mjs|html|css)$/.test(e.name) && !p.endsWith("css/base.css")) sourceFiles.push(p);
  }
})(root);

const words = new Set();
const tags = new Set(["html", "body"]);
for (const f of sourceFiles) {
  if (f.includes(path.sep + "help" + path.sep)) continue;      // help pages are viewed in their own panes
  const text = fs.readFileSync(f, "utf8");
  for (const m of text.matchAll(/[A-Za-z][\w-]*/g)) words.add(m[0]);
  for (const m of text.matchAll(/<([a-z][a-z0-9]*)[\s>]/g)) tags.add(m[1]);
  for (const m of text.matchAll(/createElement\(\s*["']([a-z][a-z0-9]*)["']/g)) tags.add(m[1]);
}
const extra = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], "utf8")) : { classes: [], tags: [] };
extra.classes.forEach(c => words.add(c));
extra.tags.forEach(t => tags.add(t));
// Help pages are loaded into the page, so their tags count too.
for (const t of ["p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a", "table", "tr", "td", "th", "thead", "tbody", "code", "pre", "strong", "em", "hr", "img", "small", "label", "input", "select", "textarea", "button", "span", "div", "i", "b", "sup", "sub", "blockquote"]) tags.add(t);

// ---- 2. keep only the selectors the app can match ----
function selectorUsable(sel) {
  if (/data-bs-theme=["']?dark/.test(sel)) return false;
  for (const m of sel.matchAll(/\.((?:\\.|[\w-])+)/g)) {
    if (!words.has(m[1].replace(/\\/g, ""))) return false;
  }
  // type selectors: first token of each compound selector
  for (const compound of sel.split(/\s*[>+~]\s*|\s+/)) {
    const t = compound.match(/^([a-z][a-z0-9]*)(?![\w-])/);
    if (t && !tags.has(t[1])) return false;
  }
  return true;
}

const css = fs.readFileSync(bootstrapPath, "utf8");
const tree = postcss.parse(css);
const keptVars = new Set();

tree.walkAtRules("charset", r => r.remove());
tree.walkRules(rule => {
  if (rule.parent && rule.parent.type === "atrule" && /keyframes/.test(rule.parent.name)) return;
  const kept = rule.selectors.filter(selectorUsable);
  if (kept.length === 0) { rule.remove(); return; }
  rule.selectors = kept;
});
tree.walkAtRules(/keyframes/, r => r.remove());
tree.walkAtRules(r => { if (r.nodes && r.nodes.length === 0) r.remove(); });

// ---- 3. variables: keep only those that kept rules refer to ----
const declared = new Map();      // --bs-name -> decl in :root
tree.walkRules(rule => {
  if (rule.selector.startsWith(":root")) rule.walkDecls(d => { if (d.prop.startsWith("--")) declared.set(d.prop, d); });
});
const queue = [];
tree.walkDecls(d => {
  if (d.parent.selector && d.parent.selector.startsWith(":root")) return;
  for (const m of d.value.matchAll(/var\((--[\w-]+)/g)) queue.push(m[1]);
});
while (queue.length) {
  const name = queue.pop();
  if (keptVars.has(name)) continue;
  keptVars.add(name);
  const d = declared.get(name);
  if (d) for (const m of d.value.matchAll(/var\((--[\w-]+)/g)) queue.push(m[1]);
}
tree.walkRules(rule => {
  if (!rule.selector.startsWith(":root")) return;
  rule.walkDecls(d => { if (d.prop.startsWith("--") && !keptVars.has(d.prop)) d.remove(); });
  if (rule.nodes.length === 0) rule.remove();
});
tree.walkAtRules(r => { if (r.nodes && r.nodes.length === 0) r.remove(); });

const header = `/* ===========================================================
   base.css
   -----------------------------------------------------------
   The parts of Bootstrap 5.3.3 this app uses, copied here so the
   app no longer loads Bootstrap. Written by
   scripts/extractBootstrapCss.mjs from Bootstrap's own stylesheet:
   only rules whose class names the app uses, the tag-level
   defaults (Reboot) for tags the app uses, and the --bs-*
   variables those rules refer to.
   This file is now ours: edit it directly, and trim it as the
   CSS cleanup goes on.
   =========================================================== */

`;
const out = header + tree.toString().replace(/\}\s*(?=[^\s}])/g, "}\n");
fs.writeFileSync(outPath, out);
console.log("wrote", path.relative(root, outPath), (out.length / 1024).toFixed(1) + " KB (from " + (css.length / 1024).toFixed(0) + " KB)");
