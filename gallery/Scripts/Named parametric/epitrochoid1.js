/* ============================================================
   Epitrochoid + (Optional) Curve-Stitch Segments + Intersections
   Gallery Script (ParameterControls-integrated)

   WHAT THIS IS
   ------------
   This is a Gallery script version of an "epitrochoid generator"
   with a stitch-style option:
     - You can draw the parametric curve itself (the polyline).
     - You can draw "stitch" segments: connect point[i] to point[i+skip].
     - You can optionally compute and display intersections among those
       stitch segments.

   EPITROCHOID EQUATIONS
   ---------------------
   x(θ) = (R + r) cos(θ) - d cos(((R + r)/r) θ)
   y(θ) = (R + r) sin(θ) - d sin(((R + r)/r) θ)

   Where:
     R = radius of fixed circle
     r = radius of rolling circle (rolling outside)
     d = pen offset (distance from rolling center to traced point)

   GALLERY SCRIPT CONTRACT (YOUR RULES)
   -----------------------------------
   - exports scriptInfo + runPattern()
   - uses global ctx directly (do NOT declare a ctx variable)
   - controls use 'widget' (not 'type')
   - drawRegistry-style lifecycle: init / update / draw
   - elements.element holds computed geometry
   - scriptInfo.parameters alias to scriptInfo.params
   - scriptInfo.redrawHandler calls update(params) + draw()
   - scriptInfo.onParamChange exists (no-op ok)
   - buildParameterControls(scriptInfo, "tab-scripts", true)

   INTERSECTION FINDING (EXTENSIVE NOTES)
   -------------------------------------
   Intersection detection is the expensive part. The naive approach is:
     - Build a list of line segments (stitch lines).
     - Compare every pair of segments for intersection.

   If you have N segments, there are ~N*(N-1)/2 pairs.
   For N=1000, that is ~500,000 checks (heavy but maybe tolerable).
   For N=3000, that's ~4.5 million checks (likely too slow).

   Therefore this script provides practical controls:
     - maxSegments: cap how many segments are built (limits N).
     - intersectionStride: skip segment pairs to reduce checks.
       Example stride=3 checks only every 3rd segment index pairing.
     - showIntersections: off by default for performance.

   HOW WE DETECT INTERSECTIONS
   ---------------------------
   We treat each stitch as a line segment between two points:
     segA = [A, B]
     segB = [C, D]

   We compute an intersection of the infinite lines using a standard
   2D line-line intersection formula (based on determinants), then we
   verify that the intersection point lies *within both segments*.

   1) Compute denominator (denom).
      denom == 0 means the lines are parallel or coincident.
      In that case we return null (no single intersection point).

   2) Compute intersection point (px, py) using determinant form.

   3) Check "is this point actually on both segments?"
      We do that with bounding-box checks and a small epsilon.

   4) Avoid false positives from adjacent segments.
      Segments that share an endpoint “intersect” at that endpoint,
      but that’s usually not visually meaningful as a “crossing”.
      We therefore skip comparisons when the segment indices are too
      close (abs(i-j) <= 1 by default), and we also skip first/last
      wrap adjacency cases (because this is a closed loop).

   5) Optional de-duplication:
      Many intersections can cluster tightly. We provide an optional
      pixel-grid de-duplication based on a tolerance value.
      (If you want that later, it’s easy to add; right now we keep it
      simple and just collect all intersections found.)

   OUTPUT / DISPLAY
   ----------------
   - The curve polyline is drawn in strokeColor.
   - Stitch segments are drawn in stitchColor (usually lighter).
   - Intersections are drawn as small filled circles in dotColor.

============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Epitrochoid (Linkage) + Stitch + Intersections",

  params: {

    // geometry
    R: 140,
    r: 60,
    d: 90,

    // sampling
    count: 1400,          // number of parametric samples (points)
    turns: 1,             // multiply full 2π traversal by this
    rotationDeg: 0,       // rotate entire figure

    // modulation
    taperPct: 0,          // 0..100; scales pen offset by (1 - taper*sinθ)

    // stitch rendering
    drawCurve: true,
    drawStitch: true,
    skip: 35,

    // intersection rendering
    showIntersections: false,
    intersectionStride: 1,  // pair-sampling stride (1 = full)
    maxSegments: 1200,       // cap number of stitch segments to build

    // style
    strokeColor: "#000000",
    stitchColor: "#555555",
    dotColor: "#ff0000",
    lineWidth: 1,
    stitchWidth: 1,
    dotRadius: 2
  },

  controls: {

    R: {
      widget: "range",
      label: "Fixed Radius (R)",
      min: 10,
      max: 300,
      step: 1,
      showValue: true,
      showButtons: true
    },

    r: {
      widget: "range",
      label: "Rolling Radius (r)",
      min: 5,
      max: 200,
      step: 1,
      showValue: true,
      showButtons: true
    },

    d: {
      widget: "range",
      label: "Pen Offset (d)",
      min: 0,
      max: 300,
      step: 1,
      showValue: true,
      showButtons: true
    },

    count: {
      widget: "range",
      label: "Point Count",
      min: 100,
      max: 4000,
      step: 50,
      showValue: true,
      showButtons: true
    },

    turns: {
      widget: "range",
      label: "Turns (× 2π)",
      min: 1,
      max: 20,
      step: 1,
      showValue: true,
      showButtons: true
    },

    rotationDeg: {
      widget: "range",
      label: "Rotation (deg)",
      min: 0,
      max: 360,
      step: 1,
      showValue: true,
      showButtons: true
    },

    taperPct: {
      widget: "range",
      label: "Taper (%)",
      min: 0,
      max: 100,
      step: 1,
      showValue: true,
      showButtons: true
    },

    skip: {
      widget: "range",
      label: "Skip (stitch)",
      min: 1,
      max: 300,
      step: 1,
      showValue: true,
      showButtons: true
    },

    drawCurve: {
      widget: "checkbox",
      label: "Draw Curve"
    },

    drawStitch: {
      widget: "checkbox",
      label: "Draw Stitch"
    },

    showIntersections: {
      widget: "checkbox",
      label: "Show Intersections"
    },

    intersectionStride: {
      widget: "range",
      label: "Intersection Stride",
      min: 1,
      max: 20,
      step: 1,
      showValue: true,
      showButtons: true
    },

    maxSegments: {
      widget: "range",
      label: "Max Segments",
      min: 100,
      max: 3000,
      step: 100,
      showValue: true,
      showButtons: true
    },

    lineWidth: {
      widget: "range",
      label: "Curve Width",
      min: 0.5,
      max: 6,
      step: 0.5,
      showValue: true,
      showButtons: true
    },

    stitchWidth: {
      widget: "range",
      label: "Stitch Width",
      min: 0.5,
      max: 6,
      step: 0.5,
      showValue: true,
      showButtons: true
    },

    dotRadius: {
      widget: "range",
      label: "Dot Radius",
      min: 1,
      max: 10,
      step: 1,
      showValue: true,
      showButtons: true
    },

    strokeColor: {
      widget: "colorPicker",
      label: "Curve Color"
    },

    stitchColor: {
      widget: "colorPicker",
      label: "Stitch Color"
    },

    dotColor: {
      widget: "colorPicker",
      label: "Dot Color"
    }

  },

  parameters: null,
  redrawHandler: null,
  onParamChange: null

}; // end scriptInfo


/* ============================================================
   elements
============================================================ */
const elements = {
  element: null
}; // end elements


