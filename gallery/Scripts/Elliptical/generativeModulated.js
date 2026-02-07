/* ============================================================
   Modulated Circle — Curve Stitch Grid (Generative)
   Gallery Script (ParameterControls-integrated)

   PURPOSE
   ------------------------------------------------------------
   Take ONE “unit” object (a modulated circle) and apply a
   generative technique: replicate it across a grid using
   transforms, while allowing deterministic per-cell variation.

   This is the “composition by repetition” idea:
     - same generator
     - repeated placement
     - controlled variation per instance

   SHAPE
   ------------------------------------------------------------
   Modulated circle in polar form:

     r(θ) = R + A * sin(nθ + φ)

   We sample points on this curve and draw CURVE-STITCH lines
   between two sequences of points on the same curve:

     A[i] connects to A[ (N - 1 - i) + offset ]

   GENERATIVE TECHNIQUES INCLUDED
   ------------------------------------------------------------
   1) Grid replication (rows x cols)
   2) Per-cell deterministic variation (seeded):
      - phase variation
      - amplitude variation
      - frequency variation
      - rotation variation
      - scale variation
   3) Optional “vary by row/col” gradients (non-random):
      - phaseByRow, phaseByCol
      - amplitudeByRow, amplitudeByCol
      - rotationByRow, rotationByCol

   ASSUMPTIONS (FAIL-FAST)
   ------------------------------------------------------------
   - buildParameterControls() exists at /ui/parameterControls.js
   - A global canvas context exists (ctx), provided by your getter
   - #action exists (parameterControls uses it)

   USER RULES
   ------------------------------------------------------------
   - No local ctx variable is declared in this file.
   - No ctx is passed into helper functions.
   - Controls are OBJECT-KEYED (no "key" fields).
   - Controls use "widget".
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Modulated Circle — Curve Stitch Grid (Generative)",

  params: {

    /* Grid */
    rows: 3,
    cols: 4,
    margin: 20,              /* pixels around the grid */

    /* Unit modulated circle */
    baseRadius: 55,          /* R */
    amplitude: 18,           /* A */
    frequency: 7,            /* n */
    phaseDeg: 0,             /* φ base */

    /* Sampling + stitch */
    steps: 900,
    stitchEvery: 2,
    stitchOffset: 0,

    /* Rendering */
    stitchWidth: 1,
    stitchColor: "#000000",

    /* Optional reference outline (unit curve) */
    showOutline: false,
    outlineWidth: 1,
    outlineColor: "#cc0000",

    /* --------------------------------------------------------
       GENERATIVE: deterministic per-cell variation
       -------------------------------------------------------- */

    seed: 42,
    variation: 0.65,          /* 0..1 global variation strength */

    /* Random-like per-cell deltas (scaled by variation) */
    phaseJitterDeg: 90,       /* +/- degrees */
    amplitudeJitter: 0.50,    /* +/- fraction of amplitude */
    frequencyJitter: 4,       /* +/- integer */
    rotationJitterDeg: 30,    /* +/- degrees */
    scaleJitter: 0.30,        /* +/- fraction of scale */

    /* Row/col gradients (added on top of jitter) */
    phaseByRowDeg: 0,
    phaseByColDeg: 0,
    amplitudeByRow: 0.00,     /* fraction of amplitude per row step */
    amplitudeByCol: 0.00,
    rotationByRowDeg: 0,
    rotationByColDeg: 0

  },

  /* Alias for compatibility with existing scriptRunner expectations. */
  parameters: null,

  controls: {

    /* Grid */
    rows: { label: "Rows", widget: "range", min: 1, max: 10, step: 1 },
    cols: { label: "Cols", widget: "range", min: 1, max: 10, step: 1 },
    margin: { label: "Margin (px)", widget: "range", min: 0, max: 80, step: 1 },

    /* Unit modulated circle */
    baseRadius: { label: "Base radius (R)", widget: "range", min: 5, max: 200, step: 1 },
    amplitude:  { label: "Amplitude (A)", widget: "range", min: 0, max: 160, step: 1 },
    frequency:  { label: "Frequency (n)", widget: "range", min: 1, max: 30, step: 1 },
    phaseDeg:   { label: "Phase (deg)", widget: "range", min: -180, max: 180, step: 1 },

    /* Sampling + stitch */
    steps:        { label: "Steps", widget: "range", min: 200, max: 6000, step: 50 },
    stitchEvery:  { label: "Stitch every", widget: "range", min: 1, max: 20, step: 1 },
    stitchOffset: { label: "Stitch offset", widget: "range", min: -3000, max: 3000, step: 1 },

    /* Rendering */
    stitchWidth: { label: "Stitch width", widget: "range", min: 1, max: 8, step: 1 },
    stitchColor: { label: "Stitch color", widget: "colorPicker" },

    showOutline:  { label: "Show outline", widget: "checkbox" },
    outlineWidth: { label: "Outline width", widget: "range", min: 1, max: 8, step: 1 },
    outlineColor: { label: "Outline color", widget: "colorPicker" },

    /* Generative controls */
    seed:       { label: "Seed", widget: "range", min: 0, max: 1000, step: 1 },
    variation:  { label: "Variation (0..1)", widget: "range", min: 0, max: 1, step: 0.01 },

    phaseJitterDeg:    { label: "Phase jitter (deg)", widget: "range", min: 0, max: 180, step: 1 },
    amplitudeJitter:   { label: "Amp jitter (fraction)", widget: "range", min: 0, max: 1, step: 0.01 },
    frequencyJitter:   { label: "Freq jitter (+/-)", widget: "range", min: 0, max: 12, step: 1 },
    rotationJitterDeg: { label: "Rotation jitter (deg)", widget: "range", min: 0, max: 180, step: 1 },
    scaleJitter:       { label: "Scale jitter (fraction)", widget: "range", min: 0, max: 1, step: 0.01 },

    phaseByRowDeg:     { label: "Phase by row (deg)", widget: "range", min: -180, max: 180, step: 1 },
    phaseByColDeg:     { label: "Phase by col (deg)", widget: "range", min: -180, max: 180, step: 1 },

    amplitudeByRow:    { label: "Amp by row (fraction)", widget: "range", min: -1, max: 1, step: 0.01 },
    amplitudeByCol:    { label: "Amp by col (fraction)", widget: "range", min: -1, max: 1, step: 0.01 },

    rotationByRowDeg:  { label: "Rotation by row (deg)", widget: "range", min: -180, max: 180, step: 1 },
    rotationByColDeg:  { label: "Rotation by col (deg)", widget: "range", min: -180, max: 180, step: 1 }

  },

  elements: null,

  onParamChange() {
    /* Intentionally empty. */
  }, // end onParamChange

  redrawHandler: null

}; // end scriptInfo


