/* ============================================================
   Dynamic Pursuit Engine (Pursuit Curves + Polygon Overlay)

   - Persistent positions + velocities
   - Curvature-biased steering
   - Jitter on velocity
   - Target functions:
       * agent-next
       * agent-random
       * centroid
       * circle
       * fixed-point
   - Animation checkbox
   - Step button (advance one time step)
   - Reset button (rebuild state)
   - Soft fade with adjustable fadeStrength
   - Adjustable animationRate (frame skipping)
   - Draws BOTH:
       * pursuit curves (trails)
       * current polygon overlay
============================================================ */

import { printTitle } from "/draw/drawUtilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";

/* ------------------------------------------------------------
   clearCanvasFull()
   - Clears the entire canvas, regardless of current transform
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
   fadeCanvas(thing)
   - Softly fades the canvas using fadeStrength
   - This is the key to keeping pursuit curves visible but
     preventing infinite clutter.
------------------------------------------------------------ */
function fadeCanvas(thing) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const alpha = thing.fadeStrength;
  if (alpha <= 0) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/* ------------------------------------------------------------
   Utility: normalize a vector
------------------------------------------------------------ */
function normalize(dx, dy) {
  const len = Math.hypot(dx, dy);
  if (len === 0) return { x: 0, y: 0 };
  return { x: dx / len, y: dy / len };
}

/* ------------------------------------------------------------
   Utility: steerVelocity
   - vel: current velocity { vx, vy }
   - desired: desired direction { dx, dy } (assumed normalized)
   - curvatureBias: 0..1, how strongly we turn toward desired
------------------------------------------------------------ */
function steerVelocity(vel, desired, curvatureBias) {
  if (curvatureBias <= 0) return { vx: vel.vx, vy: vel.vy };

  const speed = Math.hypot(vel.vx, vel.vy);
  if (speed === 0) {
    return { vx: desired.dx * speed, vy: desired.dy * speed };
  }

  const cur = normalize(vel.vx, vel.vy);

  const blendedX = (1 - curvatureBias) * cur.x + curvatureBias * desired.dx;
  const blendedY = (1 - curvatureBias) * cur.y + curvatureBias * desired.dy;
  const newDir = normalize(blendedX, blendedY);

  return {
    vx: newDir.x * speed,
    vy: newDir.y * speed
  };
}

/* ------------------------------------------------------------
   Target functions
------------------------------------------------------------ */

function targetAgentNext(i, pts, time, cx, cy) {
  return pts[(i + 1) % pts.length];
}

function targetAgentRandom(i, pts, time, cx, cy, randomTargets) {
  const idx = randomTargets[i];
  return pts[idx];
}

function targetCentroid(i, pts, time, cx, cy) {
  let sx = 0, sy = 0;
  for (const p of pts) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / pts.length, y: sy / pts.length };
}

function targetCircle(i, pts, time, cx, cy) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const r = Math.min(w, h) * 0.35;

  const omega = 0.5;
  const angle = omega * time;

  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle)
  };
}

function targetFixedPoint(i, pts, time, cx, cy) {
  return { x: cx, y: cy };
}

/* ------------------------------------------------------------
   getTargetForAgent()
------------------------------------------------------------ */
function getTargetForAgent(i, pts, time, thing) {
  const cx = thing.cx;
  const cy = thing.cy;

  switch (thing.targetMode) {
    case "agent-next":   return targetAgentNext(i, pts, time, cx, cy);
    case "agent-random": return targetAgentRandom(i, pts, time, cx, cy, thing.randomTargets);
    case "centroid":     return targetCentroid(i, pts, time, cx, cy);
    case "circle":       return targetCircle(i, pts, time, cx, cy);
    case "fixed-point":  return targetFixedPoint(i, pts, time, cx, cy);
    default:             return targetAgentNext(i, pts, time, cx, cy);
  }
}

/* ------------------------------------------------------------
   stepSimulation()
------------------------------------------------------------ */
function stepSimulation(thing) {
  const pts = thing.pts;
  const vel = thing.vel;
  const N = pts.length;

  const dt = thing.dt;

  thing.time += dt;

  for (let i = 0; i < N; i++) {
    const p = pts[i];
    const v = vel[i];

    const target = getTargetForAgent(i, pts, thing.time, thing);
    const dir = normalize(target.x - p.x, target.y - p.y);

    const steered = steerVelocity(v, { dx: dir.x, dy: dir.y }, thing.curvatureBias);

    const j = thing.jitter;
    const jx = j * (Math.random() - 0.5);
    const jy = j * (Math.random() - 0.5);

    const newVx = steered.vx + jx;
    const newVy = steered.vy + jy;

    vel[i].vx = newVx;
    vel[i].vy = newVy;

    pts[i].x = p.x + newVx * dt;
    pts[i].y = p.y + newVy * dt;
  }
}

