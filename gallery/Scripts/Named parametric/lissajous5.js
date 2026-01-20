/* ============================================================
   Interactive Parametric Curves (Rose + Lissajous) — Intersections
   Gallery Script (ParameterControls-integrated)

   ----------------------------------------------------------------
   RETAINED SOURCE TEXT (AS REQUESTED)
   ----------------------------------------------------------------
   Ah, yes — that’s a key point! Let me clarify.

   In parametric curves, the curve is defined as a pair of functions:

   x = f_x(t), \quad y = f_y(t)

   So conceptually, you can pass a single wrapper function that returns {x, y}
   for each parameter t (or theta). That’s exactly what we do here:

   - rosePointAt(theta, params)      -> {x,y}
   - lissajousPointAt(theta, params) -> {x,y}

     • theta is the parameter (t in the math).
     • x and y are calculated together.
     • The function returns a single object {x, y}, so the rest of the pipeline
       (generateParametricPoints, findSelfIntersections, drawCurve) doesn’t
       need to know the details of x and y separately.

   This approach is convenient because it keeps the intersection detection and
   drawing functions fully generic — they just ask “what is the point at this
   parameter?”

   ----------------------------------------------------------------
   WHAT YOU WILL LEARN FROM THIS CONVERSION (AND WHY IT MATTERS)
   ----------------------------------------------------------------
   1) Separation of concerns:
      - Curve definition: "pointAt(theta) -> {x,y}" (rose or lissajous)
      - Sampling: generateParametricPoints() does NOT know the curve type
      - Intersections: findSelfIntersections() does NOT know the curve type
      - Rendering: drawCurve() does NOT know the curve type

   2) Why the wrapper point function is powerful:
      - It lets you plug in new parametric families without changing the
        sampling, intersection detection, or drawing pipeline.

   3) A practical, scalable intersection strategy:
      - The naive O(N^2) "compare every point to every point" approach
        becomes unusable as steps increases.
      - This script uses a spatial hash (uniform grid bucketing) to make
        "near-duplicate" detection practical for interactive sliders.

   ----------------------------------------------------------------
   ASSUMPTIONS (FAIL-FAST)
   ----------------------------------------------------------------
   - buildParameterControls() exists at /ui/parameterControls.js
   - A global canvas context exists (ctx), provided by your getter
   - #action exists (parameterControls uses it)
   - This file is executed by the Gallery Scripts runner (runPattern)

   IMPORTANT USER RULES
   ----------------------------------------------------------------
   - No local ctx variable is declared in this file.
   - No ctx is passed into helper functions.
   - Controls are OBJECT-KEYED. No invented "key" field (or any synonym).
   - Controls use "widget".
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Parametric Curves — Rose vs Lissajous (Intersections Pipeline)",

  /* Parameters are the single source of truth for this script. */
  params: {

    curveType: "rose",     /* "rose" | "lissajous" */

    /* Global controls */
    steps: 2000,
    thetaMaxTurns: 1,      /* number of full turns (1 => 2π, 2 => 4π, etc.) */
    strokeWidth: 1,
    strokeColor: "#000000",

    /* Intersections */
    showIntersections: true,
    tol: 1.0,              /* distance tolerance in *canvas pixels* */
    markerRadius: 3,
    markerColor: "#cc0000",

    /* Rose controls */
    roseA: 180,
    roseK: 5,
    roseUseSine: false,    /* false => cos(kθ), true => sin(kθ) */

    /* Lissajous controls */
    lissA: 180,
    lissB: 180,
    lissAFreq: 3,
    lissBFreq: 2,
    lissDelta: Math.PI / 2

  },

  /* Alias for compatibility with existing scriptRunner expectations. */
  parameters: null,

  /* Controls are OBJECT-KEYED. */
  controls: {

    /* Curve selector */
    curveType: {
      label: "Curve",
      widget: "select",
      options: [
        { value: "rose", label: "Rose" },
        { value: "lissajous", label: "Lissajous" }
      ]
    },

    /* Shared */
    steps: {
      label: "Steps",
      widget: "range",
      min: 200,
      max: 6000,
      step: 50
    },

    thetaMaxTurns: {
      label: "Theta turns",
      widget: "range",
      min: 1,
      max: 10,
      step: 1
    },

    strokeWidth: {
      label: "Stroke width",
      widget: "range",
      min: 1,
      max: 6,
      step: 1
    },

    strokeColor: {
      label: "Stroke color",
      widget: "color"
    },

    /* Intersections */
    showIntersections: {
      label: "Show intersections",
      widget: "checkbox"
    },

    tol: {
      label: "Intersection tolerance (px)",
      widget: "range",
      min: 0.25,
      max: 6,
      step: 0.25
    },

    markerRadius: {
      label: "Marker radius",
      widget: "range",
      min: 1,
      max: 10,
      step: 1
    },

    markerColor: {
      label: "Marker color",
      widget: "color"
    },

    /* Rose */
    roseA: {
      label: "Rose amplitude (a)",
      widget: "range",
      min: 10,
      max: 300,
      step: 1
    },

    roseK: {
      label: "Rose k",
      widget: "range",
      min: 1,
      max: 20,
      step: 1
    },

    roseUseSine: {
      label: "Rose uses sine",
      widget: "checkbox"
    },

    /* Lissajous */
    lissA: {
      label: "Lissajous A (x amp)",
      widget: "range",
      min: 10,
      max: 300,
      step: 1
    },

    lissB: {
      label: "Lissajous B (y amp)",
      widget: "range",
      min: 10,
      max: 300,
      step: 1
    },

    lissAFreq: {
      label: "Lissajous a (x freq)",
      widget: "range",
      min: 1,
      max: 12,
      step: 1
    },

    lissBFreq: {
      label: "Lissajous b (y freq)",
      widget: "range",
      min: 1,
      max: 12,
      step: 1
    },

    lissDelta: {
      label: "Lissajous delta",
      widget: "range",
      min: 0,
      max: 6.283185307179586,
      step: 0.01
    }

  },

  /* Elements cache (drawRegistry-style). */
  elements: null,

  /* Compatibility no-op. */
  onParamChange() {
    /* Intentionally empty. */
  }, // end onParamChange

  /* Redraw handler is set during runPattern(). */
  redrawHandler: null

}; // end scriptInfo


