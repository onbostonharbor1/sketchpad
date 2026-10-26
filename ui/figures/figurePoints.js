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
     { n, kind: "free",     layer,          x, y, dx, dy }

     n        permanent number, taken from figure.nextPoint. Never
              reused, even after the point is deleted.
     layer    index into figure.layers (layer numbers never change). A
              free point belongs to the layer that was active when it
              was placed. Only the active layer's points can be selected,
              added or deleted.
     arm, t   an anchored point sits on an infrastructure line of its
              layer (arm id) at fraction t of its length. It always
              keeps exactly that fraction, so it follows its object
              when the object is moved or its step count changes.
     x, y     where the point is now. For an anchored point this is
              recomputed from layer, arm and t on every redraw. Points
              are never dragged: an anchored point rides along with its
              object, a free point stays where it was placed. Only the
              object's own handles are dragged (interactor.js).
     dx, dy   offset of the number label from the point (used from
              Phase 7; always 0 for now).

   Vocabulary: Barry's working name for a drawn point is "disc" (a filled
   circle). Code and tests still say "point".

   Infrastructure: a registry object may define infrastructure(),
   returning arms { id, a, b, steps, from, to }. The candidate points
   (the places a click can pick) are t = i / steps for i = from..to.
   Stitch lines are not infrastructure and cannot carry points.

   Exports:
     findCandidate(tabState, x, y, radius)
     findPoint(figure, x, y, radius)
     addAnchoredPoint(figure, candidate)
     addFreePoint(figure, x, y)
     deletePoint(figure, n)
     refreshPoints(tabState)
     drawFigurePoints(tabState)
   ============================================================ */

const MARKER_RADIUS = 9;   // drawn size of a numbered point
const HALO_GAP      = 4;   // selected point: gap from the marker to its outer ring


/* ------------------------------------------------------------
   armsOf(instance) -- infrastructure of one layer ([] if none)
   ------------------------------------------------------------ */
function armsOf(instance) {
  return (instance && typeof instance.infrastructure === "function")
    ? instance.infrastructure()
    : [];
} // end armsOf


function armPoint(arm, t) {
  return {
    x: arm.a.x + (arm.b.x - arm.a.x) * t,
    y: arm.a.y + (arm.b.y - arm.a.y) * t
  };
} // end armPoint


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

  let best     = null;
  let bestDist = radius;

  for (const arm of armsOf(instances[layer])) {
    for (let i = arm.from; i <= arm.to; i++) {
      const t  = i / arm.steps;
      const pt = armPoint(arm, t);
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


export function addFreePoint(figure, x, y) {

  const p = {
    n: figure.nextPoint++, kind: "free", layer: figure.activeLayer,
    x, y, dx: 0, dy: 0
  };
  figure.points.push(p);
  return p;

} // end addFreePoint


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
    if (p.kind !== "anchored") continue;

    const arm = armsOf(instances[p.layer]).find((a) => a.id === p.arm);
    if (!arm) continue;               // keep the last known position

    const pt = armPoint(arm, p.t);
    p.x = pt.x;
    p.y = pt.y;
  }

} // end refreshPoints


/* ============================================================
   drawFigurePoints(tabState)
   ------------------------------------------------------------
   Draws every numbered point on the main canvas: a white disc, a
   black rim and the number. The selected point is marked by a thick
   red rim and a second red ring just outside it, so it stands out
   from the others even when it sits on a handle or a stitch line.
   ============================================================ */
export function drawFigurePoints(tabState) {

  ctx.save();
  ctx.font         = "bold 11px sans-serif";
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";

  for (const p of tabState.figure.points) {
    const selected = p.n === tabState.selectedPoint;

    ctx.beginPath();
    ctx.arc(p.x, p.y, MARKER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle   = "#ffffff";
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

    ctx.fillStyle = "#000000";
    ctx.fillText(String(p.n), p.x + p.dx, p.y + p.dy);
  }

  ctx.restore();

} // end drawFigurePoints

// end figurePoints.js
