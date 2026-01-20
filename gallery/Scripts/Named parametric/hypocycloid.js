/* ============================================================
   Hypocycloid — Curve vs Curve-Stitch Mode
   Gallery Script (ParameterControls-integrated)

   WHAT THIS SCRIPT DOES
   ---------------------
   This script draws a hypocycloid in TWO modes:

   1) Curve mode (default)
      - Draws the hypocycloid as a single continuous parametric curve.

   2) Curve-stitch mode
      - Computes points along the hypocycloid.
      - Draws straight line segments connecting points that are "skip"
        steps apart (like classic string-art / curve-stitch).
      - Optionally repeats multiple "passes" with different start offsets
        to build the dense woven look you showed.

   WHY THIS MATCHES YOUR REQUEST
   -----------------------------
   - There is a checkbox that flips between the two modes.
   - When curve-stitch mode is ON, extra sliders appear.
   - When it is OFF, those stitch-only controls disappear.

   IMPORTANT NOTE ABOUT UI CONTROLS
   -------------------------------
   Your Gallery environment uses buildParameterControls() as the UI engine.
   That means:
     - scriptInfo.controls must use `widget`, not `type`.
     - To show/hide stitch-only controls, we rebuild the controls list
       and call buildParameterControls() again.

   MATH BACKGROUND (HYPOCYCLOID)
   -----------------------------
   A hypocycloid is traced by a point on the circumference of a circle
   of radius r rolling inside a fixed circle of radius R.

   Standard parametric form:
     x(t) = (R - r) cos(t) + r cos((R - r)/r * t)
     y(t) = (R - r) sin(t) - r sin((R - r)/r * t)

   If R/r is an integer N, the curve closes nicely and has N cusps.

   In this script:
     - "cusps" (N) is the integer ratio R/r.
     - We set R = baseRadius, r = baseRadius / cusps
       so the ratio is controlled directly.

   FILE CONTRACT (Gallery Script)
   ------------------------------
   - exports scriptInfo
   - exports runPattern()  (NO ctx argument; uses global ctx)
   - uses drawRegistry-like lifecycle: init / update / draw
   - uses elements.element for computed geometry

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - ctx exists (global getter already configured by Sketchpad)
   - buildParameterControls exists at /ui/parameterControls.js
   - #action exists for control rendering

============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Hypocycloid — Curve / Curve-Stitch",

  params: {

    // Main geometry controls
    cusps: 5,                 // integer ratio R/r; also number of cusps
    baseRadius: 220,           // radius of fixed circle (R)
    rotationDeg: 0,            // rotate final drawing
    samples: 1600,             // number of points computed along curve

    // Style controls (common to both modes)
    lineWidth: 1,
    strokeAlpha: 0.9,

    // Mode switch
    curveStitch: false,

    // Stitch-only controls (only used when curveStitch === true)
    stitchSkip: 37,            // connect point i to i + stitchSkip
    stitchPasses: 1,           // number of repeated "offset passes"
    stitchPassStep: 1,         // how much to shift start index per pass

    // Optional: connect more than one neighbor (web density)
    stitchNeighbors: 1         // connect i->i+skip, i->i+2*skip, ...
  },

  // Controls are built dynamically (base controls + conditional stitch controls)
  controls: {},

  // Required alias (compat)
  parameters: null,

  // Optional compat hooks (kept inert but present)
  redrawHandler: null,
  onParamChange: null

}; // end scriptInfo



/* ============================================================
   State / Elements
============================================================ */
const elements = {

  // element.points: [{x,y}, ...] in canvas coordinates
  // element.lines:  [[p1,p2], ...] for stitch mode
  element: null,

  // Track the last mode so we know when to rebuild controls
  lastMode: null

}; // end elements



