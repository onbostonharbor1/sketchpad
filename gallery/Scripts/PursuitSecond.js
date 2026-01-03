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


canvasId – which canvas to draw on
n – number of points
steps – iterations
dt – step size
radius – initial circle size
rule – pursuit rule ("next", "kth", "speeds", "centroid", or "custom")
options – extra settings depending on the rule (like k for k-th pursuit, custom mapping, speed array, etc.)


   ============================================================ */

import { printTitle } from "../../draw/draw_utilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";

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
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  // Clear canvas (identity transform)
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.restore();

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

  // derived
  scriptInfo.elements.element.speeds =
    makeSpeedsArray(p.n, p.speed, p.speedSpread, p.speedSeed);
} // end init


/* ------------------------------------------------------------
   update(params)
------------------------------------------------------------ */
function update(params) {
  const e = scriptInfo.elements.element;

  // Apply provided keys
  for (const key in scriptInfo.params) {
    const value = params[key];
    if (value === undefined) continue;
    e[key] = value;
  }

  // Derived array for speeds rule (rebuild if anything relevant changed)
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
    n:          { label: "Points (n)",  widget: "range",  min: 3,    max: 24,   step: 1,    default: 6 },
    steps:      { label: "Steps",       widget: "range",  min: 10,   max: 8000, step: 10,   default: 3000 },
    dt:         { label: "dt",          widget: "range",  min: 0.005,max: 0.2,  step: 0.005,default: 0.05 },
    radius:     { label: "Radius",      widget: "range",  min: 20,   max: 280,  step: 5,    default: 200 },
    speed:      { label: "Speed",       widget: "range",  min: 0.1,  max: 3,    step: 0.05, default: 1.0 },

    rule:       { label: "Rule",        widget: "select", options: ["next", "kth", "centroid", "speeds"], default: "next" },
    k:          { label: "k (kth)",     widget: "range",  min: 1,    max: 23,   step: 1,    default: 2 },

    speedSpread:{ label: "Spread",      widget: "range",  min: 0.0,  max: 2.0,  step: 0.05, default: 0.7 },
    speedSeed:  { label: "Seed",        widget: "range",  min: 0,    max: 20,   step: 1,    default: 3 },

    lineWidth:  { label: "Line Width",  widget: "range",  min: 0.2,  max: 3.0,  step: 0.1,  default: 0.5 },
    strokeStyle:{ label: "Color",       widget: "colorPicker",                              default: "#0044ff" }
  },

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
  },

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
