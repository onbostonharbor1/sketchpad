/* ============================================================================
   SCRIPT 1 – Unified Conchoid Engine (The Organic Shell)
   ============================================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

export const scriptInfo = {
  title: "Conchoid Organic Engine",

  params: {
    midpoint: { x: 400, y: 400 },
    color: "#ff0000",
    lineWidth: 1.2,

    numCurves: 30,
    spacingD: 8,
    spacingA: 1.5,  // Controls the "fanning" spread

    globalScale: 1.0,
    a: 30,          // Small 'a' creates the tight organic center
    d: 100,

    rotation: 0,
    bound: 600,
    colorMode: "monochrome", // "monochrome" | "rainbow"

    points: []
  },

  controls: {
    globalScale: { label: "Global Scale", widget: "range", min: 0.1, max: 2.0, step: 0.1 },
    a:           { label: "Base Asymptote", widget: "range", min: 2,   max: 200, step: 1 },
    d:           { label: "Base Distance",  widget: "range", min: 5,   max: 400, step: 2 },

    numCurves:   { label: "# Curves",      widget: "range", min: 1,   max: 100, step: 1 },
    spacingD:    { label: "d-Growth",      widget: "range", min: -10, max: 40,  step: 1 },
    spacingA:    { label: "a-Growth (Fan)", widget: "range", min: 0,   max: 10,  step: 0.2 },

    colorMode: {
      label: "Color Mode",
      widget: "select",
      options: [
        { value: "monochrome", label: "Monochrome" },
        { value: "rainbow",    label: "Rainbow" }
      ]
    },

    rotation:    { label: "Rotation",      widget: "range", min: -180, max: 180, step: 5 },
    bound:       { label: "Bound Box",     widget: "range", min: 100,  max: 1000, step: 10 },
    color:       { label: "Color",         widget: "color" },
    lineWidth:   { label: "Line width",    widget: "range", min: 0.5,  max: 3,   step: 0.1 }
  },

  parameters: null,
  elements: null,
  onParamChange() {},
  redrawHandler: null
};

/**
 * Renders the conchoid. Meeting at the pole is guaranteed by the theta range.
 */
function drawConchoid(ctx, ox, oy, angle, e, currentA, currentD, hue) {
  const steps = 400;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const limit = Math.PI * 0.48; // Wide limit for organic tails

  if (e.colorMode === "rainbow") {
    ctx.strokeStyle = `hsl(${hue}, 80%, 50%)`;
  }

  [1, -1].forEach(sign => {
    ctx.beginPath();
    let started = false;

    for (let i = 0; i <= steps; i++) {
      const theta = -limit + (2 * limit) * (i / steps);
      const secant = 1 / Math.cos(theta);

      const r = ((currentA * secant) + (sign * currentD)) * e.globalScale;

      const lx = r * Math.cos(theta);
      const ly = r * Math.sin(theta);

      const wx = ox + (lx * cosA - ly * sinA);
      const wy = oy + (lx * sinA + ly * cosA);

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
  });
}

function draw() {
  const e = scriptInfo.elements.element;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.strokeStyle = e.color;
  ctx.lineWidth = e.lineWidth;

  const rad = (e.rotation * Math.PI) / 180;

  for (let i = 0; i < e.numCurves; i++) {
    const currentA = e.a + (i * e.spacingA);
    const currentD = e.d + (i * e.spacingD);
    const hue = (i / e.numCurves) * 360;

    drawConchoid(ctx, e.midpoint.x, e.midpoint.y, rad, e, currentA, currentD, hue);
  }

  // Draw the Pole
  ctx.fillStyle = e.color;
  ctx.beginPath();
  ctx.arc(e.midpoint.x, e.midpoint.y, 3, 0, Math.PI * 2);
  ctx.fill();
}

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
