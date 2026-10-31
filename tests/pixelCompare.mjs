/* tests/pixelCompare.mjs
   -----------------------------------------------------------
   Compares two folders of pictures made by tests/pixelShots.mjs.
       npm run pixels:compare -- before after
   For each picture it prints "identical", or how many pixels differ by
   more than 8 levels (out of 255), the biggest difference, and the box
   the differences fall in. Differing pairs also get a picture in
   pixel-refs/diff-<after>/ : the "before" picture with the changed
   pixels painted red. Differences of 8 levels or less (anti-aliasing
   noise) are ignored. Exit code 1 if any picture really differs.
   ----------------------------------------------------------- */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

const [a, b] = process.argv.slice(2);
if (!a || !b) { console.error("usage: node tests/pixelCompare.mjs <before folder> <after folder>"); process.exit(2); }
const dirA = path.join("pixel-refs", a), dirB = path.join("pixel-refs", b);
const names = JSON.parse(fs.readFileSync(path.join(dirA, "_names.json"), "utf8"));
const diffDir = path.join("pixel-refs", "diff-" + b);
const THRESHOLD = 8;
let differing = 0;

for (const n of names) {
  const fa = path.join(dirA, n + ".png"), fb = path.join(dirB, n + ".png");
  if (!fs.existsSync(fb)) { console.log(n.padEnd(34), "MISSING in", b); differing++; continue; }
  const A = PNG.sync.read(fs.readFileSync(fa)), B = PNG.sync.read(fs.readFileSync(fb));
  if (A.width !== B.width || A.height !== B.height) {
    console.log(n.padEnd(34), `SIZE ${A.width}x${A.height} vs ${B.width}x${B.height}`); differing++; continue;
  }
  let count = 0, max = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  const out = new PNG({ width: A.width, height: A.height });
  A.data.copy(out.data);
  for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
    const i = (y * A.width + x) * 4;
    const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]));
    if (d > max) max = d;
    if (d > THRESHOLD) {
      count++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      out.data[i] = 255; out.data[i + 1] = 0; out.data[i + 2] = 0; out.data[i + 3] = 255;
    }
  }
  if (count === 0) { console.log(n.padEnd(34), max === 0 ? "identical" : `same (largest change ${max} of 255)`); continue; }
  differing++;
  console.log(n.padEnd(34), `DIFFERENT: ${count} px, largest change ${max}, box x ${x0}-${x1} y ${y0}-${y1}`);
  fs.mkdirSync(diffDir, { recursive: true });
  fs.writeFileSync(path.join(diffDir, n + ".png"), PNG.sync.write(out));
}
console.log(differing === 0 ? `\nAll ${names.length} pictures match.` : `\n${differing} of ${names.length} pictures differ. See ${diffDir}`);
process.exit(differing ? 1 : 0);
