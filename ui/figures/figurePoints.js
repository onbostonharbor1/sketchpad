/* figurePoints.js
   ============================================================
   Figures Tab -- Numbered Points (data, picking, drawing)
   ============================================================
   Role:
     The numbered points of a figure: creating, finding, moving,
     deleting and drawing them. No event handling (that is
     figurePointer.js) and no layer drawing (figureLayers.js).

   Point record, in figure.points:
     { n, kind: "anchored", layer, arm, t, x, y, dx, dy }
     { n, kind: "free",     layer,          x, y, dx, dy, ox, oy }

     n        permanent number, taken from figure.nextPoint. Never
              reused, even after the point is deleted. It is an id only:
              the disc is drawn without it.
     layer    index into figure.layers (layer numbers never change). A
              free point belongs to the layer that was active when it
              was placed. Only the active layer's points can be selected,
              added or deleted.
     arm, t   an anchored point sits on an infrastructure line of its
              layer (arm id) at fraction t of its length. It always
              keeps exactly that fraction, so it follows its object
              when the object is moved or its step count changes.
     x, y     where the point is now, in canvas pixels. For an anchored
              point this is recomputed from layer, arm and t on every
              redraw. Points are never dragged except free ones
              (moveFreePoint): an anchored point rides along with its
              object. The object's own handles are dragged by interactor.js.
     ox, oy   a free point only: where it is in its layer's object space.
              x, y are recomputed from these on every redraw, so a free
              disc travels with its layer when the layer is moved or turned
              (Phase 7b). Where the layer has no transform, ox = x, oy = y.

   Layer transform (Phase 7b): a layer may carry layer.transform (see
   draw/drawTransform.js). Infrastructure arms come from the object in object
   space; every arm is mapped through the transform of its layer before a
   disc is found or placed on it, so all disc positions are in canvas space.
     dx, dy   offset of a number label from the point. Discs are drawn
              without numbers now, so this is always 0; kept for
              Phase 7, which may drop it.

   Vocabulary: Barry's name for a drawn point is "disc" (a filled circle,
   in the color of its layer, drawn without its number). Code and tests
   still say "point".

   Infrastructure: a registry object may define infrastructure(),
   returning arms. An arm is either { id, a, b, steps, from, to } (a
   straight run between two points) or { id, points, from, to } (an
   explicit array, for an arc or a ring of nodes; steps = points.length - 1
   so the same t = i/steps still picks out index i). The candidate points
   (the places a click can pick) are t = i / steps for i = from..to.
   Stitch lines are not infrastructure and cannot carry points.

   Exports:
     findCandidate(tabState, x, y, radius)
     findPoint(figure, x, y, radius)
     addAnchoredPoint(figure, candidate)
     addFreePoint(figure, x, y, transform)
     moveFreePoint(point, x, y, transform)
     deletePoint(figure, n)
     refreshPoints(tabState)
     drawFigurePoints(tabState, { showAll, dimming })
   ============================================================ */

import { applyTransform, inverseTransform } from "/draw/drawTransform.js";

const MARKER_RADIUS = 9;   // drawn size of a numbered point
const HALO_GAP      = 4;   // selected point: gap from the marker to its outer ring
// Alpha for the discs of layers that are not the active one, while editing.
// Layers themselves are dimmed harder (DIM_ALPHA in figureLayers.js).
const DISC_DIM_ALPHA = 0.5;


/* ------------------------------------------------------------
   armsOf(instance) -- infrastructure of one layer ([] if none)
   ------------------------------------------------------------ */
function armsOf(instance) {
  return (instance && typeof instance.infrastructure === "function")
    ? instance.infrastructure()
    : [];
} // end armsOf


// The point at fraction t along an arm, in canvas space. transform is the
// layer's transform, or null/undefined for none. Two arm shapes (Phase 7d):
// a straight run between a and b (the original shape), or an explicit
// points array for an arc or a ring of nodes -- t = i/steps still picks
// index i, since steps = points.length - 1 for that shape.
function armPoint(arm, t, transform) {
  const pt = arm.points
    ? arm.points[Math.round(t * arm.steps)]
    : {
        x: arm.a.x + (arm.b.x - arm.a.x) * t,
        y: arm.a.y + (arm.b.y - arm.a.y) * t
      };
  return applyTransform(transform, pt);
} // end armPoint


// The transform of layer number i of the figure, or null.
function layerTransform(figure, i) {
  return figure.layers[i]?.transform || null;
} // end layerTransform


/* ============================================================
   findCandidate(tabState, x, y, radius)
   ------------------------------------------------------------
   The infrastructure point nearest to (x, y) within radius, or
   null. Only the active layer is searched.
   Returns { layer, arm, t, x, y }.
   ============================================================ */
export function findCandidate(tabState, x, y, radius) {

  const figure    = tabState.figure;
  const instances = tabState.instances || [];
  const layer     = figure.activeLayer;
  const xform     = layerTransform(figure, layer);

  let best     = null;
  let bestDist = radius;

  for (const arm of armsOf(instances[layer])) {
    for (let i = arm.from; i <= arm.to; i++) {
      const t  = i / arm.steps;
      const pt = armPoint(arm, t, xform);
      const d  = Math.hypot(pt.x - x, pt.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = { layer, arm: arm.id, t, x: pt.x, y: pt.y };
      }
    }
  }

  return best;

} // end findCandidate


