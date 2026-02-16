/* ============================================================
   Pursuit Curves in an Ellipse
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Adapted from pursuitCurvesRules.js (circle-based pursuit).
   Initial point placement uses arc-length equalized spacing
   around an ellipse perimeter instead of a circle.

   WHAT CHANGES VS. THE CIRCLE VERSION
   -------------------------------------
   - `radius` replaced by `ellipse_a` (semi-major) and
     `ellipse_b` (semi-minor).
   - `rotate` added — rotates the ellipse and its pursuers.
   - `showEllipse` added — when true, the first frame draws
     ellipse arcs between the starting points instead of
     straight chords.  Every subsequent frame is unchanged:
     straight lines as the pursuers move inward.
   - All pursuit rules (next, kth, centroid, speeds) unchanged.

   THE ELLIPSE BOUNDARY
   --------------------
   The first iteration polygon has its vertices on the ellipse.
   With showEllipse=true its sides follow the ellipse curve
   (drawn as a dense polyline along the arc-length samples).
   This visually anchors the outer boundary to the ellipse
   while the interior spiral remains straight-line pursuit.

   EFFECT OF ELLIPSE ASYMMETRY
   ----------------------------
   Arc-length spacing places pursuers evenly by perimeter
   distance. On a circle this equals equal-angle spacing;
   on an ellipse it does not. Pursuers near the major axis
   ends are denser in angle; those near the minor axis are
   sparser. This breaks rotational symmetry: the inward
   spirals converge at different rates depending on eccentricity.

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - window.ctx exists
   - #action exists
============================================================ */

import { printTitle }             from "/draw/drawUtilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";


/* ------------------------------------------------------------
   clearCanvasFull()
------------------------------------------------------------ */
function clearCanvasFull() {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.restore();

} // end clearCanvasFull


