/* scriptRunner.js
   ------------------------------------------------------------
   Universal Script Loader + Execution Helpers
   ------------------------------------------------------------
   Used by:
     • Patterns tab      (canvas)
     • Gallery Scripts   (canvas)
     • Utilities → Lab   (canvas)
     • Utilities → Tools (text)

   Provides:
     1) loadScriptModule()     – dynamic ES-module loader
     2) executeScriptToCanvas() – runPattern()/drawPattern() to canvas
     3) executeScriptToText()   – runPattern()/render() to #text
   ------------------------------------------------------------
*/


/* ===========================================================
   loadScriptModule(modulePath)
   -----------------------------------------------------------
   Dynamically loads an ES module with fail-fast behavior.

   Arguments:
     modulePath (string) – relative module URL (e.g. "../patterns/foo.js")

   Returns:
     The imported module object.

   Notes:
     - Uses @vite-ignore to prevent Vite from rewriting paths.
     - Does not handle caching or execution.
=========================================================== */
export async function loadScriptModule(modulePath) {
  try {
    // MUST load exactly as written, no optional chaining.
    const mod = await import(/* @vite-ignore */ modulePath);
    return mod;
  } catch (err) {
    console.error("loadScriptModule error:", err);
    throw new Error(`Failed to load module: ${modulePath}`);
  }
} // end loadScriptModule



/* ===========================================================
   executeScriptToCanvas(mod, title)
   -----------------------------------------------------------
   Executes a script into the shared drawing canvas.

   Used by:
     • Patterns tab
     • Gallery tab (Scripts)
     • Utilities → Lab

   Behavior:
     - Clears #sketchpad
     - Appends window.drawCanvas
     - Clears canvas to white
     - Executes:
         mod.runPattern()   OR
         mod.drawPattern(params)

   Notes:
     - Never rewrites existing draw algorithms.
     - Matches Patterns/Gallery behavior exactly.
=========================================================== */
export function executeScriptToCanvas(mod, title) {
  const pad = document.getElementById("sketchpad");
  if (!pad) throw new Error("executeScriptToCanvas: #sketchpad not found");

  // Clear region and insert shared canvas
  pad.innerHTML = "";
  pad.appendChild(window.drawCanvas);

  // Reset canvas to white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);

  // ---- Execute drawing code (fail-fast style) ----
  if (typeof mod.runPattern === "function") {
    mod.runPattern();
    return;
  }

  if (typeof mod.drawPattern === "function") {
    let params = {};
    if (typeof mod.initPattern === "function") {
      params = mod.initPattern();
    }
    mod.drawPattern(params);
    return;
  }

  throw new Error(
    "Script module contains neither runPattern() nor drawPattern()"
  );
} // end executeScriptToCanvas



/* ===========================================================
   executeScriptToText(mod, title)
   -----------------------------------------------------------
   Executes a script and writes **HTML output** into #text.

   Used by:
     • Utilities → Tools

   Behavior:
     - Clears #text
     - Executes:
         mod.runPattern()    → may return HTML string
         mod.render()        → returns HTML string
     - Inserts HTML into #text

   Notes:
     - Does not modify canvas.
     - Tools scripts may return either HTML or plain text.
=========================================================== */
export function executeScriptToText(mod, title) {
  const text = document.getElementById("text");
  if (!text) throw new Error("executeScriptToText: #text not found");

  text.innerHTML = "";

  // ---- Preferred: runPattern() returns HTML ----
  if (typeof mod.runPattern === "function") {
    const out = mod.runPattern();
    if (typeof out === "string") {
      text.innerHTML = out;
      return;
    }
    // If nothing returned → show placeholder
    text.innerHTML = "<p>(Script executed — no HTML returned)</p>";
    return;
  }

  // ---- Alternative: render() produces HTML ----
  if (typeof mod.render === "function") {
    const html = mod.render();
    if (typeof html === "string") {
      text.innerHTML = html;
      return;
    }
    text.innerHTML = "<p>(Script render() returned no HTML)</p>";
    return;
  }

  // No supported entry point
  text.innerHTML = "<p style='color:red'>(No usable output from script)</p>";
  throw new Error(
    "Script has neither runPattern() nor render() — cannot output to text"
  );
} // end executeScriptToText

