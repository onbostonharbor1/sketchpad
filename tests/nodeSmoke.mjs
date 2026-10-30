/* tests/nodeSmoke.mjs
   ------------------------------------------------------------
   Smoke and abuse test for the Node service (node/sketchpadServer.mjs).
   Run:  npm run test:node

   It never touches the real repo. It copies the small folders the
   service works on (patterns, gallery, utilities, drawRegistry, help,
   home, figures; images skipped) into a temporary folder, starts the
   service there on a free port, and sends requests:

     1. Bad envelopes (bad JSON, empty body, wrong shapes).
     2. Origin and Host checks.
     3. Every request name with an empty payload: must be refused or
        answered, never a 500.
     4. Abuse: names with "..", sibling folders such as helpzz, a
        manifest outside the allowed folders. Each must be refused
        AND leave the disk unchanged.
     5. Happy paths for the writers, so the safety checks cannot
        quietly break real use.

   Exit code 1 if anything fails.
   ------------------------------------------------------------ */
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/* SKETCHPAD_NODE_DIR points the test at another copy of node/ (to see the old code fail). */
const nodeDir  = process.env.SKETCHPAD_NODE_DIR || path.join(repoRoot, "node");
const base     = fs.mkdtempSync(path.join(os.tmpdir(), "sketchpad-node-"));
const scratch  = path.join(base, "repo");
fs.mkdirSync(scratch);

/* ---- copy the working folders, skipping images and big files ---- */
const COPY = ["patterns", "gallery", "utilities", "drawRegistry", "help", "home", "figures"];
for (const dir of COPY) {
  const from = path.join(repoRoot, dir);
  if (!fs.existsSync(from)) continue;
  fs.cpSync(from, path.join(scratch, dir), {
    recursive: true,
    filter: (src) => {
      if (/[\\/]node_modules[\\/]/.test(src)) return false;
      if (/\.(png|jpe?g|gif|webp)$/i.test(src)) return false;
      return !(fs.statSync(src).isFile() && fs.statSync(src).size > 200 * 1024);
    }
  });
}
fs.writeFileSync(path.join(scratch, "package.json"), '{"sentinel":true}\n');
fs.mkdirSync(path.join(scratch, "help", "test"), { recursive: true });
fs.mkdirSync(path.join(scratch, "helpzz"), { recursive: true });

