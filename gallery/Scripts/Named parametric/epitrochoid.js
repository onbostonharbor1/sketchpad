/* ============================================================
   Epitrochoid (Parametric) — Sliders + Build Steps
   Gallery Script (ParameterControls-integrated)

   PURPOSE
   -------
   One purpose of Gallery scripts is to evolve into reusable
   draw-library code. This version is structured explicitly as a
   repeatable build sequence. Each step is designed to be lifted
   into /draw later with minimal changes.

   THREE PRIMARY SLIDERS (WHAT THEY MEAN)
   -------------------------------------
   R  (Fixed Circle Radius)
     - Radius of the stationary circle.
     - Affects overall geometry and the frequency factor.

   r  (Rolling Circle Radius)
     - Radius of the circle rolling around the outside of R.
     - Smaller r increases the frequency factor k = (R + r) / r,
       producing more intricate looping.

   d  (Pen Offset)
     - Distance from the rolling circle center to the drawing point.
     - Controls how dramatic the curve becomes (inner/outer loops,
       self-intersections).

   BUILD SEQUENCE (THE REUSABLE STEPS)
   ----------------------------------
   Step 1: buildSpec(params)
     - Validate and normalize user parameters into a clean spec.

   Step 2: buildCurveFunctions(spec)
     - Create the pure math functions funcX(t), funcY(t).
     - No sampling, no canvas, no drawing.

   Step 3: chooseDomain(spec, curve)
     - Choose tMin/tMax/numPoints deterministically for interactive use.
     - This can later be replaced by “closure-aware” logic.

   Step 4: buildModel(spec, curve, domain)
     - Assemble a Parametric instance from curve + domain + style.

   Step 5: render(model)
     - Clear and draw using the existing drawParametric pipeline.

   STYLE / CONSTRAINTS
   -------------------
   - Fail-fast: missing dependencies or invalid values throw.
   - Deterministic: update() rebuilds the model from params every time.
   - No ctx variable is declared; the global ctx is used directly.
   - No optional chaining or silent fallbacks.
============================================================ */

import { Parametric } from "/classes/parametric.js";
import { drawParametric } from "/draw/drawParametrics.js";
import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */

export const scriptInfo = {

  title: "Epitrochoid (Parametric) — Sliders (Build Steps)",

  params: {
    R: 1.0,
    r: 0.6,
    d: 0.6,
    lineWidth: 1,
    color: "blue"
  },

  parameters: null,

  controls: {

    R: {
      widget: "range",
      label: "R (fixed radius)",
      min: 0.2,
      max: 10.0,
      step: 0.2
    },

    r: {
      widget: "range",
      label: "r (rolling radius)",
      min: 0.2,
      max: 10.0,
      step: 0.2
    },

    d: {
      widget: "range",
      label: "d (pen offset)",
      min: 0.0,
      max: 10.0,
      step: 0.2
    },

    lineWidth: {
      widget: "range",
      label: "Line Width",
      min: 1,
      max: 6,
      step: 1
    },

    color: {
      widget: "colorPicker",
      label: "Color"
    }

  },

  redrawHandler: null,

  onParamChange: function () { }

};


/* ============================================================
   Internal state
============================================================ */

const elements = {
  element: null
};


/* ============================================================
   runPattern()
============================================================ */

export function runPattern() {

  scriptInfo.parameters = scriptInfo.params;

  init(scriptInfo.params);

  buildParameterControls(scriptInfo, "tab-scripts", true);

  scriptInfo.redrawHandler = function () {
    update(scriptInfo.params);
    draw();
  };

  scriptInfo.redrawHandler();

} // end runPattern


/* ============================================================
   init(params)
============================================================ */

function init(params) {

  // Build once at startup.
  elements.element = buildEpitrochoidModelFromParams(params);

} // end init


/* ============================================================
   update(params)
============================================================ */

function update(params) {

  // Rebuild deterministically from params.
  elements.element = buildEpitrochoidModelFromParams(params);

} // end update


/* ============================================================
   draw()
============================================================ */

function draw() {

  render(elements.element);

} // end draw


/* ============================================================
   buildEpitrochoidModelFromParams(params)
   ------------------------------------------------------------
   The orchestration wrapper that applies the standard build steps.
============================================================ */

function buildEpitrochoidModelFromParams(params) {

  const spec  = buildSpec(params);                 // Step 1
  const curve = buildCurveFunctions(spec);         // Step 2
  const dom   = chooseDomain(spec, curve);         // Step 3
  const model = buildModel(spec, curve, dom);      // Step 4

  return model;

} // end buildEpitrochoidModelFromParams


/* ============================================================
   Step 1: buildSpec(params)
============================================================ */

function buildSpec(params) {

  const R = requireFiniteNumber(params.R, "R");
  const r = requireFiniteNumber(params.r, "r");
  const d = requireFiniteNumber(params.d, "d");

  const lineWidth = requireFiniteNumber(params.lineWidth, "lineWidth");
  const color = params.color;

  if (r === 0) {
    throw new Error("Epitrochoid: r must not be 0");
  }

  if (!color) {
    throw new Error("Epitrochoid: color is required");
  }

  return {
    R: R,
    r: r,
    d: d,
    lineWidth: lineWidth,
    color: color
  };

} // end buildSpec


/* ============================================================
   Step 2: buildCurveFunctions(spec)
============================================================ */

function buildCurveFunctions(spec) {

  const R = spec.R;
  const r = spec.r;
  const d = spec.d;

  // Derived constant: frequency factor.
  const k = (R + r) / r;

  // Pure math functions (math space).
  function funcX(t) {
    return (R + r) * Math.cos(t) - d * Math.cos(k * t);
  } // end funcX

  function funcY(t) {
    return (R + r) * Math.sin(t) - d * Math.sin(k * t);
  } // end funcY

  return {
    k: k,
    funcX: funcX,
    funcY: funcY
  };

} // end buildCurveFunctions


/* ============================================================
   Step 3: chooseDomain(spec, curve)
   ------------------------------------------------------------
   Interactive exploration domain:
   - Sliders produce arbitrary decimals, so "closure" is not reliable.
   - Use a fixed span that reveals the structure consistently.

   If/when you want a closure-aware version later, this is the ONLY
   step that changes.
============================================================ */

function chooseDomain(spec, curve) {

  // Deterministic, stable, "shows enough of the curve".
  const tMin = 0;
  const tMax = 20 * Math.PI;

  // Sampling density: smooth but responsive.
  const numPoints = 2500;

  return {
    tMin: tMin,
    tMax: tMax,
    numPoints: numPoints,
    maxFreq: 0,
    samplesPerCycle: 30
  };

} // end chooseDomain


/* ============================================================
   Step 4: buildModel(spec, curve, domain)
============================================================ */

function buildModel(spec, curve, domain) {

  const model = new Parametric({
    funcX: curve.funcX,
    funcY: curve.funcY,

    color: spec.color,
    lineWidth: spec.lineWidth,

    printEquations: false,
    margin: 30,

    domain: domain
  });

  return model;

} // end buildModel


/* ============================================================
   Step 5: render(model)
============================================================ */

function render(model) {

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  drawParametric(model);

} // end render


/* ============================================================
   requireFiniteNumber(v, label)
============================================================ */

function requireFiniteNumber(v, label) {

  const n = Number(v);

  if (!Number.isFinite(n)) {
    throw new Error("Invalid numeric value for " + label + ": " + v);
  }

  return n;

} // end requireFiniteNumber
