/* ============================================================================
   SCRIPT 2 — FULL RESTORED VERSION WITH ALL FAMILIES + CISSOID ENGINE
   ============================================================================ */

   import { buildParameterControls } from "/ui/parameterControls.js";
export const scriptInfo = {
  title: "Cissoid Families (Restored)",

  params: {
    midpoint: { x: 350, y: 300 },
    color: "#0066ff",
    lineWidth: 1.5,

    effect: "offsetCurve",

    numCurves: 24,
    circleRadius: 140,
    scale: 120,
    bound: 500,

    points: []
  },

  controls: {
    effect: {
      label: "Effect",
      widget: "select",
      options: [
        { value: "offsetCurve",    label: "Offset Curve" },
        { value: "expandingFan",   label: "Expanding Fan" },
        { value: "contractingFan", label: "Contracting Fan" },
        { value: "breathing",      label: "Breathing" },
        { value: "hyperbolic",     label: "Hyperbolic" },
        { value: "radialSpokes",   label: "Radial Spokes" },
        { value: "tickMarks",      label: "Tick Marks" }
      ]
    },

    numCurves:    { label: "# Curves",       widget: "range", min: 1,  max: 64,  step: 1 },
    circleRadius: { label: "Circle Radius",  widget: "range", min: 40, max: 300, step: 5 },
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
   init / update
   ============================================================================ */

function init() {
  const p = scriptInfo.params;

  if (p.points.length === 0)
    p.points.push({ x: p.midpoint.x, y: p.midpoint.y });

  const pt = p.points[0];

  scriptInfo.elements = {
    element: {
      ...p,
      midpoint: { x: pt.x, y: pt.y }
    }
  };
}

function update(incoming) {
  const e = scriptInfo.elements.element;
  const p = scriptInfo.params;

  for (const key in incoming) {
    const val = incoming[key];
    if (val === undefined) continue;

    if (key === "points") {
      const pt = p.points[0];
      e.midpoint.x = pt.x;
      e.midpoint.y = pt.y;
    } else if (Object.hasOwn(e, key)) {
      e[key] = val;
    }
  }
}

/* ============================================================================
   CISSOID ENGINE (CLASSICAL, RESTORED)
   ============================================================================ */

   function generateCissoidLocal(scale) {
    const pts = [];
    const steps = 600;

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * 4 - 2;   // -2 → +2

      // Classical cissoid of Diocles
      const denom = 1 + t * t;
      const x = (2 * t * t) / denom;
      const y = (2 * t * t * t) / denom;

      pts.push({ x: x * scale, y: y * scale });
    }

    return pts;
  }


function drawCissoidInFrame(ctx, localPts, frame, params) {
  const { origin, tangent, normal } = frame;
  const { bound, centerX, centerY, color, lineWidth } = params;

  const half = bound * 0.5;
  const minX = centerX - half;
  const maxX = centerX + half;
  const minY = centerY - half;
  const maxY = centerY + half;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  ctx.beginPath();
  let started = false;

  for (const lp of localPts) {
    const wx = origin.x + lp.x * tangent.x + lp.y * normal.x;
    const wy = origin.y + lp.x * tangent.y + lp.y * normal.y;

    const inside =
      wx >= minX && wx <= maxX &&
      wy >= minY && wy <= maxY;

    if (inside) {
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

function makeParams(e) {
  return {
    bound: e.bound,
    centerX: e.midpoint.x,
    centerY: e.midpoint.y,
    color: e.color,
    lineWidth: e.lineWidth
  };
}

/* ============================================================================
   FAMILIES (FULL SET, RESTORED)
   ============================================================================ */

   function drawOffsetCurveFamily(ctx, e, localPts) {
    const cx = e.midpoint.x;
    const cy = e.midpoint.y;

    // reference circle
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, e.circleRadius, 0, Math.PI * 2);
    ctx.stroke();

    const params = makeParams(e);

    for (let i = 0; i < e.numCurves; i++) {
      const theta = (i / e.numCurves) * 2 * Math.PI;

      // point on circle
      const px = cx + Math.cos(theta) * e.circleRadius;
      const py = cy + Math.sin(theta) * e.circleRadius;

      // OUTWARD normal (this is the direction the cissoid should open)
      const nx = Math.cos(theta);
      const ny = Math.sin(theta);

      // tangent = rotate normal 90° clockwise
      // this makes +x = tangent, +y = outward
      const tx = ny;
      const ty = -nx;

      const frame = {
        origin: { x: px, y: py },
        tangent: { x: tx, y: ty },
        normal:  { x: nx, y: ny }
      };

      drawCissoidInFrame(ctx, localPts, frame, params);
    }
  }


function drawExpandingFan(ctx, e, localPts) {
  const params = makeParams(e);
  const cx = e.midpoint.x;
  const cy = e.midpoint.y;

  const baseAngle = -Math.PI / 2;
  const spread = Math.PI * 0.8;

  for (let i = 0; i < e.numCurves; i++) {
    const t = i / (e.numCurves - 1);
    const angle = baseAngle - spread * 0.5 + spread * t;
    const r = e.circleRadius * (0.5 + t);

    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;

    const tangent = { x: Math.cos(angle), y: Math.sin(angle) };
    const normal  = { x: -Math.sin(angle), y: Math.cos(angle) };

    const frame = { origin: { x: px, y: py }, tangent, normal };

    drawCissoidInFrame(ctx, localPts, frame, params);
  }
}

function drawContractingFan(ctx, e, localPts) {
  const params = makeParams(e);
  const cx = e.midpoint.x;
  const cy = e.midpoint.y;

  const baseAngle = -Math.PI / 2;
  const spread = Math.PI * 0.8;

  for (let i = 0; i < e.numCurves; i++) {
    const t = i / (e.numCurves - 1);
    const angle = baseAngle - spread * 0.5 + spread * t;
    const r = e.circleRadius * (1.2 - t);

    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;

    const tangent = { x: Math.cos(angle), y: Math.sin(angle) };
    const normal  = { x: -Math.sin(angle), y: Math.cos(angle) };

    const frame = { origin: { x: px, y: py }, tangent, normal };

    drawCissoidInFrame(ctx, localPts, frame, params);
  }
}

function drawBreathing(ctx, e, localPts) {
  const params = makeParams(e);
  const cx = e.midpoint.x;
  const cy = e.midpoint.y;

  const time = (performance.now() % 4000) / 4000;
  const radiusScale = 0.7 + 0.3 * Math.sin(time * 2 * Math.PI);

  for (let i = 0; i < e.numCurves; i++) {
    const theta = (i / e.numCurves) * 2 * Math.PI;
    const r = e.circleRadius * radiusScale;

    const px = cx + Math.cos(theta) * r;
    const py = cy + Math.sin(theta) * r;

    const tangent = { x: -Math.sin(theta), y: Math.cos(theta) };
    const normal  = { x:  Math.cos(theta), y: Math.sin(theta) };

    const frame = { origin: { x: px, y: py }, tangent, normal };

    drawCissoidInFrame(ctx, localPts, frame, params);
  }
}

function drawHyperbolic(ctx, e, localPts) {
  const params = makeParams(e);
  const cx = e.midpoint.x;
  const cy = e.midpoint.y;

  for (let i = 0; i < e.numCurves; i++) {
    const t = (i + 1) / (e.numCurves + 1);
    const theta = t * 2 * Math.PI;
    const r = e.circleRadius * (1 / (0.3 + t));

    const px = cx + Math.cos(theta) * r;
    const py = cy + Math.sin(theta) * r;

    const tangent = { x: -Math.sin(theta), y: Math.cos(theta) };
    const normal  = { x:  Math.cos(theta), y: Math.sin(theta) };

    const frame = { origin: { x: px, y: py }, tangent, normal };

    drawCissoidInFrame(ctx, localPts, frame, params);
  }
}

function drawRadialSpokes(ctx, e, localPts) {
  const params = makeParams(e);
  const cx = e.midpoint.x;
  const cy = e.midpoint.y;

  for (let i = 0; i < e.numCurves; i++) {
    const theta = (i / e.numCurves) * 2 * Math.PI;
    const r = e.circleRadius;

    const px = cx + Math.cos(theta) * r;
    const py = cy + Math.sin(theta) * r;

    const tangent = { x: Math.cos(theta), y: Math.sin(theta) };
    const normal  = { x: -Math.sin(theta), y: Math.cos(theta) };

    const frame = { origin: { x: px, y: py }, tangent, normal };

    drawCissoidInFrame(ctx, localPts, frame, params);
  }
}

function drawTickMarks(ctx, e, localPts) {
  const params = makeParams(e);
  const cx = e.midpoint.x;
  const cy = e.midpoint.y;

  const ticks = e.numCurves;

  for (let i = 0; i < ticks; i++) {
    const theta = (i / ticks) * 2 * Math.PI;
    const rInner = e.circleRadius * 0.95;
    const rOuter = e.circleRadius * 1.05;

    const px = cx + Math.cos(theta) * rOuter;
    const py = cy + Math.sin(theta) * rOuter;

    const tangent = { x: -Math.sin(theta), y: Math.cos(theta) };
    const normal  = { x:  Math.cos(theta), y: Math.sin(theta) };

    const frame = { origin: { x: px, y: py }, tangent, normal };

    drawCissoidInFrame(ctx, localPts, frame, params);

    // radial tick
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(theta) * rInner, cy + Math.sin(theta) * rInner);
    ctx.lineTo(cx + Math.cos(theta) * rOuter, cy + Math.sin(theta) * rOuter);
    ctx.stroke();
  }
}

/* ============================================================================
   draw()
   ============================================================================ */

function draw() {
  const e = scriptInfo.elements.element;

  // FIX: supply a step count
  const localPts = generateCissoidLocal(e.scale, 400);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  switch (e.effect) {
    case "offsetCurve":
      drawOffsetCurveFamily(ctx, e, localPts);
      break;
    case "expandingFan":
      drawExpandingFan(ctx, e, localPts);
      break;
    case "contractingFan":
      drawContractingFan(ctx, e, localPts);
      break;
    case "breathing":
      drawBreathing(ctx, e, localPts);
      break;
    case "hyperbolic":
      drawHyperbolic(ctx, e, localPts);
      break;
    case "radialSpokes":
      drawRadialSpokes(ctx, e, localPts);
      break;
    case "tickMarks":
      drawTickMarks(ctx, e, localPts);
      break;
  }
}


/* ============================================================================
   runPattern()
   ============================================================================ */

export function runPattern() {
  scriptInfo.parameters = scriptInfo.params;

  init();
  buildParameterControls(scriptInfo, "tab-scripts", true);

  scriptInfo.redrawHandler = () => {
    update(scriptInfo.params);
    draw();
  };

  scriptInfo.redrawHandler();

  if (window.armInteractor)
    window.armInteractor(scriptInfo);
}
