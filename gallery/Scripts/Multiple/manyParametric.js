/* ============================================================
   Nicholson — Curve Stitching Density Plots (Figs 5–8)
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo:
   - Basic chord algorithm (N segments)
   - Density plot sampler (S samples)
   - Preset selector for Figures 5–8 panels

   GOAL
   ----
   - Run under Gallery calling runPattern()
   - Use parameterControls.js
   - Match drawRegistry-style lifecycle and naming
   - NEVER show a black background (always paint a light backing)

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

  title: "Nicholson — Curve Stitching Density Plots (Figs 5–8)",

  params: {

    preset: "5a",

    // Density plots only
    samples: 100,

    // Basic alg only
    N: 150,

    // Mapping multiplier
    k: 0.75,

    // Display
    showGuide: false,
    invert: false,

    // Basic draw style
    lineWidth: 0.7,

    // Background (always painted)
    backgroundColor: "#f8f8f8",

    // Ink colors
    inkColor: "#111111",
    guideColor: "rgba(0,0,0,0.15)"
  },

  controls: {

    preset: {
      widget: "select",
      label: "Figure / Panel",
      options: [
        { value: "5a", label: "5a — basic alg (circle)" },
        { value: "5b", label: "5b — density plot (circle)" },
        { value: "5c", label: "5c — basic alg (circle)" },
        { value: "5d", label: "5d — density plot (circle)" },

        { value: "6a", label: "6a — Hypocycloid (density)" },
        { value: "6b", label: "6b — Lemniscate (density)" },
        { value: "6c", label: "6c — Rose curve (density)" },

        { value: "7a", label: "7a — One circle (density)" },
        { value: "7b", label: "7b — Two circles: radii (density)" },
        { value: "7c", label: "7c — Two circles: centers (density)" },
        { value: "7d", label: "7d — Two circles: both (density)" },

        { value: "8a", label: "8a — Rose + Circle (density)" },
        { value: "8b", label: "8b — Square + Lemniscate (density)" },
        { value: "8c", label: "8c — Hypocycloid + Circle (density)" }
      ]
    },

    samples: {
      widget: "range",
      label: "Samples S (density)",
      min: 100,
      max: 100000,
      step: 1000
    },

    N: {
      widget: "range",
      label: "N (basic)",
      min: 20,
      max: 400,
      step: 1
    },

    k: {
      widget: "range",
      label: "k (mapping multiplier)",
      min: 0.1,
      max: 30,
      step: 0.05
    },

    lineWidth: {
      widget: "range",
      label: "Line Width (basic)",
      min: 0.2,
      max: 3.0,
      step: 0.1
    },

    showGuide: {
      widget: "checkbox",
      label: "Show axes"
    },

    invert: {
      widget: "checkbox",
      label: "Invert palette"
    },

    backgroundColor: {
      widget: "colorPicker",
      label: "Background"
    },

    inkColor: {
      widget: "colorPicker",
      label: "Ink"
    }

  },

  elements: {
    element: null
  }

}; // end scriptInfo


// Compatibility aliases (per your Gallery conversion rules)
scriptInfo.parameters = scriptInfo.params;

scriptInfo.redrawHandler = function redrawHandler() {
  updateNicholson(scriptInfo.params);
  drawNicholson();
}; // end redrawHandler

scriptInfo.onParamChange = function onParamChange() {
  // Compatibility no-op
}; // end onParamChange


/* ============================================================
   runPattern()
============================================================ */
export function runPattern() {

  buildParameterControls(scriptInfo, "tab-scripts", true);

  initNicholson();
  scriptInfo.redrawHandler();

} // end runPattern


/* ============================================================
   initNicholson()
============================================================ */
function initNicholson() {

  scriptInfo.elements.element = {
    W: 0,
    H: 0
  };

} // end initNicholson


/* ============================================================
   updateNicholson(params)
============================================================ */
function updateNicholson(params) {

  scriptInfo.elements.element.W = ctx.canvas.width;
  scriptInfo.elements.element.H = ctx.canvas.height;

} // end updateNicholson


