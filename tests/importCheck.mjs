/* tests/importCheck.mjs
   ------------------------------------------------------------
   Checks that every import in the app resolves: the file exists and
   every named import is exported by that file. It catches the usual
   mistakes after moving or deleting code. Run:  npm run check:imports

   It reads the source text only (no browser, no server). Imports of
   packages (jquery, tinymce, ...) are skipped. Exit code 1 if any
   import is broken.
   ------------------------------------------------------------ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIR = /^(node_modules|\.git|archive|dist|dist-static|public|\.vite)$/;

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIR.test(e.name)) walk(full); }
    else if (/\.m?js$/.test(e.name) && !/^zz/.test(e.name)) files.push(full);
  }
})(root);

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

function resolveSpec(fromFile, spec) {
  if (!/^[./]/.test(spec)) return null;                 // a package: skip
  const base = spec.startsWith("/") ? path.join(root, spec) : path.resolve(path.dirname(fromFile), spec);
  const clean = base.split("?")[0];
  if (fs.existsSync(clean) && fs.statSync(clean).isFile()) return clean;
  if (fs.existsSync(clean + ".js")) return clean + ".js";
  return clean;                                          // reported as missing
}

const exportCache = new Map();
function exportsOf(file) {
  if (exportCache.has(file)) return exportCache.get(file);
  const names = new Set();
  exportCache.set(file, names);                          // guards against export * cycles
  const text = stripComments(fs.readFileSync(file, "utf8"));
  for (const m of text.matchAll(/export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of text.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(",")) {
      const bits = part.trim().split(/\s+as\s+/);
      const name = (bits[1] || bits[0]).trim();
      if (name) names.add(name);
    }
  }
  if (/export\s+default\b/.test(text)) names.add("default");
  for (const m of text.matchAll(/export\s+\*\s+from\s+["']([^"']+)["']/g)) {
    const target = resolveSpec(file, m[1]);
    if (target && fs.existsSync(target)) for (const n of exportsOf(target)) names.add(n);
  }
  return names;
}

let problems = 0;
const report = (msg) => { problems++; console.log(msg); };

for (const file of files) {
  const rel = path.relative(root, file);
  const text = stripComments(fs.readFileSync(file, "utf8"));

  const check = (spec, names, kind) => {
    const target = resolveSpec(file, spec);
    if (target === null) return;
    if (!fs.existsSync(target)) { report(`MISSING FILE  ${rel} -> ${spec} (${kind})`); return; }
    if (/\.(css|json|html)$/.test(target)) return;
    const have = exportsOf(target);
    for (const n of names) if (!have.has(n)) report(`MISSING NAME  ${rel} imports {${n}} from ${spec} (${kind})`);
  };

  for (const m of text.matchAll(/^[ \t]*import\s+((?:\{[^}]*\}|[\w$*\s,]+?)+)\s*from\s*["']([^"']+)["']/gm)) {
    const clause = m[1];
    const names = [];
    const braces = clause.match(/\{([\s\S]*)\}/);
    if (braces) for (const part of braces[1].split(",")) { const n = part.trim().split(/\s+as\s+/)[0].trim(); if (n) names.push(n); }
    const outside = clause.replace(/\{[\s\S]*\}/, "").replace(/\*\s+as\s+[\w$]+/, "").replace(/,/g, "").trim();
    if (outside) names.push("default");
    check(m[2], names, "static");
  }
  for (const m of text.matchAll(/^[ \t]*import\s*["']([^"']+)["']/gm)) check(m[1], [], "side-effect");
  for (const m of text.matchAll(/(?:const|let|var)\s*\{([^}]*)\}\s*=\s*await\s+import\(\s*["']([^"']+)["']\s*\)/g)) {
    const names = m[1].split(",").map(x => x.trim().split(":")[0].trim()).filter(Boolean);
    check(m[2], names, "dynamic");
  }
  for (const m of text.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) check(m[1], [], "dynamic");
}

console.log(`import check: ${files.length} files, ${problems} problem(s)`);
process.exit(problems ? 1 : 0);
