/* controls/scripts/multifocalRose.js
   ============================================================
   MULTIFOCAL ROSE CURVE
   ============================================================
   Formula: r = cos(n1/d1 * t) + offset * cos(n2/d2 * t)

   Creates nested petal structures and complex floral centers
   by layering two different harmonic oscillations.

   Techniques to Try:

    The Nested Center: Set n1=5, d1=4 and n2=2. Keep offset low (around 0.3). You'll see a small rose forming inside the larger one.

    The "Lace" Pattern: Increase turns to 20 and set n2 to a very high number compared to n1. The inner petals will vibrate rapidly, creating a zig-zag texture.

    The Symmetry Break: Since the multifocal curve is more complex, it often takes more Turns to close the shape than a standard Grandi rose. If the shape doesn't connect at the end, increase the turns slider.
   ============================================================ */

import { Point } from "/classes/classes.js";
import { drawLine, printText, displayPoint } from "/draw/drawUtilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";

export const scriptInfo = {
  title: "Multifocal Rose Sandbox",

  params: {
    n1: 5,
    d1: 4,
    n2: 2,
    d2: 1,
    offset: 0.5,
    phase: 0,
    turns: 8,
    step: 0.05,
    userScale: 120,
    color: "#ff3366",
    lineWidth: 1.5,
    showIntersections: false
  },

  controls: {
    n1: { widget: "range", label: "Primary n", min: 1, max: 20, step: 1 },
    d1: { widget: "range", label: "Primary d", min: 1, max: 20, step: 1 },
    n2: { widget: "range", label: "Secondary n", min: 1, max: 20, step: 1 },
    offset: { widget: "range", label: "Inner Intensity", min: 0, max: 2, step: 0.1 },
    phase: { widget: "range", label: "Phase Shift", min: 0, max: Math.PI * 2, step: 0.1 },
    turns: { widget: "range", label: "Turns", min: 1, max: 50, step: 1 },
    step: { widget: "range", label: "Resolution", min: 0.001, max: 0.2, step: 0.001 },
    userScale: { widget: "range", label: "Zoom", min: 10, max: 400, step: 10 },
    color: { widget: "colorPicker", label: "Color" },
    showIntersections: { widget: "checkbox", label: "Show Intersections" }
  }
};

scriptInfo.parameters = scriptInfo.params;

/**
 * getLineIntersection(p1, p2, p3, p4)
 * Standard intersection check.
 */
function getLineIntersection(p1, p2, p3, p4) {
    const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (denom === 0) return null;
    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
    const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
    const epsilon = 0.01;
    if (ua > epsilon && ua < (1 - epsilon) && ub > epsilon && ub < (1 - epsilon)) {
        return new Point(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
    }
    return null;
}

/**
 * redrawHandler
 * Renders the primary and secondary harmonic interference.
 */
scriptInfo.redrawHandler = function() {
  const p = scriptInfo.params;
  const k1 = p.n1 / p.d1;
  const k2 = p.n2 / p.d2;
  const tMax = Math.PI * p.turns;
  const dt = p.step;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const cx = ctx.canvas.width / 2;
  const cy = ctx.canvas.height / 2;

  const segments = [];
  let prevPt = null;

  for (let t = 0; t <= tMax; t += dt) {
    // Multifocal Math: Primary + (Offset * Secondary)
    const r = Math.cos(k1 * t + p.phase) + (p.offset * Math.cos(k2 * t));

    const x = cx + (r * Math.cos(t)) * p.userScale;
    const y = cy + (r * Math.sin(t)) * p.userScale;
    const currPt = new Point(x, y);

    if (prevPt) {
      const newSeg = { p1: prevPt, p2: currPt };
      drawLine(newSeg.p1, newSeg.p2, p.color, p.lineWidth);

      if (p.showIntersections && segments.length > 2) {
        for (let j = 0; j < segments.length - 2; j++) {
          const old = segments[j];
          const hit = getLineIntersection(newSeg.p1, newSeg.p2, old.p1, old.p2);
          if (hit) displayPoint(hit, "red");
        }
      }
      segments.push(newSeg);
    }
    prevPt = currPt;
  }
};

export function runPattern() {
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();
}
