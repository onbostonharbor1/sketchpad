/* controls/scripts/barnsleyFern.js
   ============================================================
   BARNSLEY FERN (WITH MUTATION SLIDER)
   ============================================================
   An Iterated Function System (IFS) that creates a
   naturalistic fern. The Mutation slider alters the affine
   transformations to simulate different plant species.
   ============================================================ */

import { Point } from "/classes/classes.js";
import { printText, drawCircle } from "/draw/drawUtilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";

export const scriptInfo = {
  title: "Barnsley Fern Mutation",

  params: {
    iterations: 15000,
    mutation: 0,
    dotSize: 0.5,
    color: "#32cd32",
    alpha: 0.5,
    userScale: 60,
    yOffset: 40
  },

  controls: {
    iterations: { widget: "range", label: "Density", min: 1000, max: 50000, step: 1000 },
    mutation: { widget: "range", label: "Mutation Strength", min: -0.1, max: 0.1, step: 0.005 },
    dotSize: { widget: "range", label: "Leaflet Size", min: 0.1, max: 2, step: 0.1 },
    userScale: { widget: "range", label: "Zoom", min: 10, max: 150, step: 5 },
    yOffset: { widget: "range", label: "Vertical Shift", min: 0, max: 200, step: 5 },
    color: { widget: "colorPicker", label: "Plant Color" },
    alpha: { widget: "range", label: "Opacity", min: 0.1, max: 1.0, step: 0.1 }
  }
};

scriptInfo.parameters = scriptInfo.params;

/**
 * redrawHandler
 * Processes transformations with a mutation offset to change the fern shape.
 */
scriptInfo.redrawHandler = function() {
  const p = scriptInfo.params;
  const iters = Number(p.iterations);
  const dSize = Number(p.dotSize);
  const scale = Number(p.userScale);
  const yShift = Number(p.yOffset);
  const mut = Number(p.mutation);

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const cx = ctx.canvas.width / 2;
  const bottom = ctx.canvas.height - yShift;

  let x = 0;
  let y = 0;

  ctx.globalAlpha = Number(p.alpha);

  for (let i = 0; i < iters; i++) {
    const r = Math.random();
    let nextX, nextY;

    if (r < 0.01) {
      // 1. Stem (remains mostly stable)
      nextX = 0;
      nextY = 0.16 * y;
    } else if (r < 0.86) {
      // 2. Main Body (Influenced by Mutation)
      // Standard: 0.85, 0.04, -0.04, 0.85
      nextX = (0.85 + mut) * x + (0.04 + mut) * y;
      nextY = (-0.04 + mut) * x + (0.85 - mut) * y + 1.6;
    } else if (r < 0.93) {
      // 3. Left Side
      nextX = 0.2 * x - 0.26 * y;
      nextY = 0.23 * x + 0.22 * y + 1.6;
    } else {
      // 4. Right Side
      nextX = -0.15 * x + 0.28 * y;
      nextY = 0.26 * x + 0.24 * y + 0.44;
    }

    x = nextX;
    y = nextY;

    const canvasX = cx + x * scale;
    const canvasY = bottom - y * scale;

    // Use drawCircle for the point-cloud effect
    drawCircle(new Point(canvasX, canvasY), dSize, p.color, 1);
  }

  ctx.globalAlpha = 1.0;
  printText(`Mutation Factor: ${mut.toFixed(3)}`, new Point(10, 10));
};

export function runPattern() {
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();
}
