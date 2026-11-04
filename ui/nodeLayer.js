/* ===========================================================
   nodeLayer.js  (browser-side)
   -----------------------------------------------------------
   PURPOSE
   -------
   Thin browser bridge used by Sketchpad UI code to invoke
   Node services and get structured JSON results back.

   This file does NOT implement tasks.
   It only transports a request to the Node service.

   Expected UI call pattern:
     import { nodeAddPatternScripts } from "./nodeLayer.js";

     const report = await nodeAddPatternScripts();
     render report into #text

   =========================================================== */

import { timed } from "/ui/instrument.js";

/* ===========================================================
   nodeDispatch(requestName, payload)

   DESCRIPTION
   -----------
   Sends a dispatch request to the Node service and returns
   the JSON response.

   REQUIREMENTS
   ------------
   • The Node service must be running locally.
   • A server endpoint must exist (example below):
       POST /dispatch   (on the page's own server; Vite passes it to
                         http://localhost:5174/dispatch, vite.config.js)

   NOTE
   ----
   This is the only "transport primitive" you should need.
   Higher-level nodeXXX() helpers call this.

   =========================================================== */

export async function nodeDispatch(requestName, payload = {}) {
  // The page's own server passes /dispatch on to the Node service
  // (vite.config.js), so this works on the PC and in a Codespace alike.
  const url = "/dispatch";

  let response;
  try {
    response = await timed("service " + requestName, () => fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestName: requestName,
        payload: payload
      })
    }));
  } catch (networkErr) {
    // The service is not running (or this is a read-only copy of Sketchpad
    // with no Node service). Say so in plain words.
    throw new Error(
      "The Node service did not answer at " + url + ". Features that read or write " +
      "files need it (start it with: npm run dev:all). A read-only copy of Sketchpad " +
      "has no Node service, so those features are unavailable there."
    );
  }

  if (!response.ok) {
    const text = await response.text();
    // Vite answers for the service when the service is not running (its
    // own error page, not the service's JSON); a read-only copy answers 404.
    if (!text.trim().startsWith("{")) {
      throw new Error(
        "The Node service did not answer at " + url + " (HTTP " + response.status + "). Features that read " +
        "or write files need it (start it with: npm run dev:all). A read-only copy of Sketchpad has no " +
        "Node service, so those features are unavailable there."
      );
    }
    throw new Error(`nodeDispatch: HTTP ${response.status} ${response.statusText}: ${text}`);
  }

  return await response.json();
} // end nodeDispatch



export async function nodeListLogFiles(limit = 10) {
  return await nodeDispatch("listLogFiles", { limit });
} // end nodeListLogFiles


export async function nodeReadLogFile(name) {
  return await nodeDispatch("readLogFile", { name });
} // end nodeReadLogFile


// VS Code's saved versions of a script (node/scriptHistoryRequests.mjs).
export async function nodeListScriptHistory(path) {
  return await nodeDispatch("listScriptHistory", { path });
} // end nodeListScriptHistory


// The Ideabook hint scripts of one category (names without .js).
export async function nodeListIdeabookScripts(category) {
  return await nodeDispatch("listIdeabookScripts", { category });
} // end nodeListIdeabookScripts


export async function nodeReadScriptHistoryVersion(path, id) {
  return await nodeDispatch("readScriptHistoryVersion", { path, id });
} // end nodeReadScriptHistoryVersion


export async function nodeRebuildAndValidateManifests() {
  return await nodeDispatch("manifestMaintenance", {});
} // end nodeRebuildAndValidateManifests
