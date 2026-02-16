/* controls/scripts/lorenzAttractorCentered.js
   ============================================================
   LORENZ ATTRACTOR (AUTO-CENTERING)
   ============================================================ */

import { Point } from "/classes/classes.js";
import { drawLine, printText } from "/draw/drawUtilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";

export const scriptInfo = {
  title: "Lorenz Attractor (Centered)",
  params: {
    iterations: 8000,
    sigma: 10, rho: 28, beta: 2.666,
    dt: 0.01, userScale: 15,
    color: "#00ff88", alpha: 0.5
  },
  controls: {
    iterations: { widget: "range", label: "Length", min: 1000, max: 30000, step: 1000 },
    rho: { widget: "range", label: "Rho (Shape)", min: 1, max: 50, step: 1 },
    userScale: { widget: "range", label: "Zoom", min: 5, max: 40, step: 1 },
    color: { widget: "colorPicker", label: "Color" }
  }
};

scriptInfo.redrawHandler = function() {
  const p = scriptInfo.params;
  const dt = Number(p.dt);
  const scale = Number(p.userScale);

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // --- PASS 1: Calculate Raw Points ---
  let x = 0.1, y = 0, z = 0;
  const rawPoints = [];

  for (let i = 0; i < p.iterations; i++) {
    const dx = p.sigma * (y - x) * dt;
    const dy = (x * (p.rho - z) - y) * dt;
    const dz = (x * y - p.beta * z) * dt;
    x += dx; y += dy; z += dz;

    // Store scaled but uncentered points
    rawPoints.push(new Point(x * scale, y * scale));
  }

  // --- PASS 2: Calculate Offset & Draw ---
  const offset = getTranslationOffset(rawPoints, ctx.canvas.width, ctx.canvas.height);

  ctx.globalAlpha = p.alpha;
  ctx.beginPath();
  for (let i = 1; i < rawPoints.length; i++) {
    const p1 = rawPoints[i-1];
    const p2 = rawPoints[i];

    // Apply the offset here
    const start = new Point(p1.x + offset.x, p1.y + offset.y);
    const end = new Point(p2.x + offset.x, p2.y + offset.y);

    drawLine(start, end, p.color, 1);
  }
  ctx.globalAlpha = 1.0;
};

// ... Utility function getTranslationOffset goes here ...
/**
 * getTranslationOffset
 * Calculates the shift needed to center a set of points on the canvas.
 * @param {Array} points - Array of Point objects
 * @param {number} canvasW - Width of canvas
 * @param {number} canvasH - Height of canvas
 * @returns {Object} {x, y} offsets
 */
function getTranslationOffset(points, canvasW, canvasH) {
  if (points.length === 0) return { x: 0, y: 0 };

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  // Find the boundaries
  for (const pt of points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  // Find the center of the drawing
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Return the difference between canvas center and drawing center
  return {
    x: (canvasW / 2) - centerX,
    y: (canvasH / 2) - centerY
  };
}



export function runPattern() {
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();
}