/* ============================================================
   Basic helpers
============================================================ */
function toRadians(deg) {
  return (deg * Math.PI) / 180;
} // end toRadians


function clampInt(x, lo, hi) {

  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;

} // end clampInt


function clearCanvas() {

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

} // end clearCanvas


/* ============================================================
   Deterministic per-cell pseudo-random (no Math.random)

   Returns a stable value in [-1, +1] for (row, col, channel).
============================================================ */
function cellNoiseSigned(row, col, channel, seed) {

  /* A simple hash-like scramble:
     - deterministic
     - fast
     - good enough for variation controls */
  const a = 12.9898;
  const b = 78.233;
  const c = 37.719;

  const x = Math.sin((row + 1) * a + (col + 1) * b + (channel + 1) * c + seed * 0.1) * 43758.5453;
  const frac = x - Math.floor(x);

  return (frac * 2) - 1;

} // end cellNoiseSigned


/* ============================================================
   Modulated circle point: θ -> {x,y}

   r(θ) = R + A * sin(nθ + φ)
============================================================ */
function modulatedCirclePointAt(theta, R, A, n, phiRad) {

  const r = R + A * Math.sin(n * theta + phiRad);

  return {
    x: r * Math.cos(theta),
    y: r * Math.sin(theta)
  };

} // end modulatedCirclePointAt


/* ============================================================
   Sample points for one cell-instance
============================================================ */
function generatePointsForCell(p, R, A, n, phiRad) {

  const pts = [];
  const count = p.steps;

  for (let i = 0; i < count; i++) {

    const theta = (Math.PI * 2 * i) / (count - 1);
    const pt = modulatedCirclePointAt(theta, R, A, n, phiRad);

    pts.push({ x: pt.x, y: pt.y });

  }

  return pts;

} // end generatePointsForCell


/* ============================================================
   Draw unit outline (optional)
============================================================ */
function drawOutline(points, p) {

  if (points.length === 0) return;

  ctx.save();

  ctx.lineWidth = p.outlineWidth;
  ctx.strokeStyle = p.outlineColor;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.stroke();
  ctx.restore();

} // end drawOutline


