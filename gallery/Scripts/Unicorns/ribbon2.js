/* ============================================================
   Animated Color Ribbon (Static)
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo:
   - Two point rings (circlePoints)
   - Lines connect pts1[i] to pts2[(i*mult) % n]
   - HSLA rainbow sweep based on index + time

   CONVERSION CHANGES
   ------------------
   - NO animation (static render)
   - ParameterControls-integrated
   - DrawRegistry-style lifecycle: init / update / draw
   - Uses global ctx directly (no ctx var, no window.ctx, no passing ctx)

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - ctx exists globally (provided by Sketchpad getter)
   - #action exists
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Color Ribbon (Static)",

  params: {
    n: 1200,
    baseRadius: 250,
    outerRadiusScale: 1.2,

    offset: 0.0,
    scale: 0.8,

    mult: 7,

    lineWidth: 0.4,

    alpha: 0.3,
    hueShift: 0.0,
    hueSpread: 360,
    saturation: 70,
    lightness: 45
  },

  controls: {

    n: {
      widget: "range",
      label: "Lines (n)",
      min: 60,
      max: 2400,
      step: 20
    },

    baseRadius: {
      widget: "range",
      label: "Base Radius",
      min: 20,
      max: 420,
      step: 1
    },

    outerRadiusScale: {
      widget: "range",
      label: "Outer Radius Scale",
      min: 0.2,
      max: 3.0,
      step: 0.01
    },

    offset: {
      widget: "range",
      label: "Outer Offset (radians)",
      min: -6.283185307179586,
      max: 6.283185307179586,
      step: 0.01
    },

    scale: {
      widget: "range",
      label: "Outer Scale",
      min: 0.05,
      max: 2.0,
      step: 0.01
    },

    mult: {
      widget: "range",
      label: "Mapping Multiplier",
      min: 1,
      max: 50,
      step: 1
    },

    lineWidth: {
      widget: "range",
      label: "Line Width",
      min: 0.1,
      max: 4.0,
      step: 0.1
    },

    alpha: {
      widget: "range",
      label: "Alpha",
      min: 0.02,
      max: 1.0,
      step: 0.01
    },

    hueShift: {
      widget: "range",
      label: "Hue Shift",
      min: 0,
      max: 360,
      step: 1
    },

    hueSpread: {
      widget: "range",
      label: "Hue Spread",
      min: 0,
      max: 720,
      step: 1
    },

    saturation: {
      widget: "range",
      label: "Saturation (%)",
      min: 0,
      max: 100,
      step: 1
    },

    lightness: {
      widget: "range",
      label: "Lightness (%)",
      min: 0,
      max: 100,
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
  updateRibbon(scriptInfo.params);
  drawRibbon();
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

  buildParameterControls(scriptInfo, "tab-scripts", true);

  initRibbon();
  scriptInfo.redrawHandler();

} // end runPattern


/* ============================================================
   initRibbon()
   ------------------------------------------------------------
   Cold-start only: establish stable element state.
============================================================ */
function initRibbon() {

  scriptInfo.elements.element = {
    w: 0,
    h: 0,
    cx: 0,
    cy: 0,
    pts1: [],
    pts2: []
  };

} // end initRibbon


/* ============================================================
   updateRibbon(params)
   ------------------------------------------------------------
   Recompute geometry.
============================================================ */
function updateRibbon(params) {

  const e = scriptInfo.elements.element;

  e.w = ctx.canvas.width;
  e.h = ctx.canvas.height;
  e.cx = e.w / 2;
  e.cy = e.h / 2;

  const n = clampInt(params.n, 3, 20000);

  const R1 = params.baseRadius;
  const R2 = params.baseRadius * params.outerRadiusScale;

  e.pts1 = circlePoints(n, R1, 0.0, 1.0, e.cx, e.cy);
  e.pts2 = circlePoints(n, R2, params.offset, params.scale, e.cx, e.cy);

} // end updateRibbon


/* ============================================================
   drawRibbon()
   ------------------------------------------------------------
   Deterministic draw from elements + params only.
============================================================ */
function drawRibbon() {

  const e = scriptInfo.elements.element;
  const p = scriptInfo.params;

  ctx.clearRect(0, 0, e.w, e.h);

  ctx.lineWidth = p.lineWidth;

  const n = e.pts1.length;
  const mult = clampInt(p.mult, 1, 1000000);

  for (let i = 0; i < n; i++) {

    const pt1 = e.pts1[i];

    const j = (i * mult) % n;
    const pt2 = e.pts2[j];

    ctx.beginPath();
    ctx.strokeStyle = colorAt(i, n, p);
    ctx.moveTo(pt1.x, pt1.y);
    ctx.lineTo(pt2.x, pt2.y);
    ctx.stroke();
  }

} // end drawRibbon


/* ============================================================
   circlePoints(n, R, offset, scale, cx0, cy0)
============================================================ */
function circlePoints(n, R, offset, scale, cx0, cy0) {

  const pts = [];

  for (let i = 0; i < n; i++) {
    const a = 2 * Math.PI * i / n + offset;

    pts.push({
      x: cx0 + scale * R * Math.cos(a),
      y: cy0 + scale * R * Math.sin(a)
    });
  }

  return pts;

} // end circlePoints


/* ============================================================
   colorAt(i, n, params)
============================================================ */
function colorAt(i, n, params) {

  const hue = (params.hueSpread * (i / n) + params.hueShift) % 360;

  const sat = clamp(params.saturation, 0, 100);
  const lit = clamp(params.lightness, 0, 100);
  const a = clamp(params.alpha, 0, 1);

  return "hsla(" + hue + ", " + sat + "%, " + lit + "%, " + a + ")";

} // end colorAt


/* ============================================================
   clamp(v, a, b)
============================================================ */
function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v));
} // end clamp


/* ============================================================
   clampInt(v, a, b)
============================================================ */
function clampInt(v, a, b) {

  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return a;

  if (n < a) return a;
  if (n > b) return b;
  return n;

} // end clampInt
