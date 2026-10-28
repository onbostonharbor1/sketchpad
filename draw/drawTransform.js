/* draw/drawTransform.js
   ============================================================
   The layer transform: object space to canvas space
   ============================================================
   Role:
     In a figure every layer can be moved and rotated without touching the
     object's own numbers. An object keeps drawing in "object space" (its
     own coordinates); the layer's transform turns those into canvas
     coordinates. No canvas operations (ctx.translate, ctx.rotate) are used.

   A transform is a plain object:  { angle, tx, ty }
     angle  rotation in radians
     tx, ty offset in canvas pixels
   canvas point = rotate(object point, angle) + (tx, ty)
   The identity transform is { angle: 0, tx: 0, ty: 0 }. A missing (null or
   undefined) transform means the identity, so the Draw tab never has to
   know about any of this.

   Two pieces of drawState are involved (declared in drawState.js):
     drawState.transform  the transform of the layer being drawn, or null.
                          drawLine and mapPoint apply it.
     drawState.bounds     { minX, minY, maxX, maxY } of everything drawn in
                          object space, or null. drawLine fills it in so a
                          layer's centroid and bounding box can be found.
   Figure code sets both before a layer draws and clears them after.

   Why object space at all:
     A Line's handles say pt1 = (200, 200). If the layer is moved 100 px
     right, the handle should still say (200, 200), so the object's own
     sliders, steps and handle logic never need to know it was moved.
     Only the layer's transform changes, to tx = 100. Everything that
     shows, hits or drags a handle or disc goes through the same transform
     (interactor.js through getTransform, figurePoints.js through
     armPoint), so what you see and what you grab always agree.

   A worked example, a quarter turn and a shift:
     t = { angle: Math.PI / 2, tx: 300, ty: 100 }     (90 degrees)
     object point (10, 0):
       rotate 90 degrees  -> (0, 10)      cos = 0, sin = 1:
                                          x' = 0*10 - 1*0 = 0
                                          y' = 1*10 + 0*0 = 10
       then add (tx, ty)  -> (300, 110)
     canvas y grows downward, so a positive angle turns clockwise on
     screen.

   Exports:
     newTransform()                        the identity transform
     applyTransform(t, pt)                 object point to canvas point
     inverseTransform(t, x, y)             canvas point to object point
     translateTransform(t, dx, dy)         a copy moved by (dx, dy) canvas px
     rotateTransformAbout(t, cx, cy, d)    a copy turned by d radians about
                                           the canvas point (cx, cy)
     mapPoint(pt)                          applyTransform with drawState.transform
     newBounds()                           an empty bounds object
     noteBounds(pt)                        grow drawState.bounds to include pt
   ============================================================ */

import { drawState } from "./drawState.js";


// A fresh identity transform: no turn, no shift. A new object each call,
// so two layers never share (and so never jointly change) one transform.
export function newTransform() {
  return { angle: 0, tx: 0, ty: 0 };
} // end newTransform


/* ------------------------------------------------------------
   applyTransform(t, pt) -> { x, y }
   Object space to canvas space: turn about the object-space origin
   (0, 0) by t.angle, then shift by (t.tx, t.ty). This is the standard
   2-D rotation:
       x' = cos * x - sin * y
       y' = sin * x + cos * y
   Always returns a new object; pt is never changed.
   ------------------------------------------------------------ */
export function applyTransform(t, pt) {

  if (!t) return { x: pt.x, y: pt.y };     // no transform: the identity

  const c = Math.cos(t.angle);
  const s = Math.sin(t.angle);
  return {
    x: c * pt.x - s * pt.y + t.tx,
    y: s * pt.x + c * pt.y + t.ty
  };

} // end applyTransform


/* ------------------------------------------------------------
   inverseTransform(t, x, y) -> { x, y }
   The object point that the transform sends to canvas point (x, y).
   Undoes applyTransform in reverse order: first take the shift off,
   then turn back by -angle (cos(-a) = cos a, sin(-a) = -sin a, which
   is where the signs below come from). Used whenever a mouse position
   (canvas space) has to become an object's own coordinates: dragging
   a handle, placing or dragging a free disc.
   ------------------------------------------------------------ */
export function inverseTransform(t, x, y) {

  if (!t) return { x, y };

  const c  = Math.cos(t.angle);
  const s  = Math.sin(t.angle);
  const ux = x - t.tx;          // shift taken off
  const uy = y - t.ty;
  return {
    x:  c * ux + s * uy,        // turned back by -angle
    y: -s * ux + c * uy
  };

} // end inverseTransform


/* ------------------------------------------------------------
   translateTransform(t, dx, dy) -> a new transform
   The same transform, moved (dx, dy) canvas pixels. The angle is
   untouched: moving never turns. t may be null (the identity).
   ------------------------------------------------------------ */
export function translateTransform(t, dx, dy) {

  const from = t || newTransform();
  return { angle: from.angle, tx: from.tx + dx, ty: from.ty + dy };

} // end translateTransform


/* ------------------------------------------------------------
   rotateTransformAbout(t, cx, cy, d) -> a new transform
   Turns the whole picture by d radians about the canvas point (cx, cy).
   A canvas point p goes to  c + R(d) * (p - c); applying that to
   R(angle) * object + (tx, ty) gives the new angle and offset below.

   In words: the angles add (angle + d), and the old shift (tx, ty),
   measured from the pivot (rx, ry), is itself turned by d about the
   pivot. The figure's centroid drag (figureCentroid.js) uses this with
   the pivot at the layer's centroid, so the layer turns in place.
   ------------------------------------------------------------ */
export function rotateTransformAbout(t, cx, cy, d) {

  const from = t || newTransform();
  const c = Math.cos(d);
  const s = Math.sin(d);
  const rx = from.tx - cx;      // the shift, seen from the pivot
  const ry = from.ty - cy;
  return {
    angle: from.angle + d,
    tx: cx + c * rx - s * ry,   // turned by d, back from the pivot
    ty: cy + s * rx + c * ry
  };

} // end rotateTransformAbout


/* ------------------------------------------------------------
   mapPoint(pt): the point as drawn, using the transform of the layer
   being drawn (drawState.transform).
   Outside a figure layer drawState.transform is null, so this returns
   the point unchanged and the Draw tab behaves as it always did.
   ------------------------------------------------------------ */
export function mapPoint(pt) {
  return applyTransform(drawState.transform, pt);
} // end mapPoint


// An empty extent: every real point will be smaller than Infinity and
// larger than -Infinity, so the first noteBounds() call sets all four.
// After drawing, minX still being Infinity means nothing was drawn.
export function newBounds() {
  return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
} // end newBounds


/* ------------------------------------------------------------
   noteBounds(pt): include pt in drawState.bounds (object space), if the
   caller has asked for bounds by setting drawState.bounds.
   drawLine calls this for both ends of every line it draws. Object
   space, not canvas space, so the box can be turned with the layer
   (figureCentroid.js) instead of growing as the layer turns.
   ------------------------------------------------------------ */
export function noteBounds(pt) {

  const b = drawState.bounds;
  if (!b) return;               // nobody asked: the Draw tab, or no figure

  if (pt.x < b.minX) b.minX = pt.x;
  if (pt.y < b.minY) b.minY = pt.y;
  if (pt.x > b.maxX) b.maxX = pt.x;
  if (pt.y > b.maxY) b.maxY = pt.y;

} // end noteBounds

// end drawTransform.js
