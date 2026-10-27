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

     Click (a press that is not a drag; see below):

       on a numbered point         select it
       near a candidate            number that infrastructure point
                                   (anchored point) and select it
       anywhere else               a free point, numbered where you
                                   clicked
       Delete / Backspace          delete the selected point

     Right-click (Phase 8, figureWelds.js): toggles whether the disc
     under the cursor is welded. Already welded -> drops it out of its
     group. Not welded, with another disc (any layer, the same layer
     included, for tying a corner) at the same spot -> welds them. A
     bare infrastructure point is numbered first, but only if that
     lands it on an existing disc -- otherwise nothing happens. Either
     way a short message shows in the caption bar. The browser's own
     context menu is suppressed on both the right mousedown and the
     contextmenu event, so it never flashes up first.

     Both this file and the interactor listen at the same time in
     points mode. A press on a handle belongs to the interactor, so a
     disc is dragged only when the press is clear of the handles. A
     click on a handle does not move it, so a disc can be placed on
     an end point.

     What counts as a click: a press on a handle is a click only if it
     does not move (more than CLICK_SLOP), because a moving press is the
     handle being dragged. A press anywhere else is always a click at the
     spot where it went down, even if the hand slips, since dragging on
     empty canvas means nothing else. A press that dragged a free disc
     only selects it.

     A hidden active layer cannot be edited: its discs would not be
     drawn. Clicks are ignored then and the pointer shows "not-allowed".

     "Near" means within the hit radius, uiState.figures.hitRadius
     canvas pixels. Numbers are never reused.

   Exports:
     activatePointsInput(tabId, redraw)
     deactivatePointsInput()
   ============================================================ */

import { canvasLayerManager } from "/ui/canvasLayerManager.js";
import { uiState }            from "/ui/uiState.js";
import { PointPickerPresets } from "/ui/interactor.js";
import { applyTransform }      from "/draw/drawTransform.js";
import {
  findCandidate,
  findPoint,
  addAnchoredPoint,
  addFreePoint,
  moveFreePoint,
  deletePoint
} from "./figurePoints.js";
import { toggleWeldAt } from "./figureWelds.js";

const CLICK_SLOP = 4;    // canvas pixels a press may move and still be a click

// Points-mode cursor (Barry, 2026-10-27): the system crosshair sits dead
// center on the real cursor position, which buries the disc you're
// dragging right when you need to see it land on or near another one.
// This is a custom cursor instead: a dot, offset from the actual pointer
// position, joined to it by a thin line. The "2 2" after the url() is the
// hotspot -- the pixel of the SVG that the browser treats as the real
// cursor position -- and (2,2) is blank, so nothing is drawn over the
// point you're actually pointing at. CURSOR_OFFSET is how far away the
// visible dot sits; 14px clears a disc's own 9px radius plus its selected
// halo. Tune by eye and re-measure against MARKER_RADIUS/HALO_GAP in
// figurePoints.js if those ever change.
const CURSOR_OFFSET = 14;
const CURSOR_HOT = 2;
const CURSOR_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">` +
  `<line x1="${CURSOR_HOT}" y1="${CURSOR_HOT}" x2="${CURSOR_HOT + CURSOR_OFFSET}" y2="${CURSOR_HOT + CURSOR_OFFSET}" ` +
  `stroke="#1565c0" stroke-width="1.5"/>` +
  `<circle cx="${CURSOR_HOT + CURSOR_OFFSET}" cy="${CURSOR_HOT + CURSOR_OFFSET}" r="4" ` +
  `fill="#1565c0" stroke="white" stroke-width="1"/>` +
  `</svg>`;
const POINTS_CURSOR =
  `url("data:image/svg+xml,${encodeURIComponent(CURSOR_SVG)}") ${CURSOR_HOT} ${CURSOR_HOT}, crosshair`;

let controller = null;   // AbortController of the active listeners


/* ------------------------------------------------------------
   showWeldNotice(message)
   A short-lived note in the caption bar (Phase 8: weld created,
   removed, or nothing nearby to weld). Self-clearing, so it never
   needs to be remembered to be cleaned up.
   ------------------------------------------------------------ */
