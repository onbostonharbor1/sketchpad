/* ============================================================
   Curve Stitch Bird Approximation (Static)
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo:
   - Two stitched “wings” made from arc-to-inner-line segments
   - Simple stitched “body” down the center

   GOAL
   ----
   - Run under Gallery calling runPattern()
   - Use parameterControls.js
   - Match drawRegistry-style lifecycle and naming

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - window.ctx exists (global getter)
   - #action exists
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Curve Stitch Bird Approximation",

  params: {
    numLines: 150,

    strokeStyle: "#000000",
    lineWidth: 0.5,

    wingRadiusFactor: 0.9,
    wingOffsetY: -50,

    wingStartAngleDeg: 180,
    wingEndAngleDeg:   360,

    innerXFactor: 0.10,
    innerYFactor: 0.10,

    wingEllipseYScale: 0.50,

    bodyLineCount: 30,
    bodyTopY: -50,
    bodyHeight: 100,
    bodyCurveX: 20,
    bodyExtraY: 20
  },

  controls: {
    numLines: {
      type: "range",
      label: "Wing Stitch Lines",
      min: 10,
      max: 400,
      step: 1
    },

    strokeStyle: {
      type: "color",
      label: "Line Color"
    },

    lineWidth: {
      type: "range",
      label: "Line Width",
      min: 0.1,
      max: 3,
      step: 0.1
    },

    wingRadiusFactor: {
      type: "range",
      label: "Wing Radius Factor",
      min: 0.1,
      max: 1.2,
      step: 0.01
    },

    wingOffsetY: {
      type: "range",
      label: "Wing Offset Y",
      min: -200,
      max: 200,
      step: 1
    },

    wingStartAngleDeg: {
      type: "range",
      label: "Wing Start Angle (deg)",
      min: 0,
      max: 360,
      step: 1
    },

    wingEndAngleDeg: {
      type: "range",
      label: "Wing End Angle (deg)",
      min: 0,
      max: 360,
      step: 1
    },

    innerXFactor: {
      type: "range",
      label: "Inner X Factor",
      min: 0.0,
      max: 0.5,
      step: 0.01
    },

    innerYFactor: {
      type: "range",
      label: "Inner Y Factor",
      min: 0.0,
      max: 0.5,
      step: 0.01
    },

    wingEllipseYScale: {
      type: "range",
      label: "Wing Ellipse Y Scale",
      min: 0.1,
      max: 1.5,
      step: 0.01
    },

    bodyLineCount: {
      type: "range",
      label: "Body Lines",
      min: 0,
      max: 200,
      step: 1
    },

    bodyTopY: {
      type: "range",
      label: "Body Top Y",
      min: -200,
      max: 200,
      step: 1
    },

    bodyHeight: {
      type: "range",
      label: "Body Height",
      min: 0,
      max: 400,
      step: 1
    },

    bodyCurveX: {
      type: "range",
      label: "Body Curve X",
      min: 0,
      max: 200,
      step: 1
    },

    bodyExtraY: {
      type: "range",
      label: "Body Extra Y",
      min: -200,
      max: 200,
      step: 1
    }
  },

  elements: {
    element: null
  }

}; // end scriptInfo

// Compatibility aliases (per your Gallery conversion rules)
scriptInfo.parameters = scriptInfo.params;

scriptInfo.redrawHandler = function redrawHandler() {
  updateBird(scriptInfo.params);
  drawBird();
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

  // Fail-fast assumptions
  if (!window.ctx) {
    throw new Error("Curve Stitch Bird: window.ctx missing");
  }

  // Build controls
  buildParameterControls(scriptInfo, "tab-scripts", true);

  // Cold init (first run)
  initBird();

  // First draw
  scriptInfo.redrawHandler();

} // end runPattern


/* ============================================================
   initBird()
   ------------------------------------------------------------
   Cold-start only:
   - establish a stable element object
============================================================ */
function initBird() {

  scriptInfo.elements.element = {
    w: 0,
    h: 0,
    cx: 0,
    cy: 0
  };

} // end initBird


/* ============================================================
   updateBird(params)
   ------------------------------------------------------------
   Apply parameter changes to element state.
============================================================ */
function updateBird(params) {

  const c = window.ctx;

  scriptInfo.elements.element.w  = c.canvas.width;
  scriptInfo.elements.element.h  = c.canvas.height;
  scriptInfo.elements.element.cx = c.canvas.width / 2;
  scriptInfo.elements.element.cy = c.canvas.height / 2;

} // end updateBird


/* ============================================================
   drawBird()
   ------------------------------------------------------------
   Deterministic draw from elements + params only.
============================================================ */
function drawBird() {

  const c = window.ctx;

  const e = scriptInfo.elements.element;
  const p = scriptInfo.params;

  // Clear canvas
  c.clearRect(0, 0, e.w, e.h);

  // Style
  c.strokeStyle = p.strokeStyle;
  c.lineWidth   = p.lineWidth;

  // Wings
  drawWing(p, e, false);
  drawWing(p, e, true);

  // Body
  drawBody(p, e);

} // end drawBird


/* ============================================================
   drawWing(params, element, flipX)
============================================================ */
function drawWing(params, element, flipX) {

  const c = window.ctx;

  const numLines = params.numLines;

  const startAngle = toRadians(params.wingStartAngleDeg);
  const endAngle   = toRadians(params.wingEndAngleDeg);

  for (let i = 0; i <= numLines; i++) {

    const t = i / numLines;

    // Outer arc point
    const angle1 = startAngle + (endAngle - startAngle) * t;

    let x1 =
      element.cx +
      Math.cos(angle1) * (element.w / 2) * params.wingRadiusFactor;

    let y1 =
      element.cy +
      params.wingOffsetY +
      Math.sin(angle1) * (element.h / 2) * params.wingRadiusFactor * params.wingEllipseYScale;

    // Inner/body connection point
    const x2 =
      element.cx +
      (flipX ? -1 : 1) * (element.w / 2) * (1 - t) * params.innerXFactor;

    const y2 =
      element.cy +
      params.wingOffsetY +
      (element.h / 2) * t * params.innerYFactor;

    if (flipX) {
      x1 = element.cx - (x1 - element.cx);
    }

    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  }

} // end drawWing


/* ============================================================
   drawBody(params, element)
============================================================ */
function drawBody(params, element) {

  const c = window.ctx;

  const count = params.bodyLineCount;

  if (count <= 0) return;

  for (let i = 0; i <= count; i++) {

    const t = i / count;

    const bodyTopX = element.cx;
    const bodyTopY = element.cy + params.bodyTopY + t * params.bodyHeight;

    const bodyBottomX =
      element.cx +
      Math.sin(t * Math.PI) * params.bodyCurveX;

    const bodyBottomY =
      element.cy +
      (params.bodyTopY + params.bodyHeight) +
      t * params.bodyExtraY;

    c.beginPath();
    c.moveTo(bodyTopX, bodyTopY);
    c.lineTo(bodyBottomX, bodyBottomY);
    c.stroke();
  }

} // end drawBody


/* ============================================================
   toRadians(deg)
============================================================ */
function toRadians(deg) {
  return deg * Math.PI / 180;
} // end toRadians
