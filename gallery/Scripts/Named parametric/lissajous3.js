/* ============================================================
   Lissajous Curve Drawer
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo:
   - Lissajous curves using <canvas>
   - Interactive controls for frequency ratios, phase shift, resolution

   GOAL
   ----
   - Run under Gallery calling runPattern()
   - Use parameterControls.js
   - Match drawRegistry-style lifecycle and naming

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - global ctx exists
   - #action exists
============================================================ */

/*
🧠 Architectural Notes

• Modular draw routine: `drawRose(k, a, resolution)` is isolated and inspectable.
• Symbolic parameters: `k` controls lobes, `a` controls amplitude, `resolution` affects smoothness.
• UI clarity: Each control is labeled and live-updating.
• Canvas-centered: Uses `ctx.translate()` for symmetry.

When you reach Phase 4 SVG conversion, we can refactor this into `<path>` elements with symbolic overlays and provenance tags. Want to scaffold that next?

Absolutely, Barry. Here’s a standalone HTML file for drawing Lissajous curves using `<canvas>`, with interactive controls for frequency ratios, phase shift, and resolution. It’s modular and ready for your iterative tweaks:
*/

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Lissajous Curve Visualizer",

  params: {
    freqX: 3,
    freqY: 2,

    phase: 3.14,

    resolution: 1000,

    amplitude: 200,

    color: "#cc0077",
    lineWidth: 2
  },

  controls: {

    freqX: {
      widget: "range",
      label: "Frequency X (a)",
      min: 1,
      max: 20,
      step: 1
    },

    freqY: {
      widget: "range",
      label: "Frequency Y (b)",
      min: 1,
      max: 20,
      step: 1
    },

    phase: {
      widget: "range",
      label: "Phase Shift (δ)",
      min: 0,
      max: 6.28,
      step: 0.01
    },

    resolution: {
      widget: "range",
      label: "Resolution",
      min: 100,
      max: 2000,
      step: 10
    },

    amplitude: {
      widget: "range",
      label: "Amplitude",
      min: 10,
      max: 500,
      step: 1
    },

    color: {
      widget: "colorPicker",
      label: "Stroke Color"
    },

    lineWidth: {
      widget: "range",
      label: "Line Width",
      min: 0.5,
      max: 10,
      step: 0.5
    }

  },

  elements: {
    element: null
  }

}; // end scriptInfo


// Compatibility aliases (per your Gallery conversion rules)
scriptInfo.parameters = scriptInfo.params;

scriptInfo.redrawHandler = function redrawHandler() {
  updateLissajous(scriptInfo.params);
  drawLissajous();
}; // end redrawHandler

scriptInfo.onParamChange = function onParamChange() {
  // Compatibility no-op
}; // end onParamChange


/* ============================================================
   runPattern()
   ------------------------------------------------------------
   Gallery entry point.
   NO ctx argument. NO ctx variable declared.
============================================================ */
export function runPattern() {

  buildParameterControls(scriptInfo, "tab-scripts", true);

  initLissajous();
  scriptInfo.redrawHandler();

} // end runPattern


/* ============================================================
   initLissajous()
   ------------------------------------------------------------
   Cold-start only: establish stable element state.
============================================================ */
function initLissajous() {

  scriptInfo.elements.element = {
    W: 0,
    H: 0,
    cx: 0,
    cy: 0
  };

} // end initLissajous


/* ============================================================
   updateLissajous(params)
   ------------------------------------------------------------
   Apply parameter changes to element state.
============================================================ */
function updateLissajous(params) {

  scriptInfo.elements.element.W = ctx.canvas.width;
  scriptInfo.elements.element.H = ctx.canvas.height;

  scriptInfo.elements.element.cx = ctx.canvas.width / 2;
  scriptInfo.elements.element.cy = ctx.canvas.height / 2;

} // end updateLissajous


/* ============================================================
   drawLissajous()
   ------------------------------------------------------------
   Deterministic draw from elements + params only.
============================================================ */
function drawLissajous() {

  const e = scriptInfo.elements.element;
  const p = scriptInfo.params;

  // Clear (transparent canvas)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, e.W, e.H);

  ctx.save();

  ctx.translate(e.cx, e.cy);

  ctx.beginPath();

  const a = clampInt(p.freqX, 1, 1000000);
  const b = clampInt(p.freqY, 1, 1000000);

  const delta = Number(p.phase);

  const resolution = clampInt(p.resolution, 10, 10000000);

  const amp = Number(p.amplitude);

  for (let i = 0; i <= resolution; i++) {

    const t = (i / resolution) * 2 * Math.PI;

    const x = amp * Math.sin(a * t + delta);
    const y = amp * Math.sin(b * t);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

  }

  ctx.strokeStyle = p.color;
  ctx.lineWidth = p.lineWidth;

  ctx.stroke();

  ctx.restore();

} // end drawLissajous


/* ============================================================
   clampInt(v, a, b)
============================================================ */
function clampInt(v, a, b) {

  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return a;

  if (n < a) return a;
  if (n > b) return b;
  return n;

} // end clampInt
