/* ============================================================
   Pursuit Curves (N-gon)
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo:
   - N points pursue the next point, leaving a trail.

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - window.ctx exists
   - #action exists
   ============================================================ */
/**
 * John Sharp’s pursuit curves with a triangle.
 * Each vertex chases the next, leaving a trail.
 */

import { printTitle } from "/draw/draw_utilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";

let ctx = null;


/* ------------------------------------------------------------
   clearCanvasFull()
------------------------------------------------------------ */
function clearCanvasFull() {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.restore();

} // end clearCanvasFull


/* ------------------------------------------------------------
   drawPursuit(thing)
------------------------------------------------------------ */
function drawPursuit(thing) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const cx = w / 2;
  const cy = h / 2;
  const r  = Math.min(w, h) * 0.35;

  // build initial polygon
  let points = [];
  for (let i = 0; i < thing.numPoints; i++) {
    const a = (2 * Math.PI * i) / thing.numPoints - Math.PI / 2;
    points.push({
      x: cx + r * Math.cos(a),
      y: cy + r * Math.sin(a)
    });
  }

  clearCanvasFull();

  ctx.lineWidth   = thing.lineWidth;
  ctx.strokeStyle = `rgba(0,0,255,${thing.trailAlpha})`;

  for (let s = 0; s < thing.steps; s++) {

    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();

    points = points.map((p, i) => {
      const t = points[(i + 1) % points.length];
      return {
        x: p.x + (t.x - p.x) * thing.stepSize,
        y: p.y + (t.y - p.y) * thing.stepSize
      };
    });
  }

} // end drawPursuit


/* ------------------------------------------------------------
   init()
------------------------------------------------------------ */
function init() {

  const p = scriptInfo.params;

  scriptInfo.elements = {
    element: {
      numPoints:  p.numPoints,
      stepSize:   p.stepSize,
      steps:      p.steps,
      trailAlpha: p.trailAlpha,
      lineWidth:  p.lineWidth
    }
  };

} // end init


/* ------------------------------------------------------------
   update(params)
------------------------------------------------------------ */
function update(params) {

  const e = scriptInfo.elements.element;

  e.numPoints  = parseInt(params.numPoints, 10);
  e.stepSize   = parseFloat(params.stepSize);
  e.steps      = parseInt(params.steps, 10);
  e.trailAlpha = parseFloat(params.trailAlpha);
  e.lineWidth  = parseFloat(params.lineWidth);

  if (e.numPoints < 3) e.numPoints = 3;
  if (e.steps < 1) e.steps = 1;
  if (e.stepSize < 0) e.stepSize = 0;

} // end update


/* ------------------------------------------------------------
   draw()
------------------------------------------------------------ */
function draw() {
  drawPursuit(scriptInfo.elements.element);
} // end draw


/* ------------------------------------------------------------
   scriptInfo
------------------------------------------------------------ */
export const scriptInfo = {

  title: "Pursuit Curves (N-gon)",

  controls: {
    numPoints:  { label: "Points",      widget: "range", min: 3,     max: 12,   step: 1,     default: 4 },
    stepSize:   { label: "Step Size",   widget: "range", min: 0.001, max: 0.2,  step: 0.001, default: 0.06 },
    steps:      { label: "Steps",       widget: "range", min: 10,    max: 5000, step: 10,    default: 55 },
    trailAlpha: { label: "Trail Alpha", widget: "range", min: 0.01,  max: 1,    step: 0.01,  default: 0.6 },
    lineWidth:  { label: "Line Width",  widget: "range", min: 0.5,   max: 3,    step: 0.1,   default: 1 }
  }, // end controls

  params: {
    numPoints:  4,
    stepSize:   0.06,
    steps:      55,
    trailAlpha: 0.6,
    lineWidth:  1
  }, // end params

  elements: null,

  init,
  update,
  draw,

  // parameterControls compatibility
  parameters: null,

  redrawHandler() {
    this.update(this.params);
    this.draw();
  }, // end redrawHandler

  onParamChange() {
  } // end onParamChange

}; // end scriptInfo


/* ------------------------------------------------------------
   runPattern()
------------------------------------------------------------ */
export function runPattern(_ctx) {

  ctx = _ctx || window.ctx;
  if (!ctx) throw new Error("pursuitCurvesNgon.runPattern: no ctx provided and window.ctx is null");

  printTitle(scriptInfo.title);

  scriptInfo.parameters = scriptInfo.params;
  scriptInfo.init();

  buildParameterControls(
    scriptInfo,
    "tab-scripts",
    true
  );

  scriptInfo.redrawHandler();

} // end runPattern
