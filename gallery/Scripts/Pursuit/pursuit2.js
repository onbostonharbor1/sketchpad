/* ============================================================
   Pursuit Curves (Rules: next / kth / centroid / speeds)
   Gallery Script (ParameterControls-integrated)

   ABSTRACTED FROM HTML
   --------------------
   Original: drawPursuitCurves({ n, steps, dt, radius, speed, rule, options })
   Here: interactive controls + same core algorithm.

   NOTES
   -----
   - "custom" rule is not exposed as a control here because it needs a function.
   - "speeds" rule uses a deterministic generated speeds array based on a seed.
     (So it stays interactive without requiring a text editor control.)

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - window.drawCanvas exists
   - window.ctx exists
   - #action exists

   PARAMETER SUMMARY (DOC-ONLY)
   ----------------------------
   canvasId – which canvas to draw on (not used in this Gallery script)
   n        – number of points
   steps    – iterations
   dt       – step size
   radius   – initial circle size
   rule     – pursuit rule ("next", "kth", "speeds", "centroid", or "custom")
   options  – extra settings depending on the rule (k, speed array, etc.)

   ============================================================ */

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
   buildInitialPoints()
------------------------------------------------------------ */
function buildInitialPoints(n, radius) {

  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  const cx = W / 2;
  const cy = H / 2;

  let pts = [];

  for (let i = 0; i < n; i++) {
    const theta = 2 * Math.PI * i / n;
    pts.push({
      x: cx + radius * Math.cos(theta),
      y: cy + radius * Math.sin(theta)
    });
  }

  return pts;

} // end buildInitialPoints


/* ------------------------------------------------------------
   makeSpeedsArray()
   - deterministic "interesting" speeds without needing text input
------------------------------------------------------------ */
function makeSpeedsArray(n, baseSpeed, spread, seed) {

  // simple deterministic pseudo-random-ish function (no RNG state)
  // produces values in [baseSpeed-spread, baseSpeed+spread]
  let arr = new Array(n);

  for (let i = 0; i < n; i++) {
    const t = (i + 1) * (seed + 1) * 0.731;
    const f = Math.sin(t * 3.11) * Math.cos(t * 1.73); // [-1..1]-ish
    const v = baseSpeed + spread * f;
    arr[i] = v;
  }

  return arr;

} // end makeSpeedsArray


/* ------------------------------------------------------------
   validateElement(e)
   - fail-fast validation (no silent clamping)
------------------------------------------------------------ */
function validateElement(e) {

  if (!Number.isInteger(e.n) || e.n < 3)
    throw new Error("pursuitCurvesRules: n must be integer >= 3");

  if (!Number.isInteger(e.steps) || e.steps < 1)
    throw new Error("pursuitCurvesRules: steps must be integer >= 1");

  if (!Number.isFinite(e.dt) || e.dt <= 0)
    throw new Error("pursuitCurvesRules: dt must be > 0");

  if (!Number.isFinite(e.radius) || e.radius <= 0)
    throw new Error("pursuitCurvesRules: radius must be > 0");

  if (!Number.isFinite(e.speed) || e.speed < 0)
    throw new Error("pursuitCurvesRules: speed must be >= 0");

  if (e.rule !== "next" && e.rule !== "kth" && e.rule !== "centroid" && e.rule !== "speeds")
    throw new Error("pursuitCurvesRules: rule must be one of next|kth|centroid|speeds");

  if (!Number.isInteger(e.k) || e.k < 1)
    throw new Error("pursuitCurvesRules: k must be integer >= 1");

  if (e.k >= e.n)
    throw new Error("pursuitCurvesRules: k must be < n");

  if (!Number.isFinite(e.speedSpread) || e.speedSpread < 0)
    throw new Error("pursuitCurvesRules: speedSpread must be >= 0");

  if (!Number.isInteger(e.speedSeed) || e.speedSeed < 0)
    throw new Error("pursuitCurvesRules: speedSeed must be integer >= 0");

  if (!Number.isFinite(e.lineWidth) || e.lineWidth <= 0)
    throw new Error("pursuitCurvesRules: lineWidth must be > 0");

  if (typeof e.strokeStyle !== "string" || e.strokeStyle.length === 0)
    throw new Error("pursuitCurvesRules: strokeStyle must be a non-empty string");

} // end validateElement


/* ------------------------------------------------------------
   updateOnce()
   - Computes one iteration step, returns new point array
------------------------------------------------------------ */
function updateOnce(pts, thing) {

  const n = thing.n;
  const dt = thing.dt;
  const speed = thing.speed;
  const rule = thing.rule;

  let newPts = [];

  for (let i = 0; i < n; i++) {

    // Rule: speeds (per-point speed toward next)
    if (rule === "speeds") {

      const speeds = thing.speeds;
      const j = (i + 1) % n;

      const dx = pts[j].x - pts[i].x;
      const dy = pts[j].y - pts[i].y;

      newPts.push({
        x: pts[i].x + speeds[i] * dx * dt,
        y: pts[i].y + speeds[i] * dy * dt
      });

      continue;
    }

    // Determine target for other rules
    let target;

    if (rule === "next") {
      target = pts[(i + 1) % n];
    }
    else if (rule === "kth") {
      const k = thing.k;
      target = pts[(i + k) % n];
    }
    else if (rule === "centroid") {

      let cx = 0;
      let cy = 0;

      for (let j = 0; j < n; j++) {
        cx += pts[j].x;
        cy += pts[j].y;
      }

      cx = cx / n;
      cy = cy / n;

      target = { x: cx, y: cy };
    }
    else {
      // fallback: next
      target = pts[(i + 1) % n];
    }

    const dx = target.x - pts[i].x;
    const dy = target.y - pts[i].y;

    newPts.push({
      x: pts[i].x + speed * dx * dt,
      y: pts[i].y + speed * dy * dt
    });
  }

  return newPts;

} // end updateOnce


