/* ============================================================
   Four Curves — Unified Comparison Panel (2x2)
   Gallery Script (ParameterControls-integrated)

   PURPOSE
   -------
   Draw four related curve-stitch constructions in a 2x2 grid,
   using ONE unified control set so you can compare/contrast:

     (1) Parabola        (classic axis stitching)
     (2) Pursuit         (nonlinear index remap)
     (3) 1/4 Astroid     (parametric quarter astroid + tethers)
     (4) Tractrix        (tractrix curve + tether fan)

   IMPORTANT UPDATE (FIXES)
   ------------------------
   1) AUTO-FIT PER PANEL
      - The drawing now auto-fits inside each panel so the top
        does not get clipped just because S is larger than the
        panel height.

   2) TRACTRIX MAPPING FIX
      - Tractrix points are now normalized into the local [0..S]
        box (with padding), so the curve is visible and not
        shoved out of the clipped area.

   3) INDEPENDENT AXIS ROTATION (NON-ORTHOGONAL AXES)
      - You can set X-axis angle and Y-axis angle independently.
      - The angle between them does NOT have to be 90 degrees.
      - This is done by installing a custom basis transform per
        panel (not a single rotation of an orthogonal system).

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - window.ctx exists (global getter)
   - buildParameterControls() exists at /ui/parameterControls.js
   - #action exists

   USER RULES HONORED
   ------------------
   - No local ctx variable declared
   - No ctx passed into any function
   - Controls are object-keyed; no invented schema attributes
   ============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Four Curves — Unified Comparison (Parabola / Pursuit / Astroid / Tractrix)",

  params: {

    /* Layout */
    margin: 40,
    panelPadding: 18,          /* inner padding inside each panel */

    /* Unified geometry */
    size: 520,                 /* requested local axis span S (auto-fit clamps it) */
    steps: 180,                /* stitch count */

    /* Independent axis angles (degrees) */
    axisXDeg: 0,               /* X-axis direction */
    axisYDeg: 90,              /* Y-axis direction (not required to be 90 from X) */

    /* Optional offset inside panel (so you can “shift down” etc.) */
    offsetU: 0,                /* local +u shift (pixels) */
    offsetV: 0,                /* local +v shift (pixels) */

    /* Visibility */
    showGuides: true,
    showTethers: true,
    showCurve: true,

    /* Styling */
    guideWidth: 2,
    guideColor: "#cc0000",

    tetherWidth: 1,
    tetherColor: "#000000",

    curveWidth: 3,
    curveColor: "#000000",

    /* Tractrix tuning */
    tractrixTmax: 4.0,         /* parameter extent */
    tractrixSamples: 300       /* curve sampling density (independent of steps) */

  },

  parameters: null,

  controls: {

    margin:       { label: "Margin", widget: "range", min: 0, max: 200, step: 1 },
    panelPadding: { label: "Panel padding", widget: "range", min: 0, max: 80, step: 1 },

    size:  { label: "Size (S)", widget: "range", min: 150, max: 1200, step: 1 },
    steps: { label: "Steps (N)", widget: "range", min: 20, max: 3000, step: 1 },

    axisXDeg: { label: "Axis X angle (deg)", widget: "range", min: -180, max: 180, step: 1 },
    axisYDeg: { label: "Axis Y angle (deg)", widget: "range", min: -180, max: 180, step: 1 },

    offsetU: { label: "Offset U", widget: "range", min: -300, max: 300, step: 1 },
    offsetV: { label: "Offset V", widget: "range", min: -300, max: 300, step: 1 },

    showGuides:  { label: "Show guides",  widget: "checkbox" },
    showTethers: { label: "Show tethers", widget: "checkbox" },
    showCurve:   { label: "Show curve",   widget: "checkbox" },

    guideWidth:  { label: "Guide width", widget: "range", min: 1, max: 10, step: 1 },
    guideColor:  { label: "Guide color", widget: "color" },

    tetherWidth: { label: "Tether width", widget: "range", min: 1, max: 10, step: 1 },
    tetherColor: { label: "Tether color", widget: "color" },

    curveWidth:  { label: "Curve width", widget: "range", min: 1, max: 10, step: 1 },
    curveColor:  { label: "Curve color", widget: "color" },

    tractrixTmax:     { label: "Tractrix tMax", widget: "range", min: 1.0, max: 10.0, step: 0.01 },
    tractrixSamples:  { label: "Tractrix samples", widget: "range", min: 50, max: 2000, step: 1 }

  },

  onParamChange() {
    /* Intentionally empty. */
  }, // end onParamChange

  redrawHandler: null

}; // end scriptInfo


/* ============================================================
   Utilities
============================================================ */
function degToRad(d) {

  return (d * Math.PI) / 180;

} // end degToRad


function clearCanvas() {

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

} // end clearCanvas