/* ------------------------------------------------------------
   drawFrame()
------------------------------------------------------------ */
function drawFrame(thing) {
  const pts = thing.pts;
  if (!pts || pts.length === 0) return;

  ctx.fillStyle = "rgba(0,0,255,0.6)";
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.lineWidth = thing.lineWidth;
  ctx.strokeStyle = `rgba(0,0,255,${thing.trailAlpha})`;

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.closePath();
  ctx.stroke();
}

/* ------------------------------------------------------------
   resetSimulation()
------------------------------------------------------------ */
function resetSimulation(thing) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const cx = thing.cx;
  const cy = thing.cy;
  const r = Math.min(w, h) * 0.35;

  const N = thing.numPoints;

  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (2 * Math.PI * i) / N - Math.PI / 2;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }

  const vel = [];
  for (let i = 0; i < N; i++) {
    vel.push({
      vx: (Math.random() - 0.5) * thing.initialSpeed,
      vy: (Math.random() - 0.5) * thing.initialSpeed
    });
  }

  const randomTargets = [];
  for (let i = 0; i < N; i++) {
    let t;
    do { t = Math.floor(Math.random() * N); } while (t === i);
    randomTargets.push(t);
  }

  thing.pts = pts;
  thing.vel = vel;
  thing.randomTargets = randomTargets;
  thing.time = 0;

  clearCanvasFull();
}

/* ------------------------------------------------------------
   Animation loop with frame skipping
------------------------------------------------------------ */

let animationFrameId = null;
let frameCounter = 0;

function startAnimation() {
  if (animationFrameId != null) return;

  const loop = () => {
    const e = scriptInfo.elements.element;
    const p = scriptInfo.params;

    if (!e || !p.animation) {
      animationFrameId = null;
      return;
    }

    frameCounter++;

    if (frameCounter >= e.animationRate) {
      frameCounter = 0;

        fadeCanvas(e);
        stepSimulation(e);
        // Auto-reset when polygon becomes too small
        const avgLen = computeAverageEdgeLength(e.pts);
        if (avgLen < e.minLineLength) {
            resetSimulation(e);
            drawFrame(e);
            animationFrameId = requestAnimationFrame(loop);
            return;
        }

      drawFrame(e);
    }

    animationFrameId = requestAnimationFrame(loop);
  };

  animationFrameId = requestAnimationFrame(loop);
}

