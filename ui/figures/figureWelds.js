/* figureWelds.js
   ============================================================
   Figures Tab -- Welds (Phase 8)
   ============================================================
   Role:
     A weld ties together discs that sit at the same spot on different
     layers (or, for a corner, two discs on the same layer). A weld is
     not itself draggable: dragging one of its member discs (because the
     disc is on a handle, or is a free disc) moves every other member's
     layer to follow, so the figure keeps meeting at that point.

   Data (figure.welds, not yet saved -- Phase 10):
     figure.welds = [ { members: [ { layer, n }, ... ], unsatisfied } ]
     members   the discs in the group, by their figure.points number.
     unsatisfied   true while the group's members no longer coincide
               (two of its layers both tried to move this drag and only
               one could). Recomputed on every draw, not stored across
               redraws; see drawWeldMarks().

   Creating and removing a weld (right-click, figurePointer.js):
     toggleWeldAt() is the whole of it. Right-click a disc already in a
     group to drop it out (dissolving the group if that leaves fewer
     than two members). Right-click a disc not in a group: if another
     disc (any layer, the same layer included, for tying a corner) sits
     within hit radius, join or start a group with it. Right-click a
     bare infrastructure point: numbers it first (the same as a left
     click would), but only if that creates a disc that lands on an
     existing one -- otherwise nothing happens, so right-clicking empty
     infrastructure cannot litter the figure with lone discs.
     Creating a weld never moves anything: discs must already coincide.

   Moving a weld (propagateAfterChange(), the move-propagation rule):
     Hooked into moveHandle() (ui/interactor.js, drag and the arrow
     keys) and setTransform() (figureCentroid.js, move and turn) via a
     snapshot taken just before the change and compared just after.
     Every weld member of the layer being changed that actually moved
     seeds a breadth-first walk of the weld graph. For each neighbor
     disc reached:
       - the neighbor sits exactly at one of its own object's handles
         (t = 0 or 1, and that arm end matches a handle) -> move that
         one handle by the same canvas delta;
       - the neighbor is mid-arm and BOTH ends of that specific arm are
         handles (Line, Parabola, Radiate) -> move both, so the arm
         reshapes and the object's other handles stay still;
       - anywhere else (the arm's ends are not handles at all, as for
         Regular Polygon or a node ring) -> translate the whole layer.
     A layer moves at most once per drag; a second weld edge that would
     move it again is left alone, which is how an unsatisfiable weld
     (two paths disagreeing about where a layer should land) shows up.

   Exports:
     weldOf(figure, n)
     removeFromWeld(figure, n)
     toggleWeldAt(tabState, x, y, radius)
     snapshotWeldMembers(figure, layerIndex)
     propagateAfterChange(tabId, layerIndex, snapshot)
     drawWeldMarks(tabState)
   ============================================================ */

import { uiState } from "/ui/uiState.js";
import { applyTransform, inverseTransform, translateTransform } from "/draw/drawTransform.js";
import { findCandidate, addAnchoredPoint, moveFreePoint, refreshPoints } from "./figurePoints.js";
// figureLayers.js imports this module too (for snapshotWeldMembers,
// propagateAfterChange and drawWeldMarks); importing redrawFigure back
// from it here is a circular import, but it is fine -- this binding is
// only used inside a function body, well after both modules have
// finished loading.
import { redrawFigure } from "./figureLayers.js";

const EPS = 0.5;         // canvas pixels; "the same spot" and "didn't move"
const MARK_RADIUS = 7;   // the plus mark's white halo
const MARK_ARM    = 5;   // the plus mark's arm length


/* ------------------------------------------------------------
   pointByN(figure, n)
   ------------------------------------------------------------ */
function pointByN(figure, n) {
  return figure.points.find((p) => p.n === n) || null;
} // end pointByN


/* ============================================================
   weldOf(figure, n)
   ------------------------------------------------------------
   The weld group point n belongs to, or null.
   ============================================================ */
export function weldOf(figure, n) {
  const list = figure.welds || [];
  return list.find((w) => w.members.some((m) => m.n === n)) || null;
} // end weldOf


/* ------------------------------------------------------------
   createOrJoinWeld(figure, nA, nB)
   Joins the two points into one weld group, merging their groups if
   each already had one. Does not check coincidence -- the caller
   (toggleWeldAt) only calls this once it has found two discs at the
   same spot.
   ------------------------------------------------------------ */
function createOrJoinWeld(figure, nA, nB) {
  if (!figure.welds) figure.welds = [];
  const pa = pointByN(figure, nA);
  const pb = pointByN(figure, nB);
  if (!pa || !pb) return null;

  const wa = weldOf(figure, nA);
  const wb = weldOf(figure, nB);

  if (wa && wb) {
    if (wa === wb) return wa;
    wa.members.push(...wb.members);
    figure.welds = figure.welds.filter((w) => w !== wb);
    return wa;
  }
  if (wa) { wa.members.push({ layer: pb.layer, n: pb.n }); return wa; }
  if (wb) { wb.members.push({ layer: pa.layer, n: pa.n }); return wb; }

  const weld = { members: [
    { layer: pa.layer, n: pa.n },
    { layer: pb.layer, n: pb.n }
  ] };
  figure.welds.push(weld);
  return weld;
} // end createOrJoinWeld


