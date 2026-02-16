/* ============================================================
   Unified Pursuit Engine — Extended
   Adds:
     - jitter
     - curvatureBias
     - targetMode (next, random, opposite)
============================================================ */

import { printTitle } from "/draw/drawUtilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";

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
}

/* ------------------------------------------------------------
   Utility: apply curvature bias
   - current direction is rotated toward desired direction
------------------------------------------------------------ */
function applyCurvatureBias(px, py, tx, ty, curvatureBias) {
  if (curvatureBias <= 0) {
    return { dx: tx - px, dy: ty - py };
  }

  // Desired direction
  const dx = tx - px;
  const dy = ty - py;
  const desiredAngle = Math.atan2(dy, dx);

  // Current direction (approximate using previous frame)
  // For static drawing, we approximate "current" as pointing outward
  const currentAngle = Math.atan2(py, px);

  // Rotate currentAngle toward desiredAngle
  const angleDiff = desiredAngle - currentAngle;
  const limited = currentAngle + angleDiff * curvatureBias;

  return {
    dx: Math.cos(limited),
    dy: Math.sin(limited)
  };
}

/* ------------------------------------------------------------
   Target selection modes
------------------------------------------------------------ */
function buildTargets(pts, mode) {
  const N = pts.length;
  const targets = [];

  for (let i = 0; i < N; i++) {
    let t = 0;

    switch (mode) {
      case "next":
        t = (i + 1) % N;
        break;

      case "random":
        do {
          t = Math.floor(Math.random() * N);
        } while (t === i);
        break;

      case "opposite":
        t = (i + Math.floor(N / 2)) % N;
        break;
    }

    targets.push(t);
  }

  return targets;
}

/* ------------------------------------------------------------
   updateMultiAgent()
------------------------------------------------------------ */
function updateMultiAgent(pts, stepSize, jitter, curvatureBias, targets) {
  return pts.map((p, i) => {
    const t = pts[targets[i]];

    // Apply curvature bias
    const { dx, dy } = applyCurvatureBias(p.x, p.y, t.x, t.y, curvatureBias);

    // Apply jitter
    const jx = jitter * (Math.random() - 0.5);
    const jy = jitter * (Math.random() - 0.5);

    return {
      x: p.x + (dx * stepSize) + jx,
      y: p.y + (dy * stepSize) + jy
    };
  });
}

/* ------------------------------------------------------------
   updateChained()
------------------------------------------------------------ */
function updateChained(pts, stepSize) {
  const out = [];

  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i];
    const t = pts[i + 1];
    out.push({
      x: p.x + (t.x - p.x) * stepSize,
      y: p.y + (t.y - p.y) * stepSize
    });
  }

  // Last point stays fixed
  out.push({ ...pts[pts.length - 1] });

  return out;
}

/* ------------------------------------------------------------
   updateCyclic()
------------------------------------------------------------ */
function updateCyclic(pts, stepSize) {
  const N = pts.length;
  return pts.map((p, i) => {
    const t = pts[(i + 1) % N];
    return {
      x: p.x + (t.x - p.x) * stepSize,
      y: p.y + (t.y - p.y) * stepSize
    };
  });
}

/* ------------------------------------------------------------
   unifiedPursuitEngine()
------------------------------------------------------------ */
function unifiedPursuitEngine(thing) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const cx = 300;
  const cy = 300;
  const r  = Math.min(w, h) * 0.35;

  // Build initial polygon
  let pts = [];
  for (let i = 0; i < thing.numPoints; i++) {
    const a = (2 * Math.PI * i) / thing.numPoints - Math.PI / 2;
    pts.push({
      x: cx + r * Math.cos(a),
      y: cy + r * Math.sin(a)
    });
  }

  // Build target mapping
  const targets = buildTargets(pts, thing.targetMode);

  clearCanvasFull();

  ctx.lineWidth   = thing.lineWidth;
  ctx.strokeStyle = `rgba(0,0,255,${thing.trailAlpha})`;

  for (let s = 0; s < thing.steps; s++) {

    // Draw polygon
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Dispatch
    switch (thing.pursuitMode) {
      case "multi":
        pts = updateMultiAgent(
          pts,
          thing.stepSize,
          thing.jitter,
          thing.curvatureBias,
          targets
        );
        break;

      case "chain":
        pts = updateChained(pts, thing.stepSize);
        break;

      case "cyclic":
        pts = updateCyclic(pts, thing.stepSize);
        break;
    }
  }
}

