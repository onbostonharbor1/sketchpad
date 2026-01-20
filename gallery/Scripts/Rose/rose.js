/* ============================================================
   Rose Curve Intersections (4-lobed default) — Generic Pipeline
   Gallery Script (ParameterControls-integrated)

   ----------------------------------------------------------------
   RETAINED SOURCE TEXT (AS REQUESTED)
   ----------------------------------------------------------------
   Absolutely! Let’s carefully work through this. Since you want intersection
   points of a rose curve with 4 lobes, we need to define the curve and compute
   where it intersects itself.

   A rose curve with 4 lobes can be written as:

   r(θ) = a · cos(2θ)

   where a is the radius factor. Using polar coordinates:

   x(θ) = r(θ) cos(θ) = a cos(2θ) cos(θ)
   y(θ) = r(θ) sin(θ) = a cos(2θ) sin(θ)

   The curve intersects itself whenever two different angles θ1 != θ2 produce
   the same (x, y) point.

   Notes:
     1. This uses a numerical approach: it samples the curve at many points and
        finds duplicate coordinates within a tolerance.
     2. You can increase steps for higher accuracy.
     3. For a 4-lobed rose, there will be a few self-intersections at the origin
        and some symmetric points.

   ----------------------------------------------------------------
   WHAT YOU WILL LEARN FROM THIS CONVERSION (AND WHY IT DIFFERS)
   ----------------------------------------------------------------
   A) The “math” is not the program:
      - The rose equations define pointAt(theta).
      - Everything else (sampling, intersection detection, drawing) is generic.

   B) The key upgrade: this avoids the naive O(N^2) comparison loop.
      - The original code compares every sampled point pair (i,j).
      - That becomes unusable when steps increases.
      - This script uses spatial hashing (grid buckets) to make it interactive.

   C) What “intersection” means here (important):
      - This is NOT segment/segment intersection.
      - It is “near-duplicate sampled points” within a pixel tolerance.
      - That matches the intent of the original approximation method.

   D) Why this contrasts with lissajous4.js:
      - lissajous4.js (by name and prior context) is likely a single-family
        renderer / exploration file.
      - This script is explicitly a reusable “parametric intersections pipeline”:
           pointAt(theta)  -> points[] -> hits[] -> render
        So you learn the framework pattern you can reuse for other curves.

   ----------------------------------------------------------------
   ASSUMPTIONS (FAIL-FAST)
   ----------------------------------------------------------------
   - buildParameterControls() exists at /ui/parameterControls.js
   - A global canvas context exists (ctx), provided by your getter
   - #action exists (parameterControls uses it)

   IMPORTANT USER RULES
   ----------------------------------------------------------------
   - No local ctx variable is declared in this file.
   - No ctx is passed into helper functions.
   ============================================================ */