/* ============================================================
   init()
============================================================ */
function init() {

  elements.element = {
    points: [],
    segments: [],
    intersections: [],
    lastSig: ""
  };

} // end init


/* ============================================================
   update(params)
============================================================ */
function update(params) {

  const sig = JSON.stringify(params);
  if (sig === elements.element.lastSig) return;
  elements.element.lastSig = sig;

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const cx = w / 2;
  const cy = h / 2;

  const rotationRad = params.rotationDeg * Math.PI / 180;

  const pts = computeEpitrochoidPoints(
    params.R,
    params.r,
    params.d,
    params.count,
    params.turns,
    rotationRad,
    params.taperPct,
    cx,
    cy
  );

  elements.element.points = pts;

  if (params.drawStitch || params.showIntersections) {
    elements.element.segments = buildSegments(pts, params.skip, params.maxSegments);
  } else {
    elements.element.segments = [];
  }

  if (params.showIntersections) {
    elements.element.intersections = findIntersections(
      elements.element.segments,
      params.intersectionStride
    );
  } else {
    elements.element.intersections = [];
  }

} // end update


/* ============================================================
   draw()
============================================================ */
function draw() {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);

  if (scriptInfo.params.drawCurve) {
    drawCurvePolyline(elements.element.points);
  }

  if (scriptInfo.params.drawStitch) {
    drawStitchSegments(elements.element.segments);
  }

  if (scriptInfo.params.showIntersections) {
    drawIntersectionDots(elements.element.intersections);
  }

} // end draw


