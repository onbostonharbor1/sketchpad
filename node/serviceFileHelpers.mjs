/* ===========================================================
   serviceFileHelpers.mjs  (Node.js)
   -----------------------------------------------------------
   Small file helpers shared by the request files: read and write JSON, check that a
   directory or file exists, make a timestamp for a file name.
   Called by the dispatcher in sketchpadService.mjs.
   =========================================================== */

import fs from "fs";


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
  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2) + "\n",
    "utf8"
  );
} // end writeJsonFileSync


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
