/* ============================================================
   Modulated Circle
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Extracted from standalone "Math-Art Sketchpad" HTML:
   - Keeps ONLY the Modulated Circle shape
   - Removes dropdown, registry, and sessionStorage gallery

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

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Modulated Circle",

  params: {
    baseRadius: 150,
    modFreq: 6,
    modAmp: 30,

    strokeStyle: "#000000",
    lineWidth: 1
  },

  controls: {

    baseRadius: {
      widget: "range",
      label: "Base Radius",
      min: 50,
      max: 300,
      step: 1
    },

    modFreq: {
      widget: "range",
      label: "Modulation Frequency",
      min: 1,
      max: 20,
      step: 1
    },

    modAmp: {
      widget: "range",
      label: "Modulation Amplitude",
      min: 0,
      max: 100,
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
      max: 8,
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
    pts: []
  };

} // end init


/* ============================================================
   update(params)
   ------------------------------------------------------------
   Computes the modulated circle polyline points.
============================================================ */
function update(params) {

  const e = scriptInfo.elements.element;

  e.W = ctx.canvas.width;
  e.H = ctx.canvas.height;

  e.cx = e.W / 2;
  e.cy = e.H / 2;

  e.pts = buildModulatedCirclePoints(params.baseRadius, params.modFreq, params.modAmp);

} // end update


/* ============================================================
   buildModulatedCirclePoints(baseRadius, modFreq, modAmp)
============================================================ */
function buildModulatedCirclePoints(baseRadius, modFreq, modAmp) {

  const pts = [];

  const TAU = Math.PI * 2;

  const br = baseRadius;
  const mf = modFreq;
  const ma = modAmp;

  const dt = 0.01;

  for (let t = 0; t <= TAU + dt; t += dt) {

    const r = br + ma * Math.sin(mf * t);

    pts.push({
      x: r * Math.cos(t),
      y: r * Math.sin(t)
    });

  }

  return pts;

} // end buildModulatedCirclePoints


/* ============================================================
   draw()
============================================================ */
function draw() {

  const e = scriptInfo.elements.element;
  const p = scriptInfo.params;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, e.W, e.H);

  ctx.save();
  ctx.translate(e.cx, e.cy);

  ctx.beginPath();

  const pts = e.pts;
  if (!pts.length) throw new Error("draw: no points");

  ctx.moveTo(pts[0].x, pts[0].y);

  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }

  ctx.strokeStyle = p.strokeStyle;
  ctx.lineWidth = p.lineWidth;

  ctx.stroke();

  ctx.restore();

} // end draw