/* ============================================================
   runPattern()
============================================================ */
export function runPattern() {

  scriptInfo.parameters = scriptInfo.params;

  scriptInfo.onParamChange = function () {
    // no-op (compatibility)
  }; // end onParamChange

  scriptInfo.redrawHandler = function () {
    update(scriptInfo.params);
    draw();
  }; // end redrawHandler

  init();

  buildParameterControls(scriptInfo, "tab-scripts", true);

  scriptInfo.redrawHandler();

} // end runPattern


/* ============================================================
   geometry: epitrochoid points
============================================================ */
function computeEpitrochoidPoints(R, r, d, count, turns, rotationRad, taperPct, cx, cy) {

  const pts = [];
  const total = count;

  for (let i = 0; i <= total; i++) {

    const theta = (i / total) * (Math.PI * 2) * turns;

    // taperFactor modulates pen offset with a simple sinusoid
    const taperFactor = 1 - (taperPct / 100) * Math.sin(theta);

    const x0 =
      (R + r) * Math.cos(theta) -
      (d * taperFactor) * Math.cos(((R + r) / r) * theta);

    const y0 =
      (R + r) * Math.sin(theta) -
      (d * taperFactor) * Math.sin(((R + r) / r) * theta);

    // rotate
    const xr = x0 * Math.cos(rotationRad) - y0 * Math.sin(rotationRad);
    const yr = x0 * Math.sin(rotationRad) + y0 * Math.cos(rotationRad);

    pts.push({ x: cx + xr, y: cy + yr });

  }

  return pts;

} // end computeEpitrochoidPoints


/* ============================================================
   buildSegments(points, skip, maxSegments)
============================================================ */
function buildSegments(points, skip, maxSegments) {

  const segs = [];
  const n = points.length;

  if (n < 2) return segs;

  // Use a closed loop: connect i -> (i + skip) mod n
  // Limit number of segments to maxSegments for performance.
  const limit = Math.min(n, maxSegments);

  for (let i = 0; i < limit; i++) {

    const a = points[i];
    const b = points[(i + skip) % n];

    segs.push({ a: a, b: b, i: i });

  }

  return segs;

} // end buildSegments


/* ============================================================
   INTERSECTION FINDING
============================================================ */

/* ------------------------------------------------------------
   findIntersections(segments, stride)

   PERFORMANCE STRATEGY
   --------------------
   We compare segment pairs (s[i], s[j]) for i < j.

   We skip "near neighbors" because they share endpoints or are
   adjacent in index order. Those "intersections" are not the
   crossings you care about visually; they are topology artifacts.

   The stride parameter reduces work:
     stride = 1 -> full O(N^2) comparisons
     stride = 2 -> sample comparisons more coarsely
     stride = 5 -> much faster, fewer intersections found

   NOTE
   ----
   This is still potentially expensive; keep maxSegments moderate.
------------------------------------------------------------ */
function findIntersections(segments, stride) {

  const hits = [];
  const n = segments.length;

  // A small epsilon helps with floating-point boundary tests.
  const eps = 1e-9;

  for (let i = 0; i < n; i++) {

    const s1 = segments[i];

    for (let j = i + 1; j < n; j += stride) {

      const s2 = segments[j];

      // Skip near-neighbor comparisons:
      // If the stitch segments are indexed by their source point i,
      // then segments with very close indices tend to share endpoints
      // or lie "next to each other" without making meaningful crossings.
      //
      // This is a practical heuristic, not a theorem.
      if (Math.abs(s1.i - s2.i) <= 1) continue;

      // Also skip the wrap-around adjacency (first/last) in a closed loop.
      if (s1.i === 0 && s2.i === n - 1) continue;

      const pt = segmentIntersection(s1.a, s1.b, s2.a, s2.b, eps);
      if (pt) hits.push(pt);

    }

  }

  return hits;

} // end findIntersections