/* ------------------------------------------------------------
   drawPursuit()
   - Clears and draws full path for "steps" iterations
------------------------------------------------------------ */
function drawPursuit(thing) {

  clearCanvasFull();

  // Build initial points each redraw (deterministic)
  let pts = buildInitialPoints(thing.n, thing.radius);

  ctx.strokeStyle = thing.strokeStyle;
  ctx.lineWidth = thing.lineWidth;

  ctx.beginPath();

  for (let s = 0; s < thing.steps; s++) {

    // Draw polygon
    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < thing.n; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }

    ctx.lineTo(pts[0].x, pts[0].y);

    // Update
    pts = updateOnce(pts, thing);
  }

  ctx.stroke();

} // end drawPursuit


/* ------------------------------------------------------------
   init()
------------------------------------------------------------ */
function init() {

  const p = scriptInfo.params;

  scriptInfo.elements = {
    element: {
      n:           p.n,
      steps:       p.steps,
      dt:          p.dt,
      radius:      p.radius,
      speed:       p.speed,
      rule:        p.rule,
      k:           p.k,

      speedSpread: p.speedSpread,
      speedSeed:   p.speedSeed,
      speeds:      null,

      strokeStyle: p.strokeStyle,
      lineWidth:   p.lineWidth
    }
  };

  validateElement(scriptInfo.elements.element);

  // derived
  scriptInfo.elements.element.speeds =
    makeSpeedsArray(p.n, p.speed, p.speedSpread, p.speedSeed);

} // end init


/* ------------------------------------------------------------
   update(params)
------------------------------------------------------------ */
function update(params) {

  const e = scriptInfo.elements.element;

  e.n           = parseInt(params.n, 10);
  e.steps       = parseInt(params.steps, 10);
  e.dt          = parseFloat(params.dt);
  e.radius      = parseFloat(params.radius);
  e.speed       = parseFloat(params.speed);
  e.rule        = params.rule;
  e.k           = parseInt(params.k, 10);

  e.speedSpread = parseFloat(params.speedSpread);
  e.speedSeed   = parseInt(params.speedSeed, 10);

  e.lineWidth   = parseFloat(params.lineWidth);
  e.strokeStyle = params.strokeStyle;

  validateElement(e);

  // Derived array for speeds rule (deterministic)
  e.speeds = makeSpeedsArray(e.n, e.speed, e.speedSpread, e.speedSeed);

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

  title: "Pursuit Curves (Rules)",

  controls: {
    n:           { label: "Points (n)",  widget: "range",  min: 3,     max: 24,   step: 1,     default: 6 },
    steps:       { label: "Steps",       widget: "range",  min: 10,    max: 8000, step: 10,    default: 3000 },
    dt:          { label: "dt",          widget: "range",  min: 0.005, max: 0.2,  step: 0.005, default: 0.05 },
    radius:      { label: "Radius",      widget: "range",  min: 20,    max: 280,  step: 5,     default: 200 },
    speed:       { label: "Speed",       widget: "range",  min: 0.1,   max: 3,    step: 0.05,  default: 1.0 },

    rule:        { label: "Rule",        widget: "select", options: ["next", "kth", "centroid", "speeds"], default: "next" },
    k:           { label: "k (kth)",     widget: "range",  min: 1,     max: 23,   step: 1,     default: 2 },

    speedSpread: { label: "Spread",      widget: "range",  min: 0.0,   max: 2.0,  step: 0.05,  default: 0.7 },
    speedSeed:   { label: "Seed",        widget: "range",  min: 0,     max: 20,   step: 1,     default: 3 },

    lineWidth:   { label: "Line Width",  widget: "range",  min: 0.2,   max: 3.0,  step: 0.1,   default: 0.5 },
    strokeStyle: { label: "Color",       widget: "colorPicker",                               default: "#0044ff" }
  }, // end controls

  params: {
    n: 6,
    steps: 3000,
    dt: 0.05,
    radius: 200,
    speed: 1.0,
    rule: "next",
    k: 2,
    speedSpread: 0.7,
    speedSeed: 3,
    lineWidth: 0.5,
    strokeStyle: "#0044ff"
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
    // required by some parameterControls flows
  } // end onParamChange

}; // end scriptInfo


/* ------------------------------------------------------------
   runPattern() — Gallery entry point
------------------------------------------------------------ */
export function runPattern(_ctx) {

  ctx = _ctx || window.ctx;
  if (!ctx) throw new Error("pursuitCurvesRules.runPattern: no ctx provided and window.ctx is null");

  printTitle(scriptInfo.title);

  // compatibility shim
  scriptInfo.parameters = scriptInfo.params;

  scriptInfo.init();

  buildParameterControls(
    scriptInfo,
    "tab-scripts",
    true
  );

  scriptInfo.redrawHandler();

} // end runPattern
