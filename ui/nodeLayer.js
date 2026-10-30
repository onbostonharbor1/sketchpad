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
       POST http://localhost:5174/dispatch

   NOTE
   ----
   This is the only "transport primitive" you should need.
   Higher-level nodeXXX() helpers call this.

   =========================================================== */

export async function nodeDispatch(requestName, payload = {}) {
  const url = "http://localhost:5174/dispatch";

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestName: requestName,
        payload: payload
      })
    });
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


export async function nodeRebuildAndValidateManifests() {
  return await nodeDispatch("manifestMaintenance", {});
} // end nodeRebuildAndValidateManifests
