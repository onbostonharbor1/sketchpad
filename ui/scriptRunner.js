/* scriptRunner.js
   ------------------------------------------------------------
   Universal Script Loader + Execution Helpers  (COMPAT FIX)
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
     - executes them deterministically
     - optionally builds parameter controls
     - routes output either to canvas or to #text

   ------------------------------------------------------------
   USED BY
   -------
     • Patterns tab      → canvas
     • Gallery Scripts   → canvas
     • Utilities → Lab   → canvas
     • Utilities → Tools → text

   ------------------------------------------------------------
   CONTRACT (CANVAS SCRIPTS)
   -------------------------
   REQUIRED:
     - export function runPattern()

   COMPATIBILITY SUPPORT (important):
     - runPattern() may be declared as:
         runPattern()
       OR
         runPattern(ctx)
       The runner will pass ctx ONLY when the function declares
       at least one parameter.

   OPTIONAL (parameterControls support):
     - export const scriptInfo = { ... }
       where scriptInfo.parameters (or .params) exists
     - scriptInfo.redrawHandler may be set by the script during runPattern()

   ------------------------------------------------------------
   CONTRACT (TEXT SCRIPTS)
   -----------------------
   REQUIRED:
     - export function runPattern()   returning HTML string
   OPTIONAL:
     - export function render()       returning HTML string

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

/*
   ParameterControls builder.
   NOTE: Optional behavior. If a script does not export scriptInfo,
   no controls are built and the script still runs.
*/
import { buildParameterControls } from "/ui/parameterControls.js";


/* ===========================================================
   loadScriptModule(path)
=========================================================== */
export async function loadScriptModule(path) {

  if (typeof path !== "string" || path.trim() === "") {
    throw new Error("loadScriptModule: path must be a non-empty string");
  }

  let spec = path.trim();

  // normalize to rooted URL
  if (!spec.startsWith("/")) spec = "/" + spec;

  // remove accidental double slashes
  while (spec.startsWith("//")) spec = spec.slice(1);

  // cache busting (dev)
  const bust = "t=" + Date.now();
  spec = (spec.indexOf("?") >= 0) ? (spec + "&" + bust) : (spec + "?" + bust);

  // probe fetch to avoid Vite index.html masquerading as JS
  const res = await fetch(spec, { cache: "no-store" });

  const ct = (res.headers.get("content-type") || "").toLowerCase();

  if (!res.ok) {
    throw new Error(
      "loadScriptModule: fetch failed " + res.status +
      " for " + spec +
      " (content-type: " + ct + ")"
    );
  }

  if (ct.indexOf("javascript") === -1 && ct.indexOf("ecmascript") === -1) {
    const body = await res.text();
    const snippet = body.slice(0, 200).replace(/\s+/g, " ");
    throw new Error(
      "loadScriptModule: non-JS response for " + spec +
      " (content-type: " + ct + ") snippet: " + snippet
    );
  }

  // dynamic ES module import
  const mod = await import(/* @vite-ignore */ spec);

  if (!mod || typeof mod.runPattern !== "function") {
    throw new Error(
      "loadScriptModule: module has no exported runPattern(): " + path
    );
  }

  return mod;

} // end loadScriptModule


/* ===========================================================
   normalizeScriptInfo(mod)
   -----------------------------------------------------------
   Ensure scriptInfo vocabulary consistency:
     - scriptInfo.parameters <-> scriptInfo.params
=========================================================== */
function normalizeScriptInfo(mod) {

  if (!mod) throw new Error("normalizeScriptInfo: mod missing");

  const info = mod.scriptInfo;
  if (!info) return null;

  if (info.params && !info.parameters) {
    info.parameters = info.params;
  } else if (info.parameters && !info.params) {
    info.params = info.parameters;
  }

  return info;

} // end normalizeScriptInfo


/* ===========================================================
   attachCanvasToRegion(regionId)
=========================================================== */
function attachCanvasToRegion(regionId) {

  if (!regionId) throw new Error("attachCanvasToRegion: regionId missing");

  const host = document.getElementById(regionId);
  if (!host) throw new Error("attachCanvasToRegion: #" + regionId + " not found");

  const canvas = window.drawCanvas;
  if (!canvas) throw new Error("attachCanvasToRegion: window.drawCanvas missing");

  host.innerHTML = "";
  host.appendChild(canvas);

  return host;

} // end attachCanvasToRegion


/* ===========================================================
   clearCanvasBackground(color = "#ffffff")
=========================================================== */
function clearCanvasBackground(color = "#ffffff") {

  const canvas = window.drawCanvas;
  if (!canvas) throw new Error("clearCanvasBackground: window.drawCanvas missing");

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

} // end clearCanvasBackground