function stopAnimation() {
  if (animationFrameId != null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function computeAverageEdgeLength(pts) {
    const N = pts.length;
    let total = 0;
    for (let i = 0; i < N; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % N];
      total += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return total / N;
  }


/* ------------------------------------------------------------
   init()
------------------------------------------------------------ */
function init() {
  const p = scriptInfo.params;

  scriptInfo.elements = {
    element: {
      animation:     p.animation,
      animationRate: p.animationRate,
      targetMode:    p.targetMode,
      numPoints:     p.numPoints,
      dt:            p.dt,
      trailAlpha:    p.trailAlpha,
      lineWidth:     p.lineWidth,
      jitter:        p.jitter,
      curvatureBias: p.curvatureBias,
      initialSpeed:  p.initialSpeed,
      fadeStrength:  p.fadeStrength,
      minLineLength: p.minLineLength,

      cx: 300,
      cy: 300,

      pts: null,
      vel: null,
      randomTargets: null,
      time: 0
    }
  };

  resetSimulation(scriptInfo.elements.element);
}

/* ------------------------------------------------------------
   update()
------------------------------------------------------------ */
function update(params) {
  const e = scriptInfo.elements.element;

  const oldNumPoints  = e.numPoints;
  const oldTargetMode = e.targetMode;

  e.animation     = !!params.animation;
  e.animationRate = parseInt(params.animationRate, 10);
  e.targetMode    = params.targetMode;
  e.numPoints     = parseInt(params.numPoints, 10);
  e.dt            = parseFloat(params.dt);
  e.trailAlpha    = parseFloat(params.trailAlpha);
  e.lineWidth     = parseFloat(params.lineWidth);
  e.jitter        = parseFloat(params.jitter);
  e.curvatureBias = parseFloat(params.curvatureBias);
  e.initialSpeed  = parseFloat(params.initialSpeed);
  e.fadeStrength  = parseFloat(params.fadeStrength);
  e.minLineLength = parseFloat(params.minLineLength);

  if (e.animationRate < 1) e.animationRate = 1;
  if (e.numPoints < 3) e.numPoints = 3;
  if (e.dt <= 0) e.dt = 0.1;

  if (e.numPoints !== oldNumPoints || e.targetMode !== oldTargetMode) {
    resetSimulation(e);
  }
}

/* ------------------------------------------------------------
   draw()
------------------------------------------------------------ */
function draw() {
  const e = scriptInfo.elements.element;
  clearCanvasFull();
  drawFrame(e);
}

/* ------------------------------------------------------------
   scriptInfo
------------------------------------------------------------ */
export const scriptInfo = {

  title: "Dynamic Pursuit Engine",

  actions: {
    stepOnce(info) {
      const e = info.elements.element;
      const p = info.params;

      if (!p.animation) {
        fadeCanvas(e);
        stepSimulation(e);
        drawFrame(e);
      }
    },

    resetSim(info) {
      const e = info.elements.element;
      resetSimulation(e);
      drawFrame(e);
    }
  },

  controls: {
    animation: {
      label: "Animation",
      widget: "checkbox",
      default: false
    },

    animationRate: {
      label: "Animation Rate",
      widget: "range",
      min: 1,
      max: 20,
      step: 1,
      default: 1
    },

    stepButton: {
      widget: "button",
      label: "Step",
      action: "stepOnce",
      redraw: false
    },

    resetButton: {
      widget: "button",
      label: "Reset",
      action: "resetSim",
      redraw: false
    },

    targetMode: {
      label: "Target Mode",
      widget: "select",
      options: [
        { value: "agent-next",   label: "Agent Next" },
        { value: "agent-random", label: "Agent Random" },
        { value: "centroid",     label: "Centroid" },
        { value: "circle",       label: "Circle" },
        { value: "fixed-point",  label: "Fixed Point" }
      ],
      default: "agent-next"
    },

    curvatureBias: {
      label: "Curvature Bias",
      widget: "range",
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.2
    },

    jitter: {
      label: "Jitter",
      widget: "range",
      min: 0,
      max: 5,
      step: 0.1,
      default: 0
    },

    fadeStrength: {
      label: "Fade Strength",
      widget: "range",
      min: 0,
      max: 0.2,
      step: 0.005,
      default: 0.02
    },

    numPoints: {
      label: "Points",
      widget: "range",
      min: 3,
      max: 20,
      step: 1,
      default: 6
    },

    dt: {
      label: "Time Step (dt)",
      widget: "range",
      min: 0.1,
      max: 2,
      step: 0.1,
      default: 0.5
    },

    trailAlpha: {
      label: "Polygon Alpha",
      widget: "range",
      min: 0.01,
      max: 1,
      step: 0.01,
      default: 0.6
    },

    lineWidth: {
      label: "Line Width",
      widget: "range",
      min: 0.5,
      max: 3,
      step: 0.1,
      default: 1
    },

    minLineLength: {
        label: "Min Line Length",
        widget: "range",
        min: 0,
        max: 100,
        step: 2,
        default: 5
      },


    initialSpeed: {
      label: "Initial Speed",
      widget: "range",
      min: 0,
      max: 200,
      step: 1,
      default: 50
    }
  },

  params: {
    animation:     false,
    animationRate: 1,
    targetMode:    "agent-next",
    curvatureBias: 0.2,
    jitter:        0,
    fadeStrength:  0.02,
    minLineLength: 5,
    numPoints:     6,
    dt:            0.5,
    trailAlpha:    0.6,
    lineWidth:     1,
    initialSpeed:  50
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

  onParamChange() {
    const p = this.params;

    this.update(p);

    if (p.animation) {
      startAnimation();
    } else {
      stopAnimation();
      this.draw();
    }
  }
};

/* ------------------------------------------------------------
   runPattern()
------------------------------------------------------------ */
export function runPattern() {
  printTitle(scriptInfo.title);

  scriptInfo.parameters = scriptInfo.params;
  scriptInfo.init();

  buildParameterControls(scriptInfo, "tab-scripts", true);

  scriptInfo.redrawHandler();
}
