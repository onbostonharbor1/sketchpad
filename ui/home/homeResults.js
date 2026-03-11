/* homeResults.js
   ============================================================
   Home Tab -- Results Display and Rendering
   ============================================================
   Role:
     Owns everything related to displaying a selected Home entry
     in the Results view. Supports two entry types:
       * JS entries   -- executed as ES modules into the shared canvas.
       * Image entries -- displayed as <img> elements in #text.

     The render token mechanism prevents stale async renders from
     overwriting the DOM when the user clicks a new entry before
     the previous render completes.

   Architectural rules:
     * Does NOT build subtabs or category frames. homeNav.js.
     * Does NOT build the caption bar. homeMenuCmds.js.
     * Does NOT load the manifest. homeManifest.js.
     * Reads/writes the render token via homeState.js.

   Exports:
     renderHomeResults()
     isJsPath(p)
     isImagePath(p)
     deriveHomeOriginFromPath(path)
   ============================================================ */

import { runScriptByPath }                from "/ui/scriptRunner.js";
import {
  incrementHomeResultsRenderToken,
  getHomeResultsRenderToken
}                                         from "./homeState.js";


/* ============================================================
   renderHomeResults()
   ============================================================ */
export async function renderHomeResults() {

  const saved = uiState.home?.saved;
  if (!saved) throw new Error("renderHomeResults: uiState.home.saved missing");

  const myToken = incrementHomeResultsRenderToken();

  const entry = saved.activeEntry;
  if (!entry) throw new Error("renderHomeResults: activeEntry missing");

  if (entry.sourceType === "drawRegistry") {
    throw new Error(
      "renderHomeResults: drawRegistry items are launch-only and cannot " +
      "be rendered in Home Results: " + String(entry.path || entry.file)
    );
  }

  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("renderHomeResults: #text missing");
  textDiv.innerHTML = "";

  const actionDiv = document.getElementById("action");
  if (!actionDiv) throw new Error("renderHomeResults: #action missing");
  actionDiv.innerHTML = "";

  const { setHomeCaptionForResult } = await import("/ui/home/homeMenuCmds.js");
  setHomeCaptionForResult(entry);

  if (isJsPath(entry.path)) {
    await renderHomeJsEntryToCanvas(entry, myToken);
    return;
  }

  if (isImagePath(entry.path)) {
    await renderHomeImageEntryToText(entry, myToken);
    return;
  }

  const padDiv = document.getElementById("sketchpad");
  if (padDiv) padDiv.innerHTML = "<p>(Unsupported result type)</p>";
  textDiv.innerHTML =
    "<p><b>Home:</b> Unsupported result type for: " + entry.path + "</p>";

  throw new Error("renderHomeResults: unsupported result type: " + entry.path);

} // end renderHomeResults


/* ============================================================
   renderHomeJsEntryToCanvas(entry, token)
   ============================================================ */
async function renderHomeJsEntryToCanvas(entry, token) {

  const padDiv = document.getElementById("sketchpad");
  if (!padDiv) throw new Error("renderHomeJsEntryToCanvas: #sketchpad missing");

  let overlay = document.getElementById("canvasOverlayLayers");
  if (!overlay) {
    overlay    = document.createElement("div");
    overlay.id = "canvasOverlayLayers";
    padDiv.appendChild(overlay);
  }

  try {
    await runScriptByPath(entry.path, "canvas", {
      canvasRegionId:   "sketchpad",
      enableControls:   true,
      controlsRegionId: "action"
    });
  } catch (err) {
    showHomeResultsError("execute", err);
  }

} // end renderHomeJsEntryToCanvas


/* ============================================================
   renderHomeImageEntryToText(entry, myToken)
   ============================================================ */
async function renderHomeImageEntryToText(entry, myToken) {

  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("renderHomeImageEntryToText: #text missing");

  textDiv.innerHTML = "<p>(Loading image...)</p>";

  const img    = new Image();
  const loaded = await new Promise((resolve) => {
    img.onload  = () => resolve({ ok: true  });
    img.onerror = () => resolve({ ok: false });
    img.src = entry.path;
  });

  if (myToken !== getHomeResultsRenderToken()) return;

  if (!loaded.ok) {
    textDiv.innerHTML =
      "<p><b>Home:</b> Image failed to load.</p>" +
      "<p>Path: " + entry.path + "</p>";
    throw new Error("renderHomeImageEntryToText: image failed to load: " + entry.path);
  }

  img.style.display   = "block";
  img.style.maxWidth  = "800px";
  img.style.maxHeight = "800px";
  img.style.margin    = "0 auto";

  textDiv.innerHTML = "";
  textDiv.appendChild(img);

} // end renderHomeImageEntryToText


/* ============================================================
   clearHomeCanvasAndOverlays()
   ============================================================ */
export function clearHomeCanvasAndOverlays() {

  const canvas = window.drawCanvas;
  if (!canvas) throw new Error("clearHomeCanvasAndOverlays: window.drawCanvas missing");

  const c = window.ctx;
  if (!c) throw new Error("clearHomeCanvasAndOverlays: window.ctx missing");

  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha              = 1;
  c.globalCompositeOperation = "source-over";
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, canvas.width, canvas.height);

  const layers = document.getElementById("canvasOverlayLayers");
  if (layers) layers.innerHTML = "";

} // end clearHomeCanvasAndOverlays


/* ============================================================
   showHomeResultsError(where, err)
   ============================================================ */
function showHomeResultsError(where, err) {

  const padDiv = document.getElementById("sketchpad");
  if (!padDiv) throw new Error("showHomeResultsError: #sketchpad missing");

  const msg = (err && err.message) ? err.message : String(err);
  padDiv.innerHTML =
    "<p style='color:red; font-weight:700; margin:10px 0'>" +
    "Home Results error (" + where + "): " + msg + "</p>";

  throw err;

} // end showHomeResultsError


/* ============================================================
   Path type utilities
   ============================================================ */
export function isJsPath(p) {
  if (typeof p !== "string") throw new Error("isJsPath: path must be a string");
  return p.toLowerCase().endsWith(".js");
} // end isJsPath

export function isImagePath(path) {
  const dot = path.lastIndexOf(".");
  if (dot < 0) return false;
  const ext = path.slice(dot + 1).toLowerCase();
  return ext === "png" || ext === "jpg" || ext === "webp" || ext === "jpeg";
} // end isImagePath

export function deriveHomeOriginFromPath(path) {
  if (typeof path !== "string" || !path.length) return "Unknown";
  const p = path.toLowerCase();
  if (p.startsWith("/patterns/"))     return "Patterns";
  if (p.startsWith("/gallery/"))      return "Gallery";
  if (p.startsWith("/utilities/"))    return "Utilities";
  if (p.startsWith("/drawregistry/")) return "Draw";
  if (p.startsWith("/home/"))         return "Home";
  return "Unknown";
} // end deriveHomeOriginFromPath
