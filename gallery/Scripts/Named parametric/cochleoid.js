/* ============================================================
   Cochleoid
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Adapted from your shapeRegistry['cochleoid'] snippet:

     r = scale * sin(theta) / (theta * decayRate)

   Then:
     x = r * cos(theta)
     y = r * sin(theta)

   CONTRACT (Gallery scripts)
   -------------------------
   - exports scriptInfo + runPattern() (NO ctx argument)
   - uses global ctx directly (NO ctx variable declared)
   - drawRegistry-style lifecycle: init / update / draw
   - scriptInfo.controls uses 'widget' (not 'type')
   - buildParameterControls(scriptInfo, "tab-scripts", true)
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Cochleoid",

  description: "Spiral with decaying amplitude",

  params: {

    scale: 100,
    decayRate: 1.0,

    // sampling / extent
    thetaMaxPi: 4,        // theta runs 0..(thetaMaxPi * PI)
    thetaStep: 0.01,

    // render
    strokeColor: "#000000",
    lineWidth: 1

  },

  controls: {

    scale: {
      widget: "range",
      label: "Scale",
      min: 10,
      max: 200,
      step: 1,
      showValue: true,
      showButtons: true
    },

    decayRate: {
      widget: "range",
      label: "Decay Rate",
      min: 0.1,
      max: 5,
      step: 0.1,
      showValue: true,
      showButtons: true
    },

    thetaMaxPi: {
      widget: "range",
      label: "Theta Max (×π)",
      min: 1,
      max: 48,
      step: 1,
      showValue: true,
      showButtons: true
    },

    thetaStep: {
      widget: "range",
      label: "Theta Step",
      min: 0.001,
      max: 0.05,
      step: 0.001,
      showValue: true,
      showButtons: true
    },

    strokeColor: {
      widget: "color",
      label: "Stroke Color"
    },

    lineWidth: {
      widget: "range",
      label: "Line Width",
      min: 0.5,
      max: 6,
      step: 0.5,
      showValue: true,
      showButtons: true
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

    points: [],

    last: {
      scale: null,
      decayRate: null,
      thetaMax: null,
      thetaStep: null
    }

  };

} // end init


function update(params) {

  const scale = params.scale;
  const decayRate = params.decayRate;

  const thetaMax = params.thetaMaxPi * Math.PI;
  const thetaStep = params.thetaStep;

  if (!Number.isFinite(scale)) throw new Error("Cochleoid: scale must be numeric");
  if (!Number.isFinite(decayRate)) throw new Error("Cochleoid: decayRate must be numeric");
  if (decayRate === 0) throw new Error("Cochleoid: decayRate must not be 0");

  if (!Number.isFinite(thetaMax)) throw new Error("Cochleoid: thetaMaxPi must be numeric");
  if (!Number.isFinite(thetaStep)) throw new Error("Cochleoid: thetaStep must be numeric");
  if (thetaStep <= 0) throw new Error("Cochleoid: thetaStep must be > 0");

  const same =
    elements.element.last.scale === scale &&
    elements.element.last.decayRate === decayRate &&
    elements.element.last.thetaMax === thetaMax &&
    elements.element.last.thetaStep === thetaStep;

  if (same) return;

  elements.element.last.scale = scale;
  elements.element.last.decayRate = decayRate;
  elements.element.last.thetaMax = thetaMax;
  elements.element.last.thetaStep = thetaStep;

  elements.element.points = computeCochleoidPoints(scale, decayRate, thetaMax, thetaStep);

} // end update


function draw() {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w / 2, h / 2);

  ctx.strokeStyle = scriptInfo.params.strokeColor;
  ctx.lineWidth = scriptInfo.params.lineWidth;

  const pts = elements.element.points;

  if (pts.length < 2) {
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

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
   math
============================================================ */
function computeCochleoidPoints(scale, decayRate, thetaMax, thetaStep) {

  const pts = [];

  // start at small theta to avoid divide-by-zero
  for (let theta = 0.01; theta <= thetaMax; theta += thetaStep) {

    const r = scale * Math.sin(theta) / (theta * decayRate);

    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);

    pts.push({ x: x, y: y });

  }

  return pts;

} // end computeCochleoidPoints
