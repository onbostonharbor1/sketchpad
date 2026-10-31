/* figureCentroid.js
   ============================================================
   Figures Tab -- Centroid, Bounding Box and Rotation (Phase 7b)
   ============================================================
   Role:
     Moves and turns a whole layer. The active layer shows a small diamond
     at its centroid. Drag the diamond to move the layer. Click it to select
     it: a padded bounding box appears with one round rotation handle on a
     stem above the top edge. Drag that handle to turn the layer about the
     centroid. With the diamond selected the arrow keys move the layer 1 px
     (10 with Shift).

     Nothing in the object changes. Moving or turning only edits the
     layer's transform (layer.transform = { angle, tx, ty }, see
     draw/drawTransform.js); the object keeps drawing in its own coordinates
     and drawLine maps them. So a handle, a stitch count, a slider all keep
     meaning what they meant.

   Where things come from:
     bounds    drawLine notes every end it draws into drawState.bounds while
               a layer draws; redrawFigure keeps the result in
               instance.bounds (object space, before the transform).
     centroid  the center of those bounds. (The center of the bounding box,
               not an average of the points: it is cheap, steady while the
               shape is edited, and the same for every object.)
     box       the bounds grown by BOX_PAD on every side, turned by the
               layer's angle.

   Rules:
     * Only the active layer has a centroid, and only while it is visible.
       Show All (preview), final mode and points mode hide it. Points mode
       is left alone on purpose: the middle of a Line is both its centroid
       and the natural place for a disc, and a click must reach the disc.
     * A press on the centroid or the rotation handle wins over an object
       handle under it (centroidHit; the interactor asks).
     * Selecting a layer, hiding it, or toggling points mode deselects.
       The selection is tabState.centroidSelected (not saved).
     * Not built: scaling, snapping the angle with Shift.

   The drawing goes on the "bbox" overlay canvas, which is otherwise
   unused in Figures. The mouse is read from window, like interactor.js, so
   an object with no handles still works.

   Exports:
     activateCentroid(tabId, redraw)
     deactivateCentroid()
     centroidHit(tabState, x, y)
     drawCentroid(tabState)
   ============================================================ */

import { canvasLayerManager } from "/ui/canvasLayerManager.js";
import { uiState }            from "/ui/uiState.js";
import { refreshInteractor }  from "/ui/interactor.js";
import { drawState }          from "/draw/drawState.js";
import {
  newTransform,
  applyTransform,
  translateTransform,
  rotateTransformAbout
} from "/draw/drawTransform.js";
import { snapshotWeldMembers, propagateAfterChange } from "./figureWelds.js";

const BOX_PAD     = 6;     // box margin around the bounds, canvas pixels
const STEM        = 26;    // from the box's top edge up to the rotation handle
const DIAMOND     = 7;     // half-size of the centroid diamond
const HANDLE_R    = 6;     // radius of the rotation handle
const HIT_RADIUS  = 9;     // grab range of the diamond and of the handle
const NUDGE       = 1;     // arrow key step; Shift makes it 10
const NUDGE_SHIFT = 10;
const COLOR       = "#1565c0";
const COLOR_ON    = "#FE8A18";   // selected (same orange as an active handle)

let controller = null;   // AbortController of the active listeners


/* ------------------------------------------------------------
   geometry(tabState)
   Where everything is, in canvas pixels, or null when the active layer has
   no centroid right now (none, hidden, nothing drawn, Show All).
   Returns { center, corners[4], stemFrom, handle }.
   ------------------------------------------------------------ */
