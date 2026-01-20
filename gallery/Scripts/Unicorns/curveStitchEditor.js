/* ============================================================
   Custom Stitch Rule Editor (Static)
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo:
   - Point generator: circle | line | grid
   - Connection rule: connect i -> j (j computed from a rule)
   - Original UI used a textarea and Render button

   CONVERSION GOAL
   ---------------
   - Run under Gallery calling runPattern()
   - Use parameterControls.js
   - Match drawRegistry-style lifecycle and naming

   IMPORTANT CONSTRAINTS
   ---------------------
   - NO animation
   - NO ctx variable declarations
   - NO window.ctx
   - NO passing ctx to functions
   - NO ctx checks / guards

   NOTE ABOUT RULE INPUT
   ---------------------
   The original file lets the user type arbitrary JavaScript and runs it
   via new Function(...). That requires a text editor UI, which is NOT
   part of parameterControls.

   This conversion keeps the concept, but uses SAFE built-in rule modes
   that reproduce the same behavior class (e.g. (i + k) % n).

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

  title: "Custom Stitch Rule Editor (Static)",

  params: {

    pointGen: "circle",
    pointCount: 100,

    ruleMode: "offset",
    offsetK: 50,
    multM: 7,

    strokeColor: "#3366cc",
    lineWidth: 1,

    showPoints: false,
    pointRadius: 1.5,

    circleRadius: 200,
    lineX0: 100,
    lineX1: 500

  },

  controls: {

    pointGen: {
      widget: "select",
      label: "Point Generator",
      options: [
        { value: "circle", label: "Circle" },
        { value: "line",   label: "Line" },
        { value: "grid",   label: "Grid" }
      ]
    },

    pointCount: {
      widget: "range",
      label: "Point Count",
      min: 10,
      max: 200,
      step: 1
    },

    ruleMode: {
      widget: "select",
      label: "Connection Rule",
      options: [
        { value: "offset", label: "j = (i + k) % n" },
        { value: "mult",   label: "j = (i * m) % n" },
        { value: "mirror", label: "j = (n - 1 - i)" }
      ]
    },

    offsetK: {
      widget: "range",
      label: "Offset k",
      min: 0,
      max: 200,
      step: 1
    },

    multM: {
      widget: "range",
      label: "Multiplier m",
      min: 1,
      max: 50,
      step: 1
    },

    strokeColor: {
      widget: "colorPicker",
      label: "Line Color"
    },

    lineWidth: {
      widget: "range",
      label: "Line Width",
      min: 0.5,
      max: 6,
      step: 0.5
    },

    showPoints: {
      widget: "checkbox",
      label: "Show Points"
    },

    pointRadius: {
      widget: "range",
      label: "Point Radius",
      min: 0.5,
      max: 6,
      step: 0.5
    },

    circleRadius: {
      widget: "range",
      label: "Circle Radius",
      min: 20,
      max: 280,
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
  updateStitch(scriptInfo.params);
  drawStitch();
}; // end redrawHandler

scriptInfo.onParamChange = function onParamChange() {
  // Compatibility no-op
}; // end onParamChange


/* ============================================================
   runPattern()
   ------------------------------------------------------------
   Gallery entry point.
============================================================ */
export function runPattern() {

  buildParameterControls(scriptInfo, "tab-scripts", true);

  initStitch();
  scriptInfo.redrawHandler();

} // end runPattern


/* ============================================================
   initStitch()
   ------------------------------------------------------------
   Cold-start only.
============================================================ */
function initStitch() {

  scriptInfo.elements.element = {
    w: 0,
    h: 0,
    cx: 0,
    cy: 0,
    points: []
  };

} // end initStitch


/* ============================================================
   updateStitch(params)
   ------------------------------------------------------------
   Compute points for the selected generator.
============================================================ */
function updateStitch(params) {

  const e = scriptInfo.elements.element;

  e.w = ctx.canvas.width;
  e.h = ctx.canvas.height;
  e.cx = e.w / 2;
  e.cy = e.h / 2;

  const count = clampInt(params.pointCount, 2, 20000);

  if (params.pointGen === "circle") {
    e.points = generateCirclePoints(count, params.circleRadius, e.cx, e.cy);
    return;
  }

  if (params.pointGen === "line") {
    e.points = generateLinePoints(count, params.lineX0, params.lineX1, e.cy);
    return;
  }

  if (params.pointGen === "grid") {
    e.points = generateGridPoints(count, e.w, e.h);
    return;
  }

  throw new Error("updateStitch: invalid pointGen '" + String(params.pointGen) + "'");

} // end updateStitch


/* ============================================================
   drawStitch()
   ------------------------------------------------------------
   Deterministic draw from elements + params only.
============================================================ */
function drawStitch() {

  const e = scriptInfo.elements.element;
  const p = scriptInfo.params;

  ctx.clearRect(0, 0, e.w, e.h);

  ctx.strokeStyle = p.strokeColor;
  ctx.lineWidth = p.lineWidth;

  const pts = e.points;
  const n = pts.length;

  for (let i = 0; i < n; i++) {

    const j = computeJ(i, n, p);

    if (j < 0 || j >= n) continue;

    ctx.beginPath();
    ctx.moveTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[j].x, pts[j].y);
    ctx.stroke();
  }

  if (p.showPoints === true) {
    drawPoints(pts, p.pointRadius);
  }

} // end drawStitch


/* ============================================================
   computeJ(i, n, params)
============================================================ */
function computeJ(i, n, params) {

  if (params.ruleMode === "offset") {
    const k = clampInt(params.offsetK, 0, 1000000);
    return (i + k) % n;
  }

  if (params.ruleMode === "mult") {
    const m = clampInt(params.multM, 1, 1000000);
    return (i * m) % n;
  }

  if (params.ruleMode === "mirror") {
    return (n - 1 - i);
  }

  throw new Error("computeJ: invalid ruleMode '" + String(params.ruleMode) + "'");

} // end computeJ


/* ============================================================
   generateCirclePoints(n, R, cx0, cy0)
============================================================ */
function generateCirclePoints(n, R, cx0, cy0) {

  const pts = [];

  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;

    pts.push({
      x: cx0 + R * Math.cos(a),
      y: cy0 + R * Math.sin(a)
    });
  }

  return pts;

} // end generateCirclePoints


/* ============================================================
   generateLinePoints(n, x0, x1, y0)
============================================================ */
function generateLinePoints(n, x0, x1, y0) {

  const pts = [];

  if (n === 1) {
    pts.push({ x: (x0 + x1) / 2, y: y0 });
    return pts;
  }

  for (let i = 0; i < n; i++) {
    pts.push({
      x: x0 + (x1 - x0) * (i / (n - 1)),
      y: y0
    });
  }

  return pts;

} // end generateLinePoints


/* ============================================================
   generateGridPoints(count, w, h)
============================================================ */
function generateGridPoints(count, w, h) {

  const pts = [];

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  for (let i = 0; i < count; i++) {

    const x = (i % cols) * (w / cols) + w / (2 * cols);
    const y = Math.floor(i / cols) * (h / rows) + h / (2 * rows);

    pts.push({ x, y });
  }

  return pts;

} // end generateGridPoints


/* ============================================================
   drawPoints(points, r)
============================================================ */
function drawPoints(points, r) {

  ctx.save();

  ctx.fillStyle = "rgba(0,0,0,0.25)";

  for (let i = 0; i < points.length; i++) {
    const p = points[i];

    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

} // end drawPoints


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