/* ---- start the service ---- */
const port = await new Promise((resolve) => {
  const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); });
});
const server = spawn(process.execPath, [path.join(nodeDir, "sketchpadServer.mjs")], {
  cwd: scratch, env: { ...process.env, SKETCHPAD_PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"]
});
let serverLog = "";
server.stdout.on("data", d => serverLog += d);
server.stderr.on("data", d => serverLog += d);
await new Promise((resolve, reject) => {
  const t0 = Date.now();
  const timer = setInterval(() => {
    if (/listening at/.test(serverLog)) { clearInterval(timer); resolve(); }
    else if (Date.now() - t0 > 30000) { clearInterval(timer); reject(new Error("service did not start:\n" + serverLog)); }
  }, 100);
});

/* ---- helpers ---- */
function rawRequest(body, headers = {}) {
  return new Promise((resolve) => {
    const req = http.request({ host: "127.0.0.1", port, path: "/dispatch", method: "POST",
      headers: { "Content-Type": "text/plain", ...headers } }, (res) => {
      let text = ""; res.on("data", d => text += d);
      res.on("end", () => { let json = null; try { json = JSON.parse(text); } catch {} resolve({ status: res.statusCode, json, text }); });
    });
    req.on("error", (e) => resolve({ status: 0, json: null, text: String(e.message) }));
    req.end(body);
  });
}
const call = (requestName, payload, headers) => rawRequest(JSON.stringify({ requestName, payload }), headers);
const exists = (...p) => fs.existsSync(path.join(scratch, ...p));

let passed = 0, failed = 0;
function check(name, ok, detail = "") {
  if (ok) passed++; else { failed++; console.log("FAIL  " + name + (detail ? "  :: " + detail : "")); }
}
const refused = (r) => r.status >= 400 && r.status < 500;

/* ---- 1. envelopes ---- */
check("bad JSON is a 400",        (await rawRequest("{bad json")).status === 400);
check("empty body is a 400",      (await rawRequest("")).status === 400);
check("array body is a 400",      (await rawRequest("[]")).status === 400);
check("unknown request is a 400", (await call("constructor", {})).status === 400);
check("payload must be object",   (await rawRequest('{"requestName":"listLogFiles","payload":"x"}')).status === 400);

/* ---- 2. origin and host ---- */
check("foreign Origin is refused",  (await call("listLogFiles", {}, { Origin: "http://evil.example" })).status === 403);
check("app Origin is allowed",      (await call("listLogFiles", {}, { Origin: "http://localhost:5173" })).status === 200);
check("no Origin is allowed",       (await call("listLogFiles", {})).status === 200);
check("foreign Host is refused",    (await call("listLogFiles", {}, { Host: "evil.example" })).status === 403);

/* ---- 3. every request name, empty payload: never a 500 ---- */
const NAMES = ["writePatternThumbnail", "createFigure", "editManifestEntry", "deletePackageScript", "editPackageScript",
  "renamePackageScript", "listLogFiles", "readLogFile", "openInEditor", "archiveItem", "writePatternFromDrawRegistry",
  "writeHelpFile", "writeGalleryPatternPng", "saveSecondaryObject", "archiveSecondaryObject", "getSecondaryManifest",
  "getPrimaryObjectsWithSecondaries", "readSecondaryObject", "manifestMaintenance"];
for (const n of NAMES) {
  const r = await call(n, {});
  check("empty payload: " + n + " is not a 500", r.status !== 500 && r.status !== 0, "status " + r.status + " " + (r.json && r.json.error));
}

/* ---- 4. abuse: refused and the disk is unchanged ---- */
const before = JSON.stringify(fs.readdirSync(base));
let r;
r = await call("readSecondaryObject", { primaryId: "..", filename: "package.json" });
check("read ..: refused", refused(r) && !(r.json && r.json.content), "status " + r.status);
r = await call("archiveSecondaryObject", { primaryId: "..", filename: "package.json" });
check("archiveSecondaryObject ..: refused", refused(r), "status " + r.status);
check("archiveSecondaryObject ..: package.json still in place", exists("package.json") && !exists("archive"));
r = await call("saveSecondaryObject", { primaryId: "../../outside", name: "a", payload: { a: 1 }, thumbBase64: "AAAA" });
check("saveSecondaryObject outside repo: refused", refused(r), "status " + r.status);
r = await call("saveSecondaryObject", { primaryId: "parabola", name: "../../evil", payload: { a: 1 }, thumbBase64: "AAAA" });
check("saveSecondaryObject name with ..: refused", refused(r), "status " + r.status);
check("nothing created outside the repo copy", JSON.stringify(fs.readdirSync(base)) === before);
r = await call("writePatternThumbnail", { category: "../utilities", filename: "x", pngBase64: "iVBORw0KGgo=" });
check("writePatternThumbnail category ..: refused", refused(r), "status " + r.status);
check("writePatternThumbnail wrote nothing in utilities", !exists("utilities", "images"));
const cat = fs.readdirSync(path.join(scratch, "patterns"), { withFileTypes: true }).find(e => e.isDirectory() && exists("patterns", e.name, "manifest.json")).name;
r = await call("writePatternFromDrawRegistry", { category: cat, idName: "../evil", scriptText: "x", thumbBase64: "AAAA" });
check("writePatternFromDrawRegistry idName ..: refused", refused(r), "status " + r.status);
r = await call("writeGalleryPatternPng", { category: "..", idName: "x", pngBase64: "AAAA", thumbBase64: "AAAA" });
check("writeGalleryPatternPng category ..: refused", refused(r), "status " + r.status);
r = await call("writeHelpFile", { helpPath: "helpzz/pwn.html", html: "x" });
check("writeHelpFile sibling folder helpzz: refused", refused(r) && !exists("helpzz", "pwn.html"), "status " + r.status);
r = await call("writeHelpFile", { helpPath: "help/../package.json", html: "x" });
check("writeHelpFile ../package.json: refused", refused(r) && fs.readFileSync(path.join(scratch, "package.json"), "utf8").includes("sentinel"), "status " + r.status);
r = await call("editManifestEntry", { manifestPath: "package.json", matchField: "x", matchValue: "y" });
check("editManifestEntry non-manifest file: refused", refused(r), "status " + r.status);
r = await call("editManifestEntry", { manifestPath: "../package.json", matchField: "x", matchValue: "y" });
check("editManifestEntry ../: refused", refused(r), "status " + r.status);
fs.mkdirSync(path.join(scratch, "patterns-evil"));
fs.writeFileSync(path.join(scratch, "patterns-evil", "manifest.json"), '[{"filename":"v","path":"v.js"}]\n');
fs.writeFileSync(path.join(scratch, "patterns-evil", "v.js"), "// victim\n");
r = await call("archiveItem", { manifestPath: "patterns-evil/manifest.json", filename: "v.js" });
check("archiveItem sibling folder patterns-evil: refused and file stays", refused(r) && exists("patterns-evil", "v.js") && !exists("patterns-evil", "archive"), "status " + r.status);
fs.writeFileSync(path.join(scratch, "patterns", "victim.txt"), "x");
r = await call("archiveItem", { manifestPath: "patterns/" + cat + "/manifest.json", filename: "../victim.txt" });
check("archiveItem filename ..: refused and file stays", refused(r) && exists("patterns", "victim.txt"), "status " + r.status);
fs.writeFileSync(path.join(scratch, "patterns", cat, "stray.js"), "// not in the manifest\n");
r = await call("archiveItem", { manifestPath: "patterns/" + cat + "/manifest.json", filename: "stray.js" });
check("archiveItem file not in manifest: refused and file NOT moved", refused(r) && exists("patterns", cat, "stray.js") && !exists("patterns", cat, "archive", "stray.js"), "status " + r.status);
r = await call("openInEditor", { editor: "vscode", file: "../package.json" });
check("openInEditor ..: refused", refused(r), "status " + r.status);

/* ---- 5. happy paths ---- */
r = await call("writeHelpFile", { helpPath: "/help/test/ok.html", html: "<p>ok</p>" });
check("writeHelpFile valid", r.status === 200 && exists("help", "test", "ok.html"), "status " + r.status + " " + (r.json && r.json.error));
r = await call("writePatternThumbnail", { category: cat, filename: "zzthumb", pngBase64: "iVBORw0KGgo=" });
check("writePatternThumbnail valid", r.status === 200 && exists("patterns", cat, "images", "thumb_zzthumb.png"), "status " + r.status + " " + (r.json && r.json.error));
r = await call("saveSecondaryObject", { primaryId: "parabola", name: "smoke1", payload: { a: 1 }, thumbBase64: "AAAA" });
check("saveSecondaryObject valid", r.status === 200 && exists("drawRegistry", "parabola", "smoke1.json"), "status " + r.status + " " + (r.json && r.json.error));
r = await call("readSecondaryObject", { primaryId: "parabola", filename: "smoke1.json" });
check("readSecondaryObject valid", r.status === 200 && r.json.content && r.json.content.a === 1, "status " + r.status);
r = await call("getSecondaryManifest", { primaryId: "parabola" });
check("getSecondaryManifest lists it", r.status === 200 && JSON.stringify(r.json.manifest).includes("smoke1"), "status " + r.status);
r = await call("archiveSecondaryObject", { primaryId: "parabola", filename: "smoke1.json" });
check("archiveSecondaryObject valid", r.status === 200 && exists("drawRegistry", "parabola", "archive", "smoke1.json"), "status " + r.status + " " + (r.json && r.json.error));
const manifestPath = path.join(scratch, "patterns", cat, "manifest.json");
const entry = JSON.parse(fs.readFileSync(manifestPath, "utf8")).find(e => e && e.path && exists("patterns", cat, e.path));
if (entry) {
  r = await call("archiveItem", { manifestPath: "/patterns/" + cat + "/manifest.json", filename: entry.path });
  const left = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  check("archiveItem valid: file moved, entry removed",
    r.status === 200 && exists("patterns", cat, "archive", entry.path) && !exists("patterns", cat, entry.path) && !left.some(e => e && e.path === entry.path),
    "status " + r.status + " " + (r.json && r.json.error));
}

/* ---- 6. oversized body, then is the service still alive? ---- */
const big = await rawRequest(JSON.stringify({ requestName: "listLogFiles", payload: { pad: "x".repeat(51 * 1024 * 1024) } }));
check("oversized body is refused (413 or closed)", big.status === 413 || big.status === 0, "status " + big.status);
check("service still answers", (await call("listLogFiles", {})).status === 200);

server.kill();
fs.rmSync(base, { recursive: true, force: true });
console.log(`node smoke test: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
