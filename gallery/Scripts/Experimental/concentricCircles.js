/* ============================================================
   Concentric Stitch Engine — Multi-Ring + Boundary Types + Mapping Modes
   Gallery Script (ParameterControls-integrated)

   PURPOSE
   -------
   Generalize the REM “Concentric circles” idea into a single
   explicit engine:

     - Choose boundary type (circle / ellipse / modulated circle)
     - Choose pairing mode (single pair / adjacent rings / all pairs)
     - Choose mapping mode (ratio / ratio+phase / ratio+phase+warp)

   ENGINE (ALWAYS THE SAME)
   -----------------------
   1) Sample boundary A at parameter t (angle in radians)
   2) Compute mapped parameter u = map(t)
   3) Sample boundary B at u
   4) Draw segment A(t) -> B(u)

   This stays “curve-stitch native”: straight segments produce
   envelopes and interference patterns.

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - window.ctx exists (global getter)
   - buildParameterControls() exists at /ui/parameterControls.js
   - #action exists (parameterControls uses it)

   IMPORTANT USER RULES
   --------------------
   - No local ctx variable is declared in this file.
   - No ctx is passed into helper functions.
   - No invented control schema concepts (no 'key').

   NOTE ON UNRAVELING COMPLEXITY
   -----------------------------
   This script is deliberately flat:
   - One draw() with explicit switch statements
   - Small helper functions only for mechanical math
   - Controls are always visible, but only the relevant ones are used
   ============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Concentric Stitch Engine — Rings + Boundary Types",

  params: {

    /* Placement */
    centerX: 650,
    centerY: 380,

    /* Rings */
    innerR: 120,
    outerR: 320,
    ringCount: 3,

    /* Pairing */
    pairingMode: "adjacent",     /* single | adjacent | all */
    ringA: 0,                    /* used only when pairingMode=single */
    ringB: 2,                    /* used only when pairingMode=single */

    /* Boundary shape */
    boundaryType: "circle",      /* circle | ellipse | modulated */
    ellipseRatio: 0.70,          /* b/a for ellipse (0.1..1.0) */
    modAmp: 0.25,                /* modulation amplitude as fraction of radius */
    modFreq: 6,                  /* modulation frequency (lobes) */
    modPhase: 0.0,               /* radians */

    /* Stitch sampling */
    steps: 220,                  /* number of line segments per pair */
    tStart: 0.0,                 /* radians */
    tEnd: (Math.PI * 2),

    /* Mapping */
    direction: "cw",             /* cw | ccw (matches REM's V flag idea) */
    mappingMode: "ratio",        /* ratio | phase | warp */
    ratio: 3.0,                  /* N */
    phase: 0.0,                  /* radians */
    warpAmp: 0.0,                /* radians */
    warpFreq: 3.0,               /* integer-ish */

    /* Styling */
    showRings: true,
    ringWidth: 1,
    ringColor: "#888888",

    lineWidth: 1,
    lineColor: "#000000",

    /* Global shift */
    offsetX: 0,
    offsetY: 0

  },

  parameters: null,

  controls: {

    centerX: { label: "Center X", widget: "range", min: 0, max: 2000, step: 1 },
    centerY: { label: "Center Y", widget: "range", min: 0, max: 2000, step: 1 },

    innerR:  { label: "Inner R",  widget: "range", min: 5, max: 1000, step: 1 },
    outerR:  { label: "Outer R",  widget: "range", min: 10, max: 1500, step: 1 },
    ringCount:{ label: "Ring count", widget: "range", min: 2, max: 10, step: 1 },

    pairingMode: {
      label: "Pairing mode",
      widget: "select",
      options: ["single", "adjacent", "all"]
    },

    ringA: { label: "Ring A (single)", widget: "range", min: 0, max: 9, step: 1 },
    ringB: { label: "Ring B (single)", widget: "range", min: 1, max: 9, step: 1 },

    boundaryType: {
      label: "Boundary type",
      widget: "select",
      options: ["circle", "ellipse", "modulated"]
    },

    ellipseRatio: { label: "Ellipse ratio (b/a)", widget: "range", min: 0.10, max: 1.00, step: 0.01 },

    modAmp:   { label: "Mod amp (fraction)", widget: "range", min: 0.00, max: 0.90, step: 0.01 },
    modFreq:  { label: "Mod freq", widget: "range", min: 1, max: 24, step: 1 },
    modPhase: { label: "Mod phase", widget: "range", min: -6.283, max: 6.283, step: 0.01 },

    steps:  { label: "Steps", widget: "range", min: 20, max: 2000, step: 1 },

    direction: {
      label: "Direction",
      widget: "select",
      options: ["cw", "ccw"]
    },

    mappingMode: {
      label: "Mapping mode",
      widget: "select",
      options: ["ratio", "phase", "warp"]
    },

    ratio: { label: "Ratio (N)", widget: "range", min: -12.0, max: 12.0, step: 0.01 },
    phase: { label: "Phase", widget: "range", min: -6.283, max: 6.283, step: 0.01 },

    warpAmp:  { label: "Warp amp", widget: "range", min: 0.0, max: 6.283, step: 0.01 },
    warpFreq: { label: "Warp freq", widget: "range", min: 0.0, max: 24.0, step: 0.01 },

    showRings: { label: "Show rings", widget: "checkbox" },
    ringWidth: { label: "Ring width", widget: "range", min: 1, max: 8, step: 1 },
    ringColor: { label: "Ring color", widget: "color" },

    lineWidth: { label: "Line width", widget: "range", min: 1, max: 8, step: 1 },
    lineColor: { label: "Line color", widget: "color" },

    offsetX: { label: "Offset X", widget: "range", min: -1200, max: 1200, step: 1 },
    offsetY: { label: "Offset Y", widget: "range", min: -1200, max: 1200, step: 1 }

  },

  onParamChange() {
    /* Intentionally empty. */
  }, // end onParamChange

  redrawHandler: null

}; // end scriptInfo


