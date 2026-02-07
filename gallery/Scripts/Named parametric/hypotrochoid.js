/* ============================================================
   Hypotrochoid
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from a shapeRegistry entry:
     shapeRegistry['hypotrochoid'] = { ... createShape(params).draw(ctx) ... }

   GOAL
   ----
   - Run under Gallery calling runPattern()
   - Use parameterControls.js
   - Match drawRegistry-style lifecycle and naming
   - No ctx variable declared; use global ctx directly

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - ctx exists globally (your Sketchpad getter)
   - buildParameterControls exists at /ui/parameterControls.js
   - #action exists
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */

export const scriptInfo = {

  title: "Hypotrochoid",

  description: "Spirograph-style curve from rolling inside a circle",

  /* ------------------------------------------------------------
     params
     - These are the live values used by update() and draw()
  ------------------------------------------------------------ */
  params: {
    R: 100,   // fixed circle radius
    r: 30,    // rolling circle radius (inside)
    d: 50,    // pen offset from rolling circle center
    turns: 20,         // original code: Math.PI * 20
    step: 0.01,        // original code: t += 0.01
    strokeStyle: "#000000",
    lineWidth: 1
  },

  /* ------------------------------------------------------------
     parameters alias
     - Compatibility shim: some parts of Sketchpad expect
       scriptInfo.parameters (not .params)
  ------------------------------------------------------------ */
  parameters: null,

  /* ------------------------------------------------------------
     controls
     IMPORTANT:
     - use widget (not type)
  ------------------------------------------------------------ */
  controls: {

    R: {
      widget: "range",
      label: "R (fixed radius)",
      min: 50,
      max: 200,
      step: 1
    },

    r: {
      widget: "range",
      label: "r (rolling radius)",
      min: 10,
      max: 100,
      step: 1
    },

    d: {
      widget: "range",
      label: "d (pen offset)",
      min: 10,
      max: 100,
      step: 1
    },

    turns: {
      widget: "range",
      label: "Turns (π * turns)",
      min: 1,
      max: 60,
      step: 1
    },

    step: {
      widget: "range",
      label: "Step (Δt)",
      min: 0.001,
      max: 0.05,
      step: 0.001
    },

    strokeStyle: {
      widget: "colorPicker",
      label: "Stroke"
    },

    lineWidth: {
      widget: "range",
      label: "Line width",
      min: 0.25,
      max: 6,
      step: 0.25
    }
  },

  /* ------------------------------------------------------------
     elements
     - Persistent geometry and cached point arrays live here
  ------------------------------------------------------------ */
  elements: {
    points: []
  },

  /* ------------------------------------------------------------
     redrawHandler
     - set during runPattern()
  ------------------------------------------------------------ */
  redrawHandler: null,

  /* ------------------------------------------------------------
     onParamChange
     - compatibility no-op (parameterControls may call it)
  ------------------------------------------------------------ */
  onParamChange() {
    // no-op
  } // end onParamChange

}; // end scriptInfo


/* ============================================================
   init()
   Cold-start only: create stable element storage
============================================================ */
function init() {

  scriptInfo.elements.points = [];

} // end init


/* ============================================================
   update(params)
   Recompute point list deterministically from params
============================================================ */
function update(params) {

  const R = params.R;
  const r = params.r;
  const d = params.d;

  const turns = params.turns;
  const step = params.step;

  const maxT = Math.PI * turns;

  const pts = [];

  // The original shapeRegistry code:
  // for (let t = 0; t <= Math.PI * 20; t += 0.01) { ... }
  //
  // We preserve that, but with user controls for turns + step.

  for (let t = 0; t <= maxT; t += step) {

    const x =
      (R - r) * Math.cos(t) +
      d * Math.cos(((R - r) / r) * t);

    const y =
      (R - r) * Math.sin(t) -
      d * Math.sin(((R - r) / r) * t);

    pts.push({ x, y });

  }

  scriptInfo.elements.points = pts;

} // end update


/* ============================================================
   draw()
   Render the hypotrochoid to the canvas
============================================================ */
function draw() {

  const pts = scriptInfo.elements.points;
  if (pts.length === 0) return;

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.save();

  // Center the curve on the canvas
  ctx.translate(w / 2, h / 2);

  ctx.strokeStyle = scriptInfo.params.strokeStyle;
  ctx.lineWidth = scriptInfo.params.lineWidth;

  ctx.beginPath();

  // Start path at first point
  ctx.moveTo(pts[0].x, pts[0].y);

  // Continue through remaining points
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }

  ctx.stroke();
  ctx.restore();

} // end draw


/* ============================================================
   runPattern()
   Gallery entry point
============================================================ */
export function runPattern() {

  // ParameterControls expects this alias sometimes
  scriptInfo.parameters = scriptInfo.params;

  // Cold-start init
  init();

  // Build UI controls in Gallery Scripts tab
  buildParameterControls(scriptInfo, "tab-scripts", true);

  // Define redrawHandler used by parameterControls
  scriptInfo.redrawHandler = function redrawHandler() {

    // Clear canvas (deterministic)
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Recompute geometry then draw
    update(scriptInfo.params);
    draw();

  }; // end redrawHandler

  // First draw
  scriptInfo.redrawHandler();

} // end runPattern
