/* ============================================================
   Hamid Naderi Yeganeh — "Boat"
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Provided standalone HTML demo that draws the “Boat” curve-stitch.

   GOAL
   ----
   - Run under Gallery calling runPattern()
   - Use parameterControls.js
   - Match drawRegistry-style lifecycle and naming
   - Make it interactive (controls change the drawing)

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - global ctx exists
   - #action exists
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Boat (Curve-Stitch)",

  params: {
    N: 1200,
    margin: 24,
    stroke: "#0b1a2b",
    lineWidth: 0.7,
    alpha: 1,
    gamma: 1.0,
    fit: "contain"
  },

  controls: {

    N: {
      widget: "range",
      label: "Segments (N)",
      min: 200,
      max: 2000,
      step: 100
    },

    margin: {
      widget: "range",
      label: "Margin",
      min: 0,
      max: 120,
      step: 1
    },

    stroke: {
      widget: "colorPicker",
      label: "Stroke"
    },

    lineWidth: {
      widget: "range",
      label: "Line Width",
      min: 0.1,
      max: 3.0,
      step: 0.1
    },

    alpha: {
      widget: "range",
      label: "Alpha",
      min: 0.05,
      max: 1.0,
      step: 0.05
    },

    gamma: {
      widget: "range",
      label: "Gamma (Y)",
      min: 0.6,
      max: 1.6,
      step: 0.02
    },

    fit: {
      widget: "select",
      label: "Fit",
      options: ["contain", "cover"]
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
   ------------------------------------------------------------
   Gallery entry point.
   NO ctx argument. NO ctx variable declared.
============================================================ */
export function runPattern() {

  buildParameterControls(scriptInfo, "tab-scripts", true);

  init();
  scriptInfo.redrawHandler();

} // end runPattern


/* ============================================================
   init()
   ------------------------------------------------------------
   Cold-start only: establish stable element state.
============================================================ */
function init() {

  scriptInfo.elements.element = {
    // cached endpoints (Float32Array)
    N: 0,
    p1: null,
    p2: null,

    // bbox in model space
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0
  };

} // end init


/* ============================================================
   update(params)
   ------------------------------------------------------------
   Rebuild point arrays only when N changes; always refresh bbox.
============================================================ */
function update(params) {

  const e = scriptInfo.elements.element;

  const N = clampInt(params.N, 10, 2000000);
  if (N !== e.N) {
    buildEndpoints(N, params.gamma, e);
  } else {
    // gamma change requires rebuild even if N unchanged
    // (because y values are gamma-adjusted)
    buildEndpoints(N, params.gamma, e);
  }

} // end update


/* ============================================================
   draw()
============================================================ */
function draw() {

  const e = scriptInfo.elements.element;
  const p = scriptInfo.params;

  const canvas = ctx.canvas;

  // Clear
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background: do NOT paint black; leave transparent/white canvas
  // (If your system clears to white elsewhere, that stays.)
  // If you want explicit white, do it outside this script.

  // Compute scale/transform
  const margin = clampInt(p.margin, 0, 1000000);

  const wData = e.maxX - e.minX;
  const hData = e.maxY - e.minY;

  const wAvail = canvas.width  - 2 * margin;
  const hAvail = canvas.height - 2 * margin;

  const sx = wAvail / wData;
  const sy = hAvail / hData;

  const s = (String(p.fit) === "cover") ? Math.max(sx, sy) : Math.min(sx, sy);

  const cx = (e.minX + e.maxX) / 2;
  const cy = (e.minY + e.maxY) / 2;

  const tx = canvas.width / 2  - s * cx;
  const ty = canvas.height / 2 - s * cy;

  // Stroke setup
  ctx.globalAlpha = clamp01(Number(p.alpha));
  ctx.lineWidth   = Number(p.lineWidth);
  ctx.strokeStyle = String(p.stroke);
  ctx.lineCap     = "round";

  // Draw segments
  const N = e.N;

  ctx.beginPath();

  for (let i = 0; i < 2 * N; i += 2) {

    const ax = tx + s * e.p1[i];
    const ay = ty + s * e.p1[i + 1];

    const bx = tx + s * e.p2[i];
    const by = ty + s * e.p2[i + 1];

    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);

  }

  ctx.stroke();

  ctx.restore();

} // end draw


/* ============================================================
   buildEndpoints(N, gamma, e)
   ------------------------------------------------------------
   Computes normalized endpoints for Boat:
     P1(n) = ( sin(12π n/N)^3 , cos(10π n/N)^3 )
     P2(n) = ( sin( 8π n/N)^3 , cos( 6π n/N)^3 )
============================================================ */
function buildEndpoints(N, gamma, e) {

  const p1 = new Float32Array(2 * N);
  const p2 = new Float32Array(2 * N);

  const pi = Math.PI;

  let minX =  1e9, minY =  1e9, maxX = -1e9, maxY = -1e9;

  for (let n = 1; n <= N; n++) {

    const t = n / N;

    // P1
    const x1 = pow3(Math.sin(12 * pi * t));
    let   y1 = pow3(Math.cos(10 * pi * t));
    y1 = applyGamma(y1, gamma);

    // P2
    const x2 = pow3(Math.sin(8 * pi * t));
    let   y2 = pow3(Math.cos(6 * pi * t));
    y2 = applyGamma(y2, gamma);

    const i = (n - 1) * 2;

    p1[i]     = x1;
    p1[i + 1] = y1;

    p2[i]     = x2;
    p2[i + 1] = y2;

    if (x1 < minX) minX = x1; if (x1 > maxX) maxX = x1;
    if (y1 < minY) minY = y1; if (y1 > maxY) maxY = y1;

    if (x2 < minX) minX = x2; if (x2 > maxX) maxX = x2;
    if (y2 < minY) minY = y2; if (y2 > maxY) maxY = y2;

  }

  e.N = N;
  e.p1 = p1;
  e.p2 = p2;

  e.minX = minX;
  e.minY = minY;
  e.maxX = maxX;
  e.maxY = maxY;

} // end buildEndpoints


/* ============================================================
   applyGamma(y, gamma)
============================================================ */
function applyGamma(y, gamma) {

  const g = Number(gamma);

  if (g === 1) return y;

  const s = (y < 0) ? -1 : 1;
  const a = Math.abs(y);

  return s * Math.pow(a, g);

} // end applyGamma


/* ============================================================
   pow3(x)
============================================================ */
function pow3(x) {
  return x * x * x;
} // end pow3


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


/* ============================================================
   clamp01(v)
============================================================ */
function clamp01(v) {

  if (!Number.isFinite(v)) return 1;

  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;

} // end clamp01
