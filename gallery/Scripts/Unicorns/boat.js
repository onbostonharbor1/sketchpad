/* ============================================================
   Hamid Naderi Yeganeh — "Boat" (Curve-Stitch)
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo that draws the "Boat" using:
     P1(n) = ( sin(12π n/N)^3 , cos(10π n/N)^3 )
     P2(n) = ( sin( 8π n/N)^3 , cos( 6π n/N)^3 )

   CONVERSION RULES APPLIED
   -----------------------
   - Use global ctx directly (no window.ctx, no ctx variable)
   - drawRegistry-style lifecycle: init / update / draw
   - elements.element holds computed geometry for draw()
   - Uses buildParameterControls(scriptInfo, "tab-scripts", true)
   - scriptInfo.parameters alias provided
   - scriptInfo.redrawHandler calls update(params) + draw()
   - scriptInfo.onParamChange is a no-op compatibility hook

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - ctx exists globally (provided by Sketchpad getter)
   - buildParameterControls exists at /ui/parameterControls.js
   - #action exists
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */

export const scriptInfo = {

  title: 'Hamid Naderi Yeganeh — "Boat" (Curve-Stitch)',

  params: {
    N: 2000,
    margin: 24,

    fit: "contain",      // "contain" | "cover"

    bg: "#ffffff",
    stroke: "#0b1a2b",
    lineWidth: 0.7,
    alpha: 1.0,

    gamma: 1.0           // 0.9..1.2 to taste
  },

  controls: {
    N: {
      label: "N (Segments)",
      widget: "range",
      min: 200,
      max: 12000,
      step: 50
    },
    margin: {
      label: "Margin",
      widget: "range",
      min: 0,
      max: 200,
      step: 1
    },

    gamma: {
      label: "Gamma (Y)",
      widget: "range",
      min: 0.5,
      max: 2.0,
      step: 0.01
    },

    lineWidth: {
      label: "Line Width",
      widget: "range",
      min: 0.1,
      max: 5.0,
      step: 0.05
    },
    alpha: {
      label: "Alpha",
      widget: "range",
      min: 0,
      max: 1,
      step: 0.01
    },

    // NOTE: leaving bg/stroke as text strings, since your control system
    // may or may not have a color widget. If you do, change widget as needed.
    bg: {
      label: "Background (CSS)",
      widget: "text"
    },
    stroke: {
      label: "Stroke (CSS)",
      widget: "text"
    },

    fit: {
      label: "Fit",
      widget: "select",
      options: ["contain", "cover"]
    }
  },

  background: null,
  overlays: [],
  transforms: [],

  elements: null,

  // Compatibility aliases filled in runPattern()
  parameters: null,
  redrawHandler: null,
  onParamChange: null
};

/* ============================================================
   Helpers
============================================================ */

function pow3(x) {
  return x * x * x;
} // end pow3

function applyGamma(y, gamma) {

  if (gamma === 1) return y;

  if (y === 0) return 0;

  if (y < 0) return -Math.pow(-y, gamma);

  return Math.pow(y, gamma);

} // end applyGamma

function computeBoatData(params) {

  const N = params.N | 0;

  const p1 = new Float32Array(2 * N);
  const p2 = new Float32Array(2 * N);

  const pi = Math.PI;

  for (let n = 1; n <= N; n++) {

    const t = n / N;

    // P1(n)
    const x1 = pow3(Math.sin(12 * pi * t));
    const y1 = applyGamma(pow3(Math.cos(10 * pi * t)), params.gamma);

    // P2(n)
    const x2 = pow3(Math.sin(8 * pi * t));
    const y2 = applyGamma(pow3(Math.cos(6 * pi * t)), params.gamma);

    const i = (n - 1) * 2;

    p1[i] = x1;
    p1[i + 1] = y1;

    p2[i] = x2;
    p2[i + 1] = y2;

  } // end for n

  // bounding box (gamma can stretch)
  let minX = 1e9;
  let minY = 1e9;
  let maxX = -1e9;
  let maxY = -1e9;

  for (let i = 0; i < 2 * N; i += 2) {

    const xA = p1[i];
    const yA = p1[i + 1];
    const xB = p2[i];
    const yB = p2[i + 1];

    if (xA < minX) minX = xA;
    if (xA > maxX) maxX = xA;
    if (yA < minY) minY = yA;
    if (yA > maxY) maxY = yA;

    if (xB < minX) minX = xB;
    if (xB > maxX) maxX = xB;
    if (yB < minY) minY = yB;
    if (yB > maxY) maxY = yB;

  } // end for i

  return {
    p1: p1,
    p2: p2,
    minX: minX,
    minY: minY,
    maxX: maxX,
    maxY: maxY
  };

} // end computeBoatData

function computeTransform(bounds, params) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const wData = bounds.maxX - bounds.minX;
  const hData = bounds.maxY - bounds.minY;

  const wAvail = w - 2 * params.margin;
  const hAvail = h - 2 * params.margin;

  const sx = wAvail / wData;
  const sy = hAvail / hData;

  const s = (params.fit === "cover") ? Math.max(sx, sy) : Math.min(sx, sy);

  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;

  const tx = (w / 2) - (s * cx);
  const ty = (h / 2) - (s * cy);

  return { s: s, tx: tx, ty: ty };

} // end computeTransform

function buildPathData(p1, p2, N, xform) {

  const segs = new Float32Array(4 * N);

  const s = xform.s;
  const tx = xform.tx;
  const ty = xform.ty;

  let k = 0;

  for (let i = 0; i < 2 * N; i += 2) {

    segs[k++] = tx + s * p1[i];
    segs[k++] = ty + s * p1[i + 1];

    segs[k++] = tx + s * p2[i];
    segs[k++] = ty + s * p2[i + 1];

  } // end for i

  return segs;

} // end buildPathData

function strokeSegments(segs) {

  ctx.beginPath();

  for (let i = 0; i < segs.length; i += 4) {
    ctx.moveTo(segs[i], segs[i + 1]);
    ctx.lineTo(segs[i + 2], segs[i + 3]);
  } // end for i

  ctx.stroke();

} // end strokeSegments

/* ============================================================
   Lifecycle
============================================================ */

function init() {

  scriptInfo.elements = {
    element: {
      segs: null
    }
  };

} // end init

function update(params) {

  const N = params.N | 0;

  const data = computeBoatData(params);

  const xform = computeTransform(
    { minX: data.minX, minY: data.minY, maxX: data.maxX, maxY: data.maxY },
    params
  );

  const segs = buildPathData(data.p1, data.p2, N, xform);

  scriptInfo.elements.element.segs = segs;

} // end update

function draw() {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  // background
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.clearRect(0, 0, w, h);

  if (scriptInfo.params.bg) {
    ctx.fillStyle = scriptInfo.params.bg;
    ctx.fillRect(0, 0, w, h);
  }

  // style
  ctx.globalAlpha = scriptInfo.params.alpha;
  ctx.lineWidth = scriptInfo.params.lineWidth;
  ctx.strokeStyle = scriptInfo.params.stroke;
  ctx.lineCap = "round";

  // draw
  strokeSegments(scriptInfo.elements.element.segs);

  ctx.restore();

} // end draw

/* ============================================================
   runPattern (Gallery entry point)
============================================================ */

export function runPattern() {

  scriptInfo.parameters = scriptInfo.params;

  scriptInfo.onParamChange = function () {
    // no-op compatibility hook
  }; // end onParamChange

  scriptInfo.redrawHandler = function () {
    update(scriptInfo.params);
    draw();
  }; // end redrawHandler

  init();

  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();

} // end runPattern
