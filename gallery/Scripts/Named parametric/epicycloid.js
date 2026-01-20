/* ============================================================
   Epicycloid
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from a shapeRegistry entry:
     shapeRegistry['epicycloid'] = { ... createShape().draw(ctx) ... }

   WHAT IT DRAWS
   ------------
   An epicycloid is traced by a point attached to a circle rolling
   around the outside of another circle.

   SKETCHPAD GALLERY CONTRACT
   -------------------------
   - exports:
       export const scriptInfo
       export function runPattern()

   - uses global ctx (do NOT declare a ctx variable)

   - parameterControls:
       buildParameterControls(scriptInfo, "tab-scripts", true)

   NOTES
   -----
   - This script centers the curve on the canvas and scales it by
     a simple radius parameter.
   - k controls the number of lobes (integer-like behavior).
   - rotation rotates the curve in radians.
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Epicycloid",

  params: {
    k: 3,
    radius: 50,
    rotation: 0
  },

  controls: {
    k: {
      widget: "range",
      label: "k (lobes)",
      min: 1,
      max: 10,
      step: 1
    },

    radius: {
      widget: "range",
      label: "Radius",
      min: 10,
      max: 200,
      step: 1
    },

    rotation: {
      widget: "range",
      label: "Rotation (radians)",
      min: 0,
      max: Math.PI * 2,
      step: 0.01
    }
  },

  elements: {
    curve: null
  },

  parameters: null,      // alias (set in runPattern)
  redrawHandler: null,   // set in runPattern
  onParamChange: null    // set in runPattern

}; // end scriptInfo


/* ============================================================
   init()
============================================================ */
function init() {

  scriptInfo.elements.curve = {
    points: []
  };

} // end init


/* ============================================================
   update(params)
============================================================ */
function update(params) {

  const k = Number(params.k);
  const radius = Number(params.radius);
  const rotation = Number(params.rotation);

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const cx = w / 2;
  const cy = h / 2;

  // Trace enough to complete the shape.
  // Original: t <= 2πk
  const tMax = Math.PI * 2 * k;
  const dt = 0.01;

  const pts = [];

  for (let t = 0; t <= tMax; t += dt) {

    // Original equations (from your registry snippet)
    const x =
      radius * (k + 1) * Math.cos(t + rotation) -
      radius * Math.cos((k + 1) * t + rotation);

    const y =
      radius * (k + 1) * Math.sin(t + rotation) -
      radius * Math.sin((k + 1) * t + rotation);

    // Center it on canvas
    pts.push({
      x: cx + x,
      y: cy + y
    });

  }

  scriptInfo.elements.curve.points = pts;

} // end update


/* ============================================================
   draw()
============================================================ */
function draw() {

  const pts = scriptInfo.elements.curve.points;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.save();

  ctx.lineWidth = 1;
  ctx.strokeStyle = "#000";

  ctx.beginPath();

  if (pts.length > 0) {
    ctx.moveTo(pts[0].x, pts[0].y);
  }

  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }

  ctx.stroke();
  ctx.restore();

} // end draw


/* ============================================================
   runPattern()
============================================================ */
export function runPattern() {

  // ParameterControls compatibility aliases
  scriptInfo.parameters = scriptInfo.params;

  init();

  scriptInfo.redrawHandler = function () {
    update(scriptInfo.params);
    draw();
  }; // end scriptInfo.redrawHandler

  scriptInfo.onParamChange = function () {
    // no-op (some callers may expect it)
  }; // end scriptInfo.onParamChange

  buildParameterControls(scriptInfo, "tab-scripts", true);

  scriptInfo.redrawHandler();

} // end runPattern