/* ===========================================================
   buildControlsIfPresent(mod, options)
   -----------------------------------------------------------
   Builds parameter controls ONLY if scriptInfo exists AND
   caller requests controls.

   No redraw is forced here. If a script wants redraw-on-control
   creation, it can set scriptInfo.redrawHandler and the control
   system will call it via its own onChange wiring..

   IMPORTANT:
   - Controls must be built into a known region. In Sketchpad,
     that is #action by convention for canvas scripts.
=========================================================== */
function buildControlsIfPresent(mod, options) {

  if (!mod) throw new Error("buildControlsIfPresent: mod missing");
  if (!options) throw new Error("buildControlsIfPresent: options missing");

  if (!options.enableControls) return;

  const info = normalizeScriptInfo(mod);
  if (!info) return; // script has no scriptInfo => no controls

  if (!info.parameters) {
    throw new Error("buildControlsIfPresent: scriptInfo exists but has no parameters/params");
  }

  // Ensure parameterControls knows where to render.
  // Default for canvas scripts is #action.
  info.targetId = options.controlsRegionId || "action";

  buildParameterControls(info);

} // end buildControlsIfPresent


/* ===========================================================
   executeScriptToCanvas(mod, title, options)
   ===========================================================
   Execute a module into the shared canvas.

   DEFAULTS
   --------
   - attaches canvas to #sketchpad
   - resetCanvas() each run
   - clears white background
   - runs runPattern() once (compat: may pass ctx)
   - optionally builds parameterControls if scriptInfo exists

   CONTROLS
   --------
   - controlsRegionId defaults to #action

   CONTRACT:
   - Always calls mod.runPattern() with NO arguments.
   - Relies on the global 'ctx' getter defined in drawState.js.
=========================================================== */
export async function executeScriptToCanvas(mod, title, options = {}) {

  if (!mod) throw new Error("executeScriptToCanvas: mod missing");

  const regionId = options.canvasRegionId || "sketchpad";

  // Ensure the physical canvas is in the right place
  attachCanvasToRegion(regionId);

  // Blue Core State Reset (re-triggers your global ctx getter logic)
  resetCanvas();

  const clearBg = (options.clearBackground !== false);
  if (clearBg) {
    // We can use the bare 'ctx' here because of your global getter
    ctx.fillStyle = options.backgroundColor || "#ffffff";
    ctx.fillRect(0, 0, drawState.canvasWidth, drawState.canvasHeight);
  }

  /* DEBUG BREAKPOINT LOCATION:
     Set your breakpoint here. Step into (F11) to debug the script.
  */
  await mod.runPattern();

  // Optional parameter controls
  buildControlsIfPresent(mod, {
    enableControls: !!options.enableControls,
    controlsRegionId: options.controlsRegionId || "action"
  });

} // end executeScriptToCanvas


/* ===========================================================
   executeScriptToText(mod, title, options)
=========================================================== */
export async function executeScriptToText(mod, title, options = {}) {

  if (!mod) throw new Error("executeScriptToText: mod missing");

  const regionId = options.textRegionId || "text";

  const text = document.getElementById(regionId);
  if (!text) throw new Error("executeScriptToText: #" + regionId + " not found");

  text.innerHTML = "";

  // preferred contract
  if (typeof mod.runPattern === "function") {
    const out = await mod.runPattern();
    if (typeof out === "string") {
      text.innerHTML = out;
      return out;
    }
    text.innerHTML = "<p>(Script executed — no HTML returned)</p>";
    return out;
  }

  // alternate legacy contract
  if (typeof mod.render === "function") {
    const html = await mod.render();
    if (typeof html === "string") {
      text.innerHTML = html;
      return html;
    }
    text.innerHTML = "<p>(Script render() returned no HTML)</p>";
    return html;
  }

  text.innerHTML = "<p style='color:red'>(No usable output from script)</p>";
  throw new Error(
    "executeScriptToText: script has neither runPattern() nor render()"
  );

} // end executeScriptToText


/* ===========================================================
   runScriptByPath(path, mode, options)
=========================================================== */
export async function runScriptByPath(path, mode, options = {}) {

  const mod = await loadScriptModule(path);

  if (mode === "canvas") {
    return await executeScriptToCanvas(mod, path, options);
  }

  if (mode === "text") {
    return await executeScriptToText(mod, path, options);
  }

  throw new Error("runScriptByPath: invalid mode '" + String(mode) + "'");

} // end runScriptByPath
