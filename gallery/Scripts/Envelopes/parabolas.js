/* ============================================================
   Boundary Sampler Prototype — Line vs Arc (Hook for Custom)
   Gallery Script (ParameterControls-integrated)

   ------------------------------------------------------------
   REFERENCE TEXT (FUTURE / NOT EXECUTED) — AS REQUESTED
   ------------------------------------------------------------
   Fantastic — let’s prototype a lightweight drawRadialWeave()
   function that takes a center point and multiple arms (or
   strands), and renders a layered burst. This will give you a
   visual metaphor for tension, symmetry, and transformation —
   and could evolve into a core figure type in your gallery system.

   Conceptual Scaffold: drawRadialWeave(center, arms, options)
   Inputs:
     center: {x,y}
     arms: array of arrays of {x,y}
     options: style, color, etc.

   Variations:
     - Twist / reverse order on alternating arms
     - Ribbon mode: connect adjacent arms with stitched curves
     - Symbolic overlay: annotate arms
     - Dynamic center

   Also: a catalog of curve-stitch objects (parabolic envelope,
   circle-to-circle stitch, polygon stitch, polar stitch grid,
   bezier stitch fan, lattice stitch surface).

   ------------------------------------------------------------
   WHAT THIS SCRIPT DOES NOW
   ------------------------------------------------------------
   You asked for a function with a select that:
     1) draws lines above
     2) draws a curve arced away from the drawing
   and to leave a documented hook where you can later enter a
   function.

   This script provides a boundary sampler switch:
     boundaryMode = "lines" | "arc" | "custom"

   It draws:
     - a TOP boundary and BOTTOM boundary
     - optional boundary sample points
     - curve-stitch lines between TOP[i] and BOTTOM[N-1-i+offset]

   The “custom” mode is fail-fast:
     - boundaryCustomY() throws until you implement it.

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

  title: "Boundary Sampler — Lines vs Arc (Hook for Custom)",

  params: {

    boundaryMode: "lines",     /* lines | arc | custom */

    arches: 3,
    stepsPerArch: 80,

    /* Vertical placement */
    topY: 140,
    bottomY: 360,

    /* Span padding inside each arch cell */
    inset: 20,

    /* Arc mode: how far it bows away from the interior */
    arcBend: 70,

    /* Stitch rule */
    stitchEvery: 1,
    stitchOffset: 0,

    /* Display */
    showBoundaries: true,
    showSamples: false,

    stitchWidth: 1,
    stitchColor: "#000000",

    boundaryWidth: 1,
    boundaryColor: "#cc0000",

    sampleRadius: 2,
    sampleColor: "#0000cc"

  },

  parameters: null,

  controls: {

    boundaryMode: {
      label: "Boundary mode",
      widget: "select",
      options: [
        { value: "lines",  label: "Lines" },
        { value: "arc",    label: "Arc (bow away)" },
        { value: "custom", label: "Custom hook" }
      ]
    },

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

    bottomY: {
      label: "Bottom Y",
      widget: "range",
      min: 0,
      max: 800,
      step: 1
    },

    inset: {
      label: "Inset",
      widget: "range",
      min: 0,
      max: 120,
      step: 1
    },

    arcBend: {
      label: "Arc bend",
      widget: "range",
      min: 0,
      max: 300,
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

    showBoundaries: {
      label: "Show boundaries",
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
      widget: "colorPicker"
    },

    boundaryWidth: {
      label: "Boundary width",
      widget: "range",
      min: 1,
      max: 8,
      step: 1
    },

    boundaryColor: {
      label: "Boundary color",
      widget: "colorPicker"
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
      widget: "colorPicker"
    }

  },

  elements: null,

  onParamChange() {
    /* Intentionally empty. */
  }, // end onParamChange

  redrawHandler: null

}; // end scriptInfo