/* ------------------------------------------------------------
   buildEllipseData(thing)
   ------------------------------------------------------------
   Computes arc-length equalized points around the ellipse AND
   retains the dense sample array used to produce them.

   Returns { pts, samplePoints } where:
     pts          — N Cartesian points, evenly spaced by arc length
     samplePoints — dense perimeter samples (>= 2048 points)
                    used by drawEllipseArcs() to draw curved arcs

   We replicate the sampling logic from getEllipsePoints()
   directly so we can return the sample array — the exported
   function discards it after use.
------------------------------------------------------------ */
function buildEllipseData(thing) {

  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const cx = W / 2;
  const cy = H / 2;

  // Semi-axes: user provides the semi-axis value;
  // we use it directly as radiusX / radiusY.
  const radiusX = thing.ellipse_a;
  const radiusY = thing.ellipse_b;
  const n       = thing.n;

  const rotRad = thing.rotate * Math.PI / 180;
  const cosR   = Math.cos(rotRad);
  const sinR   = Math.sin(rotRad);

  // Point on ellipse at parametric angle theta
  function pointAtAngle(theta) {
    const rawX = radiusX * Math.cos(theta);
    const rawY = radiusY * Math.sin(theta);
    return {
      x: cx + rawX * cosR - rawY * sinR,
      y: cy + rawX * sinR + rawY * cosR
    };
  }

  // Dense sample for arc-length equalization and arc drawing
  const samples           = Math.max(2048, n * 16);
  const samplePoints      = new Array(samples + 1);
  const cumulativeLengths = new Float64Array(samples + 1);

  let cumDist = 0;
  let prev    = null;

  for (let i = 0; i <= samples; i++) {
    const theta = (i * 2 * Math.PI) / samples;
    const pt    = pointAtAngle(theta);
    samplePoints[i] = pt;

    if (prev) {
      const dx = pt.x - prev.x;
      const dy = pt.y - prev.y;
      cumDist += Math.hypot(dx, dy);
    }
    cumulativeLengths[i] = cumDist;
    prev = pt;
  }

  const totalArcLength = cumulativeLengths[samples];
  const segmentLength  = totalArcLength / n;

  // Binary search: smallest index whose cumulative length >= target
  function pointAtArcLength(target) {
    let lo = 1, hi = samples;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (cumulativeLengths[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const k    = lo;
    const prev = cumulativeLengths[k - 1];
    const next = cumulativeLengths[k];
    const t    = (target - prev) / Math.max(1e-9, next - prev);
    const p0   = samplePoints[k - 1];
    const p1   = samplePoints[k];
    return {
      x: p0.x + t * (p1.x - p0.x),
      y: p0.y + t * (p1.y - p0.y)
    };
  }

  // N arc-length equalized points
  const pts = new Array(n);
  for (let i = 0; i < n; i++) {
    pts[i] = pointAtArcLength(i * segmentLength);
  }

  return { pts, samplePoints, samples };

} // end buildEllipseData


/* ------------------------------------------------------------
   drawEllipseArcs(pts, samplePoints, samples)
   ------------------------------------------------------------
   Draws the N arcs of the ellipse between consecutive starting
   points. Each arc is traced by walking the dense samplePoints
   array from the index nearest to pts[i] to the index nearest
   to pts[i+1].

   Called once before the pursuit loop to draw the curved outer
   boundary frame. ctx stroke style must already be set.
------------------------------------------------------------ */
function drawEllipseArcs(pts, samplePoints, samples) {

  const n = pts.length;

  // Find the sample index nearest to a given point
  function nearestIndex(pt) {
    let best     = 0;
    let bestDist = Infinity;
    for (let i = 0; i <= samples; i++) {
      const dx = samplePoints[i].x - pt.x;
      const dy = samplePoints[i].y - pt.y;
      const d  = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  // Pre-compute start indices for all N points
  const indices = pts.map(p => nearestIndex(p));

  for (let i = 0; i < n; i++) {
    const iStart = indices[i];
    const iEnd   = indices[(i + 1) % n];

    ctx.moveTo(samplePoints[iStart].x, samplePoints[iStart].y);

    // Walk forward from iStart to iEnd (wrapping around samples)
    let j = iStart;
    while (j !== iEnd) {
      j = (j + 1) % (samples + 1);
      ctx.lineTo(samplePoints[j].x, samplePoints[j].y);
    }
  }

} // end drawEllipseArcs


/* ------------------------------------------------------------
   makeSpeedsArray()
   Deterministic "interesting" speeds without needing text input.
   Produces values spread around baseSpeed.
------------------------------------------------------------ */
function makeSpeedsArray(n, baseSpeed, spread, seed) {

  let arr = new Array(n);

  for (let i = 0; i < n; i++) {
    const t = (i + 1) * (seed + 1) * 0.731;
    const f = Math.sin(t * 3.11) * Math.cos(t * 1.73); // [-1..1]-ish
    arr[i] = baseSpeed + spread * f;
  }

  return arr;

} // end makeSpeedsArray


/* ------------------------------------------------------------
   validateElement(e)
   Fail-fast — no silent clamping.
------------------------------------------------------------ */
function validateElement(e) {

  if (!Number.isInteger(e.n) || e.n < 3)
    throw new Error("pursuitInEllipse: n must be integer >= 3");

  if (!Number.isInteger(e.steps) || e.steps < 1)
    throw new Error("pursuitInEllipse: steps must be integer >= 1");

  if (!Number.isFinite(e.dt) || e.dt <= 0)
    throw new Error("pursuitInEllipse: dt must be > 0");

  if (!Number.isFinite(e.ellipse_a) || e.ellipse_a <= 0)
    throw new Error("pursuitInEllipse: ellipse_a must be > 0");

  if (!Number.isFinite(e.ellipse_b) || e.ellipse_b <= 0)
    throw new Error("pursuitInEllipse: ellipse_b must be > 0");

  if (typeof e.showEllipse !== "boolean")
    throw new Error("pursuitInEllipse: showEllipse must be boolean");

  if (!Number.isFinite(e.speed) || e.speed < 0)
    throw new Error("pursuitInEllipse: speed must be >= 0");

  if (e.rule !== "next" && e.rule !== "kth" &&
      e.rule !== "centroid" && e.rule !== "speeds")
    throw new Error("pursuitInEllipse: rule must be one of next|kth|centroid|speeds");

  if (!Number.isInteger(e.k) || e.k < 1)
    throw new Error("pursuitInEllipse: k must be integer >= 1");

  if (e.k >= e.n)
    throw new Error("pursuitInEllipse: k must be < n");

  if (!Number.isFinite(e.speedSpread) || e.speedSpread < 0)
    throw new Error("pursuitInEllipse: speedSpread must be >= 0");

  if (!Number.isInteger(e.speedSeed) || e.speedSeed < 0)
    throw new Error("pursuitInEllipse: speedSeed must be integer >= 0");

  if (!Number.isFinite(e.lineWidth) || e.lineWidth <= 0)
    throw new Error("pursuitInEllipse: lineWidth must be > 0");

  if (typeof e.strokeStyle !== "string" || e.strokeStyle.length === 0)
    throw new Error("pursuitInEllipse: strokeStyle must be a non-empty string");

} // end validateElement


/* ------------------------------------------------------------
   updateOnce(pts, thing)
   One iteration step — returns new point array.
   Unchanged from circle version.
------------------------------------------------------------ */
function updateOnce(pts, thing) {

  const n     = thing.n;
  const dt    = thing.dt;
  const speed = thing.speed;
  const rule  = thing.rule;

  const newPts = [];

  for (let i = 0; i < n; i++) {

    // Rule: speeds (per-point speed toward next)
    if (rule === "speeds") {

      const j  = (i + 1) % n;
      const dx = pts[j].x - pts[i].x;
      const dy = pts[j].y - pts[i].y;

      newPts.push({
        x: pts[i].x + thing.speeds[i] * dx * dt,
        y: pts[i].y + thing.speeds[i] * dy * dt
      });

      continue;
    }

    // Determine target for other rules
    let target;

    if (rule === "next") {
      target = pts[(i + 1) % n];
    }
    else if (rule === "kth") {
      target = pts[(i + thing.k) % n];
    }
    else if (rule === "centroid") {
      let cx = 0, cy = 0;
      for (let j = 0; j < n; j++) { cx += pts[j].x; cy += pts[j].y; }
      target = { x: cx / n, y: cy / n };
    }
    else {
      target = pts[(i + 1) % n]; // fallback: next
    }

    const dx = target.x - pts[i].x;
    const dy = target.y - pts[i].y;

    newPts.push({
      x: pts[i].x + speed * dx * dt,
      y: pts[i].y + speed * dy * dt
    });
  }

  return newPts;

} // end updateOnce


/* ------------------------------------------------------------
   drawPursuit(thing)
   Clears and draws full path for `steps` iterations.
   Step 0 draws ellipse arcs (curved boundary) when
   thing.showEllipse is true; all subsequent steps draw
   straight-line chords as the pursuers spiral inward.
------------------------------------------------------------ */
function drawPursuit(thing) {

  clearCanvasFull();

  // Build initial points and dense ellipse samples
  const { pts: initialPts, samplePoints, samples } = buildEllipseData(thing);
  let pts = initialPts;

  ctx.strokeStyle = thing.strokeStyle;
  ctx.lineWidth   = thing.lineWidth;

  ctx.beginPath();

  // --- Step 0: draw curved ellipse boundary or straight polygon ---
  if (thing.showEllipse) {
    drawEllipseArcs(pts, samplePoints, samples);
  } else {
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < thing.n; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[0].x, pts[0].y);
  }

  // Advance to step 1
  pts = updateOnce(pts, thing);

  // --- Steps 1..steps-1: straight-line pursuit polygons ---
  for (let s = 1; s < thing.steps; s++) {

    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < thing.n; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.lineTo(pts[0].x, pts[0].y);

    pts = updateOnce(pts, thing);
  }

  ctx.stroke();

} // end drawPursuit


/* ------------------------------------------------------------
   init()
------------------------------------------------------------ */
function init() {

  const p = scriptInfo.params;

  scriptInfo.elements = {
    element: {
      n:           p.n,
      steps:       p.steps,
      dt:          p.dt,
      ellipse_a:   p.ellipse_a,
      ellipse_b:   p.ellipse_b,
      rotate:      p.rotate,
      showEllipse: p.showEllipse,
      speed:       p.speed,
      rule:        p.rule,
      k:           p.k,
      speedSpread: p.speedSpread,
      speedSeed:   p.speedSeed,
      speeds:      null,
      strokeStyle: p.strokeStyle,
      lineWidth:   p.lineWidth
    }
  };

  validateElement(scriptInfo.elements.element);

  scriptInfo.elements.element.speeds =
    makeSpeedsArray(p.n, p.speed, p.speedSpread, p.speedSeed);

} // end init


/* ------------------------------------------------------------
   update(params)
------------------------------------------------------------ */
function update(params) {

  const e = scriptInfo.elements.element;

  e.n           = parseInt(params.n, 10);
  e.steps       = parseInt(params.steps, 10);
  e.dt          = parseFloat(params.dt);
  e.ellipse_a   = parseFloat(params.ellipse_a);
  e.ellipse_b   = parseFloat(params.ellipse_b);
  e.rotate      = parseFloat(params.rotate);
  e.showEllipse = params.showEllipse === true || params.showEllipse === "true";
  e.speed       = parseFloat(params.speed);
  e.rule        = params.rule;
  e.k           = parseInt(params.k, 10);
  e.speedSpread = parseFloat(params.speedSpread);
  e.speedSeed   = parseInt(params.speedSeed, 10);
  e.lineWidth   = parseFloat(params.lineWidth);
  e.strokeStyle = params.strokeStyle;

  validateElement(e);

  e.speeds = makeSpeedsArray(e.n, e.speed, e.speedSpread, e.speedSeed);

} // end update


/* ------------------------------------------------------------
   draw()
------------------------------------------------------------ */
function draw() {
  drawPursuit(scriptInfo.elements.element);
} // end draw


/* ------------------------------------------------------------
   scriptInfo
------------------------------------------------------------ */
export const scriptInfo = {

  title: "Pursuit Curves in Ellipse",

  controls: {

    // --- Ellipse geometry (replaces radius) ---
    ellipse_a:   { label: "Semi-major (a)", widget: "range",    min: 20, max: 400, step: 5, default: 200 },
    ellipse_b:   { label: "Semi-minor (b)", widget: "range",    min: 20, max: 400, step: 5, default: 120 },
    rotate:      { label: "Rotation",       widget: "range",    min: 0,  max: 360, step: 5, default: 0   },
    showEllipse: { label: "Curved Boundary",widget: "checkbox",                             default: true },

    // --- Pursuit parameters (unchanged) ---
    n:           { label: "Points (n)",  widget: "range",  min: 3,     max: 24,   step: 1,     default: 6    },
    steps:       { label: "Steps",       widget: "range",  min: 10,    max: 8000, step: 10,    default: 3000 },
    dt:          { label: "dt",          widget: "range",  min: 0.005, max: 0.2,  step: 0.005, default: 0.05 },
    speed:       { label: "Speed",       widget: "range",  min: 0.1,   max: 3,    step: 0.05,  default: 1.0  },

    rule:        { label: "Rule",        widget: "select", options: ["next", "kth", "centroid", "speeds"], default: "next" },
    k:           { label: "k (kth)",     widget: "range",  min: 1,     max: 23,   step: 1,     default: 2    },

    speedSpread: { label: "Spread",      widget: "range",  min: 0.0,   max: 2.0,  step: 0.05,  default: 0.7  },
    speedSeed:   { label: "Seed",        widget: "range",  min: 0,     max: 20,   step: 1,     default: 3    },

    lineWidth:   { label: "Line Width",  widget: "range",  min: 0.2,   max: 3.0,  step: 0.1,   default: 0.5  },
    strokeStyle: { label: "Color",       widget: "colorPicker",                               default: "#0044ff" }

  }, // end controls

  params: {
    ellipse_a:   200,
    ellipse_b:   120,
    rotate:      0,
    showEllipse: true,
    n:           6,
    steps:       3000,
    dt:          0.05,
    speed:       1.0,
    rule:        "next",
    k:           2,
    speedSpread: 0.7,
    speedSeed:   3,
    lineWidth:   0.5,
    strokeStyle: "#0044ff"
  }, // end params

  elements: null,

  init,
  update,
  draw,

  parameters: null, // compatibility shim — set in runPattern()

  redrawHandler() {
    this.update(this.params);
    this.draw();
  }, // end redrawHandler

  onParamChange() {
    // required by some parameterControls flows
  } // end onParamChange

}; // end scriptInfo


/* ------------------------------------------------------------
   runPattern() — Gallery entry point
------------------------------------------------------------ */
export function runPattern() {

  printTitle(scriptInfo.title);

  scriptInfo.parameters = scriptInfo.params; // compatibility shim

  scriptInfo.init();

  buildParameterControls(scriptInfo, "tab-scripts", true);

  scriptInfo.redrawHandler();

} // end runPattern