/* ============================================================
   Helpers
============================================================ */
function clearCanvas() {

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

} // end clearCanvas


function applyGlobalOffset(p) {

  ctx.translate(p.offsetX, p.offsetY);

} // end applyGlobalOffset


function clampInt(v, lo, hi) {

  const n = Math.floor(v);
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;

} // end clampInt


function computeRings(p) {

  if (p.ringCount < 2) {
    throw new Error("ringCount must be >= 2");
  }
  if (p.outerR <= p.innerR) {
    throw new Error("outerR must be > innerR");
  }

  const rings = [];
  const n = p.ringCount;
  const span = p.outerR - p.innerR;

  for (let i = 0; i < n; i++) {
    const r = p.innerR + (span * i) / (n - 1);
    rings.push(r);
  }

  return rings;

} // end computeRings


function mapAngle(t, p) {

  /* Match REM sign convention with explicit direction.
     - cw  : H = +N * t
     - ccw : H = -N * t  */
  const sign = (p.direction === "cw") ? 1 : -1;

  if (p.mappingMode === "ratio") {
    return (sign * p.ratio * t);
  }

  if (p.mappingMode === "phase") {
    return (sign * p.ratio * t) + p.phase;
  }

  /* warp */
  return (sign * p.ratio * t) + p.phase + (p.warpAmp * Math.sin(p.warpFreq * t));

} // end mapAngle


function pointOnBoundary(p, radius, angle) {

  /* Returns {x,y} in world coordinates (after center). */

  const cx = p.centerX;
  const cy = p.centerY;

  if (p.boundaryType === "circle") {
    return {
      x: cx + radius * Math.sin(angle),
      y: cy - radius * Math.cos(angle)
    };
  }

  if (p.boundaryType === "ellipse") {
    const a = radius;
    const b = radius * p.ellipseRatio;
    return {
      x: cx + a * Math.sin(angle),
      y: cy - b * Math.cos(angle)
    };
  }

  /* modulated circle */
  const r = radius * (1 + (p.modAmp * Math.sin((p.modFreq * angle) + p.modPhase)));
  return {
    x: cx + r * Math.sin(angle),
    y: cy - r * Math.cos(angle)
  };

} // end pointOnBoundary


function drawRing(p, radius) {

  if (!p.showRings) return;

  ctx.save();
  ctx.lineWidth = p.ringWidth;
  ctx.strokeStyle = p.ringColor;

  const steps = 360;
  const dt = (Math.PI * 2) / steps;

  ctx.beginPath();

  for (let i = 0; i <= steps; i++) {
    const a = i * dt;
    const pt = pointOnBoundary(p, radius, a);
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  }

  ctx.stroke();
  ctx.restore();

} // end drawRing


function drawStitchPair(p, rA, rB) {

  ctx.save();
  ctx.lineWidth = p.lineWidth;
  ctx.strokeStyle = p.lineColor;

  const n = p.steps;
  if (n < 2) {
    ctx.restore();
    return;
  }

  const t0 = p.tStart;
  const t1 = p.tEnd;
  const dt = (t1 - t0) / (n - 1);

  for (let i = 0; i < n; i++) {

    const t = t0 + (i * dt);
    const u = mapAngle(t, p);

    const a = pointOnBoundary(p, rA, t);
    const b = pointOnBoundary(p, rB, u);

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

  }

  ctx.restore();

} // end drawStitchPair


function drawAllPairs(p, rings) {

  for (let i = 0; i < rings.length; i++) {
    for (let j = i + 1; j < rings.length; j++) {
      drawStitchPair(p, rings[i], rings[j]);
    }
  }

} // end drawAllPairs


function drawAdjacentPairs(p, rings) {

  for (let i = 0; i < rings.length - 1; i++) {
    drawStitchPair(p, rings[i], rings[i + 1]);
  }

} // end drawAdjacentPairs


function drawSinglePair(p, rings) {

  const maxIndex = rings.length - 1;

  const a = clampInt(p.ringA, 0, maxIndex);
  const b = clampInt(p.ringB, 0, maxIndex);

  if (a === b) {
    throw new Error("single pair: Ring A and Ring B must be different");
  }

  const rA = rings[Math.min(a, b)];
  const rB = rings[Math.max(a, b)];

  drawStitchPair(p, rA, rB);

} // end drawSinglePair


/* ============================================================
   Lifecycle (drawRegistry-style)
============================================================ */
function init(p) {
  /* No persistent elements required. */
} // end init


function update(p) {

  /* Fail-fast on obvious parameter mismatches. */
  if (p.steps < 2) throw new Error("steps must be >= 2");
  if (p.tEnd === p.tStart) throw new Error("tStart and tEnd must differ");

} // end update


function draw(p) {

  clearCanvas();

  ctx.save();
  applyGlobalOffset(p);

  const rings = computeRings(p);

  /* Draw boundaries */
  for (let i = 0; i < rings.length; i++) {
    drawRing(p, rings[i]);
  }

  /* Stitching (pairing mode) */
  if (p.pairingMode === "single") {
    drawSinglePair(p, rings);
  }
  else if (p.pairingMode === "adjacent") {
    drawAdjacentPairs(p, rings);
  }
  else {
    drawAllPairs(p, rings);
  }

  ctx.restore();

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
