/* homeResults.js
   ============================================================
   Home Tab — Results Display and Rendering
   ============================================================
   Role:
     Owns everything related to displaying a selected Home entry
     in the Results view. Home supports two entry types:

       • JS entries  — executed as ES modules into the shared
                       canvas (#sketchpad) via runScriptByPath().
                       Parameter controls are enabled.

       • Image entries — displayed as <img> elements in #text.
                         Sized to fit within 800×800px.

     The render token mechanism (from homeState.js) prevents
     stale async renders from overwriting the DOM when the user
     clicks a new entry before the previous render completes.

   Architectural rules:
     • Does NOT build subtabs or category frames. homeNav.js.
     • Does NOT build the caption bar. homeMenuCmds.js.
       setHomeCaptionForResult() is called by homeNav.js (on
       category click) and by this file (on Results restore).
     • Does NOT load the manifest. homeManifest.js.
     • Reads/writes the render token via homeState.js.

   Exports:
     renderHomeResults()             — main Results entry point
     isJsPath(p)                     — path type utility
     isImagePath(p)                  — path type utility
     deriveHomeOriginFromPath(path)  — human-readable origin label
   ============================================================ */

import { runScriptByPath } from "../scriptRunner.js";
import {
  incrementHomeResultsRenderToken,
  getHomeResultsRenderToken
} from "./homeState.js";


/* ============================================================
   renderHomeResults()
   ============================================================
   Main entry point for the Results view. Reads the active entry
   from uiState.home.saved and routes to the correct renderer.

   Sequence:
     1. Increment the render token (marks any in-flight render stale).
     2. Validate the active entry exists and is not a drawRegistry item.
     3. Clear #text and #action regions.
     4. Set the caption bar for this entry.
     5. Route to JS or image renderer based on entry.path extension.

   drawRegistry entries are explicitly rejected here because they
   are launch-only — they open in Draw rather than rendering in
   Home Results. If one somehow ends up as the active entry,
   that is a state management bug that should fail loudly.

   Called by:
     switchHomeView(HOME_VIEW_RESULTS) — in homeNav.js
   ============================================================ */
export async function renderHomeResults() {

  const saved = uiState.home?.saved;
  if (!saved) throw new Error("renderHomeResults: uiState.home.saved missing");

  /* ── 1. Bump render token ───────────────────────────────── */
  /* Any in-flight render from a previous click becomes stale. */
  const myToken = incrementHomeResultsRenderToken();

  const entry = saved.activeEntry;
  if (!entry) throw new Error("renderHomeResults: activeEntry missing");

  /* ── 2. Guard against drawRegistry items ────────────────── */
  if (entry.sourceType === "drawRegistry") {
    throw new Error(
      "renderHomeResults: drawRegistry items are launch-only and cannot " +
      "be rendered in Home Results: " + String(entry.path || entry.file)
    );
  }

  /* ── 3. Clear text and action regions ───────────────────── */
  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("renderHomeResults: #text missing");
  textDiv.innerHTML = "";

  const actionDiv = document.getElementById("action");
  if (!actionDiv) throw new Error("renderHomeResults: #action missing");
  actionDiv.innerHTML = "";

  /* ── 4. Set caption bar ─────────────────────────────────── */
  const { setHomeCaptionForResult } = await import("./homeMenuCmds.js");
  setHomeCaptionForResult(entry);

  /* ── 5. Route to correct renderer ───────────────────────── */
  if (isJsPath(entry.path)) {
    await renderHomeJsEntryToCanvas(entry, myToken);
    return;
  }

  if (isImagePath(entry.path)) {
    await renderHomeImageEntryToText(entry, myToken);
    return;
  }

  /* Unsupported type — show error in both regions and fail fast. */
  const padDiv = document.getElementById("sketchpad");
  if (padDiv) padDiv.innerHTML = "<p>(Unsupported result type)</p>";
  textDiv.innerHTML =
    "<p><b>Home:</b> Unsupported result type for: " + entry.path + "</p>";

  throw new Error("renderHomeResults: unsupported result type: " + entry.path);

} // end renderHomeResults


/* ============================================================
   renderHomeJsEntryToCanvas(entry, token)
   ============================================================
   Executes a JS entry as an ES module into the shared canvas
   (#sketchpad) via runScriptByPath().

   An overlay container (#canvasOverlayLayers) is created if
   it does not exist, because the script runner's armInteractor
   requires a DOM stage to work with.

   Token check: if the token is stale (a newer click has taken
   over), execution proceeds but the result will be overwritten.
   The token is checked by the caller after awaiting this function;
   individual internal await points do not check it because the
   script runner does not support cancellation.

   Arguments:
     entry   — the active manifest entry (must include .path)
     token   — the render token captured at the start of renderHomeResults()
   ============================================================ */
async function renderHomeJsEntryToCanvas(entry, token) {

  const padDiv = document.getElementById("sketchpad");
  if (!padDiv) throw new Error("renderHomeJsEntryToCanvas: #sketchpad missing");

  /* Ensure the overlay container exists for armInteractor. */
  let overlay = document.getElementById("canvasOverlayLayers");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "canvasOverlayLayers";
    padDiv.appendChild(overlay);
  }

  /* Execute the script with parameter controls enabled.
     Controls are rendered into #action. */
  try {
    await runScriptByPath(entry.path, "canvas", {
      canvasRegionId:  "sketchpad",
      enableControls:  true,
      controlsRegionId: "action"
    });
  } catch (err) {
    showHomeResultsError("execute", err);
  }

} // end renderHomeJsEntryToCanvas