/* ============================================================
   Curve point functions: theta -> {x,y}
============================================================ */

/* Rose curve:
   r(θ) = a * trig(kθ), then x = r cos θ, y = r sin θ. */
function rosePointAt(theta, p) {

  const trig = p.roseUseSine ? Math.sin : Math.cos;
  const r = p.roseA * trig(p.roseK * theta);

  return {
    x: r * Math.cos(theta),
    y: r * Math.sin(theta)
  };

} // end rosePointAt

/* Lissajous:
   x = A sin(aθ + δ)
   y = B sin(bθ) */
function lissajousPointAt(theta, p) {

  return {
    x: p.lissA * Math.sin(p.lissAFreq * theta + p.lissDelta),
    y: p.lissB * Math.sin(p.lissBFreq * theta)
  };

} // end lissajousPointAt


/* ============================================================
   Sampling: generic point function -> points[]
============================================================ */
function generateParametricPoints(pointAt, p) {

  const points = [];
  const steps = p.steps;

  /* thetaMaxTurns = number of full 2π revolutions. */
  const thetaMax = p.thetaMaxTurns * (Math.PI * 2);

  /* Generate steps points in [0, thetaMax]. */
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
   INTERSECTION FINDING (WITH LOTS OF COMMENTS AS REQUESTED)

   What we mean by "intersection" here:
   -----------------------------------
   This is NOT segment/segment intersection.

   It is a *sampled near-duplicate* test:
     "If two sampled points are very close in (x,y), treat that as
      a self-intersection."

   Why do it anyway?
   -----------------
   - It's simple and works well as a teaching tool.
   - For many parametric curves, true self-crossings produce clustered
     near-duplicates in the sampled point list.

   Problem with the naive O(N^2) approach:
   ---------------------------------------
   If steps = 2000, N^2 = 4 million comparisons (borderline).
   If steps = 6000, N^2 = 36 million comparisons (too slow for sliders).

   Practical fix: spatial hashing (uniform grid bucketing)
   -------------------------------------------------------
   - Put each point into a grid cell of size ~= tol.
   - A point can only be within tol of points in its own cell or neighbor cells.
   - This reduces comparisons dramatically.

   Key idea:
   ---------
   We are finding "places where the curve revisits the same location"
   within a given pixel tolerance, in the sampled discretization.

============================================================ */
function findSelfIntersections(points, p) {

  const tol = p.tol;

  /* If tol is zero-ish, there is no meaningful "near" match. */
  if (tol <= 0) {
    return [];
  }

  /* Cell size = tol.
     If two points are within tol, they must be in the same cell or a neighbor. */
  const cellSize = tol;

  /* Map: "cx,cy" -> array of indices into points[] */
  const buckets = new Map();

  /* Output: unique intersection points in math coords. */
  const hits = [];

  /* Duplicate suppression buckets for accepted hits. */
  const hitBuckets = new Map();

  /* Helper: compute integer cell coords for a point. */
  function cellCoords(pt) {

    const cx = Math.floor(pt.x / cellSize);
    const cy = Math.floor(pt.y / cellSize);

    return { cx: cx, cy: cy };

  } // end cellCoords

  /* Helper: pack cell coords into a string key. */
  function cellKey(cx, cy) {
    return cx + "," + cy;
  } // end cellKey

  /* Helper: add a value to a bucket. */
  function bucketAdd(map, cx, cy, value) {

    const key = cellKey(cx, cy);
    const arr = map.get(key);

    if (arr) {
      arr.push(value);
    } else {
      map.set(key, [value]);
    }

  } // end bucketAdd

  /* Helper: gather indices from a 3x3 neighborhood. */
  function bucketNeighborhood(map, cx, cy) {

    const out = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {

        const key = cellKey(cx + dx, cy + dy);
        const arr = map.get(key);

        if (arr) {
          for (let i = 0; i < arr.length; i++) {
            out.push(arr[i]);
          }
        }

      }
    }

    return out;

  } // end bucketNeighborhood

  /* Helper: distance squared (avoid sqrt). */
  function dist2(a, b) {

    const dx = a.x - b.x;
    const dy = a.y - b.y;

    return dx * dx + dy * dy;

  } // end dist2

  /* Helper: accept a hit only if it is not near an existing hit. */
  function acceptHit(pt) {

    const cc = cellCoords(pt);
    const cand = bucketNeighborhood(hitBuckets, cc.cx, cc.cy);

    const tol2 = tol * tol;

    for (let i = 0; i < cand.length; i++) {
      const existing = hits[cand[i]];
      if (dist2(existing, pt) <= tol2) {
        return;
      }
    }

    bucketAdd(hitBuckets, cc.cx, cc.cy, hits.length);
    hits.push({ x: pt.x, y: pt.y });

  } // end acceptHit

  /* Adjacency skip:
     Successive samples are close even when the curve does not intersect.
     Skip comparisons where |i - j| is small. */
  const adjacencyWindow = Math.max(6, Math.floor(p.steps / 300));
  const tol2 = tol * tol;

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

        /* Midpoint reduces marker jitter. */
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

    /* Convert math coords -> canvas coords:
       x shifts by +cx
       y flips and shifts by +cy */
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
   Update / Draw lifecycle (drawRegistry-style)
============================================================ */
function init(p) {

  /* Persistent cache for this script. */
  scriptInfo.elements = {
    element: {
      points: [],
      hits: []
    }
  };

} // end init

function update(p) {

  /* Recompute cached geometry each redraw (simple + deterministic). */

  let pointAt;

  if (p.curveType === "rose") {
    pointAt = rosePointAt;
  } else {
    pointAt = lissajousPointAt;
  }

  const points = generateParametricPoints(pointAt, p);

  let hits = [];
  if (p.showIntersections) {
    hits = findSelfIntersections(points, p);
  }

  scriptInfo.elements.element.points = points;
  scriptInfo.elements.element.hits = hits;

} // end update

function draw(p) {

  clearCanvas();

  drawCurve(scriptInfo.elements.element.points, p);

  if (p.showIntersections) {
    drawIntersections(scriptInfo.elements.element.hits, p);
  }

} // end draw


/* ============================================================
   runPattern (Gallery script entry point)
============================================================ */
export function runPattern() {

  /* ParameterControls expects this alias for many scripts. */
  scriptInfo.parameters = scriptInfo.params;

  /* Build UI controls into the Gallery Scripts tab area. */
  buildParameterControls(scriptInfo, "tab-scripts", true);

  /* Install redraw handler using the standard pattern you requested. */
  scriptInfo.redrawHandler = function () {

    update(scriptInfo.params);
    draw(scriptInfo.params);

  }; // end redrawHandler

  /* Cold start. */
  init(scriptInfo.params);
  scriptInfo.redrawHandler();

} // end runPattern
