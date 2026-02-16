/* ============================================================================
   SCRIPT 2 — Global Coordinate Version (All Families + Parallel Option)
   ============================================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

export const scriptInfo = {
  title: "Cissoid Families (Parallel Option)",

  params: {
    midpoint: { x: 350, y: 300 },
    color: "#0066ff",
    lineWidth: 1.5,
    effect: "parallelOffset",
    numCurves: 12,
    circleRadius: 140,
    scale: 120,
    bound: 400,

    offsetStep: 20,
    arcRange: 360,
    globalRotation: 0,
    colorMode: "monochrome", // "monochrome" | "rainbow"

    points: []
  },

  controls: {
    effect: {
      label: "Effect",
      widget: "select",
      options: [
        { value: "parallelOffset",  label: "Parallel Offset" },
        { value: "offsetCurve",     label: "Offset Curve" },
        { value: "expandingFan",    label: "Expanding Fan" },
        { value: "contractingFan",  label: "Contracting Fan" },
        { value: "breathing",       label: "Breathing" },
        { value: "radialSpokes",    label: "Radial Spokes" }
      ]
    },

    colorMode: {
      label: "Color Mode",
      widget: "select",
      options: [
        { value: "monochrome", label: "Monochrome" },
        { value: "rainbow",    label: "Rainbow" }
      ]
    },

    offsetStep:     { label: "Offset Step",    widget: "range", min: 5,   max: 50,  step: 1 },
    bound:          { label: "Bound Box",      widget: "range", min: 50,  max: 600, step: 10 },
    arcRange:       { label: "Arc Range",      widget: "range", min: 45,  max: 360, step: 5 },
    globalRotation: { label: "Global Rotate",  widget: "range", min: 0,   max: 360, step: 1 },

    numCurves:    { label: "# Curves",      widget: "range", min: 1,  max: 64,  step: 1 },
    scale:        { label: "Cissoid Scale",  widget: "range", min: 20, max: 300, step: 5 },
    color:        { label: "Color",          widget: "color" },
    lineWidth:    { label: "Line width",     widget: "range", min: 0.5, max: 4,  step: 0.5 }
  },

  parameters: null,
  elements: null,
  onParamChange() {},
  redrawHandler: null
};

/* ============================================================================
   CORE ENGINE: World-Space Calculation with Parallel Normal Offsets
   ============================================================================ */

function drawCissoidParallel(ctx, ox, oy, angle, offsetAmount, e) {
  const T = 6;
  const steps = 400;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  ctx.beginPath();
  let started = false;

  for (let i = 0; i <= steps; i++) {
    const t = -T + (2 * T) * (i / steps);
    const denom = 1 + t * t;

    // 1. Position
    const lx = (t * t / denom) * e.scale;
    const ly = (t * t * t / denom) * e.scale;

    // 2. Derivative (for normal calculation)
    const dDenom = denom * denom;
    const ldx = (2 * t) / dDenom;
    const ldy = (3 * t * t + Math.pow(t, 4)) / dDenom;

    // 3. Normal Vector
    const mag = Math.hypot(ldx, ldy) || 1;
    const lnx = -ldy / mag;
    const lny = ldx / mag;

    // 4. Offset local point
    const lpx = lx + lnx * offsetAmount;
    const lpy = ly + lny * offsetAmount;

    // 5. World Space
    const wx = ox + (lpx * cos - lpy * sin);
    const wy = oy + (lpx * sin + lpy * cos);

    if (Math.abs(wx - e.midpoint.x) <= e.bound && Math.abs(wy - e.midpoint.y) <= e.bound) {
      if (!started) {
        ctx.moveTo(wx, wy);
        started = true;
      } else {
        ctx.lineTo(wx, wy);
      }
    } else {
      started = false;
    }
  }
  ctx.stroke();
}

/* ============================================================================
   FAMILIES: Effect Management
   ============================================================================ */

function drawFamilies(ctx, e) {
  const { x: cx, y: cy } = e.midpoint;
  const arcRad = (e.arcRange * Math.PI) / 180;
  const globalRotRad = (e.globalRotation * Math.PI) / 180;

  for (let i = 0; i < e.numCurves; i++) {
    const t = e.numCurves > 1 ? i / (e.numCurves - 1) : 0;
    const currentTheta = (t * arcRad) + globalRotRad;

    // Color logic
    if (e.colorMode === "rainbow") {
      ctx.strokeStyle = `hsl(${(t * 360)}, 80%, 50%)`;
    } else {
      ctx.strokeStyle = e.color;
    }
    ctx.lineWidth = e.lineWidth;

    if (e.effect === "parallelOffset") {
      // Logic for the requested image style
      const offset = (i - (e.numCurves - 1) / 2) * e.offsetStep;
      drawCissoidParallel(ctx, cx, cy, globalRotRad, offset, e);
    } else {
      // Standard families logic
      let ox, oy, angle;
      switch (e.effect) {
        case "expandingFan":
          const fanAngle = globalRotRad - (arcRad * 0.4) + (arcRad * 0.8 * t);
          const r = e.circleRadius * (0.5 + t);
          ox = cx + Math.cos(fanAngle) * r; oy = cy + Math.sin(fanAngle) * r;
          angle = fanAngle; break;
        case "breathing":
          const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 500);
          ox = cx + Math.cos(currentTheta) * e.circleRadius * pulse;
          oy = cy + Math.sin(currentTheta) * e.circleRadius * pulse;
          angle = currentTheta; break;
        case "radialSpokes":
          ox = cx; oy = cy; angle = currentTheta; break;
        default:
          ox = cx + Math.cos(currentTheta) * e.circleRadius;
          oy = cy + Math.sin(currentTheta) * e.circleRadius;
          angle = currentTheta;
      }
      drawCissoidParallel(ctx, ox, oy, angle, 0, e);
    }
  }
}

/* ============================================================================
   BOILERPLATE
   ============================================================================ */

function init() {
  const p = scriptInfo.params;
  if (p.points.length === 0) p.points.push({ x: p.midpoint.x, y: p.midpoint.y });
  scriptInfo.elements = { element: { ...p } };
}

function update(incoming) {
  const e = scriptInfo.elements.element;
  for (const key in incoming) {
    if (incoming[key] !== undefined && Object.hasOwn(e, key)) e[key] = incoming[key];
  }
  if (incoming.points) {
    e.midpoint.x = incoming.points[0].x;
    e.midpoint.y = incoming.points[0].y;
  }
}

function draw() {
  const e = scriptInfo.elements.element;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawFamilies(ctx, e);

  if (e.effect === "breathing" || e.colorMode === "rainbow") {
    requestAnimationFrame(() => scriptInfo.redrawHandler());
  }
}

export function runPattern() {
  scriptInfo.parameters = scriptInfo.params;
  init();
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler = () => {
    update(scriptInfo.params);
    draw();
  };
  scriptInfo.redrawHandler();
  if (window.armInteractor) window.armInteractor(scriptInfo);
}
