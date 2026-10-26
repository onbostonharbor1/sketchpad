/* figurePointer.js
   ============================================================
   Figures Tab -- Mouse and Keyboard in Points Mode
   ============================================================
   Role:
     While a figure is in points mode, the (transparent) interaction
     layer over the canvas receives the mouse. Only the active layer
     can be changed.

     Drag (press, move, release):
       on a free disc              moves it. This is the one thing in
                                   Figures that drags a disc: a free
                                   disc depends on nothing, so no
                                   drawing routine has to know about it
       on an anchored disc         nothing (it rides along with its
                                   object)
       on a handle of the object   the interactor drags the handle
                                   (interactor.js); a free disc under
                                   the handle stays put

     Click (press and release without moving):

       on a numbered point         select it
       near a candidate            number that infrastructure point
                                   (anchored point) and select it
       anywhere else               a free point, numbered where you
                                   clicked
       Delete / Backspace          delete the selected point

     Both this file and the interactor listen at the same time in
     points mode. A press on a handle belongs to the interactor, so a
     disc is dragged only when the press is clear of the handles. A
     click on a handle does not move it, so a disc can be placed on
     an end point.

     "Near" means within the hit radius, uiState.figures.hitRadius
     canvas pixels. Numbers are never reused.

   Exports:
     activatePointsInput(tabId, redraw)
     deactivatePointsInput()
   ============================================================ */

import { canvasLayerManager } from "/ui/canvasLayerManager.js";
import { uiState }            from "/ui/uiState.js";
import { PointPickerPresets } from "/ui/interactor.js";
import {
  findCandidate,
  findPoint,
  addAnchoredPoint,
  addFreePoint,
  moveFreePoint,
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

  // True when (x, y) is within grab range of a handle of the active
  // object, the same range the interactor uses.
  const onHandle = (ts, x, y) => {
    const pts = ts.instances?.[ts.figure.activeLayer]?.params?.points;
    if (!pts) return false;
    return pts.some((p) => Math.hypot(p.x - x, p.y - y) < PointPickerPresets.hitTolerance);
  };

  let pressedAt = null;    // where the mouse went down, or null
  let dragged   = null;    // the free disc being dragged, or null
  let moved     = false;   // true once the press has moved more than a click

  layer.addEventListener("mousedown", (e) => {
    const ts = tabState();
    if (!ts) return;

    pressedAt = coords(e);
    moved     = false;
    dragged   = null;

    if (onHandle(ts, pressedAt.x, pressedAt.y)) return;   // the interactor's

    const hit = findPoint(ts.figure, pressedAt.x, pressedAt.y, uiState.figures.hitRadius);
    if (hit && hit.kind === "free") dragged = hit;
  }, { signal });

  window.addEventListener("mousemove", (e) => {
    if (!pressedAt) return;
    const m = coords(e);
    if (!moved && Math.hypot(m.x - pressedAt.x, m.y - pressedAt.y) <= CLICK_SLOP) return;
    moved = true;

    if (!dragged) return;
    const ts = tabState();
    if (!ts) return;
    moveFreePoint(dragged, m.x, m.y);
    ts.selectedPoint = dragged.n;
    redraw();
  }, { signal });

  window.addEventListener("mouseup", (e) => {
    if (!pressedAt) return;
    const m = coords(e);
    const wasDrag = moved;
    pressedAt = null;
    dragged   = null;
    if (wasDrag) return;                      // a drag, not a click

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
