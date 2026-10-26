/* figurePointer.js
   ============================================================
   Figures Tab -- Mouse and Keyboard in Points Mode
   ============================================================
   Role:
     While a figure is in points mode, the (transparent) interaction
     layer over the canvas receives the mouse:

       press on a numbered point  select it, and drag to move it
       press near a candidate     number that infrastructure point
                                  (anchored point) and select it
       press anywhere else        a free point, numbered where you
                                  clicked
       Delete / Backspace         delete the selected point

     "Near" means within the hit radius, uiState.figures.hitRadius
     canvas pixels. Numbers are never reused. Object handles are off
     in points mode; only points can be dragged.

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
  movePoint,
  deletePoint
} from "./figurePoints.js";

let controller = null;   // AbortController of the active listeners


/* ============================================================
   activatePointsInput(tabId, redraw)
   ------------------------------------------------------------
   redraw() redraws the whole figure. Replaces any earlier
   activation.
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

  let dragging = null;     // the point being dragged

  const tabState = () => uiState.figures.tabs[tabId];

  const coords = (e) => {
    const rect = layer.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (layer.width  / rect.width),
      y: (e.clientY - rect.top)  * (layer.height / rect.height)
    };
  };

  layer.addEventListener("mousedown", (e) => {
    const ts = tabState();
    if (!ts) return;

    const m      = coords(e);
    const radius = uiState.figures.hitRadius;
    const figure = ts.figure;

    let point = findPoint(figure, m.x, m.y, radius);

    if (!point) {
      const c = findCandidate(ts, m.x, m.y, radius);
      point = c ? addAnchoredPoint(figure, c)
                : addFreePoint(figure, m.x, m.y);
    }

    ts.selectedPoint = point.n;
    dragging = point;
    redraw();
  }, { signal });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const ts = tabState();
    if (!ts) return;

    const m = coords(e);
    movePoint(ts, dragging, m.x, m.y);
    redraw();
  }, { signal });

  window.addEventListener("mouseup", () => { dragging = null; }, { signal });

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
