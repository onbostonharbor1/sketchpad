/* ============================================================
   Nautilus (Interactive)

   SOURCE
   ------
   Converted from your standalone HTML demo.

   INTERACTIVE CONTROLS (parameterControls)
   ---------------------------------------
   - translateXFrac / translateYFrac  (canvas placement)
   - cx, cy, rotation
   - turns, points, startRadius, tightness
   - drawSpiral, spiralWidth, spiralColor
   - fillShell, shellThickness, shellColor
   - ribs, interval, ribEvery, ribAlpha, ribWidth, ribColor
   - chambers, chamberGrowth, maxChambers, chamberWidth, chamberColor

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - window.ctx exists (or runPattern is passed a ctx)
   - buildParameterControls() exists and matches your contract:
       buildParameterControls(sourceInfo, targetTabId, render)

   NOTE
   ----
   This matches the “Pursuit Curves” scriptInfo pattern you pasted.
   ============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

let ctx = null;

/* ------------------------------------------------------------
   strokePolyline(points, width, color)
------------------------------------------------------------ */
function strokePolyline(points, width, color) {

  if (points.length < 2) return;

  ctx.save();
  ctx.lineWidth = width;
  ctx.strokeStyle = color;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.stroke();
  ctx.restore();

} // end strokePolyline


/* ------------------------------------------------------------
   directionAt(arr, i)
------------------------------------------------------------ */
function directionAt(arr, i) {

  const i0 = Math.max(0, i - 1);
  const i1 = Math.min(arr.length - 1, i + 1);

  const dx = arr[i1].x - arr[i0].x;
  const dy = arr[i1].y - arr[i0].y;

  const len = Math.hypot(dx, dy) || 1;

  return { x: dx / len, y: dy / len };

} // end directionAt


/* ------------------------------------------------------------
   toRGBA(color, alpha)
------------------------------------------------------------ */
function toRGBA(color, alpha) {

  const c = document.createElement("canvas");
  c.width = c.height = 1;

  const _ctx = c.getContext("2d");
  _ctx.fillStyle = color;

  const parsed = _ctx.fillStyle;   // normalized like 'rgb(r, g, b)'
  const m = parsed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);

  if (!m) return color;

  const r = m[1];
  const g = m[2];
  const b = m[3];

  return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";

} // end toRGBA


