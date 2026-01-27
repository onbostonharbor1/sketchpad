/* ============================================================
   Pursuit Curve Surface
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo:
   - Pursuit polygon repeatedly chases next vertex
   - Fills each intermediate polygon with low alpha

   GOAL
   ----
   - Run under Gallery calling runPattern()
   - Use parameterControls.js
   - Match drawRegistry-style lifecycle and naming
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Pursuit Curve Surface",

  params: {

    sides: 3,
    radius: 250,

    steps: 120,
    chaseRate: 0.05,

    alphaBase: 0.03,
    alphaStep: 0.002,

    inkColor: "#000000"

  },

  controls: {

    sides: {
      widget: "range",
      label: "Sides",
      min: 3,
      max: 12,
      step: 1
    },

    radius: {
      widget: "range",
      label: "Radius",
      min: 20,
      max: 350,
      step: 1
    },

    steps: {
      widget: "range",
      label: "Steps",
      min: 10,
      max: 600,
      step: 1
    },

    chaseRate: {
      widget: "range",
      label: "Chase Rate",
      min: 0.001,
      max: 0.2,
      step: 0.001
    },

    alphaBase: {
      widget: "range",
      label: "Alpha Base",
      min: 0.0,
      max: 0.2,
      step: 0.005
    },

    alphaStep: {
      widget: "range",
      label: "Alpha Step",
      min: 0.0,
      max: 0.02,
      step: 0.0005
    },

    inkColor: {
      widget: "colorPicker",
      label: "Ink Color"
    }

  },

  elements: {
    element: null
  }

}; // end scriptInfo


// Compatibility aliases (per your Gallery conversion rules)
scriptInfo.parameters = scriptInfo.params;

scriptInfo.redrawHandler = function redrawHandler() {
  update(scriptInfo.params);
  draw();
}; // end redrawHandler

scriptInfo.onParamChange = function onParamChange() {
  // Compatibility no-op
}; // end onParamChange


/* ============================================================
   runPattern()
============================================================ */
export function runPattern() {

  init();

  buildParameterControls(scriptInfo, "tab-scripts", true);

  scriptInfo.redrawHandler();

} // end runPattern


/* ============================================================
   init()
============================================================ */
function init() {

  scriptInfo.elements.element = {
    W: 0,
    H: 0,
    cx: 0,
    cy: 0,
    pts: []
  };

} // end init


/* ============================================================
   update(params)
============================================================ */
function update(params) {

  const e = scriptInfo.elements.element;

  e.W = ctx.canvas.width;
  e.H = ctx.canvas.height;

  e.cx = e.W / 2;
  e.cy = e.H / 2;

  e.pts = makePolygon(
    asInt(params.sides),
    Number(params.radius),
    e.cx,
    e.cy
  );

} // end update


/* ============================================================
   makePolygon(n, radius, cx, cy)
============================================================ */
function makePolygon(n, radius, cx, cy) {

  const pts = [];

  for (let i = 0; i < n; i++) {

    const angle = (Math.PI * 2 * i) / n;

    pts.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    });

  }

  return pts;

} // end makePolygon


/* ============================================================
   draw()
============================================================ */
function draw() {

  const e = scriptInfo.elements.element;
  const p = scriptInfo.params;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, e.W, e.H);

  const pts = clonePoints(e.pts);

  pursuitFill(
    pts,
    asInt(p.steps),
    Number(p.chaseRate),
    Number(p.alphaBase),
    Number(p.alphaStep),
    String(p.inkColor)
  );

} // end draw


/* ============================================================
   pursuitFill(points, steps, chaseRate, alphaBase, alphaStep, inkColor)
============================================================ */
function pursuitFill(points, steps, chaseRate, alphaBase, alphaStep, inkColor) {

  const rgb = hexToRgb(inkColor);

  for (let s = 0; s < steps; s++) {

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length; i++) {

      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];

      p1.x += (p2.x - p1.x) * chaseRate;
      p1.y += (p2.y - p1.y) * chaseRate;

      ctx.lineTo(p1.x, p1.y);

    }

    ctx.closePath();

    const a = alphaBase + s * alphaStep;

    ctx.fillStyle = "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + a + ")";
    ctx.fill();

  }

} // end pursuitFill


/* ============================================================
   clonePoints(points)
============================================================ */
function clonePoints(points) {

  const out = [];

  for (let i = 0; i < points.length; i++) {
    out.push({ x: points[i].x, y: points[i].y });
  }

  return out;

} // end clonePoints


/* ============================================================
   asInt(v)
============================================================ */
function asInt(v) {

  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) throw new Error("asInt: not an int: " + String(v));
  return n;

} // end asInt


/* ============================================================
   hexToRgb(hex)
============================================================ */
function hexToRgb(hex) {

  let h = String(hex).trim();
  if (h.startsWith("#")) h = h.slice(1);

  if (h.length !== 6) throw new Error("hexToRgb: expected #RRGGBB: " + String(hex));

  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);

  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    throw new Error("hexToRgb: bad hex: " + String(hex));
  }

  return { r, g, b };

} // end hexToRgb
