/* controls/scripts/rotaryHarmonograph.js
   ============================================================
   ROTARY HARMONOGRAPH SANDBOX
   ============================================================
   This script simulates a rotary harmonograph where two
   circularly swinging pendulums are combined.

   MATHEMATICS:
   The drawing is the sum of two rotating vectors:
   x(t) = [A1 * cos(f1*t + p1) * exp(-d1*t)] + [A2 * cos(f2*t + p2) * exp(-d2*t)]
   y(t) = [A1 * sin(f1*t + p1) * exp(-d1*t)] + [A2 * sin(f2*t + p2) * exp(-d2*t)]

   Symmetry: If you set f1=2 and f2=−2, you get a simple ellipse.

   Flower Petals: Try f1=10 and f2=1 for a pattern with 9 or 11 "petals" (depending on the direction of rotation).

   Infinite Variety: Because we are using floating-point frequencies, the patterns almost never perfectly repeat, giving it that organic "swinging pendulum" feel.

   CONTROL GUIDE:
   ------------------------------------------------------------
   - Freq (f1, f2): The speeds of the two rotations.
     If f1 and f2 have opposite signs, they rotate in
     opposite directions (Counter-rotational).
   - Phase (p1, p2): The starting angular offset.
   - Damping (d1, d2): How fast each rotation loses energy.
   - Amplitudes (A1, A2): The "reach" or radius of each pendulum.
   ============================================================ */

import { Point } from "/classes/classes.js";
import { drawLine, printText, displayPoint } from "/draw/drawUtilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";

export const scriptInfo = {
  title: "Rotary Harmonograph",

  params: {
    A1: 100,
    f1: 2.0,
    p1: 0,
    d1: 0.005,
    A2: 80,
    f2: -3.0,
    p2: 0,
    d2: 0.005,
    duration: 200,
    step: 0.05,
    userScale: 1.0,
    color: "#00ccaa",
    lineWidth: 1,
    showIntersections: false
  },

  controls: {
    A1: { widget: "range", label: "Amp 1", min: 10, max: 200, step: 1 },
    f1: { widget: "range", label: "Freq 1", min: -10, max: 10, step: 0.01 },
    p1: { widget: "range", label: "Phase 1", min: 0, max: Math.PI * 2, step: 0.1 },
    d1: { widget: "range", label: "Damp 1", min: 0, max: 0.05, step: 0.001 },
    A2: { widget: "range", label: "Amp 2", min: 10, max: 200, step: 1 },
    f2: { widget: "range", label: "Freq 2", min: -10, max: 10, step: 0.01 },
    p2: { widget: "range", label: "Phase 2", min: 0, max: Math.PI * 2, step: 0.1 },
    d2: { widget: "range", label: "Damp 2", min: 0, max: 0.05, step: 0.001 },
    duration: { widget: "range", label: "Duration", min: 10, max: 2000, step: 10 },
    step: { widget: "range", label: "Step (Δt)", min: 0.001, max: 0.5, step: 0.001 },
    userScale: { widget: "range", label: "Scale", min: 0.1, max: 3.0, step: 0.1 },
    color: { widget: "colorPicker", label: "Stroke Color" },
    lineWidth: { widget: "range", label: "Line Width", min: 0.5, max: 5, step: 0.5 },
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
 * Renders the combined rotary motion.
 */
scriptInfo.redrawHandler = function() {
  const p = scriptInfo.params;
  const A1 = parseFloat(p.A1);
  const f1 = parseFloat(p.f1);
  const p1 = parseFloat(p.p1);
  const d1 = parseFloat(p.d1);

  const A2 = parseFloat(p.A2);
  const f2 = parseFloat(p.f2);
  const p2 = parseFloat(p.p2);
  const d2 = parseFloat(p.d2);

  const scale = parseFloat(p.userScale);
  const dt = parseFloat(p.step);
  const tMax = parseFloat(p.duration);

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const cx = ctx.canvas.width / 2;
  const cy = ctx.canvas.height / 2;

  const segments = [];
  let prevPt = null;

  for (let t = 0; t <= tMax; t += dt) {
    // Vector 1
    const x1 = A1 * Math.cos(t * f1 + p1) * Math.exp(-d1 * t);
    const y1 = A1 * Math.sin(t * f1 + p1) * Math.exp(-d1 * t);

    // Vector 2
    const x2 = A2 * Math.cos(t * f2 + p2) * Math.exp(-d2 * t);
    const y2 = A2 * Math.sin(t * f2 + p2) * Math.exp(-d2 * t);

    const x = cx + (x1 + x2) * scale;
    const y = cy + (y1 + y2) * scale;
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

  const labelText = `Rotary: F1(${f1}) F2(${f2}) | Dur: ${tMax}`;
  ctx.fillStyle = p.color;
  printText(labelText, new Point(10, 10));
};

export function runPattern() {
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();
}