/* ============================================================
   buildControlsForMode(curveStitch)
   ------------------------------------------------------------
   Returns a controls object using Sketchpad's parameterControls
   "widget" vocabulary.

   We keep the base controls always visible.
   We append stitch-only controls only when curveStitch is true.
============================================================ */
function buildControlsForMode(curveStitch) {

  const controls = {

    cusps: {
      label: "Cusps (R/r)",
      widget: "range",
      min: 2,
      max: 20,
      step: 1
    },

    baseRadius: {
      label: "Base Radius (R)",
      widget: "range",
      min: 40,
      max: 360,
      step: 1
    },

    rotationDeg: {
      label: "Rotation (deg)",
      widget: "range",
      min: 0,
      max: 360,
      step: 1
    },

    samples: {
      label: "Samples",
      widget: "range",
      min: 200,
      max: 8000,
      step: 50
    },

    lineWidth: {
      label: "Line Width",
      widget: "range",
      min: 1,
      max: 6,
      step: 1
    },

    strokeAlpha: {
      label: "Stroke Alpha",
      widget: "range",
      min: 0.05,
      max: 1.0,
      step: 0.05
    },

    curveStitch: {
      label: "Curve-Stitch Mode",
      widget: "checkbox"
    }

  };

  if (curveStitch) {

    controls.stitchSkip = {
      label: "Stitch Skip",
      widget: "range",
      min: 1,
      max: 300,
      step: 1
    };

    controls.stitchNeighbors = {
      label: "Neighbors",
      widget: "range",
      min: 1,
      max: 10,
      step: 1
    };

    controls.stitchPasses = {
      label: "Passes",
      widget: "range",
      min: 1,
      max: 40,
      step: 1
    };

    controls.stitchPassStep = {
      label: "Pass Step",
      widget: "range",
      min: 0,
      max: 50,
      step: 1
    };

  }

  return controls;

} // end buildControlsForMode



/* ============================================================
   rebuildControlsIfNeeded()
   ------------------------------------------------------------
   If the user flipped curveStitch, we rebuild the control panel
   so stitch-only sliders appear/disappear.

   This is the simplest deterministic approach in your Gallery:
     - rewrite scriptInfo.controls
     - rebuildParameterControls into #action
============================================================ */
function rebuildControlsIfNeeded() {

  const mode = Boolean(scriptInfo.params.curveStitch);

  if (elements.lastMode === mode) return;

  elements.lastMode = mode;

  scriptInfo.controls = buildControlsForMode(mode);

  // Keep the alias in sync every time we rebuild controls.
  scriptInfo.parameters = scriptInfo.params;

  // Rebuild the control UI.
  buildParameterControls(scriptInfo, "tab-scripts", true);

} // end rebuildControlsIfNeeded



/* ============================================================
   init()
   ------------------------------------------------------------
   Cold-start only.
============================================================ */
function init() {

  elements.element = {
    points: [],
    lines: []
  };

  // Force a first-time control build (lastMode starts null).
  elements.lastMode = null;

} // end init



/* ============================================================
   computeHypocycloidPoints(params)
   ------------------------------------------------------------
   Computes points along a hypocycloid in its local coordinate
   system, then rotates and centers them on the canvas.

   Notes:
   - We force cusps to an integer >= 2 because the "cusps" control
     is meant to produce classic closed shapes. If you later want
     non-integer ratios, we can add that as a separate feature.

   - The points are returned in canvas coordinates.

============================================================ */
function computeHypocycloidPoints(params) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const cx = w / 2;
  const cy = h / 2;

  const cusps = Math.max(2, Math.floor(params.cusps));
  const R = params.baseRadius;
  const r = R / cusps;

  const rot = (params.rotationDeg * Math.PI) / 180;
  const cosRot = Math.cos(rot);
  const sinRot = Math.sin(rot);

  const n = Math.max(50, Math.floor(params.samples));

  // Choose a parameter span that reliably closes for integer cusps.
  // For integer cusps N = R/r, the curve closes after 2π * N.
  const tMax = Math.PI * 2 * cusps;

  const pts = [];

  for (let i = 0; i <= n; i++) {

    const t = (i / n) * tMax;

    // Hypocycloid parametric equations
    const x0 = (R - r) * Math.cos(t) + r * Math.cos(((R - r) / r) * t);
    const y0 = (R - r) * Math.sin(t) - r * Math.sin(((R - r) / r) * t);

    // Rotate
    const xr = x0 * cosRot - y0 * sinRot;
    const yr = x0 * sinRot + y0 * cosRot;

    // Center on canvas
    pts.push({
      x: cx + xr,
      y: cy + yr
    });

  }

  return pts;

} // end computeHypocycloidPoints



