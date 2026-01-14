/* drawRegistry/parametrics.js
   ------------------------------------------------------------
   Draw Registry Entry: Parametrics
   Two selectable Parametric curves:
     1) Four Circles   (default)
     2) Four ended

   Controls:
     - color
     - lineWidth
     - accordion selector (click to switch curve immediately)
   ------------------------------------------------------------ */

import { Parametric }     from "/classes/parametric.js";
import { drawParametric } from "/draw/drawParametrics.js";

window.drawRegistry_parametrics = {

  name:        "Parametrics",
  id:          "parametrics",
  version:     0.1,
  category:    "Parametrics",
  firstOrder:  true,
  source:      "internal",
  tags:        ["Parametric"],
  description: "Two parametric demos with a selector accordion",
  status:      "",
  hover:       "",

  // -- visual styling ---
  background:  null,
  overlays:    [],
  transforms:  [],

  // Placeholder for all elements drawn
  elements: null,

  // --- Core defaults for drawing (JSON-safe) ---
  params: {
    variant:   "fourCircles",   // default
    color:     "blue",
    lineWidth: 1
  },

  // --- UI metadata (controls) ---
  controls: {

    color: {
      widget: "colorPicker",
      label: "Color:"
    },

    lineWidth: {
      widget: "range",
      min: 1,
      max: 8,
      step: 1,
      label: "Width:"
    },

    parametricChooser: {
      widget: "accordion",
      startOpen: true,
      sections: [
        {
          title: "Parametrics",
          items: []   // filled in init() so actions can close over `this`
        } // end section
      ]
    } // end parametricChooser

  }, // end controls


  /* ==========================================================
     init()
     ----------------------------------------------------------
     Build:
       - the accordion clickable items
       - the default Parametric object (Four Circles)
  ========================================================== */
  init() {

    const self = this;

    function setVariantAndRedraw(newVariant) {

      if (!newVariant) {
        throw new Error("parametrics.setVariantAndRedraw: newVariant missing");
      }

      self.params.variant = newVariant;

      self.update(self.params);
      self.draw();

    } // end setVariantAndRedraw

    // Build accordion items (validateDrawRegistry style: label + action())
    self.controls.parametricChooser.sections[0].items = [
      {
        label: "Four Circles",
        action() {
          setVariantAndRedraw("fourCircles");
        } // end action
      },
      {
        label: "Four ended",
        action() {
          setVariantAndRedraw("fourEnded");
        } // end action
      }
    ];

    // Build default curve
    self.elements = {
      curve: buildCurveFromParams(self.params)
    };

  }, // end init


  /* ==========================================================
     update(params)
     ----------------------------------------------------------
     Apply changes:
       - color / lineWidth always update current curve
       - variant switch rebuilds curve definition
  ========================================================== */
  update(params) {

    if (!params) {
      throw new Error("parametrics.update: params missing");
    }
    if (!this.elements) {
      throw new Error("parametrics.update: elements missing (init not run?)");
    }

    // Variant change: rebuild curve (funcX/funcY differ)
    if (params.variant && params.variant !== this.params.variant) {
      this.params.variant = params.variant;
      this.elements.curve = buildCurveFromParams(this.params);
    }

    // Normal param updates
    if (params.color !== undefined)     this.params.color = params.color;
    if (params.lineWidth !== undefined) this.params.lineWidth = params.lineWidth;

    // Apply to curve (drawParametric reads these)
    const curve = this.elements.curve;
    curve.color = this.params.color;
    curve.lineWidth = this.params.lineWidth;

  }, // end update


  /* ==========================================================
     draw()
  ========================================================== */
  draw() {

    if (!this.elements) {
      throw new Error("parametrics.draw: elements missing (init not run?)");
    }

    drawParametric(this.elements.curve);

  } // end draw

}; // end drawRegistry_parametrics


/* ============================================================
   buildCurveFromParams(params)
   ------------------------------------------------------------
   Returns a Parametric instance for the selected variant.
============================================================ */
function buildCurveFromParams(params) {

  if (!params) {
    throw new Error("buildCurveFromParams: params missing");
  }

  const variant = params.variant;

  if (variant === "fourCircles") {
    return buildFourCircles(params);
  }

  if (variant === "fourEnded") {
    return buildFourEnded(params);
  }

  throw new Error("buildCurveFromParams: unknown variant: " + String(variant));

} // end buildCurveFromParams


/* ============================================================
   buildFourCircles(params)
   ------------------------------------------------------------
   From your script:
     x(t) = 1.5*cos(t) + 0.5*sin(199*t)
     y(t) = 1.5*sin(t) + 0.5*cos(201*t)
============================================================ */
function buildFourCircles(params) {

  const s = {

    domain: {
      tMin: 0,
      tMax: 2 * Math.PI,
      numPoints:       0,
      maxFreq:         201,
      samplesPerCycle: 30
    },

    funcX: function(t) { return 1.5 * Math.cos(t) + 0.5 * Math.sin(199 * t); },
    funcY: function(t) { return 1.5 * Math.sin(t) + 0.5 * Math.cos(201 * t); },

    color:     params.color,
    lineWidth: params.lineWidth,

    // keep equation printing off by default for this registry entry
    printEquations: false

  };

  return new Parametric(s);

} // end buildFourCircles


/* ============================================================
   buildFourEnded(params)
   ------------------------------------------------------------
   From your script (parameterized version with defaults):
     x(t) = 150*(cos(a*t) - (cos(b*t))^j)
     y(t) = 150*(sin(c*t) - (sin(d*t))^k)

   Using your last shown defaults:
     a=80, b=1, c=80, d=1, j=3, k=3
============================================================ */
function buildFourEnded(params) {

  const a = 80;
  const b = 1;
  const c = 80;
  const d = 1;
  const j = 3;
  const k = 3;

  const s = {

    domain: {
      tMin: 0,
      tMax: 2 * Math.PI,
      numPoints:       0,
      maxFreq:         201,
      samplesPerCycle: 30
    },

    funcX: function(t) { return 150 * (Math.cos(a * t) - Math.cos(b * t) ** j); },
    funcY: function(t) { return 150 * (Math.sin(c * t) - Math.sin(d * t) ** k); },

    color:     params.color,
    lineWidth: params.lineWidth,

    printEquations: false

  };

  return new Parametric(s);

} // end buildFourEnded
