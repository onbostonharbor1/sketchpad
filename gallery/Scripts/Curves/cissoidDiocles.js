/* ============================================================================
   SCRIPT 1 – Unified Cissoid Engine (one local frame, many engine features)
   - Engine: generate cissoid in local coords
   - Engine: apply symmetry / size / offset in local coords
   - Engine: place result into an arbitrary frame (origin + tangent + normal)
   - This script also includes a simple demo that uses ONE frame at midpoint.
   ============================================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

export const scriptInfo = {
  title: "Unified Cissoid Engine (Local Frame)",

  params: {
    midpoint: { x: 350, y: 300 },
    color: "blue",
    lineWidth: 1,

    numCurves: 5,
    spacing: 30,
    spacingBias: 0.0,

    scale: 100,
    loopSize: 1.0,

    rotation: 0,   // demo: direction of tangent for the single frame
    bound: 400,

    symmetryMode: "translate", // "translate" | "rotate" | "reflect"
    sizeVariation: "none",     // "none" | "bias"
    offsetMode: "none",        // "none" | "normalOffset"
    offsetAmount: 20,

    points: []
  },

  controls: {
    symmetryMode: {
      label: "Symmetry",
      widget: "select",
      options: [
        { value: "translate", label: "Translate" },
        { value: "rotate",    label: "Rotate" },
        { value: "reflect",   label: "Reflect" }
      ]
    },

    sizeVariation: {
      label: "Size Variation",
      widget: "select",
      options: [
        { value: "none", label: "None" },
        { value: "bias", label: "Bias" }
      ]
    },

    offsetMode: {
      label: "Offset Mode",
      widget: "select",
      options: [
        { value: "none",         label: "None" },
        { value: "normalOffset", label: "Normal Offset" }
      ]
    },

    offsetAmount: {
      label: "Offset Amount",
      widget: "range",
      min: 0,
      max: 100,
      step: 5
    },

    numCurves:   { label: "# Curves",      widget: "range", min: 1,   max: 10,  step: 1 },
    spacing:     { label: "Spacing",       widget: "range", min: 5,   max: 50,  step: 1 },
    spacingBias: { label: "Spacing Bias",  widget: "range", min: 0,   max: 1,   step: 0.05 },

    scale:       { label: "Scale",         widget: "range", min: 10,  max: 300, step: 5 },
    loopSize:    { label: "Loop Size",     widget: "range", min: 0.2, max: 3.0, step: 0.05 },

    rotation:    { label: "Rotation",      widget: "range", min: -180, max: 180, step: 10 },
    bound:       { label: "Bound",         widget: "range", min: 150,  max: 600, step: 10 },

    color:       { label: "Color",         widget: "color" },
    lineWidth:   { label: "Line width",    widget: "range", min: 0.5,  max: 4,   step: 0.5 }
  },

  parameters: null,
  elements: null,
  onParamChange() {},
  redrawHandler: null
};

/* ============================================================================
   ENGINE: Base cissoid in LOCAL coordinates
   ============================================================================ */

export function generateCissoidLocal(loopSize, scale) {
  const pts = [];
  const T = 4;
  const steps = 300;

  for (let i = 0; i <= steps; i++) {
    const t = -T + (2 * T) * (i / steps);
    const denom = 1 + t * t;

    const x = (t * t / denom) * loopSize;
    const y = (t * t * t / denom) * loopSize;

    pts.push({ x: x * scale, y: y * scale });
  }

  return pts;
}

/* ============================================================================
   ENGINE: Shape transforms in LOCAL coordinates
   ============================================================================ */

export function applyShapeTransformsLocal(pt, i, params) {
  let p = { ...pt };

  // Size variation
  if (params.sizeVariation === "bias") {
    const factor = 1 + params.spacingBias * i;
    p.x *= factor;
    p.y *= factor;
  }

  // Symmetry
  if (params.symmetryMode === "rotate") {
    const angle = (i * 20 * Math.PI) / 180;
    p = rotate(p.x, p.y, angle);
  }

  if (params.symmetryMode === "reflect") {
    if (i % 2 === 1) p.x = -p.x;
  }

  // Offset curves (normal offset in local space)
  if (params.offsetMode === "normalOffset") {
    const nx = -p.y;
    const ny = p.x;
    const len = Math.hypot(nx, ny) || 1;
    p.x += (nx / len) * params.offsetAmount;
    p.y += (ny / len) * params.offsetAmount;
  }

  return p;
}

