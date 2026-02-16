/* controls/scripts/roseSandbox.js
   ============================================================
   ROSE CURVE SANDBOX (MANUAL SCALE + INTERSECTIONS)
   ============================================================
   Formula: r = cos((n / d) * t + phase)

   Direct rendering loop allows visible changes to 'turns' and
   'step' while manually checking for self-intersections.
   ============================================================ */

import { Point } from "/classes/classes.js";
import { drawLine, printText, displayPoint } from "/draw/drawUtilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";

export const scriptInfo = {
  title: "Rose Curve Sandbox",

  params: {
    n: 5,
    d: 4,
    phase: 0,
    turns: 2,
    step: 0.1,
    userScale: 150,
    color: "#0077cc",
    lineWidth: 1.5,
    showIntersections: false
  },

  controls: {
    n: { widget: "range", label: "n (numerator)", min: 1, max: 20, step: 1 },
    d: { widget: "range", label: "d (denominator)", min: 1, max: 20, step: 1 },
    phase: { widget: "range", label: "Phase Shift (φ)", min: 0, max: Math.PI * 2, step: 0.1 },
    turns: { widget: "range", label: "Turns (π * n)", min: 0.1, max: 20, step: 0.1 },
    step: { widget: "range", label: "Step (Δt)", min: 0.001, max: 0.5, step: 0.001 },
    userScale: { widget: "range", label: "Zoom/Scale", min: 10, max: 400, step: 10 },
    color: { widget: "colorPicker", label: "Stroke Color" },
    lineWidth: { widget: "range", label: "Line Width", min: 0.5, max: 5, step: 0.5 },
    showIntersections: { widget: "checkbox", label: "Show Intersections" }
  }
};

scriptInfo.parameters = scriptInfo.params;

/**
 * getLineIntersection(p1, p2, p3, p4)
 * Standard intersection check adapted from the core engine.
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
 * Renders the curve and performs O(n^2) intersection checks if enabled.
 */
scriptInfo.redrawHandler = function() {
  const p = scriptInfo.params;
  const n = parseFloat(p.n);
  const d = parseFloat(p.d);
  const phase = parseFloat(p.phase);
  const scale = parseFloat(p.userScale);
  const dt = parseFloat(p.step);
  const tMax = Math.PI * p.turns;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const cx = ctx.canvas.width / 2;
  const cy = ctx.canvas.height / 2;

  const segments = [];
  let prevPt = null;

  for (let t = 0; t <= tMax; t += dt) {
    const r = Math.cos((n / d) * t + phase);
    const x = cx + (r * Math.cos(t)) * scale;
    const y = cy + (r * Math.sin(t)) * scale;
    const currPt = new Point(x, y);

    if (prevPt) {
      const newSeg = { p1: prevPt, p2: currPt };

      // Draw the segment
      drawLine(newSeg.p1, newSeg.p2, p.color, p.lineWidth);

      // Check for intersections against previous segments
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

  const labelText = `n/d: ${n}/${d} | Turns: ${p.turns.toFixed(1)} | Δt: ${dt}`;
  ctx.fillStyle = p.color;
  printText(labelText, new Point(10, 10));
};

export function runPattern() {
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();
}
