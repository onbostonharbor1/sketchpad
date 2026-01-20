/* ============================================================
   Golden Spiral (Logarithmic Spiral based on the Golden Ratio)
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from a shapeRegistry entry:

     shapeRegistry['goldenSpiral'] = {
       label: 'Golden Spiral',
       description: 'Logarithmic spiral based on the golden ratio',
       controls: {
         scale:    { type: 'slider', min: 1, max: 10, step: 0.1, default: 2 },
         segments: { type: 'slider', min: 10, max: 100, step: 1, default: 50 },
         rotation: { type: 'slider', min: 0, max: Math.PI * 2, step: 0.01, default: 0 }
       },
       createShape: (params) => ({
         draw(ctx) { ... }
       })
     };

   GOAL
   ----
   - Run under Gallery calling runPattern()
   - Use parameterControls.js
   - Match drawRegistry-style lifecycle and naming

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - A global canvas context exists (ctx), provided by your getter
   - #action exists (parameterControls uses it)
   - This file is executed by the Gallery Scripts runner (runPattern)

   IMPORTANT USER RULES
   --------------------
   - No local ctx variable is declared in this file.
   - No ctx is passed into helper functions.
   - scriptInfo.controls uses 'widget' (not 'type')
   - controls are an OBJECT keyed by parameter name (NO key fields)
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Golden Spiral (Golden Ratio Logarithmic Spiral)",

  params: {

    scale: 2,
    segments: 50,
    rotation: 0,

    strokeColor: "#000000",
    lineWidth: 2

  },

  controls: {

    scale: {
      widget: "range",
      label: "Scale",
      min: 1,
      max: 10,
      step: 0.1,
      showValue: true,
      showButtons: true
    },

    segments: {
      widget: "range",
      label: "Segments",
      min: 10,
      max: 200,
      step: 1,
      showValue: true,
      showButtons: true
    },

    rotation: {
      widget: "range",
      label: "Rotation",
      min: 0,
      max: Math.PI * 2,
      step: 0.01,
      showValue: true,
      showButtons: true
    },

    lineWidth: {
      widget: "range",
      label: "Line Width",
      min: 0.5,
      max: 6,
      step: 0.5,
      showValue: true,
      showButtons: true
    },

    strokeColor: {
      widget: "color",
      label: "Stroke Color"
    }

  },

  parameters: null,
  redrawHandler: null,
  onParamChange: null

}; // end scriptInfo


/* ============================================================
   elements + lifecycle
============================================================ */
const elements = {
  element: null
}; // end elements


function init() {

  elements.element = {

    last: {
      scale: null,
      segments: null,
      rotation: null,
      strokeColor: null,
      lineWidth: null
    }

  };

} // end init


function update(params) {

  if (!Number.isFinite(params.scale)) throw new Error("goldenSpiral: scale must be numeric");
  if (!Number.isFinite(params.segments)) throw new Error("goldenSpiral: segments must be numeric");
  if (!Number.isFinite(params.rotation)) throw new Error("goldenSpiral: rotation must be numeric");
  if (!Number.isFinite(params.lineWidth)) throw new Error("goldenSpiral: lineWidth must be numeric");

  // normalize integer-like params deterministically
  params.segments = clampInt(params.segments, 2, 20000);

  const L = elements.element.last;

  const same =
    L.scale === params.scale &&
    L.segments === params.segments &&
    L.rotation === params.rotation &&
    L.strokeColor === params.strokeColor &&
    L.lineWidth === params.lineWidth;

  if (same) return;

  L.scale = params.scale;
  L.segments = params.segments;
  L.rotation = params.rotation;
  L.strokeColor = params.strokeColor;
  L.lineWidth = params.lineWidth;

} // end update


function draw() {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);

  // center the spiral
  ctx.save();
  ctx.translate(w / 2, h / 2);

  ctx.strokeStyle = scriptInfo.params.strokeColor;
  ctx.lineWidth = scriptInfo.params.lineWidth;

  const phi = (1 + Math.sqrt(5)) / 2;

  const scale = scriptInfo.params.scale;
  const segments = scriptInfo.params.segments;
  const rotation = scriptInfo.params.rotation;

  ctx.beginPath();

  for (let i = 0; i < segments; i++) {

    // angle step kept consistent with the original snippet (0.1)
    const angle = i * 0.1 + rotation;

    // radius grows exponentially with angle: r = scale * φ^angle
    const radius = scale * Math.pow(phi, angle);

    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

  }

  ctx.stroke();
  ctx.restore();

} // end draw


/* ============================================================
   runPattern()
============================================================ */
export function runPattern() {

  scriptInfo.parameters = scriptInfo.params;

  scriptInfo.onParamChange = function () {
    // no-op (compatibility)
  }; // end onParamChange

  scriptInfo.redrawHandler = function () {
    update(scriptInfo.params);
    draw();
  }; // end redrawHandler

  init();

  buildParameterControls(scriptInfo, "tab-scripts", true);

  scriptInfo.redrawHandler();

} // end runPattern


/* ============================================================
   numeric helpers
============================================================ */
function clamp(v, a, b) {

  if (v < a) return a;
  if (v > b) return b;
  return v;

} // end clamp


function clampInt(v, a, b) {

  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) throw new Error("clampInt: value must be numeric");

  if (n < a) return a;
  if (n > b) return b;
  return n;

} // end clampInt