/* ============================================================
   removeFromWeld(figure, n)
   ------------------------------------------------------------
   Drops point n out of its weld group, dissolving the group if that
   leaves fewer than two members. True if n was welded. Also called
   (figurePoints.js) whenever a point disappears for some other reason
   -- deleted by the person, or its anchor arm has gone -- since a
   vanished member leaves its weld the same way an explicit unweld does.
   ============================================================ */
export function removeFromWeld(figure, n) {
  const weld = weldOf(figure, n);
  if (!weld) return false;
  weld.members = weld.members.filter((m) => m.n !== n);
  if (weld.members.length < 2) {
    figure.welds = figure.welds.filter((w) => w !== weld);
  }
  return true;
} // end removeFromWeld


/* ============================================================
   toggleWeldAt(tabState, x, y, radius)
   ------------------------------------------------------------
   The right-click action. Returns { kind: "weld"|"unweld"|"none",
   message, point? }.
   ============================================================ */
export function toggleWeldAt(tabState, x, y, radius) {

  const figure = tabState.figure;

  const discAt = (px, py, excludeN = null) => {
    let best = null, bestDist = radius;
    for (const p of figure.points) {
      if (p.n === excludeN) continue;
      const layer = figure.layers[p.layer];
      if (!layer || !layer.visible) continue;
      const d = Math.hypot(p.x - px, p.y - py);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    return best;
  };

  let clicked = discAt(x, y);

  if (!clicked) {
    // No disc there yet. A bare infrastructure point is only numbered
    // if doing so lands it on a disc that is already there -- otherwise
    // there is nothing to weld, and nothing is created.
    const candidate = findCandidate(tabState, x, y, radius);
    if (!candidate) return { kind: "none", message: "Nothing to weld here." };

    const partner = discAt(candidate.x, candidate.y);
    if (!partner) return { kind: "none", message: "Nothing to weld here." };

    clicked = addAnchoredPoint(figure, candidate);
  }

  if (weldOf(figure, clicked.n)) {
    removeFromWeld(figure, clicked.n);
    return { kind: "unweld", point: clicked, message: "Weld removed." };
  }

  // Same-layer partners are allowed on purpose: that is how two corner
  // handles of one object get tied together.
  const partner = discAt(clicked.x, clicked.y, clicked.n);
  if (!partner) {
    return { kind: "none", point: clicked, message: "Nothing to weld here." };
  }

  createOrJoinWeld(figure, clicked.n, partner.n);
  return { kind: "weld", point: clicked, message: "Welded." };

} // end toggleWeldAt


/* ============================================================
   snapshotWeldMembers(figure, layerIndex)
   ------------------------------------------------------------
   The current canvas position of every welded disc on one layer,
   taken just before that layer is about to change. { n -> {x,y} }.
   ============================================================ */
export function snapshotWeldMembers(figure, layerIndex) {
  const snap = new Map();
  if (!figure.welds || !figure.welds.length) return snap;

  for (const weld of figure.welds) {
    for (const m of weld.members) {
      if (m.layer !== layerIndex) continue;
      const p = pointByN(figure, m.n);
      if (p) snap.set(p.n, { x: p.x, y: p.y });
    }
  }
  return snap;
} // end snapshotWeldMembers


/* ------------------------------------------------------------
   findHandleIndex(instance, pt)
   The index in instance.params.points whose object-space position
   matches pt, or -1. Used to tell a real handle apart from a node an
   object only derives (Regular Polygon's, say).
   ------------------------------------------------------------ */
function findHandleIndex(instance, pt) {
  const pts = instance?.params?.points || [];
  for (let i = 0; i < pts.length; i++) {
    if (Math.abs(pts[i].x - pt.x) < 1e-6 && Math.abs(pts[i].y - pt.y) < 1e-6) return i;
  }
  return -1;
} // end findHandleIndex


/* ------------------------------------------------------------
   moveFollowerHandle(instance, idx, xform, dx, dy)
   Moves one handle by a canvas-space delta and re-syncs the object.
   ------------------------------------------------------------ */
function moveFollowerHandle(instance, idx, xform, dx, dy) {
  const obj = instance.params.points[idx];
  const canvasPt = applyTransform(xform, obj);
  const moved = inverseTransform(xform, canvasPt.x + dx, canvasPt.y + dy);
  instance.params.points[idx] = { x: moved.x, y: moved.y };
  if (typeof instance.update === "function") instance.update(instance.params);
  return true;
} // end moveFollowerHandle


/* ------------------------------------------------------------
   translateWholeLayer(figure, layerIndex, dx, dy)
   The fallback for a node with no real handle of its own.
   ------------------------------------------------------------ */
function translateWholeLayer(figure, layerIndex, dx, dy) {
  const layer = figure.layers[layerIndex];
  if (!layer) return false;
  layer.transform = translateTransform(layer.transform, dx, dy);
  return true;
} // end translateWholeLayer


/* ------------------------------------------------------------
   applyFollowerMove(tabState, point, dx, dy)
   Moves one follower disc's layer by the canvas delta, choosing
   handle-move, arm-translate, or whole-layer-translate as described
   in the header. True if something moved.
   ------------------------------------------------------------ */
function applyFollowerMove(tabState, point, dx, dy) {

  const figure = tabState.figure;
  const xform  = figure.layers[point.layer]?.transform || null;

  if (point.kind === "free") {
    return moveFreePoint(point, point.x + dx, point.y + dy, xform);
  }

  const instance = tabState.instances?.[point.layer];
  if (!instance || typeof instance.infrastructure !== "function") return false;

  const arm = instance.infrastructure().find((a) => a.id === point.arm);
  if (!arm) return false;

  // An arc or ring (Phase 7d's explicit-points arm shape) has no handle
  // at either end to move on its own.
  if (arm.points) return translateWholeLayer(figure, point.layer, dx, dy);

  const atStart = Math.abs(point.t) < 1e-9;
  const atEnd   = Math.abs(point.t - 1) < 1e-9;

  if (atStart || atEnd) {
    const idx = findHandleIndex(instance, atStart ? arm.a : arm.b);
    if (idx >= 0) return moveFollowerHandle(instance, idx, xform, dx, dy);
    return translateWholeLayer(figure, point.layer, dx, dy);
  }

  // Mid-arm: the arm translates (its own two ends move) if both ends
  // are real handles, so the object's other handles stay (provisional
  // rule, Phase 8 spec).
  const idxA = findHandleIndex(instance, arm.a);
  const idxB = findHandleIndex(instance, arm.b);
  if (idxA >= 0 && idxB >= 0) {
    moveFollowerHandle(instance, idxA, xform, dx, dy);
    moveFollowerHandle(instance, idxB, xform, dx, dy);
    return true;
  }

  return translateWholeLayer(figure, point.layer, dx, dy);

} // end applyFollowerMove


/* ============================================================
   propagateAfterChange(tabId, layerIndex, snapshot)
   ------------------------------------------------------------
   Compares the welded discs of layerIndex against snapshot (from
   snapshotWeldMembers, taken before the change) and walks the weld
   graph outward for every one that moved. Redraws once at the end if
   anything followed. A layer moves at most once per call.
   ============================================================ */
export function propagateAfterChange(tabId, layerIndex, snapshot) {

  const tabState = uiState.figures.tabs[tabId];
  if (!tabState || !snapshot || !snapshot.size) return;
  const figure = tabState.figure;

  const movedLayers = new Set([layerIndex]);
  const queue = [];
  const queued = new Set();

  for (const [n, before] of snapshot) {
    const p = pointByN(figure, n);
    if (!p) continue;
    const dx = p.x - before.x, dy = p.y - before.y;
    if (Math.hypot(dx, dy) > EPS) { queue.push({ n, dx, dy }); queued.add(n); }
  }

  let followed = false;

  while (queue.length) {
    const { n, dx, dy } = queue.shift();
    const weld = weldOf(figure, n);
    if (!weld) continue;

    for (const m of weld.members) {
      if (m.n === n || queued.has(m.n)) continue;
      const mp = pointByN(figure, m.n);
      if (!mp) continue;
      if (movedLayers.has(mp.layer)) continue;   // left for the consistency check

      if (!applyFollowerMove(tabState, mp, dx, dy)) continue;

      movedLayers.add(mp.layer);
      queued.add(m.n);
      followed = true;
      queue.push({ n: m.n, dx, dy });   // chain onward, same delta
    }
  }

  if (followed) {
    refreshPoints(tabState);
    redrawFigure(tabId);
  }

} // end propagateAfterChange


/* ============================================================
   drawWeldMarks(tabState)
   ------------------------------------------------------------
   One mark per weld group, at any one member's position (all of a
   satisfied group's members coincide): a black plus on a white halo,
   or red while the group's members have drifted apart (unsatisfiable
   this drag). Figured fresh every call, nothing is stored.
   ============================================================ */
export function drawWeldMarks(tabState) {

  const figure = tabState.figure;
  if (!figure.welds || !figure.welds.length) return;

  for (const weld of figure.welds) {
    const pts = weld.members.map((m) => pointByN(figure, m.n)).filter(Boolean);
    if (!pts.length) continue;

    const visible = pts.some((p) => figure.layers[p.layer]?.visible);
    if (!visible) continue;

    const satisfied = pts.every((p) =>
      Math.hypot(p.x - pts[0].x, p.y - pts[0].y) <= EPS
    );

    drawPlusMark(pts[0].x, pts[0].y, satisfied ? "#000000" : "#d00000");
  }

} // end drawWeldMarks


function drawPlusMark(x, y, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, MARK_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = "white";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - MARK_ARM, y); ctx.lineTo(x + MARK_ARM, y);
  ctx.moveTo(x, y - MARK_ARM); ctx.lineTo(x, y + MARK_ARM);
  ctx.stroke();
  ctx.restore();
} // end drawPlusMark

// end figureWelds.js