function showWeldNotice(message) {
  const caption = document.getElementById("caption");
  if (!caption) return;

  let el = document.getElementById("figureWeldNotice");
  if (!el) {
    el = document.createElement("span");
    el.id = "figureWeldNotice";
    el.style.cssText = "margin-left:12px; font-style:italic; opacity:0.85;";
    caption.appendChild(el);
  }
  el.textContent = message;
  clearTimeout(el._weldTimer);
  el._weldTimer = setTimeout(() => { el.textContent = ""; }, 2500);
} // end showWeldNotice


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

  // Resizing a canvas clears it, and the interactor may already have drawn
  // the handles here, so only resize when the size really differs.
  if (layer.width  !== main.width)  layer.width  = main.width;
  if (layer.height !== main.height) layer.height = main.height;
  layer.style.display       = "block";
  layer.style.pointerEvents = "auto";

  // True when the active layer is visible, so a disc placed on it can be seen.
  const editable = () => {
    const f = uiState.figures.tabs[tabId]?.figure;
    return !!f && !!f.layers[f.activeLayer]?.visible;
  };
  layer.style.cursor = editable() ? POINTS_CURSOR : "not-allowed";

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
    const xform = layerTransformOf(ts);
    return pts.some((p) => {
      const c = applyTransform(xform, p);        // handles are stored in object space
      return Math.hypot(c.x - x, c.y - y) < PointPickerPresets.hitTolerance;
    });
  };

  // The transform of the active layer, or null.
  const layerTransformOf = (ts) => ts.figure.layers[ts.figure.activeLayer]?.transform || null;

  let pressedAt = null;    // where the mouse went down, or null
  let dragged   = null;    // the free disc being dragged, or null
  let moved     = false;   // true once the press has moved more than a click
  let onHandleAtPress = false;   // the press began on a handle of the object

  layer.addEventListener("mousedown", (e) => {
    const ts = tabState();
    if (!ts) return;

    pressedAt = coords(e);
    moved     = false;
    dragged   = null;

    onHandleAtPress = onHandle(ts, pressedAt.x, pressedAt.y);
    if (onHandleAtPress) return;               // the interactor's

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
    moveFreePoint(dragged, m.x, m.y, layerTransformOf(ts));
    ts.selectedPoint = dragged.n;
    redraw();
  }, { signal });

  window.addEventListener("mouseup", (e) => {
    if (!pressedAt) return;
    const wasDrag  = moved;
    const wasFree  = dragged;
    const m        = pressedAt;               // a click happens where it went down
    pressedAt = null;
    dragged   = null;

    const ts = tabState();
    if (!ts) return;
    if (!editable()) return;                  // hidden active layer

    if (wasFree) {                            // on a free disc (maybe dragged): select it
      ts.selectedPoint = wasFree.n;
      redraw();
      return;
    }
    if (wasDrag && onHandleAtPress) return;   // the interactor dragged a handle

    const radius = uiState.figures.hitRadius;
    const figure = ts.figure;

    let point = findPoint(figure, m.x, m.y, radius);

    if (!point) {
      const c = findCandidate(ts, m.x, m.y, radius);
      point = c ? addAnchoredPoint(figure, c)
                : addFreePoint(figure, m.x, m.y, layerTransformOf(ts));
    }

    ts.selectedPoint = point.n;
    redraw();
  }, { signal });

  // Right-click: toggle the weld under the cursor (figureWelds.js).
  // Both the mousedown and the contextmenu event are suppressed, so the
  // browser's own menu never appears.
  layer.addEventListener("mousedown", (e) => {
    if (e.button === 2) e.preventDefault();
  }, { signal });

  layer.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const ts = tabState();
    if (!ts || !editable()) return;

    const m = coords(e);
    const result = toggleWeldAt(ts, m.x, m.y, uiState.figures.hitRadius);
    if (result.point) ts.selectedPoint = result.point.n;
    showWeldNotice(result.message);
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