function geometry(ts) {

  if (!ts || !ts.figure || ts.preview || drawState.final) return null;
  if (ts.mode === "points") return null;     // see "Rules" in the header

  const figure = ts.figure;
  const layer  = figure.layers[figure.activeLayer];
  const inst   = ts.instances?.[figure.activeLayer];
  const b      = inst?.bounds;
  if (!layer || !layer.visible || !b || !isFinite(b.minX)) return null;

  const t  = layer.transform || null;
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const x0 = b.minX - BOX_PAD, x1 = b.maxX + BOX_PAD;
  const y0 = b.minY - BOX_PAD, y1 = b.maxY + BOX_PAD;

  return {
    center:   applyTransform(t, { x: cx, y: cy }),
    corners:  [
      applyTransform(t, { x: x0, y: y0 }),
      applyTransform(t, { x: x1, y: y0 }),
      applyTransform(t, { x: x1, y: y1 }),
      applyTransform(t, { x: x0, y: y1 })
    ],
    stemFrom: applyTransform(t, { x: cx, y: y0 }),
    handle:   applyTransform(t, { x: cx, y: y0 - STEM })
  };

} // end geometry


/* ============================================================
   centroidHit(tabState, x, y)
   ------------------------------------------------------------
   True when canvas point (x, y) is on the diamond, or on the rotation
   handle while the diamond is selected.
   ============================================================ */
export function centroidHit(ts, x, y) {

  const g = geometry(ts);
  if (!g) return false;

  if (Math.hypot(g.center.x - x, g.center.y - y) < HIT_RADIUS) return true;
  return !!ts.centroidSelected && Math.hypot(g.handle.x - x, g.handle.y - y) < HIT_RADIUS;

} // end centroidHit


/* ============================================================
   drawCentroid(tabState)
   ------------------------------------------------------------
   Clears the overlay and draws the diamond (and, when selected, the box,
   stem and rotation handle) of the active layer.
   ============================================================ */
export function drawCentroid(ts) {

  const canvas = canvasLayerManager.get("bbox");
  if (!canvas) return;
  const c = canvas.getContext("2d");
  c.clearRect(0, 0, canvas.width, canvas.height);

  const g = geometry(ts);
  if (!g) return;

  const on = !!ts.centroidSelected;

  if (on) {
    c.save();
    c.strokeStyle = COLOR;
    c.lineWidth   = 1;
    c.setLineDash([5, 4]);
    c.beginPath();
    g.corners.forEach((p, i) => (i === 0 ? c.moveTo(p.x, p.y) : c.lineTo(p.x, p.y)));
    c.closePath();
    c.stroke();
    c.setLineDash([]);

    c.beginPath();                       // stem
    c.moveTo(g.stemFrom.x, g.stemFrom.y);
    c.lineTo(g.handle.x, g.handle.y);
    c.stroke();

    c.beginPath();                       // rotation handle
    c.arc(g.handle.x, g.handle.y, HANDLE_R, 0, Math.PI * 2);
    c.fillStyle = "white";
    c.fill();
    c.lineWidth = 2;
    c.stroke();
    c.restore();
  }

  c.save();                              // the diamond, always
  c.beginPath();
  c.moveTo(g.center.x,           g.center.y - DIAMOND);
  c.lineTo(g.center.x + DIAMOND, g.center.y);
  c.lineTo(g.center.x,           g.center.y + DIAMOND);
  c.lineTo(g.center.x - DIAMOND, g.center.y);
  c.closePath();
  c.fillStyle   = on ? COLOR_ON : COLOR;
  c.fill();
  c.strokeStyle = "white";
  c.lineWidth   = 1.5;
  c.stroke();
  c.restore();

} // end drawCentroid


/* ============================================================
   activateCentroid(tabId, redraw)
   ------------------------------------------------------------
   Starts listening. redraw() redraws the whole figure (which also redraws
   the guides). Replaces any earlier activation.
   ============================================================ */