/* ============================================================
   drawNicholson()
============================================================ */
function drawNicholson() {

  const e = scriptInfo.elements.element;
  const p = scriptInfo.params;

  // ----------------------------------------------------------
  // ABSOLUTE RESET + CLEAR
  // ----------------------------------------------------------
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, e.W, e.H);

  // ----------------------------------------------------------
  // ALWAYS PAINT A LIGHT BACKGROUND
  // This prevents ANY underlying black UI/CSS from showing.
  // ----------------------------------------------------------
  ctx.fillStyle = p.backgroundColor;
  ctx.fillRect(0, 0, e.W, e.H);

  // ----------------------------------------------------------
  // Optional axes (in canvas pixel space)
  // ----------------------------------------------------------
  if (p.showGuide) {
    drawAxes(e.W, e.H, p.guideColor);
  }

  // ----------------------------------------------------------
  // Render preset
  // ----------------------------------------------------------
  const preset = p.preset;

  if (preset === "5a") {
    renderBasicCircle(p.N, p.k, p.lineWidth, p.inkColor);
    return;
  }

  if (preset === "5b") {
    renderDensitySingleCurve(circle(420), p.k, p.samples, p.invert);
    return;
  }

  if (preset === "5c") {
    renderBasicCircle(p.N, p.k, p.lineWidth, p.inkColor);
    return;
  }

  if (preset === "5d") {
    renderDensitySingleCurve(circle(420), p.k, p.samples, p.invert);
    return;
  }

  if (preset === "6a") {
    renderDensitySingleCurve(hypocycloid(440, 110), 0.75, p.samples, p.invert);
    return;
  }

  if (preset === "6b") {
    renderDensitySingleCurve(lemniscate(480), 0.75, p.samples, p.invert);
    return;
  }

  if (preset === "6c") {
    renderDensitySingleCurve(rose(420, 5, 7), 0.75, p.samples, p.invert);
    return;
  }

  if (preset === "7a") {
    renderDensitySingleCurve(circle(420), 17 / 13, p.samples, p.invert);
    return;
  }

  if (preset === "7b") {
    renderDensityTwoCurves(circle(420), circle(380), 17 / 13, p.samples, p.invert);
    return;
  }

  if (preset === "7c") {
    renderDensityTwoCurves(
      offsetCurve(circle(420), 60, 0),
      circle(420),
      17 / 13,
      p.samples,
      p.invert
    );
    return;
  }

  if (preset === "7d") {
    renderDensityTwoCurves(
      offsetCurve(circle(420), 60, 0),
      circle(380),
      17 / 13,
      p.samples,
      p.invert
    );
    return;
  }

  if (preset === "8a") {
    renderDensityTwoCurves(rose(420, 5, 7), circle(420), 0.75, p.samples, p.invert);
    return;
  }

  if (preset === "8b") {
    renderDensityTwoCurves(squarePath(600), lemniscate(420), 0.75, p.samples, p.invert);
    return;
  }

  if (preset === "8c") {
    renderDensityTwoCurves(hypocycloid(440, 110), circle(420), 0.75, p.samples, p.invert);
    return;
  }

  throw new Error("Nicholson script: unknown preset '" + String(preset) + "'");

} // end drawNicholson


/* ============================================================
   drawAxes(W, H, strokeStyle)
============================================================ */
function drawAxes(W, H, strokeStyle) {

  ctx.save();

  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);

  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);

  ctx.stroke();

  ctx.restore();

} // end drawAxes


