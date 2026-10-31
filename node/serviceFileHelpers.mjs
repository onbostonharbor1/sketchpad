/* ===========================================================
   serviceFileHelpers.mjs  (Node.js)
   -----------------------------------------------------------
   Small file helpers shared by the request files: read and write JSON, check that a
   directory or file exists, make a timestamp for a file name.
   Called by the dispatcher in sketchpadService.mjs.
   =========================================================== */

import fs from "fs";
import path from "path";


/* ===========================================================
   HELPER FUNCTIONS
=========================================================== */


/* -----------------------------------------------------------
   readJsonFileSync(filePath)

   Reads and parses a JSON file.
----------------------------------------------------------- */
export function readJsonFileSync(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
} // end readJsonFileSync


/* -----------------------------------------------------------
   writeJsonFileSync(filePath, data)

   Writes formatted JSON with a trailing newline.
----------------------------------------------------------- */
export function writeJsonFileSync(filePath, data) {
  writeFileAtomicSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
} // end writeJsonFileSync


/* -----------------------------------------------------------
   writeFileAtomicSync(filePath, data, encoding?)

   Writes to a temporary file in the same folder, then renames it
   over the real file. A crash or a full disk in the middle leaves
   the old file whole, never a half-written one. If the rename is
   refused (Windows can refuse while another program has the target
   open), it falls back to copying over the target.
   data: a string (give encoding, e.g. "utf8") or a Buffer.
----------------------------------------------------------- */
export function writeFileAtomicSync(filePath, data, encoding) {
  const dir  = path.dirname(filePath);
  const tmp  = path.join(dir, "." + path.basename(filePath) + "." + process.pid + "." + Date.now() + ".tmp");
  try {
    fs.writeFileSync(tmp, data, encoding);
    try {
      fs.renameSync(tmp, filePath);
    } catch {
      fs.copyFileSync(tmp, filePath);
      fs.unlinkSync(tmp);
    }
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* no temp file to remove */ }
    throw err;
  }
} // end writeFileAtomicSync


/* -----------------------------------------------------------
   assertDirectoryExists(dir, message)

   Fail-fast directory existence check.
----------------------------------------------------------- */
export function assertDirectoryExists(dir, message) {
  if (!fs.existsSync(dir)) throw new Error(message);
  if (!fs.statSync(dir).isDirectory()) throw new Error(message);
} // end assertDirectoryExists


/* -----------------------------------------------------------
   assertFileExists(file, message)

   Fail-fast file existence check.
----------------------------------------------------------- */
export function assertFileExists(file, message) {
  if (!fs.existsSync(file)) throw new Error(message);
  if (!fs.statSync(file).isFile()) throw new Error(message);
} // end assertFileExists


/* -----------------------------------------------------------
   makeTimestampForFilename()

   Returns: YYYYMMDD_HHMMSS
----------------------------------------------------------- */
export function makeTimestampForFilename() {

  const d = new Date();

  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");

  const hh   = String(d.getHours()).padStart(2, "0");
  const min  = String(d.getMinutes()).padStart(2, "0");
  const ss   = String(d.getSeconds()).padStart(2, "0");

  return mm + dd + "_" + hh + min + ss;

} // end makeTimestampForFilename