function computePanels(p) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const m = p.margin;

  const usableW = w - (2 * m);
  const usableH = h - (2 * m);

  const panelW = usableW / 2;
  const panelH = usableH / 2;

  return [
    { x: m + (0 * panelW), y: m + (0 * panelH), w: panelW, h: panelH, label: "Parabola" },       /* top-left */
    { x: m + (1 * panelW), y: m + (0 * panelH), w: panelW, h: panelH, label: "Pursuit" },        /* top-right */
    { x: m + (0 * panelW), y: m + (1 * panelH), w: panelW, h: panelH, label: "1/4 Astroid" },    /* bottom-left */
    { x: m + (1 * panelW), y: m + (1 * panelH), w: panelW, h: panelH, label: "Tractrix" }        /* bottom-right */
  ];

} // end computePanels


function computeEffectiveSize(panel, p) {

  /* Auto-fit so the local [0..S] box fits inside the panel. */
  const innerW = panel.w - (2 * p.panelPadding);
  const innerH = panel.h - (2 * p.panelPadding);

  const maxS = (innerW < innerH) ? innerW : innerH;

  if (p.size <= maxS) return p.size;
  return maxS;

} // end computeEffectiveSize


function beginPanel(panel, p) {

  ctx.save();

  /* Clip to panel */
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.w, panel.h);
  ctx.clip();

} // end beginPanel


function endPanel() {

  ctx.restore();

} // end endPanel


function installLocalAxes(panel, p, S) {

  /* Establish a local coordinate system in each panel:
     - origin placed near bottom-left of the inner box (by default)
     - local u-axis angle = axisXDeg
     - local v-axis angle = axisYDeg
     - canvas has +y down, so basis uses negative sin for CCW math angles

     Local -> canvas:
       [x]   [ a  c  e ] [u]
       [y] = [ b  d  f ] [v]
       [1]   [ 0  0  1 ] [1]

     where:
       a,b = basisX (canvas coords)
       c,d = basisY (canvas coords)
       e,f = origin in canvas coords
  */

  const ax = degToRad(p.axisXDeg);
  const ay = degToRad(p.axisYDeg);

  const bx = Math.cos(ax);
  const by = -Math.sin(ax);

  const cx = Math.cos(ay);
  const cy = -Math.sin(ay);

  /* Place origin at inner bottom-left of panel, then apply user offsets. */
  const originX = panel.x + p.panelPadding;
  const originY = panel.y + panel.h - p.panelPadding;

  const e = originX + (p.offsetU * bx) + (p.offsetV * cx);
  const f = originY + (p.offsetU * by) + (p.offsetV * cy);

  ctx.setTransform(bx, by, cx, cy, e, f);

} // end installLocalAxes


function drawGuides(S, p) {

  if (!p.showGuides) return;

  ctx.save();

  ctx.lineWidth = p.guideWidth;
  ctx.strokeStyle = p.guideColor;

  /* Draw the local axes and the bounding square edges in local coords. */
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(S, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, S);
  ctx.stroke();

  /* Bounding square */
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(S, 0);
  ctx.lineTo(S, S);
  ctx.lineTo(0, S);
  ctx.lineTo(0, 0);
  ctx.stroke();

  ctx.restore();

} // end drawGuides


function strokeSegment(ax, ay, bx, by, width, color) {

  ctx.save();
  ctx.lineWidth = width;
  ctx.strokeStyle = color;

  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();

  ctx.restore();

} // end strokeSegment


function strokePolyline(pts, width, color) {

  if (pts.length < 2) return;

  ctx.save();
  ctx.lineWidth = width;
  ctx.strokeStyle = color;

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }

  ctx.stroke();
  ctx.restore();

} // end strokePolyline


/* ============================================================
   Panel 1: Parabola
============================================================ */
function drawParabola(panel, p) {

  beginPanel(panel, p);

  const S = computeEffectiveSize(panel, p);
  installLocalAxes(panel, p, S);
  drawGuides(S, p);

  const N = p.steps;
  const du = S / N;

  const curvePts = [];

  for (let i = 0; i <= N; i++) {

    const u = i * du;
    const v = (N - i) * du;

    if (p.showTethers) {
      strokeSegment(u, 0, 0, v, p.tetherWidth, p.tetherColor);
    }

    /* Midpoint tracer (simple envelope hint) */
    curvePts.push({ x: u / 2, y: v / 2 });

  }

  if (p.showCurve) {
    strokePolyline(curvePts, p.curveWidth, p.curveColor);
  }

  endPanel();

} // end drawParabola


/* ============================================================
   Panel 2: Pursuit-like (nonlinear remap)
============================================================ */
function drawPursuit(panel, p) {

  beginPanel(panel, p);

  const S = computeEffectiveSize(panel, p);
  installLocalAxes(panel, p, S);
  drawGuides(S, p);

  const N = p.steps;
  const du = S / N;

  const curvePts = [];

  for (let i = 0; i <= N; i++) {

    const t = i / N;
    const j = Math.floor(N * (t * t));   /* quadratic remap */
    const u = i * du;
    const v = (N - j) * du;

    if (p.showTethers) {
      strokeSegment(u, 0, 0, v, p.tetherWidth, p.tetherColor);
    }

    curvePts.push({ x: u / 2, y: v / 2 });

  }

  if (p.showCurve) {
    strokePolyline(curvePts, p.curveWidth, p.curveColor);
  }

  endPanel();

} // end drawPursuit


