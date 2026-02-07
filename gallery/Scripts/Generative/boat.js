/* ============================================================
   Hamid Naderi Yeganeh — "Boat" (Curve Stitch)
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo provided by user.

   EQUATIONS (n = 1..N):
     P1(n) = ( sin(12π n/N)^3 , cos(10π n/N)^3 )
     P2(n) = ( sin( 8π n/N)^3 , cos( 6π n/N)^3 )

   NOTES
   -----
   - This script assumes global ctx exists (Sketchpad getter).
   - No local ctx variable is declared (per project rule).
   ============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: 'Boat (Curve Stitch) — Hamid Naderi Yeganeh',

  params: {
    N: 2000,
    margin: 24,
    fit: "contain",          // "contain" | "cover"

    background: "#ffffff",   // set to "" for none
    stroke: "#0b1a2b",
    lineWidth: 0.7,
    alpha: 1.0,

    gamma: 1.0               // 0.9..1.2 typical; 1.0 = none
  },

  controls: {
    N: {
      widget: "range",
      label: "Segments (N)",
      min: 200,
      max: 12000,
      step: 50
    },

    margin: {
      widget: "range",
      label: "Margin (px)",
      min: 0,
      max: 200,
      step: 1
    },

    fit: {
      widget: "select",
      label: "Fit",
      options: ["contain", "cover"]
    },

    background: {
      widget: "colorPicker",
      label: "Background"
    },

    stroke: {
      widget: "colorPicker",
      label: "Stroke"
    },

    lineWidth: {
      widget: "range",
      label: "Line Width",
      min: 0.1,
      max: 5.0,
      step: 0.05
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
      min: 0.5,
      max: 2.0,
      step: 0.02
    }
  },

  elements: null
};

scriptInfo.parameters = scriptInfo.params;

/* ============================================================
   lifecycle
============================================================ */
function init() {

  scriptInfo.elements = {
    element: {
      p1: null,
      p2: null,
      N: 0
    }
  };

} // end init

function update(p) {

  const N = (p.N | 0);

  if (N <= 0) {
    throw new Error("Boat: N must be positive.");
  }

  const p1 = new Float32Array(2 * N);
  const p2 = new Float32Array(2 * N);

  const pi = Math.PI;
  const sin = Math.sin;
  const cos = Math.cos;

  for (let n = 1; n <= N; n++) {

    const t = n / N;

    const s12 = sin(12 * pi * t);
    const c10 = cos(10 * pi * t);
    const s8  = sin( 8 * pi * t);
    const c6  = cos( 6 * pi * t);

    const x1 = s12 * s12 * s12;
    let   y1 = c10 * c10 * c10;

    const x2 = s8  * s8  * s8;
    let   y2 = c6  * c6  * c6;

    if (p.gamma !== 1.0) {
      y1 = (y1 < 0) ? -Math.pow(-y1, p.gamma) : Math.pow(y1, p.gamma);
      y2 = (y2 < 0) ? -Math.pow(-y2, p.gamma) : Math.pow(y2, p.gamma);
    }

    const i = (n - 1) * 2;
    p1[i] = x1;  p1[i + 1] = y1;
    p2[i] = x2;  p2[i + 1] = y2;

  }

  scriptInfo.elements.element.p1 = p1;
  scriptInfo.elements.element.p2 = p2;
  scriptInfo.elements.element.N  = N;

} // end update

function draw() {

  const p = scriptInfo.params;

  const canvas = ctx.canvas;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (p.background) {
    ctx.fillStyle = p.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const el = scriptInfo.elements.element;
  const N  = el.N;
  const p1 = el.p1;
  const p2 = el.p2;

  if (!p1 || !p2 || N <= 0) {
    throw new Error("Boat: elements not initialized. init/update must run before draw.");
  }

  let minX =  1e9;
  let minY =  1e9;
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

  }

  const wData = maxX - minX;
  const hData = maxY - minY;

  const wAvail = canvas.width  - 2 * p.margin;
  const hAvail = canvas.height - 2 * p.margin;

  if (wAvail <= 0 || hAvail <= 0) {
    throw new Error("Boat: margin too large for canvas.");
  }

  const sx = wAvail / wData;
  const sy = hAvail / hData;

  const s = (p.fit === "cover") ? Math.max(sx, sy) : Math.min(sx, sy);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const tx = canvas.width  / 2 - s * cx;
  const ty = canvas.height / 2 - s * cy;

  ctx.globalAlpha = p.alpha;
  ctx.lineWidth = p.lineWidth;
  ctx.strokeStyle = p.stroke;
  ctx.lineCap = "round";

  const path = (typeof Path2D !== "undefined") ? new Path2D() : null;

  if (path) {

    for (let i = 0; i < 2 * N; i += 2) {
      const ax = tx + s * p1[i];
      const ay = ty + s * p1[i + 1];
      const bx = tx + s * p2[i];
      const by = ty + s * p2[i + 1];
      path.moveTo(ax, ay);
      path.lineTo(bx, by);
    }

    ctx.stroke(path);

  } else {

    ctx.beginPath();

    for (let i = 0; i < 2 * N; i += 2) {
      const ax = tx + s * p1[i];
      const ay = ty + s * p1[i + 1];
      const bx = tx + s * p2[i];
      const by = ty + s * p2[i + 1];
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }

    ctx.stroke();

  }

  ctx.restore();

} // end draw

/* ============================================================
   compatibility hooks
============================================================ */
scriptInfo.redrawHandler = function redrawHandler() {
  update(scriptInfo.params);
  draw();
}; // end redrawHandler

scriptInfo.onParamChange = function onParamChange() {
  // no-op (compatibility)
}; // end onParamChange

/* ============================================================
   runPattern (Gallery entry point)
============================================================ */
export function runPattern() {

  init();

  buildParameterControls(scriptInfo, "tab-scripts", true);

  scriptInfo.redrawHandler();

} // end runPattern
