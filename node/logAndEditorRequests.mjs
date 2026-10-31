/* ===========================================================
   logAndEditorRequests.mjs  (Node.js)
   -----------------------------------------------------------
   Requests that list and read the files in ./utilities/logfiles, and open a project file
   in VS Code.
   Called by the dispatcher in sketchpadService.mjs.
   =========================================================== */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { assertDirectoryExists, assertFileExists } from "./serviceFileHelpers.mjs";


/* ===========================================================
   TASK: listLogFiles

   DESCRIPTION
   -----------
   Returns newest N log files from ./utilities/logfiles.

   Payload (optional):
     { limit : 10 }

   Returns:
     {
       request: "listLogFiles",
       status: "ok",
       dir: "<absolute dir>",
       limit: <number>,
       files: [
         { name, mtimeMs, mtimeIso, size }
       ]
     }
=========================================================== */
export async function listLogFiles(payload = {}) {

  const limitRaw = payload.limit;
  const limit = (typeof limitRaw === "number" && limitRaw > 0) ? limitRaw : 10;

  const logDir = path.resolve("./utilities/logfiles");
  assertDirectoryExists(logDir, "listLogFiles: log dir missing: " + logDir);

  const entries = fs.readdirSync(logDir, { withFileTypes: true });

  const files = [];

  for (const ent of entries) {
    if (!ent.isFile()) continue;

    const name = ent.name;

    // You can broaden this later if needed.
    if (!name.toLowerCase().endsWith(".txt")) continue;

    const full = path.join(logDir, name);
    const st = fs.statSync(full);

    files.push({
      name,
      mtimeMs: st.mtimeMs,
      mtimeIso: new Date(st.mtimeMs).toISOString(),
      size: st.size
    });
  }

  // newest first
  files.sort((a, b) => b.mtimeMs - a.mtimeMs);

  const sliced = files.slice(0, limit);

  return {
    request: "listLogFiles",
    status: "ok",
    dir: logDir,
    limit,
    files: sliced
  };

} // end listLogFiles


/* ===========================================================
   TASK: readLogFile

   DESCRIPTION
   -----------
   Reads one logfile from ./utilities/logfiles and returns text.

   Payload:
     { name : "<filename>" }

   Returns:
     {
       request: "readLogFile",
       status: "ok",
       name: "<filename>",
       text: "<file contents>"
     }
=========================================================== */
export async function readLogFile(payload = {}) {

  const name = payload.name;

  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("readLogFile: name missing/invalid");
  }

  // fail-fast: disallow path separators
  if (name.indexOf("/") >= 0 || name.indexOf("\\") >= 0) {
    throw new Error("readLogFile: invalid name (no path separators allowed): " + name);
  }

  const logDir = path.resolve("./utilities/logfiles");
  assertDirectoryExists(logDir, "readLogFile: log dir missing: " + logDir);

  const full = path.join(logDir, name);
  assertFileExists(full, "readLogFile: file missing: " + full);

  const text = fs.readFileSync(full, "utf8");

  return {
    request: "readLogFile",
    status: "ok",
    name,
    text
  };

} // end readLogFile


/* ===========================================================
   TASK: openInEditor

   DESCRIPTION
   -----------
   Opens a source file of this project in a desktop editor.

   payload: { editor: "vscode", file: "/drawRegistry/x.js" }

   SAFETY
   ------
   The service listens on localhost only, but it still refuses
   anything that is not an existing file inside the project folder
   (the current directory), anything under node_modules or .git,
   and any file name with characters other than letters, digits
   and  _ . - / space. The editor command comes from a fixed list,
   never from the request.
   =========================================================== */
// To offer another editor, add its command name(s) here and a button
// in makeNotesItem (ui/menuCmds.js).
const EDITOR_COMMANDS = {
  vscode: ["code"]
};


export async function openInEditor(payload = {}) {

  const editor = payload.editor;
  const file   = payload.file;

  if (!Object.prototype.hasOwnProperty.call(EDITOR_COMMANDS, editor)) {
    throw new Error("openInEditor: unknown editor: " + editor);
  }
  if (typeof file !== "string" || !/^[A-Za-z0-9_.\-\/ ]+$/.test(file)) {
    throw new Error("openInEditor: invalid file name");
  }
  if (file.split("/").includes("..")) {
    throw new Error("openInEditor: invalid file name");
  }

  const root = path.resolve(".");
  const full = path.resolve(root, "." + (file.startsWith("/") ? file : "/" + file));
  const rel  = path.relative(root, full);

  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("openInEditor: file is outside the project");
  }
  const parts = rel.split(path.sep);
  if (parts.includes("node_modules") || parts.includes(".git")) {
    throw new Error("openInEditor: file not allowed: " + rel);
  }
  assertFileExists(full, "openInEditor: file missing: " + full);

  // Try each command name in turn; the first one that starts wins.
  const candidates = EDITOR_COMMANDS[editor];
  let lastError = null;

  for (const cmd of candidates) {
    const outcome = await launchDetached(cmd, [full]);
    if (outcome === "ok") {
      return { request: "openInEditor", status: "ok", editor, file: rel };
    }
    lastError = outcome;
  }

  throw new Error(
    "openInEditor: could not start " + candidates.join(" or ") +
    " (" + lastError + "). Is it on the PATH?"
  );

} // end openInEditor


// Starts a command detached from this service. Resolves "ok" when it
// started (or is still running after a moment), else a short reason.
function launchDetached(cmd, args) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };

    // On Windows, "code" is a .cmd file, which needs a shell. The file
    // name was validated above, and the command name is from a fixed list.
    const child = spawn(cmd, args, {
      detached: true,
      stdio: "ignore",
      shell: process.platform === "win32",
      windowsHide: true
    });

    child.on("error", (e) => finish(e.code || "error"));
    child.on("exit", (code) => finish(code === 0 || code === null ? "ok" : "exit code " + code));
    setTimeout(() => { child.unref(); finish("ok"); }, 1200);
  });
}