/* ============================================================
   findPoint(figure, x, y, radius)
   ------------------------------------------------------------
   The numbered point of the active layer nearest to (x, y) within
   radius, or null. The radius is never smaller than the drawn
   marker, so a click anywhere on a marker finds it. Points of other
   layers are ignored.
   ============================================================ */
export function findPoint(figure, x, y, radius) {

  const reach = Math.max(radius, MARKER_RADIUS);

  let best     = null;
  let bestDist = reach;

  for (const p of figure.points) {
    if (p.layer !== figure.activeLayer) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }

  return best;

} // end findPoint


/* ============================================================
   addAnchoredPoint(figure, candidate) / addFreePoint(figure, x, y)
   ------------------------------------------------------------
   Allocate the next number and add the point. Returns the point. A
   free point goes on the active layer.
   ============================================================ */
export function addAnchoredPoint(figure, c) {

  const p = {
    n: figure.nextPoint++, kind: "anchored",
    layer: c.layer, arm: c.arm, t: c.t,
    x: c.x, y: c.y, dx: 0, dy: 0
  };
  figure.points.push(p);
  return p;

} // end addAnchoredPoint


export function addFreePoint(figure, x, y, transform = null) {

  const o = inverseTransform(transform, x, y);
  const p = {
    n: figure.nextPoint++, kind: "free", layer: figure.activeLayer,
    x, y, dx: 0, dy: 0, ox: o.x, oy: o.y
  };
  figure.points.push(p);
  return p;

} // end addFreePoint


/* ============================================================
   moveFreePoint(point, x, y)
   ------------------------------------------------------------
   Drags a free point to (x, y). An anchored point is never moved
   this way (it rides along with its object); returns false for it.
   ============================================================ */
export function moveFreePoint(point, x, y, transform = null) {

  if (point.kind !== "free") return false;

  const o = inverseTransform(transform, x, y);
  point.x  = x;
  point.y  = y;
  point.ox = o.x;
  point.oy = o.y;
  return true;

} // end moveFreePoint


/* ============================================================
   deletePoint(figure, n)
   ------------------------------------------------------------
   Removes the point. Its number stays used: nextPoint never
   goes back.
   ============================================================ */
export function deletePoint(figure, n) {

  figure.points = figure.points.filter((p) => p.n !== n);

} // end deletePoint


/* ============================================================
   refreshPoints(tabState)
   ------------------------------------------------------------
   Recomputes where each anchored point is from its layer's
   current geometry, keeping its fraction t. Call after the layers
   have been updated and before drawing.
   ============================================================ */
export function refreshPoints(tabState) {

  const instances = tabState.instances || [];

  for (const p of tabState.figure.points) {
    const xform = layerTransform(tabState.figure, p.layer);

    if (p.kind === "free") {
      if (typeof p.ox !== "number") continue;
      const pt = applyTransform(xform, { x: p.ox, y: p.oy });
      p.x = pt.x;
      p.y = pt.y;
      continue;
    }

    const arm = armsOf(instances[p.layer]).find((a) => a.id === p.arm);
    if (!arm) continue;               // keep the last known position

    const pt = armPoint(arm, p.t, xform);
    p.x = pt.x;
    p.y = pt.y;
  }

} // end refreshPoints


/* ============================================================
   drawFigurePoints(tabState, { showAll, dimming })
   ------------------------------------------------------------
   Draws every disc on the main canvas: a filled circle in the color
   of its layer with a black rim, no number. The same visibility
   rules as the layers apply: a disc of a hidden layer is left out
   unless showAll. While dimming, the discs of layers other than the
   active one are drawn at DISC_DIM_ALPHA. The selected disc has a
   thick red rim and a second red ring just outside it, so it stands
   out even when it sits on a handle or a stitch line.
   ============================================================ */
export function drawFigurePoints(tabState, { showAll = false, dimming = false } = {}) {

  const figure = tabState.figure;

  ctx.save();

  for (const p of figure.points) {
    const layer = figure.layers[p.layer];
    if (!layer) continue;
    if (!layer.visible && !showAll) continue;

    const selected = p.n === tabState.selectedPoint;

    ctx.globalAlpha = (dimming && p.layer !== figure.activeLayer) ? DISC_DIM_ALPHA : 1;

    ctx.beginPath();
    ctx.arc(p.x, p.y, MARKER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle   = layer.color || "#888888";
    ctx.fill();
    ctx.lineWidth   = selected ? 3 : 1.5;
    ctx.strokeStyle = selected ? "#d00000" : "#000000";
    ctx.stroke();

    if (selected) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, MARKER_RADIUS + HALO_GAP, 0, Math.PI * 2);
      ctx.lineWidth   = 2;
      ctx.strokeStyle = "#d00000";
      ctx.stroke();
    }
  }

  ctx.restore();

} // end drawFigurePoints

// end figurePoints.js