/* ============================================================
   Rose Curve Notes (k, petals, and parametric form)
   ------------------------------------------------------------

   k (Frequency)
   -------------
   k is the most important argument for a rose curve because it
   controls:
     - the number of petals
     - the petal density / overlap pattern

   Petal count rules
   -----------------
   If k is an integer:

     - If k is odd:
         petals = k

     - If k is even:
         petals = 2k

   If k is rational (a fraction n/d):
     - The curve can trace a more complex repeating pattern with
       multiple loops that can overlap.
     - Petal count depends on parity (odd/even) of n and d:

         If n and d are both odd:
             petals = n

         If either n or d is even:
             petals = 2n

   The parameter θ (theta)
   -----------------------
   θ is the parametric "time" variable.
   As θ changes, x and y are continuously recalculated, which is
   what "draws" the curve.

   For simple cases, the full curve is typically traced over:
     θ in [0, 2π]

   For more complex (especially rational k) cases, you may need a
   longer θ range to complete the full traced pattern.

   Equations (polar -> parametric)
   -------------------------------
   Start with the polar rose equation:

     r(θ) = a * cos(kθ)

   Convert to parametric x(θ), y(θ):

     x(θ) = r(θ) * cos(θ) = a * cos(kθ) * cos(θ)
     y(θ) = r(θ) * sin(θ) = a * cos(kθ) * sin(θ)

   Practical note
   --------------
   By changing only:
     - a (amplitude / size)
     - k (frequency / petal structure)

   you can control the output without changing the drawing pipeline.

============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Rose Intersections — Generic Pipeline (4-lobed default)",

  params: {

    /* Rose definition */
    a: 200,                 // amplitude / size
    roseK: 2,               // r(θ) = a cos(roseK θ). roseK=2 => 4-lobed.
    useSine: false,         // false => cos(kθ), true => sin(kθ)

    /* Sampling */
    steps: 2500,
    thetaMaxTurns: 1,       // 1 => [0, 2π]

    /* Display */
    strokeWidth: 1,
    strokeColor: "#000000",

    /* Intersections (near-duplicate points) */
    showIntersections: true,
    tolPx: 1.25,            // tolerance in canvas pixels
    markerRadius: 3,
    markerColor: "#cc0000",

    /* Heuristic: suppress “adjacent” matches along the curve sample list */
    adjacencyWindow: 0      // 0 => auto; otherwise explicit integer

  },

  /* Compatibility alias (scriptRunner sometimes reads .parameters). */
  parameters: null,

   controls: {

    /* Rose */
    a:        { label: "Amplitude (a)",               widget: "range", min: 10,   max: 350,  step: 1 },
    roseK:    { label: "k in cos(kθ)",                widget: "range", min: 1,    max: 20,   step: 1 },
    useSine:  { label: "Use sin(kθ)",                 widget: "checkbox" },

    /* Sampling */
    steps:         { label: "Steps",                  widget: "range", min: 200,  max: 8000, step: 50 },
    thetaMaxTurns: { label: "Theta turns",            widget: "range", min: 1,    max: 10,   step: 1 },

    /* Style */
    strokeWidth:   { label: "Stroke width",           widget: "range", min: 1,    max: 6,    step: 1 },
    strokeColor:   { label: "Stroke color",           widget: "color" },

    /* Intersections */
    showIntersections: { label: "Show intersections", widget: "checkbox" },
    tolPx:             { label: "Intersection tol",   widget: "range", min: 0.25, max: 6,    step: 0.25 },
    markerRadius:      { label: "Marker radius",      widget: "range", min: 1,    max: 12,   step: 1 },
    markerColor:       { label: "Marker color",       widget: "color" },

    /* Advanced */
    adjacencyWindow: { label: "Adjacency skip (0=auto)", widget: "range", min: 0, max: 100, step: 1 }

  },


  onParamChange() {
    /* Intentionally empty. */
  }, // end onParamChange

  redrawHandler: null

};

/* ============================================================
   Parametric point function (rose family)
   r(θ) = a * trig(roseK * θ)
   x = r cos θ
   y = r sin θ
============================================================ */
function rosePointAt(theta, p) {

  const trig = p.useSine ? Math.sin : Math.cos;
  const r = p.a * trig(p.roseK * theta);

  return {
    x: r * Math.cos(theta),
    y: r * Math.sin(theta)
  };

} // end rosePointAt

/* ============================================================
   Generic sampler: pointAt(theta) -> points[]
============================================================ */
function generateParametricPoints(pointAt, p) {

  const points = [];
  const steps = p.steps;

  const thetaMax = p.thetaMaxTurns * (Math.PI * 2);

  for (let i = 0; i < steps; i++) {

    const theta = (thetaMax * i) / steps;
    const pt = pointAt(theta, p);

    points.push({
      x: pt.x,
      y: pt.y,
      theta: theta
    });

  }

  return points;

} // end generateParametricPoints

