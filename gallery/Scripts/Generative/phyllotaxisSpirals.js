/* controls/scripts/phyllotaxisSpiralTracing.js
   ============================================================
   PHYLLOTAXIS SPIRAL (CIRCULAR LATTICE MODE)
   ============================================================
   By setting the angle based on a fixed 'Points Per Ring',
   we can control the exact number of radial arms or spirals.
   ============================================================ */

import { Point } from "/classes/classes.js";
import { drawLine, printText, drawCircle } from "/draw/drawUtilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";

export const scriptInfo = {
  title: "Phyllotaxis Spiral Tracing",

  params: {
    dotCount: 800,
    pointsPerRing: 50,
    spacing: 8,
    dotSize: 3,
    color: "#00bbff",
    offset: 50,
    showDots: true,
    showLines: true,
    alpha: 0.5
  },

  controls: {
    dotCount: { widget: "range", label: "Seed Count", min: 10, max: 2000, step: 10 },
    pointsPerRing: { widget: "range", label: "Points Per Ring", min: 1, max: 200, step: 0.1 },
    spacing: { widget: "range", label: "Spacing", min: 1, max: 30, step: 0.5 },
    offset: { widget: "range", label: "Spiral Offset (k)", min: 1, max: 200, step: 1 },
    dotSize: { widget: "range", label: "Dot Size", min: 0, max: 20, step: 1 },
    color: { widget: "colorPicker", label: "Color" },
    alpha: { widget: "range", label: "Alpha", min: 0.1, max: 1.0, step: 0.1 },
    showDots: { widget: "checkbox", label: "Show Dots" },
    showLines: { widget: "checkbox", label: "Show Spiral Lines" }
  }
};

scriptInfo.parameters = scriptInfo.params;

/**
 * redrawHandler
 * Renders seeds using a calculated angle based on points per ring.
 * Corrected the lexical initialization error for cy.
 */
scriptInfo.redrawHandler = function() {
  const p = scriptInfo.params;

  const count = Number(p.dotCount);
  // Angle is derived from the user's "Points Per Ring"
  const angleRad = (360 / Number(p.pointsPerRing)) * (Math.PI / 180);
  const c = Number(p.spacing);
  const dSize = Number(p.dotSize);
  const opacity = Number(p.alpha);
  const k = Math.floor(Number(p.offset));

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const cx = ctx.canvas.width / 2;
  const cy = ctx.canvas.height / 2; // Fixed initialization error

  const points = [];

  for (let n = 0; n < count; n++) {
    // Standard Phyllotaxis radius growth
    const r = c * Math.sqrt(n);
    const theta = n * angleRad;

    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    const currPt = new Point(x, y);
    points.push(currPt);

    ctx.globalAlpha = opacity;

    // Use drawCircle for the seeds
    if (p.showDots && dSize > 0) {
      drawCircle(currPt, dSize, p.color, 1);
    }

    // Connect points based on the offset k
    if (p.showLines && n >= k) {
      const prevPt = points[n - k];
      if (prevPt) {
        drawLine(prevPt, currPt, p.color, 1);
      }
    }
  }

  ctx.globalAlpha = 1.0;
  const currentAngle = (360 / Number(p.pointsPerRing)).toFixed(3);
  printText(`Points Per Ring: ${p.pointsPerRing} | Angle: ${currentAngle}°`, new Point(10, 10));
};

export function runPattern() {
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();
}