/* ============================================================
   Draw curve stitch for one cell-instance
============================================================ */
function drawStitches(points, p) {

  const n = points.length;

  ctx.save();

  ctx.lineWidth = p.stitchWidth;
  ctx.strokeStyle = p.stitchColor;

  ctx.beginPath();

  for (let i = 0; i < n; i += p.stitchEvery) {

    let j = (n - 1 - i) + p.stitchOffset;

    j = j % n;
    if (j < 0) j += n;

    ctx.moveTo(points[i].x, points[i].y);
    ctx.lineTo(points[j].x, points[j].y);

  }

  ctx.stroke();
  ctx.restore();

} // end drawStitches


/* ============================================================
   Compute per-cell instance parameters (generative)
============================================================ */
function computeCellParams(p, row, col) {

  const v = p.variation;

  /* Jitter in [-1,+1] per channel */
  const nPhase = cellNoiseSigned(row, col, 1, p.seed);
  const nAmp   = cellNoiseSigned(row, col, 2, p.seed);
  const nFreq  = cellNoiseSigned(row, col, 3, p.seed);
  const nRot   = cellNoiseSigned(row, col, 4, p.seed);
  const nScale = cellNoiseSigned(row, col, 5, p.seed);

  /* Base values */
  let R = p.baseRadius;
  let A = p.amplitude;
  let freq = p.frequency;
  let phiDeg = p.phaseDeg;
  let rotDeg = 0;
  let scale = 1;

  /* Row/col gradients (deterministic, no noise) */
  phiDeg += (row * p.phaseByRowDeg) + (col * p.phaseByColDeg);
  rotDeg += (row * p.rotationByRowDeg) + (col * p.rotationByColDeg);
  A      += p.amplitude * ((row * p.amplitudeByRow) + (col * p.amplitudeByCol));

  /* Jitter (scaled by variation) */
  phiDeg += v * p.phaseJitterDeg * nPhase;
  A      += v * (p.amplitude * p.amplitudeJitter) * nAmp;

  freq   += Math.round(v * p.frequencyJitter * nFreq);
  rotDeg += v * p.rotationJitterDeg * nRot;
  scale  += v * p.scaleJitter * nScale;

  /* Keep frequency valid */
  freq = clampInt(freq, 1, 200);

  /* Keep scale sane */
  if (scale < 0.1) scale = 0.1;
  if (scale > 5.0) scale = 5.0;

  /* Prevent negative radius behavior from inverting everything */
  if (R < 1) R = 1;

  /* Let amplitude go negative if you want: it just phase-flips the sine.
     But if you prefer, clamp it. Here we clamp to a reasonable bound. */
  const maxA = Math.max(0, R * 2);
  if (A >  maxA) A =  maxA;
  if (A < -maxA) A = -maxA;

  return {
    R: R,
    A: A,
    freq: freq,
    phiRad: toRadians(phiDeg),
    rotRad: toRadians(rotDeg),
    scale: scale
  };

} // end computeCellParams


/* ============================================================
   Update / Draw lifecycle
============================================================ */
function init(p) {

  scriptInfo.elements = {
    element: {}
  };

} // end init


function update(p) {

  /* no cached geometry: per-cell is cheap enough */

} // end update


function draw(p) {

  clearCanvas();

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const rows = p.rows;
  const cols = p.cols;

  const usableW = w - (p.margin * 2);
  const usableH = h - (p.margin * 2);

  const cellW = usableW / cols;
  const cellH = usableH / rows;

  const originX = p.margin;
  const originY = p.margin;

  /* Set style once (cell draw calls can override if you want later) */
  ctx.save();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {

      const cx = originX + (c * cellW) + (cellW / 2);
      const cy = originY + (r * cellH) + (cellH / 2);

      const cp = computeCellParams(p, r, c);

      /* Scale unit to fit cell:
         - use the smaller cell dimension
         - account for base radius + amplitude
         - then apply per-cell scale jitter */
      const maxRad = Math.max(1, Math.abs(cp.R) + Math.abs(cp.A));
      const fit = (Math.min(cellW, cellH) * 0.45) / maxRad;
      const finalScale = fit * cp.scale;

      ctx.save();

      /* Place instance in its cell */
      ctx.translate(cx, cy);

      /* Optional per-cell rotation */
      ctx.rotate(cp.rotRad);

      /* Scale instance into the cell */
      ctx.scale(finalScale, finalScale);

      /* Generate + render this cell instance in its own local coords */
      const points = generatePointsForCell(p, cp.R, cp.A, cp.freq, cp.phiRad);

      drawStitches(points, p);

      if (p.showOutline) {
        drawOutline(points, p);
      }

      ctx.restore();

    }
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
