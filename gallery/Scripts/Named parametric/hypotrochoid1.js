/* controls/scripts/hypotrochoidSandbox.js
   ============================================================
   HYPOTROCHOID SANDBOX (SPIROGRAPH STYLE)
   ============================================================
   Formula:
   x = (R - r)cos(t) + d*cos(((R - r) / r) * t)
   y = (R - r)sin(t) - d*sin(((R - r) / r) * t)
   ============================================================ */

import { Point } from "/classes/classes.js";
import { drawLine, printText, displayPoint } from "/draw/drawUtilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";

export const scriptInfo = {
  title: "Hypotrochoid Sandbox",

  params: {
    R: 100,
    r: 60,
    d: 80,
    turns: 10,
    step: 0.05,
    userScale: 1.0,
    color: "#ff5500",
    lineWidth: 1.2,
    showIntersections: false
  },

  controls: {
    R: { widget: "range", label: "Outer Radius (R)", min: 10, max: 300, step: 1 },
    r: { widget: "range", label: "Inner Radius (r)", min: 1, max: 200, step: 1 },
    d: { widget: "range", label: "Pen Offset (d)", min: 0, max: 200, step: 1 },
    turns: { widget: "range", label: "Turns (π * n)", min: 1, max: 100, step: 1 },
    step: { widget: "range", label: "Step (Δt)", min: 0.001, max: 0.5, step: 0.001 },
    userScale: { widget: "range", label: "Global Scale", min: 0.1, max: 3.0, step: 0.1 },
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
 * Renders the hypotrochoid and performs intersection checks.
 */
scriptInfo.redrawHandler = function() {
  const p = scriptInfo.params;
  const R = parseFloat(p.R);
  const r = parseFloat(p.r);
  const d = parseFloat(p.d);
  const scale = parseFloat(p.userScale);
  const dt = parseFloat(p.step);
  const tMax = Math.PI * p.turns;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const cx = ctx.canvas.width / 2;
  const cy = ctx.canvas.height / 2;

  const segments = [];
  let prevPt = null;

  // The difference between the radii determines the base movement
  const R_minus_r = R - r;
  const ratio = R_minus_r / r;

  for (let t = 0; t <= tMax; t += dt) {
    const x = cx + (R_minus_r * Math.cos(t) + d * Math.cos(ratio * t)) * scale;
    const y = cy + (R_minus_r * Math.sin(t) - d * Math.sin(ratio * t)) * scale;
    const currPt = new Point(x, y);

    if (prevPt) {
      const newSeg = { p1: prevPt, p2: currPt };

      // Draw the segment
      drawLine(newSeg.p1, newSeg.p2, p.color, p.lineWidth);

      // Intersection logic (O(n^2))
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

  const labelText = `R: ${R} | r: ${r} | d: ${d} | Turns: ${p.turns}`;
  ctx.fillStyle = p.color;
  printText(labelText, new Point(10, 10));
};

export function runPattern() {
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();
}