/* ============================================================
   Panel 3: 1/4 Astroid
============================================================ */
function drawAstroid(panel, p) {

  beginPanel(panel, p);

  const S = computeEffectiveSize(panel, p);
  installLocalAxes(panel, p, S);
  drawGuides(S, p);

  const N = p.steps;

  const curvePts = [];

  for (let i = 0; i <= N; i++) {

    const t = (i / N) * (Math.PI / 2);

    const u = S * Math.pow(Math.cos(t), 3);
    const v = S * Math.pow(Math.sin(t), 3);

    if (p.showTethers) {
      strokeSegment(u, 0, 0, v, p.tetherWidth, p.tetherColor);
    }

    curvePts.push({ x: u, y: v });

  }

  if (p.showCurve) {
    strokePolyline(curvePts, p.curveWidth, p.curveColor);
  }

  endPanel();

} // end drawAstroid


/* ============================================================
   Tractrix helpers
============================================================ */
function buildTractrixPoints(p) {

  const pts = [];

  /* Standard tractrix (a = 1): x = t - tanh(t), y = 1/cosh(t) */
  const n = p.tractrixSamples;
  const tMax = p.tractrixTmax;

  for (let i = 0; i <= n; i++) {

    const t = (i / n) * tMax;

    const x = (t - Math.tanh(t));
    const y = (1 / Math.cosh(t));

    pts.push({ x, y });

  }

  return pts;

} // end buildTractrixPoints


function normalizeToBox(rawPts, S, pad) {

  /* Map raw points into [0..S]x[0..S] with padding.
     We invert y so the curve “rises” from the baseline in local coords. */

  let minX = rawPts[0].x;
  let maxX = rawPts[0].x;
  let minY = rawPts[0].y;
  let maxY = rawPts[0].y;

  for (let i = 1; i < rawPts.length; i++) {
    const p = rawPts[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const spanX = maxX - minX;
  const spanY = maxY - minY;

  if (spanX <= 0) throw new Error("tractrix spanX invalid");
  if (spanY <= 0) throw new Error("tractrix spanY invalid");

  const inner = S - (2 * pad);
  if (inner <= 0) throw new Error("panel too small for padding");

  const scaleX = inner / spanX;
  const scaleY = inner / spanY;
  const scale = (scaleX < scaleY) ? scaleX : scaleY;

  const pts = [];

  for (let i = 0; i < rawPts.length; i++) {

    const rx = rawPts[i].x;
    const ry = rawPts[i].y;

    /* Normalize to [0..1] then scale into inner box */
    const nx = (rx - minX) * scale;
    const ny = (ry - minY) * scale;

    /* Place with padding; also invert y within the box for visual match */
    const u = pad + nx;
    const v = pad + (inner - ny);

    pts.push({ x: u, y: v });

  }

  return pts;

} // end normalizeToBox


/* ============================================================
   Panel 4: Tractrix
============================================================ */
function drawTractrix(panel, p) {

  beginPanel(panel, p);

  const S = computeEffectiveSize(panel, p);
  installLocalAxes(panel, p, S);
  drawGuides(S, p);

  const pad = 0.06 * S;

  const raw = buildTractrixPoints(p);
  const curvePts = normalizeToBox(raw, S, pad);

  /* Tether point: right end of the local baseline */
  const pullU = S;
  const pullV = 0;

  if (p.showTethers) {

    /* Fan density tied to steps so the unified “Steps” knob still matters */
    const N = p.steps;
    const stride = Math.floor(curvePts.length / N);
    const step = (stride < 1) ? 1 : stride;

    for (let i = 0; i < curvePts.length; i += step) {
      strokeSegment(curvePts[i].x, curvePts[i].y, pullU, pullV, p.tetherWidth, p.tetherColor);
    }

  }

  if (p.showCurve) {
    strokePolyline(curvePts, p.curveWidth, p.curveColor);
  }

  endPanel();

} // end drawTractrix


/* ============================================================
   Lifecycle
============================================================ */
function init(p) {

  /* No persistent elements required. */

} // end init


function update(p) {

  if (p.steps < 2) throw new Error("steps must be >= 2");
  if (p.size <= 0) throw new Error("size must be > 0");
  if (p.tractrixSamples < 10) throw new Error("tractrixSamples must be >= 10");

} // end update


function draw(p) {

  clearCanvas();

  const panels = computePanels(p);

  drawParabola(panels[0], p);
  drawPursuit(panels[1], p);
  drawAstroid(panels[2], p);
  drawTractrix(panels[3], p);

} // end draw


/* ============================================================
   runPattern
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