/* ------------------------------------------------------------
   segmentIntersection(A, B, C, D, eps)

   Returns:
     - {x, y} if the closed segments AB and CD intersect at a point
     - null otherwise

   IMPLEMENTATION DETAILS
   ----------------------
   This uses a determinant-based intersection formula for the
   infinite lines AB and CD, then checks whether that intersection
   point lies within each segment’s bounding box.

   1) Denominator:
      denom = (Ax - Bx)*(Cy - Dy) - (Ay - By)*(Cx - Dx)

      If denom == 0, lines are parallel or coincident.
      In that case, we return null (we’re not handling the
      coincident-overlap case here).

   2) Intersection point:
      Use the "line-line intersection" closed form:
        px = det(AB) * (Cx - Dx) - (Ax - Bx) * det(CD)   all / denom
        py = det(AB) * (Cy - Dy) - (Ay - By) * det(CD)   all / denom

      where det(AB) means (Ax*By - Ay*Bx), etc.

   3) Segment containment:
      Even if the infinite lines cross, the segments might not.
      We check bounding boxes with a small epsilon margin.

   IMPORTANT PRACTICAL NOTE
   ------------------------
   This is a numeric test. For dense curves, many intersections
   will lie extremely close to segment endpoints; the epsilon helps
   avoid flickering classification due to rounding.
------------------------------------------------------------ */
function segmentIntersection(A, B, C, D, eps) {

  const Ax = A.x, Ay = A.y;
  const Bx = B.x, By = B.y;
  const Cx = C.x, Cy = C.y;
  const Dx = D.x, Dy = D.y;

  const denom = (Ax - Bx) * (Cy - Dy) - (Ay - By) * (Cx - Dx);
  if (Math.abs(denom) < eps) return null;

  const detAB = (Ax * By - Ay * Bx);
  const detCD = (Cx * Dy - Cy * Dx);

  const px =
    (detAB * (Cx - Dx) - (Ax - Bx) * detCD) / denom;

  const py =
    (detAB * (Cy - Dy) - (Ay - By) * detCD) / denom;

  const P = { x: px, y: py };

  if (!pointOnSegment(P, A, B, eps)) return null;
  if (!pointOnSegment(P, C, D, eps)) return null;

  return P;

} // end segmentIntersection


/* ------------------------------------------------------------
   pointOnSegment(P, A, B, eps)

   Bounding-box containment test.

   For segment AB, point P is on the segment (within tolerance)
   if it lies inside the axis-aligned bounding box of A and B.

   This is necessary but not always sufficient for colinearity, but
   in this usage we already computed P as the intersection of the
   two infinite lines, so colinearity is already established.

   The epsilon margin prevents edge-case drops due to float noise.
------------------------------------------------------------ */
function pointOnSegment(P, A, B, eps) {

  const minX = Math.min(A.x, B.x) - eps;
  const maxX = Math.max(A.x, B.x) + eps;
  const minY = Math.min(A.y, B.y) - eps;
  const maxY = Math.max(A.y, B.y) + eps;

  if (P.x < minX) return false;
  if (P.x > maxX) return false;
  if (P.y < minY) return false;
  if (P.y > maxY) return false;

  return true;

} // end pointOnSegment


/* ============================================================
   drawing helpers
============================================================ */
function drawCurvePolyline(points) {

  if (points.length < 2) return;

  ctx.save();

  ctx.strokeStyle = scriptInfo.params.strokeColor;
  ctx.lineWidth = scriptInfo.params.lineWidth;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.stroke();
  ctx.restore();

} // end drawCurvePolyline


function drawStitchSegments(segments) {

  if (segments.length === 0) return;

  ctx.save();

  ctx.strokeStyle = scriptInfo.params.stitchColor;
  ctx.lineWidth = scriptInfo.params.stitchWidth;

  ctx.beginPath();

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    ctx.moveTo(s.a.x, s.a.y);
    ctx.lineTo(s.b.x, s.b.y);
  }

  ctx.stroke();
  ctx.restore();

} // end drawStitchSegments


function drawIntersectionDots(points) {

  if (points.length === 0) return;

  ctx.save();

  ctx.fillStyle = scriptInfo.params.dotColor;

  const r = scriptInfo.params.dotRadius;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

} // end drawIntersectionDots
