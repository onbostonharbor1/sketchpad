/* ============================================================
   Curve Visualizer (Rose + Lissajous)
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo:
   - Toggle between Rose curves and Lissajous curves
   - Dynamic controls based on selected mode

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

• `drawLissajous(a, b, delta, resolution)` is modular and ready for symbolic overlays later.
• Phase shift slider uses `0–2π` scaled as `0–628` for intuitive control.
• You can easily add provenance tags or registry hooks as you move into Phase 4/5.

Let me know when you want to scaffold SVG conversion or overlay layering—this is a great base for symbolic inspection.

Here’s a unified standalone HTML file that lets you toggle between Rose curves and Lissajous curves using a dropdown selector.
The controls dynamically update based on the selected mode, and the draw logic is modular and inspectable—perfect for your iterative architecture.
*/

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Curve Visualizer (Rose + Lissajous)",

  params: {

    mode: "rose",

    // Rose
    lobes: 5,
    amplitude: 100,
    roseResolution: 1000,

    // Lissajous
    freqX: 3,
    freqY: 2,
    phase: 314,              // 0..628 (scaled)
    lissResolution: 1000,

    // Style
    roseColor: "#0077cc",
    lissColor: "#cc0077",
    lineWidth: 2

  },

  controls: {

    mode: {
      widget: "select",
      label: "Curve Type",
      options: [
        { value: "rose", label: "Rose Curve" },
        { value: "lissajous", label: "Lissajous Curve" }
      ]
    },

    // Rose controls
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

    roseResolution: {
      widget: "range",
      label: "Rose Resolution",
      min: 100,
      max: 2000,
      step: 10
    },

    // Lissajous controls
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
      label: "Phase Shift (δ) [0..628]",
      min: 0,
      max: 628,
      step: 1
    },

    lissResolution: {
      widget: "range",
      label: "Lissajous Resolution",
      min: 100,
      max: 2000,
      step: 10
    },

    // Style controls
    lineWidth: {
      widget: "range",
      label: "Line Width",
      min: 0.5,
      max: 10,
      step: 0.5
    },

    roseColor: {
      widget: "colorPicker",
      label: "Rose Color"
    },

    lissColor: {
      widget: "colorPicker",
      label: "Lissajous Color"
    }

  },

  elements: {
    element: null
  }

}; // end scriptInfo


// Compatibility aliases (per your Gallery conversion rules)
scriptInfo.parameters = scriptInfo.params;

scriptInfo.redrawHandler = function redrawHandler() {
  update(scriptInfo.params);
  draw();
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

  init();

  buildParameterControls(scriptInfo, "tab-scripts", true);

  scriptInfo.redrawHandler();

} // end runPattern


/* ============================================================
   init()
   ------------------------------------------------------------
   Cold-start only: establish stable element state.
============================================================ */
function init() {

  scriptInfo.elements.element = {
    W: 0,
    H: 0,
    cx: 0,
    cy: 0,
    radius: 200
  };

} // end init


/* ============================================================
   update(params)
   ------------------------------------------------------------
   Apply parameter changes to element state.
============================================================ */
function update(params) {

  scriptInfo.elements.element.W = ctx.canvas.width;
  scriptInfo.elements.element.H = ctx.canvas.height;

  scriptInfo.elements.element.cx = ctx.canvas.width / 2;
  scriptInfo.elements.element.cy = ctx.canvas.height / 2;

} // end update


/* ============================================================
   draw()
   ------------------------------------------------------------
   Deterministic draw from elements + params only.
============================================================ */
function draw() {

  const e = scriptInfo.elements.element;
  const p = scriptInfo.params;

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Always clear to transparent (NO black background fill)
  ctx.clearRect(0, 0, e.W, e.H);

  if (p.mode === "rose") {
    drawRose(p.lobes, p.amplitude, p.roseResolution);
    return;
  }

  if (p.mode === "lissajous") {
    drawLissajous(p.freqX, p.freqY, p.phase, p.lissResolution);
    return;
  }

  throw new Error("draw: unknown mode: " + String(p.mode));

} // end draw


/* ============================================================
   drawRose(k, a, resolution)
============================================================ */
function drawRose(k, a, resolution) {

  const e = scriptInfo.elements.element;
  const p = scriptInfo.params;

  ctx.save();
  ctx.translate(e.cx, e.cy);

  ctx.beginPath();

  const kk = clampInt(k, 1, 1000000);
  const aa = clampInt(a, 1, 1000000);
  const res = clampInt(resolution, 10, 10000000);

  for (let i = 0; i <= res; i++) {

    const theta = (i / res) * 2 * Math.PI;
    const r = aa * Math.cos(kk * theta);

    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

  }

  ctx.strokeStyle = p.roseColor;
  ctx.lineWidth = p.lineWidth;

  ctx.stroke();
  ctx.restore();

} // end drawRose


/* ============================================================
   drawLissajous(a, b, deltaScaled, resolution)
   ------------------------------------------------------------
   deltaScaled is 0..628, converted to radians by /100.
============================================================ */
function drawLissajous(a, b, deltaScaled, resolution) {

  const e = scriptInfo.elements.element;
  const p = scriptInfo.params;

  const aa = clampInt(a, 1, 1000000);
  const bb = clampInt(b, 1, 1000000);
  const res = clampInt(resolution, 10, 10000000);

  const delta = clampInt(deltaScaled, 0, 628) / 100;

  ctx.save();
  ctx.translate(e.cx, e.cy);

  ctx.beginPath();

  for (let i = 0; i <= res; i++) {

    const t = (i / res) * 2 * Math.PI;

    const x = e.radius * Math.sin(aa * t + delta);
    const y = e.radius * Math.sin(bb * t);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

  }

  ctx.strokeStyle = p.lissColor;
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
