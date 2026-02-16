/* controls/scripts/chladniMultiLevelTracer.js
   ============================================================
   CHLADNI MULTI-LEVEL TRACER
   ============================================================
   Finds isolines at specific vibration intensities.
   Level 0 = The standard nodal line.
   Level +/- X = The "echo" lines for stitching boundaries.
   ============================================================ */

import { Point } from "/classes/classes.js";
import { drawLine, printText } from "/draw/drawUtilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";

export const scriptInfo = {
  title: "Chladni Multi-Level Tracer",

  params: {
    n: 5,
    m: 4,
    a: 1,
    b: 1,
    levelOffset: 0,
    numLevels: 1,
    resolution: 80,
    color: "#00ffcc",
    lineWidth: 1.5,
    alpha: 0.8
  },

  controls: {
    n: { widget: "range", label: "Freq N", min: 1, max: 20, step: 1 },
    m: { widget: "range", label: "Freq M", min: 1, max: 20, step: 1 },
    a: { widget: "range", label: "Resonance A", min: -1, max: 1, step: 0.1 },
    b: { widget: "range", label: "Resonance B", min: -1, max: 1, step: 0.1 },
    levelOffset: { widget: "range", label: "Level Offset (L)", min: 0, max: 0.5, step: 0.01 },
    numLevels: { widget: "range", label: "Mirror Levels", min: 1, max: 2, step: 1 },
    resolution: { widget: "range", label: "Smoothness", min: 20, max: 200, step: 5 },
    color: { widget: "colorPicker", label: "Line Color" },
    lineWidth: { widget: "range", label: "Line Width", min: 0.5, max: 5, step: 0.5 },
    alpha: { widget: "range", label: "Opacity", min: 0.1, max: 1.0, step: 0.1 }
  }
};

scriptInfo.parameters = scriptInfo.params;

function chladni(x, y, n, m, a, b) {
  return a * Math.sin(Math.PI * n * x) * Math.sin(Math.PI * m * y) +
         b * Math.sin(Math.PI * m * x) * Math.sin(Math.PI * n * y);
}

/**
 * traceIsoline
 * Internal helper to run the marching squares for a specific target value.
 */
function traceIsoline(target, p, ctx, mapX, mapY) {
  const res = Math.floor(Number(p.resolution));
  const n = Number(p.n);
  const m = Number(p.m);
  const a = Number(p.a);
  const b = Number(p.b);

  for (let i = 0; i < res; i++) {
    for (let j = 0; j < res; j++) {
      const x1 = i / res;
      const y1 = j / res;
      const x2 = (i + 1) / res;
      const y2 = (j + 1) / res;

      // Adjust samples by the target level
      const v1 = chladni(x1, y1, n, m, a, b) - target;
      const v2 = chladni(x2, y1, n, m, a, b) - target;
      const v3 = chladni(x1, y2, n, m, a, b) - target;
      const v4 = chladni(x2, y2, n, m, a, b) - target;

      let edges = [];
      if (v1 * v2 < 0) edges.push(new Point(mapX(x1 + (-v1 / (v2 - v1)) * (x2 - x1)), mapY(y1)));
      if (v3 * v4 < 0) edges.push(new Point(mapX(x1 + (-v3 / (v4 - v3)) * (x2 - x1)), mapY(y2)));
      if (v1 * v3 < 0) edges.push(new Point(mapX(x1), mapY(y1 + (-v1 / (v3 - v1)) * (y2 - y1))));
      if (v2 * v4 < 0) edges.push(new Point(mapX(x2), mapY(y1 + (-v2 / (v4 - v2)) * (y2 - y1))));

      if (edges.length === 2) {
        drawLine(edges[0], edges[1], p.color, p.lineWidth);
      } else if (edges.length === 4) {
        drawLine(edges[0], edges[2], p.color, p.lineWidth);
        drawLine(edges[1], edges[3], p.color, p.lineWidth);
      }
    }
  }
}

scriptInfo.redrawHandler = function() {
  const p = scriptInfo.params;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const size = Math.min(w, h) * 0.9;
  const offsetX = (w - size) / 2;
  const offsetY = (h - size) / 2;

  const mapX = (val) => offsetX + val * size;
  const mapY = (val) => offsetY + val * size;

  ctx.globalAlpha = Number(p.alpha);

  const L = Number(p.levelOffset);
  const num = Number(p.numLevels);

  // Draw the target level
  traceIsoline(L, p, ctx, mapX, mapY);

  // If Mirror is set to 2, draw the negative counterpart
  if (num === 2 && L !== 0) {
    traceIsoline(-L, p, ctx, mapX, mapY);
  }

  ctx.globalAlpha = 1.0;
};

export function runPattern() {
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();
}
