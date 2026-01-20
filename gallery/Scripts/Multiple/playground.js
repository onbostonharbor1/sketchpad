/* ============================================================
   Parametric Curve Playground
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo:
   - Preset selector: cardioid | rose | spiral | lemniscate
   - Sliders: offset, frequency, radius
   - Removed: DOM UI, local "gallery save", mouse dragging, animation loop

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

  title: "Parametric Curve Playground",

  params: {

    preset: "cardioid",   // cardioid | rose | spiral | lemniscate
    offset: 50,
    frequency: 3,
    radius: 150,

    angleOffset: 0,

    step: 0.01,
    lineWidth: 1.5

  },

  controls: {

    preset: {
      widget: "select",
      label: "Preset",
      options: [
        { value: "cardioid", label: "Cardioid" },
        { value: "rose", label: "Rose" },
        { value: "spiral", label: "Spiral" },
        { value: "lemniscate", label: "Lemniscate" }
      ]
    },

    offset: {
      widget: "range",
      label: "Offset",
      min: 0,
      max: 200,
      step: 1
    },

    frequency: {
      widget: "range",
      label: "Frequency",
      min: 1,
      max: 10,
      step: 1
    },

    radius: {
      widget: "range",
      label: "Radius",
      min: 50,
      max: 300,
      step: 1
    },

    angleOffset: {
      widget: "range",
      label: "Angle Offset",
      min: 0,
      max: 6.283185307179586,
      step: 0.01
    },

    step: {
      widget: "range",
      label: "Step (resolution)",
      min: 0.001,
      max: 0.05,
      step: 0.001
    },

    lineWidth: {
      widget: "range",
      label: "Line Width",
      min: 0.2,
      max: 6,
      step: 0.1
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
============================================================ */
function update(params) {

  const e = scriptInfo.elements.element;

  e.W = ctx.canvas.width;
  e.H = ctx.canvas.height;

  e.cx = e.W / 2;
  e.cy = e.H / 2;

  e.pts = getCurvePoints(params, e);

} // end update


/* ============================================================
   getCurvePoints(params, e)
============================================================ */
function getCurvePoints(params, e) {

  const preset = String(params.preset);
  const offset = Number(params.offset);
  const freq = Number(params.frequency);
  const radius = Number(params.radius);

  const angleOffset = Number(params.angleOffset);

  const step = Number(params.step);

  if (!(step > 0)) throw new Error("getCurvePoints: step must be > 0");

  const pts = [];

  for (let t = 0; t < Math.PI * 2; t += step) {

    let r;

    if (preset === "cardioid") {
      r = radius * (1 - Math.sin(t * freq));
    } else if (preset === "rose") {
      r = radius * Math.cos(freq * t);
    } else if (preset === "spiral") {
      r = offset + radius * t / (2 * Math.PI);
    } else if (preset === "lemniscate") {
      r = radius * Math.sqrt(Math.abs(Math.cos(2 * t)));
    } else {
      throw new Error("getCurvePoints: unknown preset: " + preset);
    }

    const theta = t + angleOffset;

    pts.push({
      x: e.cx + r * Math.cos(theta),
      y: e.cy + r * Math.sin(theta)
    });

  }

  return pts;

} // end getCurvePoints


/* ============================================================
   draw()
============================================================ */
function draw() {

  const e = scriptInfo.elements.element;
  const p = scriptInfo.params;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, e.W, e.H);

  const pts = e.pts;

  if (!pts.length) throw new Error("draw: no points");

  ctx.lineWidth = Number(p.lineWidth);

  ctx.beginPath();

  for (let i = 0; i < pts.length; i++) {

    const pt = pts[i];

    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);

  }

  // Keep the original "rainbow" idea, but do it deterministically by stroking
  // the whole path once with a single color. (Per-canvas-segment color would
  // require per-segment strokes, which is expensive and noisy.)
  ctx.strokeStyle = "black";
  ctx.stroke();

  // Center marker (kept from original demo)
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(e.cx, e.cy, 4, 0, Math.PI * 2);
  ctx.fill();

} // end draw