/* ============================================================
   Renderers
============================================================ */
function renderBasicCircle(N, k, lineWidth, inkColor) {

  const g = circle(410);

  const segs = basicSegments(g, N, k);

  const cx = ctx.canvas.width / 2;
  const cy = ctx.canvas.height / 2;

  ctx.save();

  ctx.translate(cx, cy);

  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = inkColor;

  for (let i = 0; i < segs.length; i++) {
    const a = segs[i][0];
    const b = segs[i][1];

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  ctx.restore();

} // end renderBasicCircle


function renderDensitySingleCurve(curve, k, S, invert) {

  const img = densityPlot({
    gA: curve,
    gB: null,
    k: k,
    S: S,
    W: ctx.canvas.width,
    H: ctx.canvas.height,
    invert: invert
  });

  // putImageData ignores transforms; we are already in identity transform.
  ctx.putImageData(img, 0, 0);

} // end renderDensitySingleCurve


function renderDensityTwoCurves(curveA, curveB, k, S, invert) {

  const img = densityPlot({
    gA: curveA,
    gB: curveB,
    k: k,
    S: S,
    W: ctx.canvas.width,
    H: ctx.canvas.height,
    invert: invert
  });

  ctx.putImageData(img, 0, 0);

} // end renderDensityTwoCurves


/* ============================================================
   Algorithms
============================================================ */
function basicSegments(g, N, k) {

  const TAU = Math.PI * 2;

  const segs = [];

  for (let i = 0; i < N; i++) {

    const th = TAU * i / N;

    // Match original: thp = (k*i)*(TAU/N)
    const thp = (k * i) * (TAU / N);

    const a = g(th);
    const b = g(thp);

    segs.push([a, b]);
  }

  return segs;

} // end basicSegments


function densityPlot(opts) {

  const gA = opts.gA;
  const gB = opts.gB;
  const k = opts.k;
  const S = opts.S;
  const W = opts.W;
  const H = opts.H;
  const invert = opts.invert;

  const TAU = Math.PI * 2;

  const M = new Uint32Array(W * H);

  function put(x, y) {

    const ix = Math.floor(x + W / 2);
    const iy = Math.floor(y + H / 2);

    if (ix >= 0 && ix < W && iy >= 0 && iy < H) {
      M[ix + iy * W]++;
    }

  } // end put

  for (let s = 0; s < S; s++) {

    const th = Math.random() * TAU;

    const a = gA(th);

    const th2 = (k * th) % TAU;

    const b = (gB ? gB : gA)(th2);

    const t = Math.random();

    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;

    put(x, y);
  }

  let max = 0;
  for (let i = 0; i < M.length; i++) {
    if (M[i] > max) max = M[i];
  }

  const img = ctx.createImageData(W, H);

  for (let i = 0; i < M.length; i++) {

    const n = M[i] / max;

    const v = Math.pow(n, invert ? 0.6 : 1.6);

    const c = Math.floor(255 * (invert ? (1 - v) : v));

    const j = i * 4;

    img.data[j] = c;
    img.data[j + 1] = c;
    img.data[j + 2] = c;
    img.data[j + 3] = 255;
  }

  return img;

} // end densityPlot


/* ============================================================
   Curves g(θ)
============================================================ */
function circle(R) {

  return function circleCurve(t) {
    return { x: R * Math.cos(t), y: R * Math.sin(t) };
  }; // end circleCurve

} // end circle


function rose(R, m, n) {

  const k = m / n;

  return function roseCurve(t) {

    const r = R * Math.cos(k * t);

    return { x: r * Math.cos(t), y: r * Math.sin(t) };

  }; // end roseCurve

} // end rose


function lemniscate(a) {

  return function lemniscateCurve(t) {

    const r2 = a * a * Math.cos(2 * t);

    const r = (r2 > 0) ? Math.sqrt(r2) : 0;

    return { x: r * Math.cos(t), y: r * Math.sin(t) };

  }; // end lemniscateCurve

} // end lemniscate


function hypocycloid(R, r) {

  return function hypocycloidCurve(t) {

    return {
      x: (R - r) * Math.cos(t) + r * Math.cos(((R - r) / r) * t),
      y: (R - r) * Math.sin(t) - r * Math.sin(((R - r) / r) * t)
    };

  }; // end hypocycloidCurve

} // end hypocycloid


function squarePath(S) {

  const TAU = Math.PI * 2;

  return function squareCurve(t) {

    const a = ((t % TAU) + TAU) % TAU;

    const u = (a / TAU) * 4;

    const i = Math.floor(u);

    const f = u - i;

    const h = S / 2;

    if (i === 0) return { x: h, y: lerp(0, h, f) };
    if (i === 1) return { x: lerp(h, -h, f), y: h };
    if (i === 2) return { x: -h, y: lerp(h, -h, f) };

    return { x: lerp(-h, h, f), y: -h };

  }; // end squareCurve

} // end squarePath


function offsetCurve(curveFn, dx, dy) {

  return function offsetCurveFn(t) {

    const c = curveFn(t);

    return { x: c.x + dx, y: c.y + dy };

  }; // end offsetCurveFn

} // end offsetCurve


/* ============================================================
   lerp(a, b, t)
============================================================ */
function lerp(a, b, t) {
  return a + (b - a) * t;
} // end lerp
