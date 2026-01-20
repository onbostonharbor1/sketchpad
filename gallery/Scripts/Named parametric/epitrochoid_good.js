/* ============================================================
   Epitrochoid (Parametric) — Slider Version
   Gallery Script (ParameterControls-integrated)

   OVERVIEW
   --------
   This script draws an EPITROCHOID, which is the curve traced by a
   point attached to a circle of radius r as that circle rolls around
   the OUTSIDE of a fixed circle of radius R.

   The curve is controlled by three primary sliders:

   1) R  (Fixed Circle Radius)
      - Think of this as the “main” circle sitting still.
      - Larger R increases the overall scale of the path (before auto-fit),
        and also changes the harmonic ratio (R+r)/r that controls how many
        lobes / turns you see.
      - Practical range: 0.2 to 10.0 (default 1.0)

   2) r  (Rolling Circle Radius)
      - This is the circle that rolls around the outside of the fixed circle.
      - Smaller r increases the frequency factor k = (R+r)/r, which makes
        the curve more intricate (more loops / oscillations).
      - Larger r reduces that frequency, producing simpler shapes.
      - Practical range: 0.2 to 10.0 (default 0.6)

   3) d  (Pen Offset from Rolling Circle Center)
      - This is how far the “pen point” is from the rolling circle’s center.
      - If d is small, the curve stays close to the rolling circle center path
        and looks smoother / less “spiky”.
      - If d is larger, the curve becomes more dramatic and can create
        self-intersections and outer/inner loops.
      - For epitrochoids, values around 0..(R+r) are typical; here we cap it
        at 10 to keep the UI simple and predictable.
      - Practical range: 0.0 to 10.0 (default 0.6)

   NOTES ABOUT THESE RANGES
   ------------------------
   - You suggested 0.2..10 with step 0.2; that is workable for R and r.
   - For d, allowing 0.0 is useful (it degenerates to a circle-like path),
     so d uses 0.0..10 with step 0.2.
   - Because your drawParametric pipeline AUTO-FITS the curve to the canvas,
     “absolute size” is not the main effect of R/r/d; instead, the ratio terms
     determine complexity and geometry.

   FAIL-FAST / STYLE NOTES
   -----------------------
   - No ctx variable is declared; we use the global ctx directly.
   - No optional chaining; missing dependencies should crash clearly.
   - Rebuild-on-change is deterministic: update() rebuilds the Parametric
     model and draw() renders it.

============================================================ */

import { Parametric } from "/classes/parametric.js";
import { drawParametric } from "/draw/drawParametrics.js";
import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */

export const scriptInfo = {

  title: "Epitrochoid (Parametric) — Sliders",

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
      widget: "color",
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

  elements.element = buildEpitrochoidParametric(params);

} // end init


/* ============================================================
   update(params)
============================================================ */

function update(params) {

  elements.element = buildEpitrochoidParametric(params);

} // end update


/* ============================================================
   draw()
============================================================ */

function draw() {

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  drawParametric(elements.element);

} // end draw


/* ============================================================
   buildEpitrochoidParametric(params)
============================================================ */

function buildEpitrochoidParametric(params) {

  const R = requireFiniteNumber(params.R, "R");
  const r = requireFiniteNumber(params.r, "r");
  const d = requireFiniteNumber(params.d, "d");

  if (r === 0) {
    throw new Error("Epitrochoid: r must not be 0");
  }

  // Frequency factor.
  const k = (R + r) / r;

  // Because sliders produce general decimals, the curve may not "close"
  // neatly. Use a fixed domain that gives enough structure to see the form.
  // This is a deliberately pragmatic choice for interactive exploration.
  const tMin = 0;
  const tMax = 20 * Math.PI;

  // Sampling: keep it smooth while still responsive.
  const numPoints = 2500;

  const thing = new Parametric({
    funcX: function (t) {
      return (R + r) * Math.cos(t) - d * Math.cos(k * t);
    },
    funcY: function (t) {
      return (R + r) * Math.sin(t) - d * Math.sin(k * t);
    },
    color: params.color,
    lineWidth: params.lineWidth,
    printEquations: false,
    margin: 30,
    domain: {
      tMin: tMin,
      tMax: tMax,
      numPoints: numPoints,
      maxFreq: 0,
      samplesPerCycle: 30
    }
  });

  return thing;

} // end buildEpitrochoidParametric


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
