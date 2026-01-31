/* ============================================================
   Pursuit Curves (Interactive)

   SOURCE
   ------
   Converted from standalone HTML demo.

   INTERACTIVE CONTROLS
   --------------------
   - numPoints   (polygon sides)
   - steps       (iterations)
   - dt          (step size)
   - speed       (pursuit rate scaling)
   - radius      (initial circle radius)
   - alpha       (stroke opacity / trail strength)
   - reverseNW / reverseSW  (match your “reverse()” cases)

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - window.ctx exists
   - buildParameterControls() exists
   ============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ------------------------------------------------------------
   setPoints(numNodes, x, y, radius, rotation)
------------------------------------------------------------ */
function setPoints(numNodes, x, y, radius, rotation = 0) {

  const pts = [];

  for (let k = 0; k < numNodes; k++) {
    let theta = 2 * Math.PI * k / numNodes;
    theta = theta - rotation;

    pts.push({
      x: x + radius * Math.cos(theta),
      y: y + radius * Math.sin(theta)
    });
  }

  return pts;

} // end setPoints


/* ------------------------------------------------------------
   drawPursuit(pts, thing)
------------------------------------------------------------ */
function drawPursuit(pts, thing) {

  const n = pts.length;

  ctx.strokeStyle = "rgba(0,0,0," + thing.alpha + ")";
  ctx.lineWidth   = 1;

  ctx.beginPath();

  for (let s = 0; s < thing.steps; s++) {

    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < n; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }

    ctx.lineTo(pts[0].x, pts[0].y);

    const newPts = [];

    for (let i = 0; i < n; i++) {
      const j  = (i + 1) % n;
      const dx = pts[j].x - pts[i].x;
      const dy = pts[j].y - pts[i].y;

      newPts.push({
        x: pts[i].x + thing.speed * dx * thing.dt,
        y: pts[i].y + thing.speed * dy * thing.dt
      });
    }

    pts = newPts;
  }

  ctx.stroke();

} // end drawPursuit


/* ------------------------------------------------------------
   drawAll(thing)
------------------------------------------------------------ */
function drawAll(thing) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const rot = Math.PI / 4;

  // NE
  let pts = setPoints(thing.numPoints, 300, 400, thing.radius, rot);
  drawPursuit(pts, thing);

  // SE
  pts = setPoints(thing.numPoints, 583, 683, thing.radius, rot);
  drawPursuit(pts, thing);

  // NW (your reverse() case)
  pts = setPoints(thing.numPoints, 583, 400, thing.radius, rot);
  if (thing.reverseNW) pts.reverse();
  drawPursuit(pts, thing);

  // SW (your reverse() case)
  pts = setPoints(thing.numPoints, 300, 683, thing.radius, rot);
  if (thing.reverseSW) pts.reverse();
  drawPursuit(pts, thing);

} // end drawAll


/* ------------------------------------------------------------
   init()
------------------------------------------------------------ */
function init() {

  const p = scriptInfo.params;

  scriptInfo.elements = {
    thing: {
      numPoints: p.numPoints,
      steps:     p.steps,
      dt:        p.dt,
      speed:     p.speed,
      radius:    p.radius,
      alpha:     p.alpha,
      reverseNW: p.reverseNW,
      reverseSW: p.reverseSW
    }
  };

} // end init


/* ------------------------------------------------------------
   update(params)
------------------------------------------------------------ */
function update(params) {

  const t = scriptInfo.elements.thing;

  t.numPoints = parseInt(params.numPoints, 10);
  t.steps     = parseInt(params.steps, 10);
  t.dt        = parseFloat(params.dt);
  t.speed     = parseFloat(params.speed);
  t.radius    = parseFloat(params.radius);
  t.alpha     = parseFloat(params.alpha);

  t.reverseNW = !!params.reverseNW;
  t.reverseSW = !!params.reverseSW;

  if (t.numPoints < 3) t.numPoints = 3;
  if (t.steps < 1) t.steps = 1;
  if (t.dt <= 0) t.dt = 0.001;
  if (t.speed < 0) t.speed = 0;
  if (t.radius < 1) t.radius = 1;

  if (t.alpha < 0) t.alpha = 0;
  if (t.alpha > 1) t.alpha = 1;

} // end update


/* ------------------------------------------------------------
   draw()
------------------------------------------------------------ */
function draw() {
  drawAll(scriptInfo.elements.thing);
} // end draw


/* ------------------------------------------------------------
   scriptInfo (ParameterControls contract)
------------------------------------------------------------ */
export const scriptInfo = {

  title: "Pursuit Polygons (Interactive)",

  controls: {
    numPoints: { label: "Points",  widget: "range", min: 3,     max: 12,  step: 1,     default: 4 },
    steps:     { label: "Steps",   widget: "range", min: 50,    max: 800, step: 10,    default: 175 },
    dt:        { label: "dt",      widget: "range", min: 0.001, max: 0.4, step: 0.001, default: 0.1 },
    speed:     { label: "Speed",   widget: "range", min: 0.01,  max: 2.0, step: 0.01,  default: 0.5 },
    radius:    { label: "Radius",  widget: "range", min: 20,    max: 350, step: 1,     default: 200 },
    alpha:     { label: "Alpha",   widget: "range", min: 0.01,  max: 1.0, step: 0.01,  default: 0.4 },

    reverseNW: { label: "Reverse NW", widget: "checkbox", default: true },
    reverseSW: { label: "Reverse SW", widget: "checkbox", default: true }
  }, // end controls

  params: {
    numPoints: 4,
    steps:     175,
    dt:        0.1,
    speed:     0.5,
    radius:    200,
    alpha:     0.4,
    reverseNW: true,
    reverseSW: true
  }, // end params

  elements: null,

  init,
  update,
  draw,

  // parameterControls compatibility
  parameters: null, // assigned in runPattern()

  redrawHandler() {
    this.update(this.params);
    this.draw();
  }, // end redrawHandler

  onParamChange() {
  } // end onParamChange

}; // end scriptInfo


/* ------------------------------------------------------------
   runPattern() — Gallery entry point
------------------------------------------------------------ */
export function runPattern() {
  // parameterControls compatibility
  scriptInfo.parameters = scriptInfo.params;

  scriptInfo.init();

  buildParameterControls(
    scriptInfo,
    "tab-scripts",
    true
  );

  scriptInfo.redrawHandler();

} // end runPattern