/* ============================================================
   Core helpers
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


/* ============================================================
   CUSTOM HOOK (FAIL-FAST)

   Replace the body of boundaryCustomY() later with whatever you
   want. For example:
     - a sine wave
     - a polynomial
     - an arc-length sampled polyline
     - a lookup into a stored list of control points

   Contract:
     boundaryCustomY(which, x, spanX0, spanX1, p) -> y

   - which is "top" or "bottom"
   - x is the x-coordinate being sampled within the span
============================================================ */
function boundaryCustomY(which, x, spanX0, spanX1, p) {

  throw new Error("boundaryCustomY(): custom boundary not implemented yet");

} // end boundaryCustomY


/* ============================================================
   Boundary samplers (ONE SPAN)

   sampleBoundary(which, spanX0, spanX1, p, steps) -> points[]
============================================================ */
function sampleBoundary(which, spanX0, spanX1, p, steps) {

  const out = [];

  const n = clampInt(steps, 0, 200000);

  const y0 = (which === "top") ? p.topY : p.bottomY;

  for (let i = 0; i <= n; i++) {

    const t = (n === 0) ? 0 : (i / n);
    const x = spanX0 + (spanX1 - spanX0) * t;

    let y;

    if (p.boundaryMode === "lines") {

      y = y0;

    } else if (p.boundaryMode === "arc") {

      /* Bow away from the interior:
         - top boundary bows upward (smaller y)
         - bottom boundary bows downward (larger y)

         Use a simple parabola in t:
           bend(t) = 4 t (1-t)  in [0..1], max at t=0.5
      */
      const bend = 4 * t * (1 - t);

      if (which === "top") {
        y = y0 - (p.arcBend * bend);
      } else {
        y = y0 + (p.arcBend * bend);
      }

    } else if (p.boundaryMode === "custom") {

      y = boundaryCustomY(which, x, spanX0, spanX1, p);

    } else {

      throw new Error("sampleBoundary(): unknown boundaryMode: " + p.boundaryMode);

    }

    out.push({ x: x, y: y });

  }

  return out;

} // end sampleBoundary


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


function drawStitches(topPts, botPts, p) {

  const n = Math.min(topPts.length, botPts.length);

  if (n <= 0) return;

  ctx.save();

  ctx.lineWidth = p.stitchWidth;
  ctx.strokeStyle = p.stitchColor;

  ctx.beginPath();

  for (let i = 0; i < n; i += p.stitchEvery) {

    let j = (n - 1 - i) + p.stitchOffset;

    j = j % n;
    if (j < 0) j += n;

    ctx.moveTo(topPts[i].x, topPts[i].y);
    ctx.lineTo(botPts[j].x, botPts[j].y);

  }

  ctx.stroke();
  ctx.restore();

} // end drawStitches


/* ============================================================
   Update / Draw lifecycle
============================================================ */
function init(p) {

  scriptInfo.elements = {
    element: {}
  };

} // end init


function update(p) {

  /* No cached geometry yet; deterministic redraw each time. */

} // end update


function draw(p) {

  clearCanvas();

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const arches = clampInt(p.arches, 1, 1000);
  const steps = clampInt(p.stepsPerArch, 1, 200000);

  const cellW = w / arches;

  for (let a = 0; a < arches; a++) {

    const spanX0 = (a * cellW) + p.inset;
    const spanX1 = ((a + 1) * cellW) - p.inset;

    if (spanX1 <= spanX0) {
      throw new Error("draw(): inset too large for arches/canvas width");
    }

    const topPts = sampleBoundary("top", spanX0, spanX1, p, steps);
    const botPts = sampleBoundary("bottom", spanX0, spanX1, p, steps);

    if (p.showBoundaries) {
      drawPolyline(topPts, p.boundaryWidth, p.boundaryColor);
      drawPolyline(botPts, p.boundaryWidth, p.boundaryColor);
    }

    drawStitches(topPts, botPts, p);

    if (p.showSamples) {
      drawSamples(topPts, p);
      drawSamples(botPts, p);
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
