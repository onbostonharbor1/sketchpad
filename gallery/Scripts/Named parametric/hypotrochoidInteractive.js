/* controls/scripts/epitrochoidSandbox.js
   ============================================================
   EPITROCHOID SANDBOX (MANUAL CONTROLS)
   ============================================================
   Formula:
   x(t) = (R + r) * cos(t) - d * cos(((R + r) * t) / r)
   y(t) = (R + r) * sin(t) - d * sin(((R + r) * t) / r)

   This script provides manual sliders to manipulate the radii
   and pen offset independently of the Mathematica presets.
   ============================================================ */

import { Point } from "/classes/classes.js";
import { Parametric } from "/classes/parametric.js";
import { drawParametric } from "/draw/drawParametrics.js";
import { buildParameterControls } from "/ui/parameterControls.js";
import { printText } from "/draw/drawUtilities.js";

export const scriptInfo = {
  title: "Epitrochoid Sandbox",

  params: {
    R: 143,
    r: 76,
    d: 60,
    turns: 33,
    step: 0.028,
    userScale: 1.0,
    color: "#0077cc",
    lineWidth: 1.5,
    showIntersections: false
  },

  controls: {
    R: {
      widget: "range",
      label: "R (fixed radius)",
      min: 50,
      max: 200,
      step: 1
    },
    r: {
      widget: "range",
      label: "r (rolling radius)",
      min: 10,
      max: 100,
      step: 1
    },
    d: {
      widget: "range",
      label: "d (pen offset)",
      min: 10,
      max: 100,
      step: 1
    },
    turns: {
      widget: "range",
      label: "Turns (π * turns)",
      min: 1,
      max: 60,
      step: 1
    },
    step: {
      widget: "range",
      label: "Step (Δt)",
      min: 0.001,
      max: 0.05,
      step: 0.001
    },
    userScale: {
      widget: "range",
      label: "Scale Factor",
      min: 0.1,
      max: 1.0,
      step: 0.05
    },
    color: {
      widget: "colorPicker",
      label: "Stroke Color"
    },
    showIntersections: {
      widget: "checkbox",
      label: "Detect Intersections"
    }
  }
};

scriptInfo.parameters = scriptInfo.params;

/**
 * redrawHandler
 * Recalculates points based on the manual slider state.
 */
scriptInfo.redrawHandler = function() {
  const p = scriptInfo.params;

  // Derive R, r, d directly from sliders
  const R = parseFloat(p.R);
  const r = parseFloat(p.r);
  const d = parseFloat(p.d);

  // Calculate sampling density based on the Step slider
  const tMax = Math.PI * p.turns;
  const numPoints = Math.max(10, Math.floor(tMax / p.step));

  const model = new Parametric({
    funcX: (t) => (R + r) * Math.cos(t) - d * Math.cos(((R + r) * t) / r),
    funcY: (t) => (R + r) * Math.sin(t) - d * Math.sin(((R + r) * t) / r),
    color: p.color,
    lineWidth: p.lineWidth,
    showIntersections: p.showIntersections,
    margin: 40,
    domain: {
      tMin: 0,
      tMax: tMax,
      numPoints: numPoints
    }
  });

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const cx = ctx.canvas.width / 2;
  const cy = ctx.canvas.height / 2;

  ctx.save();
  // Apply post-point-generation scaling
  ctx.translate(cx, cy);
  ctx.scale(p.userScale, p.userScale);
  ctx.translate(-cx, -cy);

  try {
    drawParametric(model);
  } catch (e) {
    console.warn("Invalid bounds detected for current slider values.");
  }

  ctx.restore();

  // Display label at 10, 10
  const labelText = `R: ${R}, r: ${r}, d: ${d}, Step: ${p.step}`;
  printText(labelText, new Point(10, 10));
};

/**
 * runPattern()
 * Initializes the controls and starts the first draw.
 */
export function runPattern() {
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();
}
