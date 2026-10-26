/* figurePointer.js
   ============================================================
   Figures Tab -- Mouse and Keyboard in Points Mode
   ============================================================
   Role:
     While a figure is in points mode, the (transparent) interaction
     layer over the canvas receives the mouse. Only the active layer
     can be changed. A click (press and release without moving):

       on a numbered point         select it
       near a candidate            number that infrastructure point
                                   (anchored point) and select it
       anywhere else               a free point, numbered where you
                                   clicked
       Delete / Backspace          delete the selected point

     Numbered points are never dragged. The only draggable things are
     the object's own handles; an anchored point rides along with its
     object. Both this file and the interactor (interactor.js) listen
     at the same time in points mode. What keeps one press from doing
     both is that this file acts only on a click: a press that moves
     is the interactor dragging a handle, and does nothing here. A
     click on a handle does not move it, so a point can be placed on
     an end point.

     "Near" means within the hit radius, uiState.figures.hitRadius
     canvas pixels. Numbers are never reused.

   Exports:
     activatePointsInput(tabId, redraw)
     deactivatePointsInput()
   ============================================================ */

import { canvasLayerManager } from "/ui/canvasLayerManager.js";
import { uiState }            from "/ui/uiState.js";
import {
  findCandidate,
  findPoint,
  addAnchoredPoint,
  addFreePoint,
  deletePoint
} from "./figurePoints.js";

const CLICK_SLOP = 4;    // canvas pixels a press may move and still be a click

let controller = null;   // AbortController of the active listeners


/* ============================================================
   activatePointsInput(tabId, redraw)
   ------------------------------------------------------------
   redraw() redraws the whole figure. Replaces any earlier
   activation. Call this before armInteractor(): both size the
   same interaction layer, and the interactor draws the handles
   on it.
   ============================================================ */
export function activatePointsInput(tabId, redraw) {

  deactivatePointsInput();

  const layer = canvasLayerManager.get("interaction");
  const main  = window.drawCanvas;
  if (!layer || !main) return;

  layer.width  = main.width;
  layer.height = main.height;
  layer.getContext("2d").clearRect(0, 0, layer.width, layer.height);
  layer.style.display       = "block";
  layer.style.pointerEvents = "auto";

  controller = new AbortController();
  const { signal } = controller;

  const tabState = () => uiState.figures.tabs[tabId];

  const coords = (e) => {
    const rect = layer.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (layer.width  / rect.width),
      y: (e.clientY - rect.top)  * (layer.height / rect.height)
    };
  };

  let pressedAt = null;    // where the mouse went down, or null

  layer.addEventListener("mousedown", (e) => {
    pressedAt = coords(e);
  }, { signal });

  window.addEventListener("mouseup", (e) => {
    if (!pressedAt) return;
    const m = coords(e);
    const moved = Math.hypot(m.x - pressedAt.x, m.y - pressedAt.y);
    pressedAt = null;
    if (moved > CLICK_SLOP) return;           // a drag, not a click

    const ts = tabState();
    if (!ts) return;

    const radius = uiState.figures.hitRadius;
    const figure = ts.figure;

    let point = findPoint(figure, m.x, m.y, radius);

    if (!point) {
      const c = findCandidate(ts, m.x, m.y, radius);
      point = c ? addAnchoredPoint(figure, c)
                : addFreePoint(figure, m.x, m.y);
    }

    ts.selectedPoint = point.n;
    redraw();
  }, { signal });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Delete" && e.key !== "Backspace") return;
    if (uiState.activeTab !== "figures") return;

    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

    const ts = tabState();
    if (!ts || ts.selectedPoint == null) return;

    e.preventDefault();
    deletePoint(ts.figure, ts.selectedPoint);
    ts.selectedPoint = null;
    redraw();
  }, { signal });

} // end activatePointsInput


/* ============================================================
   deactivatePointsInput()
   ============================================================ */
export function deactivatePointsInput() {

  if (controller) {
    controller.abort();
    controller = null;
  }

  const layer = canvasLayerManager.get("interaction");
  if (layer) {
    layer.style.display       = "none";
    layer.style.pointerEvents = "none";
  }

} // end deactivatePointsInput

// end figurePointer.js
