/* node/safePaths.mjs
   ------------------------------------------------------------
   Small helpers that keep a request from reaching outside the
   folder it is meant for. The Node service builds file paths from
   text the browser sends (category names, file names, manifest
   paths). Every handler passes that text through one of these
   functions before it touches the disk.

   Nothing here reads or writes a file. Each function either returns
   a safe value or throws a RequestError, which the server turns into
   an HTTP 400.

   Functions:
     RequestError             an Error that means "the request was bad" (HTTP status 400 by default)
     assertSimpleName         one folder or file name, no slashes, no ".."
     isInside                 is this absolute path inside that folder?
     resolveInside            join a root and a relative path, stay inside
   ------------------------------------------------------------ */

import path from "path";

export class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "RequestError";
    this.status = status;
  }
}

/* ------------------------------------------------------------
   assertSimpleName(value, label)

   The value must be a non-empty string that is a single path
   segment: no "/" or "\", no NUL character, and not "." or "..".
   Returns the value unchanged. `label` names the field in the
   error message, for example "writePatternThumbnail: category".
   ------------------------------------------------------------ */
export function assertSimpleName(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new RequestError(label + " missing/invalid");
  }
  if (value.includes("/") || value.includes("\\") || value.includes("\0")) {
    throw new RequestError(label + " must be a single name, no folders: " + value);
  }
  if (value === "." || value === "..") {
    throw new RequestError(label + " must be a real name: " + value);
  }
  return value;
}

/* ------------------------------------------------------------
   isInside(rootAbs, targetAbs)

   True when targetAbs is rootAbs itself or somewhere below it.
   Uses path.relative, so a sibling such as "/repo/helpzz" is NOT
   inside "/repo/help" (a plain startsWith test gets that wrong).
   ------------------------------------------------------------ */
export function isInside(rootAbs, targetAbs) {
  const rel = path.relative(rootAbs, targetAbs);
  if (rel === "") return true;
  if (path.isAbsolute(rel)) return false;
  return rel !== ".." && !rel.startsWith(".." + path.sep);
}

/* ------------------------------------------------------------
   resolveInside(rootAbs, relInput, label)

   Joins rootAbs and a relative path from the caller. A leading
   "/" is ignored (rooted paths from the UI look like
   "/help/x.html"). Throws if the result is not strictly below
   rootAbs. Returns the absolute path.
   ------------------------------------------------------------ */
export function resolveInside(rootAbs, relInput, label) {
  if (typeof relInput !== "string" || relInput.trim() === "") {
    throw new RequestError(label + " missing/invalid");
  }
  if (relInput.includes("\0")) {
    throw new RequestError(label + " invalid");
  }
  const rel = relInput.replace(/^[/\\]+/, "");
  const abs = path.resolve(rootAbs, rel);
  if (abs === rootAbs || !isInside(rootAbs, abs)) {
    throw new RequestError(label + " escapes " + path.basename(rootAbs) + ": " + relInput);
  }
  return abs;
}
