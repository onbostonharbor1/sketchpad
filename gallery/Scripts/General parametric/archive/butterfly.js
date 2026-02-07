/* ============================================================
   Butterfly Curve — Interactive (Loop Controls)
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Based on your original polar curve:

     r = scale * ( exp(sin(theta))
                   - 2 * cos(4*theta)
                   + sin(theta/12)^5 )

   This version keeps that structure, but exposes the two frequency
   knobs that most directly affect the visible “looping”:

     - outerFreq  : replaces the 4 in cos(4*theta)
     - innerDiv   : replaces the 12 in sin(theta/12)
     - innerPower : replaces the 5  in sin(...)^5

   Plus amplitude knobs so you can rebalance the three terms without
   rewriting the equation:
     - expAmp
     - outerAmp
     - innerAmp

   CONTRACT
   --------
   - exports scriptInfo + runPattern() (NO ctx argument)
   - uses global window.ctx (NO ctx variable declared)
   - drawRegistry-style lifecycle: init / update / draw
   - elements.element stores persistent computed data
   - scriptInfo.parameters alias + redrawHandler + onParamChange shim
   - buildParameterControls(scriptInfo, "tab-scripts", true)

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - window.ctx exists (global getter installed by Sketchpad)
   - /ui/parameterControls.js exports buildParameterControls
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Butterfly Curve (Interactive)",

  description: "Polar curve with controllable loop frequencies and amplitudes",

  params: {

    // overall sizing
    scale: 50,

    // equation term amplitudes
    expAmp:   1.0,   // multiplier on exp(sin(theta))
    outerAmp: 2.0,   // multiplier on cos(outerFreq*theta)   (note: subtract sign is built-in)
    innerAmp: 1.0,   // multiplier on sin(theta/innerDiv)^innerPower

    // loop structure controls
    outerFreq: 4,    // “large loop” control (was 4)
    innerDiv:  12,   // “inner loop density” control (was 12)
    innerPower: 5,   // “inner loop sharpness” control (was 5)

    // drawing controls
    strokeColor: "#000000",
    lineWidth: 1,

    // sampling controls
    thetaMaxPi: 12,      // theta max as multiple of PI (default 12π)
    thetaStep: 0.01

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

    outerFreq: {
      widget: "range",
      label: "Outer Frequency (Large Loops)",
      min: 1,
      max: 20,
      step: 1,
      showValue: true,
      showButtons: true
    },

    innerDiv: {
      widget: "range",
      label: "Inner Divisor (Loop Density)",
      min: 1,
      max: 48,
      step: 1,
      showValue: true,
      showButtons: true
    },

    innerPower: {
      widget: "range",
      label: "Inner Power (Sharpness)",
      min: 1,
      max: 13,
      step: 1,
      showValue: true,
      showButtons: true
    },

    expAmp: {
      widget: "range",
      label: "Exp Term Amplitude",
      min: 0,
      max: 3,
      step: 0.05,
      showValue: true,
      showButtons: true
    },

    outerAmp: {
      widget: "range",
      label: "Outer Term Amplitude",
      min: 0,
      max: 6,
      step: 0.05,
      showValue: true,
      showButtons: true
    },

    innerAmp: {
      widget: "range",
      label: "Inner Term Amplitude",
      min: 0,
      max: 6,
      step: 0.05,
      showValue: true,
      showButtons: true
    },

    strokeColor: {
      widget: "colorPicker",
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
    }

  },

  // compatibility shims assigned in runPattern()
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

      expAmp: null,
      outerAmp: null,
      innerAmp: null,

      outerFreq: null,
      innerDiv: null,
      innerPower: null,

      thetaMax: null,
      thetaStep: null
    }

  };

} // end init


function update(params) {

  const scale = params.scale;

  const expAmp = params.expAmp;
  const outerAmp = params.outerAmp;
  const innerAmp = params.innerAmp;

  const outerFreq = params.outerFreq;
  const innerDiv = params.innerDiv;
  const innerPower = params.innerPower;

  const thetaMax = params.thetaMaxPi * Math.PI;
  const thetaStep = params.thetaStep;

  if (!Number.isFinite(scale)) throw new Error("Butterfly: scale must be numeric");

  if (!Number.isFinite(expAmp)) throw new Error("Butterfly: expAmp must be numeric");
  if (!Number.isFinite(outerAmp)) throw new Error("Butterfly: outerAmp must be numeric");
  if (!Number.isFinite(innerAmp)) throw new Error("Butterfly: innerAmp must be numeric");

  if (!Number.isFinite(outerFreq)) throw new Error("Butterfly: outerFreq must be numeric");
  if (!Number.isFinite(innerDiv)) throw new Error("Butterfly: innerDiv must be numeric");
  if (!Number.isFinite(innerPower)) throw new Error("Butterfly: innerPower must be numeric");

  if (!Number.isFinite(thetaMax)) throw new Error("Butterfly: thetaMaxPi must be numeric");
  if (!Number.isFinite(thetaStep)) throw new Error("Butterfly: thetaStep must be numeric");
  if (thetaStep <= 0) throw new Error("Butterfly: thetaStep must be > 0");

  const same =
    elements.element.last.scale === scale &&

    elements.element.last.expAmp === expAmp &&
    elements.element.last.outerAmp === outerAmp &&
    elements.element.last.innerAmp === innerAmp &&

    elements.element.last.outerFreq === outerFreq &&
    elements.element.last.innerDiv === innerDiv &&
    elements.element.last.innerPower === innerPower &&

    elements.element.last.thetaMax === thetaMax &&
    elements.element.last.thetaStep === thetaStep;

  if (same) return;

  elements.element.last.scale = scale;

  elements.element.last.expAmp = expAmp;
  elements.element.last.outerAmp = outerAmp;
  elements.element.last.innerAmp = innerAmp;

  elements.element.last.outerFreq = outerFreq;
  elements.element.last.innerDiv = innerDiv;
  elements.element.last.innerPower = innerPower;

  elements.element.last.thetaMax = thetaMax;
  elements.element.last.thetaStep = thetaStep;

  elements.element.points = computeButterflyPoints(
    scale,
    expAmp,
    outerAmp,
    innerAmp,
    outerFreq,
    innerDiv,
    innerPower,
    thetaMax,
    thetaStep
  );

} // end update


function draw() {

  const w = window.ctx.canvas.width;
  const h = window.ctx.canvas.height;

  window.ctx.clearRect(0, 0, w, h);

  window.ctx.save();
  window.ctx.translate(w / 2, h / 2);

  window.ctx.strokeStyle = scriptInfo.params.strokeColor;
  window.ctx.lineWidth = scriptInfo.params.lineWidth;

  const pts = elements.element.points;

  if (pts.length < 2) {
    window.ctx.restore();
    return;
  }

  window.ctx.beginPath();
  window.ctx.moveTo(pts[0].x, pts[0].y);

  for (let i = 1; i < pts.length; i++) {
    window.ctx.lineTo(pts[i].x, pts[i].y);
  }

  window.ctx.stroke();
  window.ctx.restore();

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
   Butterfly math (based on your original code)
============================================================ */
function computeButterflyPoints(
  scale,
  expAmp,
  outerAmp,
  innerAmp,
  outerFreq,
  innerDiv,
  innerPower,
  thetaMax,
  thetaStep
) {

  const pts = [];

  for (let theta = 0; theta <= thetaMax; theta += thetaStep) {

    const termExp = expAmp * Math.exp(Math.sin(theta));

    const termOuter = outerAmp * Math.cos(outerFreq * theta);

    const s = Math.sin(theta / innerDiv);
    const termInner = innerAmp * Math.pow(s, innerPower);

    const r = scale * (termExp - termOuter + termInner);

    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);

    pts.push({ x: x, y: y });

  }

  return pts;

} // end computeButterflyPoints
