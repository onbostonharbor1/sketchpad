/* controls/scripts/roseVisualizer.js
   ============================================================
   ROSE CURVE VISUALIZER
   ============================================================
   Formula:
   r = cos((n / d) * t)
   x(t) = r * cos(t)
   y(t) = r * sin(t)

   Table of Drawings and Ratios (n/d):
   | Index | n | d | Ratio |
   |-------|---|---|-------|
   | 1     | 1 | 7 | 1/7   |
   | 2     | 1 | 6 | 1/6   |
   | 3     | 1 | 5 | 1/5   |
   | 10    | 4 | 7 | 4/7   |
   | 41    | 6 | 1 | 6/1   |
   ============================================================ */

import { Point } from "/classes/classes.js";
import { Parametric } from "/classes/parametric.js";
import { drawParametric } from "/draw/drawParametrics.js";
import { buildParameterControls } from "/ui/parameterControls.js";
import { printText } from "/draw/drawUtilities.js";

/**
 * Reconstructs the n/d ratios based on the provided grid.
 */
function getRoseRatios() {
  const ratios = [
    {n:1, d:7}, {n:1, d:6}, {n:1, d:5}, {n:1, d:4}, {n:2, d:7},
    {n:1, d:3}, {n:2, d:5}, {n:3, d:7}, {n:1, d:2}, {n:4, d:7},
    {n:3, d:5}, {n:2, d:3}, {n:5, d:7}, {n:3, d:4}, {n:4, d:5},
    {n:5, d:6}, {n:6, d:7}, {n:1, d:1}, {n:8, d:7}, {n:7, d:6},
    {n:6, d:5}, {n:5, d:4}, {n:9, d:7}, {n:4, d:3}, {n:7, d:5},
    {n:10,d:7}, {n:3, d:2}, {n:11,d:7}, {n:8, d:5}, {n:5, d:3},
    {n:12,d:7}, {n:7, d:4}, {n:9, d:5}, {n:11,d:6}, {n:13,d:7},
    {n:2, d:1}, {n:3, d:1}, {n:4, d:1}, {n:5, d:1}, {n:6, d:1}
  ];
  return ratios;
}

const ROSE_DATA = getRoseRatios();

export const scriptInfo = {
  title: "Rose Curve Gallery",
  params: {
    index: 1,
    resolution: 2000,
    color: "#0000ff",
    lineWidth: 1.5,
    userScale: 1.0
  },
  controls: {
    index: {
      widget: "thumbnailGrid",
      label: "Select Ratio",
      options: ROSE_DATA.map((val, i) => ({
        value: i + 101,
        src: `./images/${i + 1}.png`
      }))
    },
    userScale: {
      widget: "range",
      label: "Drawing Scale",
      min: 0.1,
      max: 1.0,
      step: 0.05
    },
    resolution: {
      widget: "range",
      label: "Resolution",
      min: 500,
      max: 5000,
      step: 100
    },
    color: {
      widget: "colorPicker",
      label: "Stroke Color"
    },
    lineWidth: {
      widget: "range",
      label: "Line Width",
      min: 0.5,
      max: 5,
      step: 0.5
    }
  }
};

scriptInfo.parameters = scriptInfo.params;

scriptInfo.redrawHandler = function() {
  const p = scriptInfo.params;
  const data = ROSE_DATA[p.index - 1] || ROSE_DATA[0];
  const n = data.n;
  const d = data.d;

  // The model uses the Polar-to-Parametric conversion
  const model = new Parametric({
    funcX: (t) => Math.cos((n / d) * t) * Math.cos(t),
    funcY: (t) => Math.cos((n / d) * t) * Math.sin(t),
    color: p.color,
    lineWidth: p.lineWidth,
    margin: 40,
    domain: {
      tMin: 0,
      tMax: Math.PI * d * (n % 2 === 0 || d % 2 === 0 ? 2 : 1),
      numPoints: p.resolution
    }
  });

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const cx = ctx.canvas.width / 2;
  const cy = ctx.canvas.height / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(p.userScale, p.userScale);
  ctx.translate(-cx, -cy);

  drawParametric(model);
  ctx.restore();

  // Print text using Point class at 10, 10
  const labelPt = new Point(10, 10);
  ctx.fillStyle = p.color;
  printText(`Drawing: ${p.index} (Ratio: ${n}/${d})`, labelPt);
};

export function runPattern() {
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();
}