/* ============================================================
   buildStitchLines(points, params)
   ------------------------------------------------------------
   Creates an array of line segments for curve-stitch rendering.

   Stitch concept:
   - You have an ordered point list: p[0], p[1], ... p[n-1].
   - A classic "skip stitch" draws lines between points that are
     skip steps apart:
       segment(i) = (p[i], p[(i + skip) % n])

   Dense woven look:
   - We can draw multiple passes with different start offsets,
     and optionally connect multiple neighbors (skip, 2*skip, ...).

   This is NOT intersection-based drawing. Intersections emerge
   naturally as a byproduct of the line network.

============================================================ */
function buildStitchLines(points, params) {

  const lines = [];

  const n = points.length;
  if (n < 2) return lines;

  const skip = Math.max(1, Math.floor(params.stitchSkip));
  const neighbors = Math.max(1, Math.floor(params.stitchNeighbors));

  const passes = Math.max(1, Math.floor(params.stitchPasses));
  const passStep = Math.max(0, Math.floor(params.stitchPassStep));

  for (let pass = 0; pass < passes; pass++) {

    const start = pass * passStep;

    for (let i = 0; i < n; i++) {

      const a = points[(i + start) % n];

      for (let m = 1; m <= neighbors; m++) {

        const j = (i + start + m * skip) % n;
        const b = points[j];

        lines.push([a, b]);

      }

    }

  }

  return lines;

} // end buildStitchLines



/* ============================================================
   update(params)
   ------------------------------------------------------------
   Recompute geometry for the current mode.
============================================================ */
function update(params) {

  // If the user flipped the mode, rebuild the control panel.
  rebuildControlsIfNeeded();

  const pts = computeHypocycloidPoints(params);

  elements.element.points = pts;

  if (params.curveStitch) {
    elements.element.lines = buildStitchLines(pts, params);
  } else {
    elements.element.lines = [];
  }

} // end update



/* ============================================================
   draw(params)
============================================================ */
function draw(params) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);

  ctx.globalAlpha = params.strokeAlpha;
  ctx.lineWidth = params.lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const el = elements.element;

  if (!params.curveStitch) {

    // Curve mode: draw a single continuous curve
    const pts = el.points;

    if (pts.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);

      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }

      ctx.stroke();
    }

  } else {

    // Curve-stitch mode: draw the entire line network
    const lines = el.lines;

    if (lines.length >= 1) {

      ctx.beginPath();

      for (let i = 0; i < lines.length; i++) {
        const seg = lines[i];
        const a = seg[0];
        const b = seg[1];
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }

      ctx.stroke();
    }

  }

  ctx.restore();

} // end draw



/* ============================================================
   runPattern()
   ------------------------------------------------------------
   Gallery entry point.
============================================================ */
export function runPattern() {

  // Canonical aliases / compatibility
  scriptInfo.parameters = scriptInfo.params;

  // Provide a deterministic redraw handler expected by some runners
  scriptInfo.redrawHandler = function () {
    update(scriptInfo.params);
    draw(scriptInfo.params);
  }; // end scriptInfo.redrawHandler

  // No-op compat hook
  scriptInfo.onParamChange = function () { }; // end scriptInfo.onParamChange

  init();

  // Build initial controls based on starting mode, then draw once.
  rebuildControlsIfNeeded();
  scriptInfo.redrawHandler();

} // end runPattern
