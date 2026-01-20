/* ============================================================
   Rose Curve Drawer
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo:
   - Rose curves using <canvas>
   - Interactive controls for lobes, amplitude, resolution

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
    Here’s a standalone HTML file that draws rose curves using `<canvas>` and includes interactive controls to manipulate the number of lobes, amplitude, and resolution. It’s modular and inspectable—perfect for your architectural style
*/

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Rose Curve Visualizer",

  params: {
    lobes: 5,
    amplitude: 100,
    resolution: 1000,

    color: "#0077cc",
    lineWidth: 2
  },

  controls: {

    lobes: {
      widget: "range",
      label: "Lobes (k)",
      min: 1,
      max: 20,
      step: 1
    },

    amplitude: {
      widget: "range",
      label: "Amplitude (a)",
      min: 50,
      max: 200,
      step: 1
    },

    resolution: {
      widget: "range",
      label: "Resolution",
      min: 100,
      max: 2000,
      step: 10
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
  updateRose(scriptInfo.params);
  drawRose();
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

  initRose();
  scriptInfo.redrawHandler();

} // end runPattern


/* ============================================================
   initRose()
   ------------------------------------------------------------
   Cold-start only: establish stable element state.
============================================================ */
function initRose() {

  scriptInfo.elements.element = {
    W: 0,
    H: 0,
    cx: 0,
    cy: 0
  };

} // end initRose


/* ============================================================
   updateRose(params)
   ------------------------------------------------------------
   Apply parameter changes to element state.
============================================================ */
function updateRose(params) {

  scriptInfo.elements.element.W = ctx.canvas.width;
  scriptInfo.elements.element.H = ctx.canvas.height;

  scriptInfo.elements.element.cx = ctx.canvas.width / 2;
  scriptInfo.elements.element.cy = ctx.canvas.height / 2;

} // end updateRose


/* ============================================================
   drawRose()
   ------------------------------------------------------------
   Deterministic draw from elements + params only.
============================================================ */
function drawRose() {

  const e = scriptInfo.elements.element;
  const p = scriptInfo.params;

  // Clear (transparent canvas)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, e.W, e.H);

  // Draw rose
  ctx.save();

  ctx.translate(e.cx, e.cy);

  ctx.beginPath();

  const k = clampInt(p.lobes, 1, 1000000);
  const a = clampInt(p.amplitude, 1, 1000000);
  const resolution = clampInt(p.resolution, 10, 10000000);

  for (let i = 0; i <= resolution; i++) {

    const theta = (i / resolution) * 2 * Math.PI;

    const r = a * Math.cos(k * theta);

    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

  }

  ctx.strokeStyle = p.color;
  ctx.lineWidth = p.lineWidth;

  ctx.stroke();

  ctx.restore();

} // end drawRose


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
