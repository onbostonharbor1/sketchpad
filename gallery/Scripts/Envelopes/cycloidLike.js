/* ============================================================
   Rolling Arch Stitch — Line to Arc (Semicircle / Scaled)
   Gallery Script (ParameterControls-integrated)

   PURPOSE
   ------------------------------------------------------------
   This script matches the “rolling / arch envelope” family:
     - TOP boundary is a straight line (one span per arch)
     - BOTTOM boundary is an arc spanning the same endpoints
     - Stitches connect TOP[i] -> ARC[i+offset] (direct pairing)
       so there is NO hourglass X-crossing.

   This produces a single-sided arch envelope per span, similar
   to the reference you pasted (fan lines + dark curved boundary).

   CONTROLS
   ------------------------------------------------------------
   - arches: number of repeated spans across the canvas
   - stepsPerArch: number of stitches per span
   - topY: y-position of the top line
   - arcBaseY: y-position of the arc endpoints (left/right)
   - arcBulge: how “tall” the arc is (0..1). 1 = semicircle.
   - arcFlip: flips arc bulge direction (up vs down)
   - inset: padding inside each arch span
   - stitchEvery: density (skip factor)
   - stitchOffset: shifts pairing to simulate “rolling”
   - showGuides / showSamples: debugging visuals

   HOOKS FOR LATER
   ------------------------------------------------------------
   boundaryArcY() is the single place to replace the arc math with:
     - a true “rolling” curve (cycloid / trochoid)
     - a polyline / spline
     - any y = f(x) sampler

   ASSUMPTIONS (FAIL-FAST)
   ------------------------------------------------------------
   - buildParameterControls() exists at /ui/parameterControls.js
   - A global canvas context exists (ctx), provided by your getter
   - #action exists (parameterControls uses it)

   USER RULES
   ------------------------------------------------------------
   - No local ctx variable is declared in this file.
   - No ctx is passed into helper functions.
   - Controls are OBJECT-KEYED (no invented "key" fields).
   - Controls use "widget" (not "type").
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Rolling Arch Stitch — Line to Arc",

  params: {

    arches: 3,
    stepsPerArch: 90,

    topY: 120,
    arcBaseY: 380,

    /* 0 => flat line, 1 => true semicircle bulge */
    arcBulge: 1.0,

    /* false => arc bulges toward top (upward),
       true  => arc bulges downward */
    arcFlip: false,

    inset: 20,

    stitchEvery: 1,
    stitchOffset: 0,

    showGuides: true,
    showSamples: false,

    stitchWidth: 1,
    stitchColor: "#000000",

    guideWidth: 1,
    guideColor: "#cc0000",

    sampleRadius: 2,
    sampleColor: "#0000cc"

  },

  parameters: null,

  controls: {

    arches: {
      label: "Arches",
      widget: "range",
      min: 1,
      max: 12,
      step: 1
    },

    stepsPerArch: {
      label: "Steps per arch",
      widget: "range",
      min: 5,
      max: 400,
      step: 1
    },

    topY: {
      label: "Top Y",
      widget: "range",
      min: 0,
      max: 800,
      step: 1
    },

    arcBaseY: {
      label: "Arc base Y",
      widget: "range",
      min: 0,
      max: 800,
      step: 1
    },

    arcBulge: {
      label: "Arc bulge",
      widget: "range",
      min: 0,
      max: 1,
      step: 0.01
    },

    arcFlip: {
      label: "Flip arc",
      widget: "checkbox"
    },

    inset: {
      label: "Inset",
      widget: "range",
      min: 0,
      max: 160,
      step: 1
    },

    stitchEvery: {
      label: "Stitch every",
      widget: "range",
      min: 1,
      max: 20,
      step: 1
    },

    stitchOffset: {
      label: "Stitch offset",
      widget: "range",
      min: -2000,
      max: 2000,
      step: 1
    },

    showGuides: {
      label: "Show guides",
      widget: "checkbox"
    },

    showSamples: {
      label: "Show samples",
      widget: "checkbox"
    },

    stitchWidth: {
      label: "Stitch width",
      widget: "range",
      min: 1,
      max: 8,
      step: 1
    },

    stitchColor: {
      label: "Stitch color",
      widget: "color"
    },

    guideWidth: {
      label: "Guide width",
      widget: "range",
      min: 1,
      max: 8,
      step: 1
    },

    guideColor: {
      label: "Guide color",
      widget: "color"
    },

    sampleRadius: {
      label: "Sample radius",
      widget: "range",
      min: 1,
      max: 10,
      step: 1
    },

    sampleColor: {
      label: "Sample color",
      widget: "color"
    }

  },

  elements: null,

  onParamChange() {
    /* Intentionally empty. */
  }, // end onParamChange

  redrawHandler: null

}; // end scriptInfo


/* ============================================================
   Utilities
============================================================ */
function clearCanvas() {

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

} // end clearCanvas


function clampInt(x, lo, hi) {

  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;

} // end clampInt