export function activateCentroid(tabId, redraw) {

  deactivateCentroid();

  controller = new AbortController();
  const { signal } = controller;

  const tabState = () => uiState.figures.tabs[tabId];

  // Only while this figure is the one on screen.
  const live = () =>
    uiState.activeTab === "figures" &&
    uiState.figures.activeSubtab === tabId &&
    !!tabState()?.figure;

  const coords = (e) => {
    const main = window.drawCanvas;
    const rect = main.getBoundingClientRect();
    return {
      x:  (e.clientX - rect.left) * (main.width  / rect.width),
      y:  (e.clientY - rect.top)  * (main.height / rect.height),
      in: e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top  && e.clientY <= rect.bottom
    };
  };

  // The layer being moved or turned.
  const activeLayer = (ts) => ts.figure.layers[ts.figure.activeLayer];

  // Writes a transform into the layer without replacing the object, so
  // everything holding the layer sees it. Phase 8: the layer's welded
  // discs are snapshotted first, then let follow once redraw() has
  // moved everything and refreshed the points.
  const setTransform = (ts, t) => {
    const layer      = activeLayer(ts);
    const layerIndex = ts.figure.activeLayer;
    const snapshot    = snapshotWeldMembers(ts.figure, layerIndex);
    if (!layer.transform) layer.transform = newTransform();
    Object.assign(layer.transform, t);
    redraw();
    refreshInteractor();
    propagateAfterChange(tabId, layerIndex, snapshot);
  };

  let drag = null;   // { kind: "move"|"turn", from: {x,y}, start: transform, center, angle0 }

  window.addEventListener("mousedown", (e) => {
    // Left button only, like the interactor and the points-mode handlers:
    // a right-press on the diamond must not start a move.
    if (e.button !== 0) return;
    if (!live()) return;
    const ts = tabState();
    const m  = coords(e);
    const g  = geometry(ts);

    if (g && ts.centroidSelected &&
        Math.hypot(g.handle.x - m.x, g.handle.y - m.y) < HIT_RADIUS) {
      drag = {
        kind:   "turn",
        start:  { ...(activeLayer(ts).transform || newTransform()) },
        center: g.center,
        angle0: Math.atan2(m.y - g.center.y, m.x - g.center.x)
      };
      return;
    }

    if (g && Math.hypot(g.center.x - m.x, g.center.y - m.y) < HIT_RADIUS) {
      drag = {
        kind:  "move",
        from:  m,
        start: { ...(activeLayer(ts).transform || newTransform()) }
      };
      if (!ts.centroidSelected) {
        ts.centroidSelected = true;
        drawCentroid(ts);
      }
      return;
    }

    // A press anywhere else on the canvas deselects.
    if (m.in && ts.centroidSelected) {
      ts.centroidSelected = false;
      drawCentroid(ts);
    }
  }, { signal });

  window.addEventListener("mousemove", (e) => {
    if (!drag || !live()) return;
    const ts = tabState();
    const m  = coords(e);

    if (drag.kind === "move") {
      setTransform(ts, translateTransform(drag.start, m.x - drag.from.x, m.y - drag.from.y));
    } else {
      const now = Math.atan2(m.y - drag.center.y, m.x - drag.center.x);
      setTransform(ts, rotateTransformAbout(drag.start, drag.center.x, drag.center.y, now - drag.angle0));
    }
  }, { signal });

  window.addEventListener("mouseup", () => {
    drag = null;
  }, { signal });

  // Arrow keys move the layer while the diamond is selected.
  window.addEventListener("keydown", (e) => {
    if (!live()) return;
    const ts = tabState();
    if (!ts.centroidSelected || !geometry(ts)) return;

    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

    const step = e.shiftKey ? NUDGE_SHIFT : NUDGE;
    let dx = 0;
    let dy = 0;
    switch (e.key) {
      case "ArrowLeft":  dx = -step; break;
      case "ArrowRight": dx =  step; break;
      case "ArrowUp":    dy = -step; break;
      case "ArrowDown":  dy =  step; break;
      default: return;
    }

    e.preventDefault();
    setTransform(ts, translateTransform(activeLayer(ts).transform, dx, dy));
  }, { signal });

} // end activateCentroid


/* ============================================================
   deactivateCentroid()
   ============================================================ */
export function deactivateCentroid() {

  if (controller) {
    controller.abort();
    controller = null;
  }

} // end deactivateCentroid

// end figureCentroid.js
