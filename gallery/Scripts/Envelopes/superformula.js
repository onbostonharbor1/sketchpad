/* controls/scripts/superformulaSandbox.js
   ============================================================
   SUPERFORMULA SANDBOX
   ============================================================
   Formula: r(theta) = [ |cos(m*theta/4)/a|^n2 + |sin(m*theta/4)/b|^n3 ]^(-1/n1)

   A single equation capable of modeling everything from
   simple circles to complex flower and starfish geometries.
   ============================================================ */

import { Point } from "/classes/classes.js";
import { drawLine, printText, drawCircle } from "/draw/drawUtilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";

export const scriptInfo = {
  title: "Superformula Sandbox",

  params: {
    m: 5,
    n1: 1,
    n2: 1,
    n3: 1,
    a: 1,
    b: 1,
    steps: 500,
    userScale: 150,
    color: "#ff33aa",
    lineWidth: 2,
    alpha: 0.9,
    showPoints: false
  },

  controls: {
    m: { widget: "range", label: "Symmetry (m)", min: 0, max: 20, step: 0.1 },
    n1: { widget: "range", label: "Sharpness (n1)", min: 0.1, max: 10, step: 0.1 },
    n2: { widget: "range", label: "Concavity (n2)", min: 0.1, max: 10, step: 0.1 },
    n3: { widget: "range", label: "Concavity (n3)", min: 0.1, max: 10, step: 0.1 },
    a: { widget: "range", label: "Width (a)", min: 0.1, max: 2, step: 0.1 },
    b: { widget: "range", label: "Height (b)", min: 0.1, max: 2, step: 0.1 },
    steps: { widget: "range", label: "Resolution", min: 50, max: 2000, step: 50 },
    userScale: { widget: "range", label: "Scale", min: 10, max: 400, step: 10 },
    color: { widget: "colorPicker", label: "Stroke Color" },
    alpha: { widget: "range", label: "Opacity", min: 0.1, max: 1.0, step: 0.1 },
    showPoints: { widget: "checkbox", label: "Show Stitches (Points)" }
  }
};

scriptInfo.parameters = scriptInfo.params;

/**
 * superformula(theta, m, n1, n2, n3, a, b)
 * Calculates the radius for a given angle.
 */
function superformula(theta, m, n1, n2, n3, a, b) {
  const t1 = Math.pow(Math.abs(Math.cos((m * theta) / 4) / a), n2);
  const t2 = Math.pow(Math.abs(Math.sin((m * theta) / 4) / b), n3);
  const r = Math.pow(t1 + t2, -1 / n1);
  return r;
}

/**
 * redrawHandler
 * Renders the supershape by iterating from 0 to 2*PI.
 */
scriptInfo.redrawHandler = function() {
  const p = scriptInfo.params;
  const m = Number(p.m);
  const n1 = Number(p.n1);
  const n2 = Number(p.n2);
  const n3 = Number(p.n3);
  const a = Number(p.a);
  const b = Number(p.b);
  const steps = Math.floor(Number(p.steps));
  const scale = Number(p.userScale);

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const cx = ctx.canvas.width / 2;
  const cy = ctx.canvas.height / 2;

  ctx.globalAlpha = Number(p.alpha);

  let prevPt = null;
  let firstPt = null;

  // We loop to 2*PI to close the shape
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const r = superformula(theta, m, n1, n2, n3, a, b);

    const x = cx + r * Math.cos(theta) * scale;
    const y = cy + r * Math.sin(theta) * scale;
    const currPt = new Point(x, y);

    if (i === 0) firstPt = currPt;

    if (prevPt) {
      drawLine(prevPt, currPt, p.color, p.lineWidth);
    }

    if (p.showPoints) {
      drawCircle(currPt, 2, p.color, 1);
    }

    prevPt = currPt;
  }

  // Ensure the shape is perfectly closed
  if (prevPt && firstPt) {
    drawLine(prevPt, firstPt, p.color, p.lineWidth);
  }

  ctx.globalAlpha = 1.0;
  printText(`m: ${m.toFixed(1)} | n1: ${n1}`, new Point(10, 10));
};

export function runPattern() {
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();
}