/* ------------------------------------------------------------
   drawNautilus(thing)
------------------------------------------------------------ */
function drawNautilus(thing) {

  const theta0 = 0;
  const theta1 = thing.turns * Math.PI * 2;

  const N = Math.max(2, Math.floor(thing.points));
  const pts = new Array(N);

  // --- generate spiral points r = a * e^(bθ)
  for (let i = 0; i < N; i++) {

    const t = i / (N - 1);
    const theta = theta0 + t * (theta1 - theta0);

    const r = thing.startRadius * Math.exp(thing.tightness * theta);
    const a = theta + thing.rotation;

    const x = thing.cx + r * Math.cos(a);
    const y = thing.cy + r * Math.sin(a);

    pts[i] = { x: x, y: y, theta: theta, r: r };
  }

  // --- fill shell look (wide stroke)
  if (thing.fillShell) {

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = thing.shellColor;
    ctx.lineWidth = thing.shellThickness;

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    ctx.restore();
  }

  // --- main spiral
  if (thing.drawSpiral) {
    strokePolyline(pts, thing.spiralWidth, thing.spiralColor);
  }

  // --- curve-stitch ribs (i -> i + interval)
  if (thing.ribs && thing.interval >= 1) {

    ctx.save();
    ctx.lineWidth = thing.ribWidth;
    ctx.strokeStyle = toRGBA(thing.ribColor, thing.ribAlpha);

    for (let i = 0; i + thing.interval < N; i += Math.max(1, thing.ribEvery)) {

      const a = pts[i];
      const b = pts[i + thing.interval];

      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5;

      const dir = directionAt(pts, i);
      const nx = -dir.y;
      const ny =  dir.x;

      const bulge = 0.35 * Math.hypot(b.x - a.x, b.y - a.y);

      const cx1 = mx + nx * bulge;
      const cy1 = my + ny * bulge;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(cx1, cy1, b.x, b.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  // --- chamber marks
  if (thing.chambers) {

    const k = thing.chamberGrowth;
    const b = thing.tightness;

    const dTheta = Math.log(k) / (b === 0 ? 1e-6 : b);

    ctx.save();
    ctx.lineWidth = thing.chamberWidth;
    ctx.strokeStyle = thing.chamberColor;

    for (let n = 0; n < thing.maxChambers; n++) {

      const theta = theta0 + n * dTheta;
      if (theta > theta1) break;

      const span = Math.min(0.9 * dTheta, Math.PI / 3);
      const steps = 24;

      const local = [];

      for (let j = 0; j <= steps; j++) {

        const tt = (j / steps - 0.5) * span + theta;
        const rr = thing.startRadius * Math.exp(b * tt);
        const aa = tt + thing.rotation;

        local.push({
          x: thing.cx + rr * Math.cos(aa),
          y: thing.cy + rr * Math.sin(aa)
        });
      }

      strokePolyline(local, thing.chamberWidth, thing.chamberColor);
    }

    ctx.restore();
  }

} // end drawNautilus


/* ------------------------------------------------------------
   drawAll(thing)
------------------------------------------------------------ */
function drawAll(thing) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);

  ctx.translate(w * thing.translateXFrac, h * thing.translateYFrac);

  drawNautilus(thing);

} // end drawAll


/* ------------------------------------------------------------
   scriptInfo (ParameterControls contract)
------------------------------------------------------------ */
export const scriptInfo = {

  title: "Nautilus (Interactive)",

  controls: {

    translateXFrac: { label: "Translate X", widget: "range", min: 0.0, max: 1.0, step: 0.01, default: 0.48 },
    translateYFrac: { label: "Translate Y", widget: "range", min: 0.0, max: 1.0, step: 0.01, default: 0.55 },

    cx:            { label: "Center X",   widget: "range", min: -1000, max: 1000, step: 1,    default: 50 },
    cy:            { label: "Center Y",   widget: "range", min: -1000, max: 1000, step: 1,    default: 150 },
    rotation:      { label: "Rotation",   widget: "range", min: -6.283, max: 6.283, step: 0.01, default: -Math.PI * 0.25 },

    turns:         { label: "Turns",      widget: "range", min: 0.25, max: 10.0, step: 0.05, default: 4.0 },
    points:        { label: "Points",     widget: "range", min: 50,   max: 8000, step: 10,   default: 1600 },

    startRadius:   { label: "Start Radius", widget: "range", min: 0.1, max: 200, step: 0.1,  default: 4 },
    tightness:     { label: "Tightness",    widget: "range", min: 0.01, max: 1.0, step: 0.01, default: 0.30 },

    drawSpiral:    { label: "Draw Spiral", widget: "checkbox", default: true },
    spiralWidth:   { label: "Spiral Width", widget: "range", min: 0.1, max: 20, step: 0.1, default: 2 },
    spiralColor:   { label: "Spiral Color", widget: "text", default: "#222" },

    fillShell:       { label: "Fill Shell", widget: "checkbox", default: true },
    shellThickness:  { label: "Shell Thickness", widget: "range", min: 1, max: 200, step: 1, default: 34 },
    shellColor:      { label: "Shell Color", widget: "text", default: "#f2efe8" },

    ribs:          { label: "Ribs", widget: "checkbox", default: true },
    interval:      { label: "Interval", widget: "range", min: 1, max: 200, step: 1, default: 50 },
    ribEvery:      { label: "Rib Every", widget: "range", min: 1, max: 20, step: 1, default: 2 },
    ribAlpha:      { label: "Rib Alpha", widget: "range", min: 0.0, max: 1.0, step: 0.01, default: 0.22 },
    ribWidth:      { label: "Rib Width", widget: "range", min: 0.1, max: 10.0, step: 0.1, default: 1 },
    ribColor:      { label: "Rib Color", widget: "text", default: "#2c3e50" },

    chambers:        { label: "Chambers", widget: "checkbox", default: true },
    chamberGrowth:   { label: "Chamber Growth", widget: "range", min: 1.01, max: 2.0, step: 0.01, default: 1.23 },
    maxChambers:     { label: "Max Chambers", widget: "range", min: 0, max: 60, step: 1, default: 22 },
    chamberWidth:    { label: "Chamber Width", widget: "range", min: 0.1, max: 10.0, step: 0.1, default: 1.25 },
    chamberColor:    { label: "Chamber Color", widget: "text", default: "#666" }
  },

  params: {

    translateXFrac: 0.48,
    translateYFrac: 0.55,

    cx: 50,
    cy: 150,
    rotation: -Math.PI * 0.25,

    turns: 4.0,
    points: 1600,

    startRadius: 4,
    tightness: 0.30,

    drawSpiral: true,
    spiralWidth: 2,
    spiralColor: "#222",

    fillShell: true,
    shellThickness: 34,
    shellColor: "#f2efe8",

    ribs: true,
    interval: 50,
    ribEvery: 2,
    ribAlpha: 0.22,
    ribWidth: 1,
    ribColor: "#2c3e50",

    chambers: true,
    chamberGrowth: 1.23,
    maxChambers: 22,
    chamberWidth: 1.25,
    chamberColor: "#666"
  },

  elements: null,

  init() {
    this.elements = { thing: { ...this.params } };
  }, // end init

  update(params) {

    const t = this.elements.thing;

    for (const key in this.params) {
      const value = params[key];
      if (value === undefined) continue;
      t[key] = value;
    }

    // enforce integer-ish fields (range widgets deliver numbers but not necessarily ints)
    t.points = Math.floor(t.points);
    t.interval = Math.floor(t.interval);
    t.ribEvery = Math.floor(t.ribEvery);
    t.maxChambers = Math.floor(t.maxChambers);

  }, // end update

  draw() {
    drawAll(this.elements.thing);
  }, // end draw

  parameters: null, // assigned in runPattern()

  redrawHandler() {
    this.update(this.params);
    this.draw();
  }, // end redrawHandler

  onParamChange() {
    // intentionally empty (matches your existing contract)
  } // end onParamChange

}; // end scriptInfo


/* ------------------------------------------------------------
   runPattern() — Gallery entry point
------------------------------------------------------------ */
export function runPattern(_ctx) {

  ctx = _ctx || window.ctx;
  if (!ctx) throw new Error("nautilus2.runPattern: no ctx provided and window.ctx is null");

  scriptInfo.parameters = scriptInfo.params;

  scriptInfo.init();

  buildParameterControls(
    scriptInfo,
    "tab-scripts",
    true
  );

  scriptInfo.redrawHandler();

} // end runPattern