/* ============================================================================
   ENGINE: Place local curve family into an arbitrary frame
   frame = { origin:{x,y}, tangent:{x,y}, normal:{x,y} }
   ============================================================================ */

export function drawCissoidFamilyInFrame(ctx, baseLocal, frame, params) {
  const { origin, tangent, normal } = normalizeFrame(frame);
  const bound = params.bound;

  ctx.lineWidth = params.lineWidth;
  ctx.strokeStyle = params.color;

  for (let i = 0; i < params.numCurves; i++) {
    ctx.beginPath();

    let started = false;
    let prevLocal = null;
    let prevInside = false;

    for (let j = 0; j < baseLocal.length; j++) {
      let lp = baseLocal[j];

      // Shape transforms in local space
      lp = applyShapeTransformsLocal(lp, i, params);

      // Spacing along tangent (still in local space)
      const factor = Math.max(0, 1 - params.spacingBias * i);
      const offset = i * params.spacing * factor;

      const lx = lp.x + offset;
      const ly = lp.y;

      const inside = insideBox(lx, ly, bound);

      if (inside) {
        // Local -> world: origin + lx * tangent + ly * normal
        const wx = origin.x + lx * tangent.x + ly * normal.x;
        const wy = origin.y + lx * tangent.y + ly * normal.y;

        if (!started) {
          ctx.moveTo(wx, wy);
          started = true;
        } else {
          ctx.lineTo(wx, wy);
        }

        prevLocal = { x: lx, y: ly };
        prevInside = true;
      } else {
        if (prevInside && prevLocal) {
          const currLocal = { x: lx, y: ly };
          const hit = intersectBox(prevLocal, currLocal, bound);

          const wx = origin.x + hit.x * tangent.x + hit.y * normal.x;
          const wy = origin.y + hit.x * tangent.y + hit.y * normal.y;

          ctx.lineTo(wx, wy);
          break;
        } else {
          prevInside = false;
          prevLocal = { x: lx, y: ly };
        }
      }
    }

    ctx.stroke();
  }
}

/* ============================================================================
   Utilities
   ============================================================================ */

function rotate(px, py, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: px * c - py * s, y: px * s + py * c };
}

function insideBox(x, y, b) {
  return Math.abs(x) <= b && Math.abs(y) <= b;
}

function intersectBox(prev, curr, bound) {
  let ax = prev.x, ay = prev.y;
  let bx = curr.x, by = curr.y;

  const inside = (x, y) =>
    Math.abs(x) <= bound && Math.abs(y) <= bound;

  for (let k = 0; k < 25; k++) {
    const mx = (ax + bx) * 0.5;
    const my = (ay + by) * 0.5;
    if (inside(mx, my)) {
      ax = mx; ay = my;
    } else {
      bx = mx; by = my;
    }
  }

  return { x: ax, y: ay };
}

function normalizeFrame(frame) {
  let tx = frame.tangent.x;
  let ty = frame.tangent.y;
  const tlen = Math.hypot(tx, ty) || 1;
  tx /= tlen;
  ty /= tlen;

  let nx = frame.normal.x;
  let ny = frame.normal.y;
  const nlen = Math.hypot(nx, ny) || 1;
  nx /= nlen;
  ny /= nlen;

  return {
    origin: { x: frame.origin.x, y: frame.origin.y },
    tangent: { x: tx, y: ty },
    normal: { x: nx, y: ny }
  };
}

/* ============================================================================
   init / update – same pattern as before
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
   draw() – DEMO ONLY: one frame at midpoint, tangent from rotation
   (Script 2 will ignore this and just call the engine functions above.)
   ============================================================================ */

function draw() {
  const e = scriptInfo.elements.element;

  const baseLocal = generateCissoidLocal(e.loopSize, e.scale);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const angle = (e.rotation * Math.PI) / 180;

  const tangent = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal  = { x: -tangent.y,      y:  tangent.x      };

  const frame = {
    origin: { x: e.midpoint.x, y: e.midpoint.y },
    tangent,
    normal
  };

  drawCissoidFamilyInFrame(ctx, baseLocal, frame, e);
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