/* ============================================================
   Intersection detection (near-duplicate sampled points)

   Meaning:
   - We treat two sampled points as an “intersection candidate” if their
     distance is <= tolPx.
   - This is an approximation method consistent with the original text.

   Performance:
   - Uses spatial hashing (grid buckets) instead of O(N^2).
============================================================ */
function findSelfIntersections(points, p) {

  const tol = p.tolPx;

  if (tol <= 0) {
    return [];
  }

  const cellSize = tol;
  const tol2 = tol * tol;

  const buckets = new Map();      // "cx,cy" -> [index,...]
  const hits = [];                // accepted hit points
  const hitBuckets = new Map();   // spatial hash for hits (to avoid duplicates)

  function cellKey(cx, cy) {
    return cx + "," + cy;
  } // end cellKey

  function cellCoords(pt) {

    const cx = Math.floor(pt.x / cellSize);
    const cy = Math.floor(pt.y / cellSize);

    return { cx: cx, cy: cy };

  } // end cellCoords

  function bucketAdd(map, cx, cy, value) {

    const key = cellKey(cx, cy);
    const arr = map.get(key);

    if (arr) {
      arr.push(value);
    } else {
      map.set(key, [value]);
    }

  } // end bucketAdd

  function bucketNeighborhood(map, cx, cy) {

    const out = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {

        const arr = map.get(cellKey(cx + dx, cy + dy));
        if (!arr) continue;

        for (let i = 0; i < arr.length; i++) {
          out.push(arr[i]);
        }

      }
    }

    return out;

  } // end bucketNeighborhood

  function dist2(a, b) {

    const dx = a.x - b.x;
    const dy = a.y - b.y;

    return dx * dx + dy * dy;

  } // end dist2

  function acceptHit(pt) {

    const cc = cellCoords(pt);
    const candidates = bucketNeighborhood(hitBuckets, cc.cx, cc.cy);

    for (let i = 0; i < candidates.length; i++) {

      const existing = hits[candidates[i]];
      if (dist2(existing, pt) <= tol2) {
        return;
      }

    }

    bucketAdd(hitBuckets, cc.cx, cc.cy, hits.length);
    hits.push({ x: pt.x, y: pt.y });

  } // end acceptHit

  /* Adjacency skip:
     - prevents trivial matches between nearby sample indices */
  let adjacencyWindow = p.adjacencyWindow;

  if (adjacencyWindow === 0) {
    adjacencyWindow = Math.max(6, Math.floor(p.steps / 300));
  }

  for (let i = 0; i < points.length; i++) {

    const pi = points[i];
    const cci = cellCoords(pi);

    const candidates = bucketNeighborhood(buckets, cci.cx, cci.cy);

    for (let k = 0; k < candidates.length; k++) {

      const j = candidates[k];

      if (Math.abs(i - j) < adjacencyWindow) {
        continue;
      }

      const pj = points[j];

      if (dist2(pi, pj) <= tol2) {

        /* Midpoint reduces jitter */
        acceptHit({
          x: (pi.x + pj.x) / 2,
          y: (pi.y + pj.y) / 2
        });

      }

    }

    bucketAdd(buckets, cci.cx, cci.cy, i);

  }

  return hits;

} // end findSelfIntersections

/* ============================================================
   Drawing helpers
============================================================ */
function clearCanvas() {

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

} // end clearCanvas

function drawCurve(points, p) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const cx = w / 2;
  const cy = h / 2;

  ctx.save();

  ctx.lineWidth = p.strokeWidth;
  ctx.strokeStyle = p.strokeColor;

  ctx.beginPath();

  for (let i = 0; i < points.length; i++) {

    const x = cx + points[i].x;
    const y = cy - points[i].y;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

  }

  ctx.stroke();
  ctx.restore();

} // end drawCurve

function drawIntersections(hits, p) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const cx = w / 2;
  const cy = h / 2;

  ctx.save();
  ctx.fillStyle = p.markerColor;

  for (let i = 0; i < hits.length; i++) {

    const x = cx + hits[i].x;
    const y = cy - hits[i].y;

    ctx.beginPath();
    ctx.arc(x, y, p.markerRadius, 0, Math.PI * 2);
    ctx.fill();

  }

  ctx.restore();

} // end drawIntersections

/* ============================================================
   drawRegistry-style lifecycle
============================================================ */
function init(p) {

  /* No persistent elements required in this version. */

} // end init

function update(p) {

  /* No cached layers yet; nothing to update. */

} // end update

function draw(p) {

  clearCanvas();

  const points = generateParametricPoints(rosePointAt, p);
  drawCurve(points, p);

  if (p.showIntersections) {
    const hits = findSelfIntersections(points, p);
    drawIntersections(hits, p);
  }

} // end draw

/* ============================================================
   runPattern (Gallery script entry point)
============================================================ */
export function runPattern() {

  scriptInfo.parameters = scriptInfo.params;

  buildParameterControls(scriptInfo, "tab-scripts", true);

  scriptInfo.redrawHandler = function () {

    update(scriptInfo.params);
    draw(scriptInfo.params);

  }; // end redrawHandler

  init(scriptInfo.params);
  scriptInfo.redrawHandler();

} // end runPattern
