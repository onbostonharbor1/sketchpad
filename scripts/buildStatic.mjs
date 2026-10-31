/* scripts/buildStatic.mjs
   ------------------------------------------------------------
   Builds a read-only copy of Sketchpad that any plain web server can
   host (no Vite, no Node service). Run:

       npm run build:static
       npm run build:static -- --out my-folder --with-images

   Result (default folder: dist-static/):
     - the Vite build of the app (index.html and assets/)
     - the folders the app loads at run time: home, patterns, gallery,
       utilities, drawRegistry, help, figures, draw, classes, ui
     - thumbnails (images/thumb_*.png) are kept; full-size gallery
       images and the TinyMCE editor are left out unless you ask:
           --with-images     keep every image (hundreds of MB)
           --with-tinymce    keep the help editor files

   The copy must be served from the ROOT of a site (the app uses paths
   such as /ui/... and /patterns/...), not from a sub-folder.
   Anything that needs the Node service (save, archive, thumbnails, logs,
   Edit Manifest) shows a message that the service is not available.
   ------------------------------------------------------------ */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const outName = args.includes("--out") ? args[args.indexOf("--out") + 1] : "dist-static";
const out = path.resolve(root, outName);
const withImages  = flag("--with-images");
const withTinymce = flag("--with-tinymce");

/* 1. The Vite build */
console.log("1/3 vite build ...");
const build = spawnSync("npx", ["vite", "build", "--outDir", out, "--emptyOutDir"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
if (build.status !== 0) { console.error("vite build failed"); process.exit(1); }

/* 2. The folders loaded at run time */
console.log("2/3 copying run-time folders ...");
const FOLDERS = ["home", "patterns", "gallery", "utilities", "drawRegistry", "help", "figures", "draw", "classes", "ui"];
const IMAGE = /\.(png|jpe?g|gif|webp)$/i;
let copied = 0, skipped = 0;
for (const dir of FOLDERS) {
  const from = path.join(root, dir);
  if (!fs.existsSync(from)) continue;
  fs.cpSync(from, path.join(out, dir), {
    recursive: true,
    filter: (src) => {
      if (/[\\/]archive$/.test(src)) return false;
      if (!fs.statSync(src).isFile()) return true;
      if (!withImages && IMAGE.test(src) && !/[\\/]thumb_[^\\/]*$/i.test(src)) { skipped++; return false; }
      copied++;
      return true;
    }
  });
}
console.log(`    ${copied} files copied, ${skipped} full-size images left out`);

/* 3. Leave out the help editor unless asked */
if (!withTinymce) fs.rmSync(path.join(out, "tinymce"), { recursive: true, force: true });
fs.writeFileSync(path.join(out, "READ-ONLY.txt"),
  "Read-only copy of Sketchpad, built " + new Date().toISOString() + ".\n" +
  "Serve it from the root of a site. There is no Node service, so saving, archiving, thumbnails,\n" +
  "logs and manifest editing are unavailable.\n");

let files = 0, bytes = 0;
(function count(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) count(p); else { files++; bytes += fs.statSync(p).size; } } })(out);
console.log(`3/3 done: ${out}\n    ${files} files, ${(bytes / 1048576).toFixed(1)} MB`);
