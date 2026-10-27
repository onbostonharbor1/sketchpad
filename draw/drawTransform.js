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


export function newTransform() {
  return { angle: 0, tx: 0, ty: 0 };
} // end newTransform


/* ------------------------------------------------------------
   applyTransform(t, pt) -> { x, y }
   ------------------------------------------------------------ */
export function applyTransform(t, pt) {

  if (!t) return { x: pt.x, y: pt.y };

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
   ------------------------------------------------------------ */
export function inverseTransform(t, x, y) {

  if (!t) return { x, y };

  const c  = Math.cos(t.angle);
  const s  = Math.sin(t.angle);
  const ux = x - t.tx;
  const uy = y - t.ty;
  return {
    x:  c * ux + s * uy,
    y: -s * ux + c * uy
  };

} // end inverseTransform


/* ------------------------------------------------------------
   translateTransform(t, dx, dy) -> a new transform
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
   ------------------------------------------------------------ */
export function rotateTransformAbout(t, cx, cy, d) {

  const from = t || newTransform();
  const c = Math.cos(d);
  const s = Math.sin(d);
  const rx = from.tx - cx;
  const ry = from.ty - cy;
  return {
    angle: from.angle + d,
    tx: cx + c * rx - s * ry,
    ty: cy + s * rx + c * ry
  };

} // end rotateTransformAbout


/* ------------------------------------------------------------
   mapPoint(pt): the point as drawn, using the transform of the layer
   being drawn (drawState.transform).
   ------------------------------------------------------------ */
export function mapPoint(pt) {
  return applyTransform(drawState.transform, pt);
} // end mapPoint


export function newBounds() {
  return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
} // end newBounds


/* ------------------------------------------------------------
   noteBounds(pt): include pt in drawState.bounds (object space), if the
   caller has asked for bounds by setting drawState.bounds.
   ------------------------------------------------------------ */
export function noteBounds(pt) {

  const b = drawState.bounds;
  if (!b) return;

  if (pt.x < b.minX) b.minX = pt.x;
  if (pt.y < b.minY) b.minY = pt.y;
  if (pt.x > b.maxX) b.maxX = pt.x;
  if (pt.y > b.maxY) b.maxY = pt.y;

} // end noteBounds

// end drawTransform.js
