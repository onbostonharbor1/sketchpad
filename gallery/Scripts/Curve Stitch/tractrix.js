/* ============================================================
   Tractrix — REM-style Iterative Construction
   Gallery Script (ParameterControls-integrated)

   UPDATE (SHIFT)
   --------------
   Added params:
     - offsetX
     - offsetY

   These shift ALL drawing output (guides, tethers, curve)
   so you can move the whole figure down (or anywhere)
   without changing the underlying geometry math.

   ============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Tractrix (REM Construction) — Step Length",

  params: {

    /* Geometry (pixel space) */
    x: 600,
    y: 460,
    c: 50,

    /* Control like the listing: length of step */
    stepLen: 10,

    /* Safety + explicit cap (keeps it deterministic and interactive) */
    maxSteps: 1200,

    /* NEW: global shift for the whole figure */
    offsetX: 0,
    offsetY: 180,

    /* Display */
    showTethers: true,
    showCurve: true,
    tetherWidth: 1,
    curveWidth: 2,
    tetherColor: "#000000",
    curveColor: "#000000",

    showGuides: true,
    guideWidth: 1,
    guideColor: "#cc0000"

  },

  /* Alias required by your runner conventions. */
  parameters: null,

  /* Controls (object-keyed; no invented 'key' field). */
  controls: {

    x: {
      label: "X",
      widget: "range",
      min: 100,
      max: 2000,
      step: 1
    },

    y: {
      label: "Y",
      widget: "range",
      min: 50,
      max: 2000,
      step: 1
    },

    c: {
      label: "C",
      widget: "range",
      min: 0,
      max: 400,
      step: 1
    },

    stepLen: {
      label: "Step length",
      widget: "range",
      min: 1,
      max: 87,
      step: 1
    },

    maxSteps: {
      label: "Max steps",
      widget: "range",
      min: 50,
      max: 3000,
      step: 10
    },

    offsetX: {
      label: "Offset X",
      widget: "range",
      min: -1200,
      max: 1200,
      step: 1
    },

    offsetY: {
      label: "Offset Y",
      widget: "range",
      min: -1200,
      max: 1200,
      step: 1
    },

    showTethers: {
      label: "Show tethers",
      widget: "checkbox"
    },

    showCurve: {
      label: "Show curve",
      widget: "checkbox"
    },

    tetherWidth: {
      label: "Tether width",
      widget: "range",
      min: 1,
      max: 8,
      step: 1
    },

    tetherColor: {
      label: "Tether color",
      widget: "color"
    },

    curveWidth: {
      label: "Curve width",
      widget: "range",
      min: 1,
      max: 8,
      step: 1
    },

    curveColor: {
      label: "Curve color",
      widget: "color"
    },

    showGuides: {
      label: "Show guides",
      widget: "checkbox"
    },

    guideWidth: {
      label: "Guide width",
      widget: "range",
      min: 1,
      max: 8,
      step: 1
    },

    guideColor: {
      label: "Guide color",
      widget: "color"
    }

  },

  onParamChange() {
    /* Intentionally empty. */
  }, // end onParamChange

  redrawHandler: null

}; // end scriptInfo


/* ============================================================
   Core math (REM listing)
============================================================ */
function computeTractrixData(p) {

  const X = p.x;
  const Y = p.y;
  const C = p.c;

  const K = X - C;
  if (K <= 0) {
    throw new Error("Tractrix: invalid geometry: X - C must be > 0");
  }

  const L = p.stepLen;
  if (L <= 0) {
    throw new Error("Tractrix: stepLen must be > 0");
  }

  const maxByGeometry = Math.floor((2 * K) / L) + 2;
  const steps = Math.min(maxByGeometry, p.maxSteps);

  let A = 0;
  let D = Y;

  const tethers = [];
  const curvePts = [];

  for (let n = 0; n < steps; n++) {

    const inside = (2 * K * A) - (A * A);

    if (inside < 0) {
      break;
    }

    const H = Math.sqrt(inside);

    const x1 = A + C;
    const y1 = D;
    const x2 = X;
    const y2 = D - H;

    tethers.push({ x1: x1, y1: y1, x2: x2, y2: y2 });
    curvePts.push({ x: x1, y: y1 });

    A = A + L * (K - A) / K;
    D = D - L * H / K;

  }

  return {
    K: K,
    tethers: tethers,
    curvePts: curvePts
  };

} // end computeTractrixData


/* ============================================================
   Drawing helpers
============================================================ */
function clearCanvas() {

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

} // end clearCanvas


function applyGlobalOffset(p) {

  ctx.translate(p.offsetX, p.offsetY);

} // end applyGlobalOffset


function drawGuides(p) {

  if (!p.showGuides) return;

  ctx.save();
  ctx.lineWidth = p.guideWidth;
  ctx.strokeStyle = p.guideColor;

  ctx.beginPath();
  ctx.moveTo(0, p.y);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(p.x, 0);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = p.guideColor;
  ctx.fill();

  ctx.restore();

} // end drawGuides


function drawTethers(tethers, p) {

  if (!p.showTethers) return;

  ctx.save();
  ctx.lineWidth = p.tetherWidth;
  ctx.strokeStyle = p.tetherColor;

  for (let i = 0; i < tethers.length; i++) {

    const L = tethers[i];

    ctx.beginPath();
    ctx.moveTo(L.x1, L.y1);
    ctx.lineTo(L.x2, L.y2);
    ctx.stroke();

  }

  ctx.restore();

} // end drawTethers


function drawCurve(curvePts, p) {

  if (!p.showCurve) return;
  if (curvePts.length < 2) return;

  ctx.save();
  ctx.lineWidth = p.curveWidth;
  ctx.strokeStyle = p.curveColor;

  ctx.beginPath();
  ctx.moveTo(curvePts[0].x, curvePts[0].y);

  for (let i = 1; i < curvePts.length; i++) {
    ctx.lineTo(curvePts[i].x, curvePts[i].y);
  }

  ctx.stroke();
  ctx.restore();

} // end drawCurve


/* ============================================================
   Lifecycle (drawRegistry-style)
============================================================ */
function init(p) {
  /* No persistent elements required. */
} // end init


function update(p) {
  /* No persistent elements required. */
} // end update


function draw(p) {

  clearCanvas();

  ctx.save();
  applyGlobalOffset(p);

  drawGuides(p);

  const data = computeTractrixData(p);

  drawTethers(data.tethers, p);
  drawCurve(data.curvePts, p);

  ctx.restore();

} // end draw


/* ============================================================
   runPattern (Gallery script entry point)
============================================================ */
export function runPattern() {

  scriptInfo.parameters = scriptInfo.params;

  buildParameterControls(scriptInfo, "tab-scripts", true);

  scriptInfo.redrawHandler = function () {

    update(scriptInfo.params);
    draw(scriptInfo.params);

  }; // end redrawHandler

  init(scriptInfo.params);
  scriptInfo.redrawHandler();

} // end runPattern
