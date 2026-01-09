/* scriptRunner.js
   ------------------------------------------------------------
   Universal Script Loader + Execution Helpers
   ------------------------------------------------------------
   PURPOSE
   -------
   This module is the *single execution pipeline* for all
   runnable scripts in Sketchpad.

   It deliberately does NOT:
     - interpret script meaning
     - manage UI state
     - decide where scripts come from

   It ONLY:
     - loads ES modules by path
     - executes them in a controlled, deterministic way
     - routes output either to the canvas or to #text

   ------------------------------------------------------------
   USED BY
   -------
     • Patterns tab      → canvas
     • Gallery Scripts   → canvas
     • Utilities → Lab   → canvas
     • Utilities → Tools → text

   ------------------------------------------------------------
   CONTRACT
   --------
   A script must export ONE of:
     - runPattern()
     - drawPattern(params)
     - render()   (text-only utilities)

   ------------------------------------------------------------
   FAIL-FAST PHILOSOPHY
   -------------------
   Any ambiguity (missing file, wrong MIME type, missing export)
   MUST throw immediately with a readable error.
   ------------------------------------------------------------
*/

/*
   Canvas reset helper.
   This MUST be a concrete file import (".js") so the browser
   never falls back to index.html.
*/
import { resetCanvas } from "/draw/drawState.js";


/* ===========================================================
   loadScriptModule(path)
   ===========================================================
   RESPONSIBILITY
   --------------
   Given a rooted path like:
     "/patterns/foo/bar.js"

   This function:
     1. Normalizes the path
     2. Cache-busts it (dev only)
     3. PROBE-FETCHES it
        - verifies HTTP success
        - verifies JavaScript MIME type
     4. Dynamically imports the module
     5. Verifies it exports runPattern()

   WHY PROBE FETCH?
   ---------------
   Vite returns index.html (text/html) when a path is wrong.
   Dynamic import alone produces misleading MIME errors.

   Probe fetch turns that into:
     "non-JS response" with a visible HTML snippet.

   This is the *only reliable existence check* in browser code.
=========================================================== */
export async function loadScriptModule(path) {
  // --- defensive input validation ---
  if (typeof path !== "string" || path.trim() === "") {
    throw new Error("loadScriptModule: path must be a non-empty string");
  }

  let spec = path.trim();

  // --- normalize to a rooted browser URL ---
  // Home, Patterns, Gallery all pass rooted paths
  if (!spec.startsWith("/")) spec = "/" + spec;

  // --- remove accidental double slashes ---
  while (spec.startsWith("//")) spec = spec.slice(1);

  // --- cache busting ---
  // Prevents “clicked B but got A” during dev
  const bust = "t=" + Date.now();
  spec = (spec.indexOf("?") >= 0) ? (spec + "&" + bust) : (spec + "?" + bust);

  // ------------------------------------------------------------
  // PROBE FETCH
  // ------------------------------------------------------------
  // This is NOT redundant.
  // It catches:
  //   - wrong path
  //   - wrong casing
  //   - missing file
  //   - server fallback to index.html
  // BEFORE import() gives a useless MIME error.
  // ------------------------------------------------------------
  const res = await fetch(spec, { cache: "no-store" });

  const ct = (res.headers.get("content-type") || "").toLowerCase();

  // --- HTTP-level failure ---
  if (!res.ok) {
    throw new Error(
      "loadScriptModule: fetch failed " + res.status +
      " for " + spec +
      " (content-type: " + ct + ")"
    );
  }

  // --- MIME validation ---
  // JS must be application/javascript or equivalent.
  // If we get HTML here, it means:
  //   → Vite served index.html
  //   → the path is wrong
  if (ct.indexOf("javascript") === -1 && ct.indexOf("ecmascript") === -1) {
    const body = await res.text();
    const snippet = body.slice(0, 200).replace(/\s+/g, " ");
    throw new Error(
      "loadScriptModule: non-JS response for " + spec +
      " (content-type: " + ct + ") snippet: " + snippet
    );
  }

  // --- dynamic ES module import ---
  // @vite-ignore is REQUIRED because the specifier is dynamic
  const mod = await import(/* @vite-ignore */ spec);

  // --- enforce execution contract ---
  if (!mod || typeof mod.runPattern !== "function") {
    throw new Error(
      "loadScriptModule: module has no exported runPattern(): " + path
    );
  }

  return mod;
} // end loadScriptModule


/* ===========================================================
   executeScriptToCanvas(mod, title)
   ===========================================================
   RESPONSIBILITY
   --------------
   Execute a previously-loaded module into the shared canvas.

   THIS FUNCTION:
     - clears #sketchpad
     - reattaches the shared canvas
     - resets drawing state
     - runs the script ONCE

   IMPORTANT
   ---------
   Multiple draw calls *inside* runPattern() are expected
   and correct. This function resets ONCE per execution.
=========================================================== */
export function executeScriptToCanvas(mod, title) {
  const pad = document.getElementById("sketchpad");
  if (!pad) throw new Error("executeScriptToCanvas: #sketchpad not found");

  // --- ensure no stale DOM remains ---
  pad.innerHTML = "";
  pad.appendChild(window.drawCanvas);

  // --- reset drawing state deterministically ---
  resetCanvas();

  // --- primary execution path ---
  if (typeof mod.runPattern === "function") {
    mod.runPattern();
    return;
  }

  // --- secondary legacy-style path ---
  if (typeof mod.drawPattern === "function") {
    let params = {};
    if (typeof mod.initPattern === "function") {
      params = mod.initPattern();
    }
    mod.drawPattern(params);
    return;
  }

  // --- nothing usable found ---
  throw new Error(
    "executeScriptToCanvas: module has neither runPattern() nor drawPattern()"
  );
} // end executeScriptToCanvas


/* ===========================================================
   executeScriptToText(mod, title)
   ===========================================================
   RESPONSIBILITY
   --------------
   Execute a script that produces TEXT/HTML output
   (Utilities → Tools).

   DOES NOT TOUCH:
     - canvas
     - drawing state

   EXPECTED BEHAVIOR
   -----------------
   - runPattern() may return HTML
   - render() may return HTML
=========================================================== */
export function executeScriptToText(mod, title) {
  const text = document.getElementById("text");
  if (!text) throw new Error("executeScriptToText: #text not found");

  text.innerHTML = "";

  // --- preferred contract ---
  if (typeof mod.runPattern === "function") {
    const out = mod.runPattern();
    if (typeof out === "string") {
      text.innerHTML = out;
      return;
    }
    text.innerHTML = "<p>(Script executed — no HTML returned)</p>";
    return;
  }

  // --- alternate legacy contract ---
  if (typeof mod.render === "function") {
    const html = mod.render();
    if (typeof html === "string") {
      text.innerHTML = html;
      return;
    }
    text.innerHTML = "<p>(Script render() returned no HTML)</p>";
    return;
  }

  // --- nothing usable ---
  text.innerHTML = "<p style='color:red'>(No usable output from script)</p>";
  throw new Error(
    "Script has neither runPattern() nor render() — cannot output to text"
  );
} // end executeScriptToText
