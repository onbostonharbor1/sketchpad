/* ============================================================
   Hypocycloid — Evolute & Dual-Area Stitch Mode
   ============================================================ */

import { Point } from "/classes/classes.js";
import { drawLine } from "/draw/drawUtilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";

export const scriptInfo = {
  title: "Hypocycloid Dual Stitcher",
  params: {
    cusps: 4,
    baseRadius: 180,
    rotationDeg: 0,
    samples: 1200,
    lineWidth: 1,
    strokeAlpha: 0.8,
    showBase: true,
    showEvolute: true,
    stitchMode: "Both",
    stitchSkip: 30,
    stitchPasses: 1,
    color: "#00d4ff"
  },
  controls: {},
  parameters: null
};

const elements = {
  basePoints: [],
  evolutePoints: [],
  lastStitchMode: null
};

/**
 * buildControls
 * Logic-driven UI: Option "Both" renders identical stitches in both paths.
 */
function buildControls(stitchMode) {
  const controls = {
    cusps: { widget: "range", label: "Cusps (N)", min: 2, max: 20, step: 1 },
    baseRadius: { widget: "range", label: "Radius (R)", min: 40, max: 300, step: 1 },
    rotationDeg: { widget: "range", label: "Rotation", min: 0, max: 360, step: 1 },
    samples: { widget: "range", label: "Resolution", min: 200, max: 5000, step: 50 },
    showBase: { widget: "checkbox", label: "Show Base Path" },
    showEvolute: { widget: "checkbox", label: "Show Evolute Path" },
    stitchMode: {
      widget: "select",
      label: "Stitch Area",
      options: ["None", "Hypo Only", "Evolute Only", "Both"]
    },
    color: { widget: "colorPicker", label: "Color" }
  };

  if (stitchMode !== "None") {
    controls.stitchSkip = { widget: "range", label: "Stitch Skip", min: 1, max: 200, step: 1 };
    controls.stitchPasses = { widget: "range", label: "Passes", min: 1, max: 10, step: 1 };
  }
  return controls;
}

/**
 * computeGeometry
 * Calculates points and applies rotation/centering directly.
 */
function computeGeometry(p) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  const R = p.baseRadius;
  const r = R / Math.max(2, p.cusps);
  const k = R - r;
  const ratio = k / r;
  const rot = (p.rotationDeg * Math.PI) / 180;

  const bPts = [];
  const ePts = [];
  const tMax = Math.PI * 2 * p.cusps;

  const cosRot = Math.cos(rot);
  const sinRot = Math.sin(rot);

  for (let i = 0; i <= p.samples; i++) {
    const t = (i / p.samples) * tMax + 0.0001;

    // Base Position
    const x0 = k * Math.cos(t) + r * Math.cos(ratio * t);
    const y0 = k * Math.sin(t) - r * Math.sin(ratio * t);

    // Derivatives for Evolute
    const dx = -k * Math.sin(t) - k * Math.sin(ratio * t);
    const dy = k * Math.cos(t) - k * Math.cos(ratio * t);
    const ddx = -k * Math.cos(t) - (k * ratio) * Math.cos(ratio * t);
    const ddy = -k * Math.sin(t) + (k * ratio) * Math.sin(ratio * t);

    const denom = (dx * ddy - dy * ddx);
    let ex = x0, ey = y0;

    if (Math.abs(denom) > 1e-6) {
      const common = (dx * dx + dy * dy) / denom;
      ex = x0 - dy * common;
      ey = y0 + dx * common;
    }

    // Apply rotation and center on canvas
    const rotateAndCenter = (px, py) => {
      const xr = px * cosRot - py * sinRot;
      const yr = px * sinRot + py * cosRot;
      return new Point(cx + xr, cy + yr);
    };

    bPts.push(rotateAndCenter(x0, y0));
    ePts.push(rotateAndCenter(ex, ey));
  }

  elements.basePoints = bPts;
  elements.evolutePoints = ePts;
}

scriptInfo.redrawHandler = function() {
  const p = scriptInfo.params;

  if (elements.lastStitchMode !== p.stitchMode) {
    elements.lastStitchMode = p.stitchMode;
    scriptInfo.controls = buildControls(p.stitchMode);
    buildParameterControls(scriptInfo, "tab-scripts", true);
  }

  computeGeometry(p);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalAlpha = p.strokeAlpha;

  const b = elements.basePoints;
  const e = elements.evolutePoints;

  // 1. Draw Paths
  if (p.showBase && b.length > 1) {
    ctx.beginPath();
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.lineWidth;
    ctx.moveTo(b[0].x, b[0].y);
    for (let i = 1; i < b.length; i++) ctx.lineTo(b[i].x, b[i].y);
    ctx.stroke();
  }

  if (p.showEvolute && e.length > 1) {
    ctx.beginPath();
    ctx.strokeStyle = "#888";
    ctx.lineWidth = p.lineWidth;
    ctx.setLineDash([5, 5]);
    ctx.moveTo(e[0].x, e[0].y);
    for (let i = 1; i < e.length; i++) ctx.lineTo(e[i].x, e[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 2. Dual-Stitch Logic
  if (p.stitchMode !== "None") {
    const skip = Math.floor(p.stitchSkip);
    for (let pass = 0; pass < p.stitchPasses; pass++) {
      for (let i = 0; i < b.length; i++) {
        const j = (i + skip + pass) % b.length;

        // Mode "Both" triggers both blocks independently
        if (p.stitchMode === "Hypo Only" || p.stitchMode === "Both") {
          drawLine(b[i], b[j], p.color, p.lineWidth);
        }

        if (p.stitchMode === "Evolute Only" || p.stitchMode === "Both") {
          // Note: using the same color and skip for a mirrored look
          drawLine(e[i], e[j], p.color, p.lineWidth);
        }
      }
    }
  }
};

export function runPattern() {
  scriptInfo.parameters = scriptInfo.params;
  scriptInfo.controls = buildControls(scriptInfo.params.stitchMode);
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();
}
