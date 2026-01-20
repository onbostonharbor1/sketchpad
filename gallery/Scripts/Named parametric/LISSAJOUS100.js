/* ============================================================
   Lissajous Curve Stitch
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML scaffold:
   - Curve-stitch Lissajous explorer
   - Sliders for amplitude, frequency, phase, point count, stitch step

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
    Absolutely, Barry. Here’s a complete, standalone HTML + JavaScript scaffold for a Curve-Stitch Lissajous Explorer. This version:
• 🧵 Uses straight-line stitching between points on a Lissajous curve
• 🎛️ Includes interactive sliders for controlling amplitude, frequency, and phase
• 🖼️ Renders the stitched curve on a canvas
• 🧠 Designed for extensibility—easy to animate, archive, or combine with your gallery system

---
  🧾 Full HTML + JS: Lissajous Curve-Stitch Explorer
*/

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Lissajous Curve Stitch",

  params: {
    A: 150,
    B: 150,
    a: 3,
    b: 2,
    delta: 1.57,
    pointCount: 300,
    step: 50,

    strokeStyle: "#3366cc",
    lineWidth: 1
  },

  controls: {

    A: {
      widget: "range",
      label: "A (X Amplitude)",
      min: 10,
      max: 300,
      step: 1
    },

    B: {
      widget: "range",
      label: "B (Y Amplitude)",
      min: 10,
      max: 300,
      step: 1
    },

    a: {
      widget: "range",
      label: "a (X Frequency)",
      min: 1,
      max: 10,
      step: 1
    },

    b: {
      widget: "range",
      label: "b (Y Frequency)",
      min: 1,
      max: 10,
      step: 1
    },

    delta: {
      widget: "range",
      label: "δ (Phase Shift)",
      min: 0,
      max: 6.28,
      step: 0.01
    },

    pointCount: {
      widget: "range",
      label: "Point Count",
      min: 50,
      max: 1000,
      step: 1
    },

    step: {
      widget: "range",
      label: "Stitch Step",
      min: 1,
      max: 300,
      step: 1
    },

    strokeStyle: {
      widget: "colorPicker",
      label: "Stroke Color"
    },

    lineWidth: {
      widget: "range",
      label: "Line Width",
      min: 0.5,
      max: 6,
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
   Cold-start only.
============================================================ */
function init() {

  scriptInfo.elements.element = {
    W: 0,
    H: 0,
    cx: 0,
    cy: 0,
    points: []
  };

} // end init


/* ============================================================
   update(params)
   ------------------------------------------------------------
   Recompute point set deterministically from params.
============================================================ */
function update(params) {

  const e = scriptInfo.elements.element;

  e.W = ctx.canvas.width;
  e.H = ctx.canvas.height;

  e.cx = e.W / 2;
  e.cy = e.H / 2;

  e.points = generateLissajousPoints(params, e.cx, e.cy);

} // end update


/* ============================================================
   generateLissajousPoints(params, cx, cy)
============================================================ */
function generateLissajousPoints(params, cx, cy) {

  const pts = [];

  const A = params.A;
  const B = params.B;
  const a = params.a;
  const b = params.b;
  const delta = params.delta;

  const pointCount = Math.max(10, Math.floor(params.pointCount));

  for (let i = 0; i < pointCount; i++) {

    const t = (i / pointCount) * Math.PI * 2;

    const x = cx + A * Math.sin(a * t + delta);
    const y = cy + B * Math.sin(b * t);

    pts.push({ x, y });

  }

  return pts;

} // end generateLissajousPoints


/* ============================================================
   draw()
============================================================ */
function draw() {

  const e = scriptInfo.elements.element;
  const p = scriptInfo.params;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, e.W, e.H);

  ctx.strokeStyle = p.strokeStyle;
  ctx.lineWidth = p.lineWidth;

  const pts = e.points;
  const n = pts.length;

  if (n < 2) return;

  const step = ((Math.floor(p.step) % n) + n) % n;

  for (let i = 0; i < n; i++) {

    const j = (i + step) % n;

    ctx.beginPath();
    ctx.moveTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[j].x, pts[j].y);
    ctx.stroke();

  }

} // end draw