/* ============================================================
   renderHomeImageEntryToText(entry, myToken)
   ============================================================
   Loads an image from entry.path and displays it in #text.

   Loading is done via a Promise-wrapped Image() object so we
   can detect load failure before touching the DOM. The token
   is checked after the async load resolves — if a newer click
   has taken over, the stale render aborts without writing.

   Image sizing matches Gallery's display behavior:
   max 800×800px, centred, block display.

   Arguments:
     entry   — the active manifest entry (must include .path)
     myToken — the render token captured at the start of renderHomeResults()
   ============================================================ */
async function renderHomeImageEntryToText(entry, myToken) {

  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("renderHomeImageEntryToText: #text missing");

  textDiv.innerHTML = "<p>(Loading image...)</p>";

  const img = new Image();

  /* Wait for the image to load or fail before touching the DOM. */
  const loaded = await new Promise((resolve) => {
    img.onload  = () => resolve({ ok: true  });
    img.onerror = () => resolve({ ok: false });
    img.src = entry.path;
  });

  /* Token check: abort if a newer render has taken over. */
  if (myToken !== getHomeResultsRenderToken()) return;

  if (!loaded.ok) {
    textDiv.innerHTML =
      "<p><b>Home:</b> Image failed to load.</p>" +
      "<p>Path: " + entry.path + "</p>";
    throw new Error("renderHomeImageEntryToText: image failed to load: " + entry.path);
  }

  /* Size to fit — matches Gallery's image display behavior. */
  img.style.display   = "block";
  img.style.maxWidth  = "800px";
  img.style.maxHeight = "800px";
  img.style.margin    = "0 auto";

  textDiv.innerHTML = "";
  textDiv.appendChild(img);

} // end renderHomeImageEntryToText


/* ============================================================
   clearHomeCanvasAndOverlays()
   ============================================================
   Resets the shared canvas context to a known clean state
   and clears the overlay layer container.

   Prior scripts may leave the canvas context in a transformed
   or composited state. clearRect() is affected by transforms,
   so the transform must be reset before clearing.

   Called by:
     Script cleanup logic when leaving the Results view.
   ============================================================ */
export function clearHomeCanvasAndOverlays() {

  const canvas = window.drawCanvas;
  if (!canvas) throw new Error("clearHomeCanvasAndOverlays: window.drawCanvas missing");

  const c = window.ctx;
  if (!c) throw new Error("clearHomeCanvasAndOverlays: window.ctx missing");

  /* Reset all transform and composite state before clearing. */
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha            = 1;
  c.globalCompositeOperation = "source-over";

  /* Clear to white so every new script starts from a known background. */
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, canvas.width, canvas.height);

  /* Clear interaction overlay layers if present. */
  const layers = document.getElementById("canvasOverlayLayers");
  if (layers) layers.innerHTML = "";

} // end clearHomeCanvasAndOverlays


/* ============================================================
   showHomeResultsError(where, err)
   ============================================================
   Displays an error message in #sketchpad and rethrows the
   error to preserve the full stack trace in the console.

   The rethrow is intentional — this is a fail-fast architecture.
   Silently swallowing errors here would make debugging much harder.

   Arguments:
     where — a short label for which step failed ("load" | "execute")
     err   — the caught Error object
   ============================================================ */
function showHomeResultsError(where, err) {

  const padDiv = document.getElementById("sketchpad");
  if (!padDiv) throw new Error("showHomeResultsError: #sketchpad missing");

  const msg = (err && err.message) ? err.message : String(err);

  padDiv.innerHTML =
    "<p style='color:red; font-weight:700; margin:10px 0'>" +
    "Home Results error (" + where + "): " + msg +
    "</p>";

  /* Rethrow so the console shows the real stack. */
  throw err;

} // end showHomeResultsError


/* ============================================================
   Path type utilities
   ============================================================
   Small pure functions used to determine how to render an
   entry based on its file extension.
   ============================================================ */

/* isJsPath(p)
   -----------
   Returns true if the path ends with ".js" (case-insensitive).
   Fails fast if p is not a string. */
export function isJsPath(p) {
  if (typeof p !== "string") throw new Error("isJsPath: path must be a string");
  return p.toLowerCase().endsWith(".js");
} // end isJsPath


/* isImagePath(path)
   -----------------
   Returns true for paths ending in common image extensions:
   .png, .jpg, .jpeg (case-insensitive). */
export function isImagePath(path) {
  const dot = path.lastIndexOf(".");
  if (dot < 0) return false;

  const ext = path.slice(dot + 1).toLowerCase();
  return ext === "png" || ext === "jpg" || ext === "jpeg";
} // end isImagePath


/* deriveHomeOriginFromPath(path)
   -------------------------------
   Returns a human-readable origin label based on the rooted
   path prefix. Used to display where a Home entry came from.

   Arguments:
     path — rooted content path (e.g. "/patterns/curve_stitch/...")

   Returns:
     A label string: "Patterns" | "Gallery" | "Utilities" |
     "Draw" | "Home" | "Unknown"
*/
export function deriveHomeOriginFromPath(path) {

  if (typeof path !== "string" || !path.length) return "Unknown";

  const p = path.toLowerCase();

  if (p.startsWith("/patterns/"))    return "Patterns";
  if (p.startsWith("/gallery/"))     return "Gallery";
  if (p.startsWith("/utilities/"))   return "Utilities";
  if (p.startsWith("/drawregistry/")) return "Draw";
  if (p.startsWith("/home/"))        return "Home";

  return "Unknown";

} // end deriveHomeOriginFromPath