function modIndex(i, n) {

  let k = i % n;
  if (k < 0) k += n;
  return k;

} // end modIndex


/* ============================================================
   Boundary sampling (ONE ARCH SPAN)

   We sample:
     - topPts: straight line at topY
     - arcPts: arc with endpoints on y = arcBaseY

   The arc is modeled as an upper semicircle (scaled by arcBulge),
   spanning [x0..x1]. arcBulge = 1 => true semicircle.
   arcBulge < 1 => shallower arc.

   HOOK:
     Replace boundaryArcY() later to implement “rolling curves”.
============================================================ */
function sampleTopLine(x0, x1, p, steps) {

  const out = [];
  const n = clampInt(steps, 0, 200000);

  for (let i = 0; i <= n; i++) {

    const t = (n === 0) ? 0 : (i / n);
    const x = x0 + (x1 - x0) * t;

    out.push({ x: x, y: p.topY });

  }

  return out;

} // end sampleTopLine


function boundaryArcY(x, cx, baseY, radius, bulge, flip) {

  /* dx is within [-radius..+radius] */
  let dx = x - cx;

  /* THE FIX: Clamp dx to the radius to prevent precision-induced negative sqrt */
  if (dx > radius) dx = radius;
  if (dx < -radius) dx = -radius;

  /* Semicircle height term */
  const inside = (radius * radius) - (dx * dx);

  /* Use Math.max(0, ...) as a double-safety against tiny negative floats */
  const h = Math.sqrt(Math.max(0, inside));

  /* bulge scales the “rise” */
  const rise = bulge * h;

  /* Default: bulge upward (toward smaller y, toward top) */
  if (!flip) {
    return baseY - rise;
  }

  /* Flipped: bulge downward */
  return baseY + rise;

} // end boundaryArcY

function sampleArc(x0, x1, p, steps) {

  const out = [];
  const n = clampInt(steps, 0, 200000);

  const cx = (x0 + x1) / 2;
  const radius = (x1 - x0) / 2;

  if (radius <= 0) {
    throw new Error("sampleArc(): non-positive radius");
  }

  for (let i = 0; i <= n; i++) {

    const t = (n === 0) ? 0 : (i / n);
    const x = x0 + (x1 - x0) * t;

    const y = boundaryArcY(
      x,
      cx,
      p.arcBaseY,
      radius,
      p.arcBulge,
      p.arcFlip
    );

    out.push({ x: x, y: y });

  }

  return out;

} // end sampleArc

/* ============================================================
   Rendering helpers
============================================================ */
function drawPolyline(points, width, color) {

  if (points.length === 0) return;

  ctx.save();

  ctx.lineWidth = width;
  ctx.strokeStyle = color;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.stroke();
  ctx.restore();

} // end drawPolyline


function drawSamples(points, p) {

  ctx.save();

  ctx.fillStyle = p.sampleColor;

  for (let i = 0; i < points.length; i++) {

    ctx.beginPath();
    ctx.arc(points[i].x, points[i].y, p.sampleRadius, 0, Math.PI * 2);
    ctx.fill();

  }

  ctx.restore();

} // end drawSamples


function drawStitches(topPts, arcPts, p) {

  const n = Math.min(topPts.length, arcPts.length);

  if (n <= 0) return;

  ctx.save();

  ctx.lineWidth = p.stitchWidth;
  ctx.strokeStyle = p.stitchColor;

  ctx.beginPath();

  for (let i = 0; i < n; i += p.stitchEvery) {

    const j = modIndex(i + p.stitchOffset, n);

    ctx.moveTo(topPts[i].x, topPts[i].y);
    ctx.lineTo(arcPts[j].x, arcPts[j].y);

  }

  ctx.stroke();
  ctx.restore();

} // end drawStitches


/* ============================================================
   Update / Draw lifecycle (drawRegistry-style)
============================================================ */
function init(p) {

  scriptInfo.elements = {
    element: {}
  };

} // end init


function update(p) {

  /* Deterministic redraw each time (no caching yet). */

} // end update


function draw(p) {

  clearCanvas();

  const w = ctx.canvas.width;

  const arches = clampInt(p.arches, 1, 1000);
  const steps = clampInt(p.stepsPerArch, 1, 200000);

  const cellW = w / arches;

  for (let a = 0; a < arches; a++) {

    const x0 = (a * cellW) + p.inset;
    const x1 = ((a + 1) * cellW) - p.inset;

    if (x1 <= x0) {
      throw new Error("draw(): inset too large for arches/canvas width");
    }

    const topPts = sampleTopLine(x0, x1, p, steps);
    const arcPts = sampleArc(x0, x1, p, steps);

    if (p.showGuides) {
      drawPolyline(topPts, p.guideWidth, p.guideColor);
      drawPolyline(arcPts, p.guideWidth, p.guideColor);
    }

    drawStitches(topPts, arcPts, p);

    if (p.showSamples) {
      drawSamples(topPts, p);
      drawSamples(arcPts, p);
    }

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