/* ------------------------------------------------------------
   init()
------------------------------------------------------------ */
function init() {
  const p = scriptInfo.params;

  scriptInfo.elements = {
    element: {
      pursuitMode:   p.pursuitMode,
      targetMode:    p.targetMode,
      numPoints:     p.numPoints,
      stepSize:      p.stepSize,
      steps:         p.steps,
      trailAlpha:    p.trailAlpha,
      lineWidth:     p.lineWidth,
      jitter:        p.jitter,
      curvatureBias: p.curvatureBias
    }
  };
}

/* ------------------------------------------------------------
   update()
------------------------------------------------------------ */
function update(params) {
  const e = scriptInfo.elements.element;

  e.pursuitMode   = params.pursuitMode;
  e.targetMode    = params.targetMode;
  e.numPoints     = parseInt(params.numPoints, 10);
  e.stepSize      = parseFloat(params.stepSize);
  e.steps         = parseInt(params.steps, 10);
  e.trailAlpha    = parseFloat(params.trailAlpha);
  e.lineWidth     = parseFloat(params.lineWidth);
  e.jitter        = parseFloat(params.jitter);
  e.curvatureBias = parseFloat(params.curvatureBias);

  if (e.numPoints < 3) e.numPoints = 3;
  if (e.steps < 1) e.steps = 1;
}

/* ------------------------------------------------------------
   draw()
------------------------------------------------------------ */
function draw() {
  unifiedPursuitEngine(scriptInfo.elements.element);
}

/* ------------------------------------------------------------
   scriptInfo
------------------------------------------------------------ */
export const scriptInfo = {

  title: "Unified Pursuit Engine (Extended)",

  controls: {
    pursuitMode: {
      label: "Pursuit Mode",
      widget: "select",
      options: [
        { value: "multi",  label: "Multi‑Agent" },
        { value: "chain",  label: "Chained" },
        { value: "cyclic", label: "Cyclic" }
      ],
      default: "multi"
    },

    targetMode: {
      label: "Target Mode",
      widget: "select",
      options: [
        { value: "next",     label: "Next" },
        { value: "random",   label: "Random" },
        { value: "opposite", label: "Opposite" }
      ],
      default: "next"
    },

    numPoints:  { label: "Points",      widget: "range", min: 3,     max: 12,   step: 1,     default: 4 },
    stepSize:   { label: "Step Size",   widget: "range", min: 0.001, max: 0.2,  step: 0.001, default: 0.06 },
    steps:      { label: "Steps",       widget: "range", min: 10,    max: 5000, step: 10,    default: 55 },
    trailAlpha: { label: "Trail Alpha", widget: "range", min: 0.01,  max: 1,    step: 0.01,  default: 0.6 },
    lineWidth:  { label: "Line Width",  widget: "range", min: 0.5,   max: 3,    step: 0.1,   default: 1 },

    jitter: {
      label: "Jitter",
      widget: "range",
      min: 0,
      max: 5,
      step: 0.1,
      default: 0
    },

    curvatureBias: {
      label: "Curvature Bias",
      widget: "range",
      min: 0,
      max: 1,
      step: 0.01,
      default: 0
    }
  },

  params: {
    pursuitMode:   "multi",
    targetMode:    "next",
    numPoints:     4,
    stepSize:      0.06,
    steps:         55,
    trailAlpha:    0.6,
    lineWidth:     1,
    jitter:        0,
    curvatureBias: 0
  },

  elements: null,

  init,
  update,
  draw,

  parameters: null,

  redrawHandler() {
    this.update(this.params);
    this.draw();
  },

  onParamChange() {}
};

/* ------------------------------------------------------------
   runPattern()
------------------------------------------------------------ */
export function runPattern() {

  printTitle(scriptInfo.title);

  scriptInfo.parameters = scriptInfo.params;
  scriptInfo.init();

  buildParameterControls(
    scriptInfo,
    "tab-scripts",
    true
  );

  scriptInfo.redrawHandler();
}
