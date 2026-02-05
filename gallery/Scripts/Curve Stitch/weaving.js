/* ============================================================
   Curve Stitch — Bow-Tie Ellipse Weave
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo:
   - Two rotated ellipses cross-weave + intra-ellipse stitch
   - Removed: DOM UI, DPR resize handling, Save PNG button
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Bow-Tie Ellipse Weave",

  params: {

    width: 520,
    height: 820,

    rotationA: 45,
    rotationB: -45,

    centerX: 0,
    centerY: 0,

    pointsPerEllipse: 220,
    chordOffset: 22,

    bundleOpacity: 0.5,
    lineWidth: 1,

    stringColor: "#6B46C1",
    outlineColor: "#EF4444",
    outlineWidth: 4

  },

  controls: {

    width: {
      widget: "range",
      label: "Width (a*2)",
      min: 100,
      max: 900,
      step: 2
    },

    height: {
      widget: "range",
      label: "Height (b*2)",
      min: 100,
      max: 900,
      step: 2
    },

    rotationA: {
      widget: "range",
      label: "Rotation A (deg)",
      min: -90,
      max: 90,
      step: 1
    },

    rotationB: {
      widget: "range",
      label: "Rotation B (deg)",
      min: -90,
      max: 90,
      step: 1
    },

    centerX: {
      widget: "range",
      label: "Center X",
      min: -200,
      max: 200,
      step: 1
    },

    centerY: {
      widget: "range",
      label: "Center Y",
      min: -200,
      max: 200,
      step: 1
    },

    pointsPerEllipse: {
      widget: "range",
      label: "Points per ellipse",
      min: 40,
      max: 600,
      step: 2
    },

    chordOffset: {
      widget: "range",
      label: "Chord offset (k)",
      min: 1,
      max: 80,
      step: 1
    },

    bundleOpacity: {
      widget: "range",
      label: "Bundles opacity",
      min: 0.05,
      max: 1,
      step: 0.05
    },

    lineWidth: {
      widget: "range",
      label: "Line width",
      min: 0.3,
      max: 3,
      step: 0.1
    },

    stringColor: {
      widget: "colorPicker",
      label: "Strings"
    },

    outlineColor: {
      widget: "colorPicker",
      label: "Outline"
    },

    outlineWidth: {
      widget: "range",
      label: "Outline width",
      min: 1,
      max: 8,
      step: 0.5
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

  init();

  buildParameterControls(scriptInfo, "tab-scripts", true);

  scriptInfo.redrawHandler();

} // end runPattern


/* ============================================================
   init()
   ------------------------------------------------------------
   Cold-start only.
============================================================ */
function init() {

  scriptInfo.elements.element = {
    W: 0,
    H: 0,
    cx: 0,
    cy: 0,
    ptsA: [],
    ptsB: []
  };

} // end init


/* ============================================================
   update(params)
============================================================ */
function update(params) {

  const e = scriptInfo.elements.element;

  e.W = ctx.canvas.width;
  e.H = ctx.canvas.height;

  e.cx = (e.W / 2) + Number(params.centerX);
  e.cy = (e.H / 2) + Number(params.centerY);

  e.ptsA = ellipsePoints(
    Number(params.width),
    Number(params.height),
    e.cx,
    e.cy,
    Number(params.rotationA),
    clampInt(params.pointsPerEllipse, 10, 1000000)
  );

  e.ptsB = ellipsePoints(
    Number(params.width),
    Number(params.height),
    e.cx,
    e.cy,
    Number(params.rotationB),
    clampInt(params.pointsPerEllipse, 10, 1000000)
  );

} // end update


/* ============================================================
   ellipsePoints(w, h, cx, cy, rotDeg, N)
============================================================ */
function ellipsePoints(w, h, cx, cy, rotDeg, N) {

  const a = w / 2;
  const b = h / 2;

  const rot = rotDeg * Math.PI / 180;

  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);

  const pts = new Array(N);

  for (let i = 0; i < N; i++) {

    const t = i * 2 * Math.PI / N;

    const x0 = a * Math.cos(t);
    const y0 = b * Math.sin(t);

    const xr = x0 * cosR - y0 * sinR;
    const yr = x0 * sinR + y0 * cosR;

    pts[i] = [cx + xr, cy + yr];

  }

  return pts;

} // end ellipsePoints


/* ============================================================
   draw()
   ------------------------------------------------------------
   Removes "black background" everywhere:
   - We DO NOT fill a dark background.
   - We only clear the canvas (transparent / whatever the app uses).
============================================================ */
function draw() {

  const e = scriptInfo.elements.element;
  const p = scriptInfo.params;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, e.W, e.H);

  const A = e.ptsA;
  const B = e.ptsB;

  if (!A.length) throw new Error("draw: ptsA empty");
  if (!B.length) throw new Error("draw: ptsB empty");

  const N = A.length;

  const k = clampInt(p.chordOffset, 0, N - 1);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Bundle 1: A -> B with +k
  ctx.globalAlpha = Number(p.bundleOpacity);
  ctx.strokeStyle = p.stringColor;
  ctx.lineWidth = Number(p.lineWidth);

  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const j = (i + k) % N;
    ctx.moveTo(A[i][0], A[i][1]);
    ctx.lineTo(B[j][0], B[j][1]);
  }
  ctx.stroke();

  // Bundle 2: A -> B with -k
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const j = (i - k + N) % N;
    ctx.moveTo(A[i][0], A[i][1]);
    ctx.lineTo(B[j][0], B[j][1]);
  }
  ctx.stroke();

  // Intra-ellipse stitching (A and B)
  stitchOffset(A, k, p.stringColor, Number(p.lineWidth), Number(p.bundleOpacity) * 0.8);
  stitchOffset(B, k, p.stringColor, Number(p.lineWidth), Number(p.bundleOpacity) * 0.8);

  ctx.globalAlpha = 1;

  // Outline on top
  drawEllipseOutline(
    Number(p.width),
    Number(p.height),
    e.cx,
    e.cy,
    Number(p.rotationA),
    p.outlineColor,
    Number(p.outlineWidth)
  );

} // end draw


/* ============================================================
   stitchOffset(pts, k, color, lw, alpha)
============================================================ */
function stitchOffset(pts, k, color, lw, alpha) {

  const N = pts.length;

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;

  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const j = (i + k) % N;
    ctx.moveTo(pts[i][0], pts[i][1]);
    ctx.lineTo(pts[j][0], pts[j][1]);
  }
  ctx.stroke();

  ctx.globalAlpha = 1;

} // end stitchOffset


/* ============================================================
   drawEllipseOutline(w, h, cx, cy, rotDeg, color, lw)
============================================================ */
function drawEllipseOutline(w, h, cx, cy, rotDeg, color, lw) {

  const a = w / 2;
  const b = h / 2;

  const rot = rotDeg * Math.PI / 180;

  ctx.save();

  ctx.translate(cx, cy);
  ctx.rotate(rot);

  ctx.beginPath();

  // Deterministic path: parametric ellipse (no feature branching)
  const N = 512;

  for (let i = 0; i <= N; i++) {

    const t = i * 2 * Math.PI / N;

    const x = a * Math.cos(t);
    const y = b * Math.sin(t);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

  }

  ctx.lineWidth = lw;
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.restore();

} // end drawEllipseOutline


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
