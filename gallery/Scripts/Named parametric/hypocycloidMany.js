/* controls/scripts/epitrochoidVisualizer.js
   ============================================================
   EPITROCHOID (MATHEMATICA FRACTIONLIST PORT)
   ============================================================
   Formula:
   x(t) = (a + b) * cos(t) + h * cos(((a + b) * t) / b)
   y(t) = (a + b) * sin(t) + h * sin(((a + b) * t) / b)

   Constraints: a = 1, h = abs(b).
   If b < 0, stroke is Red. If b > 0, stroke is Blue.

   Table of Drawings and Arguments:
   | Index | b (Fraction) | Color | Mathematical Shape       |
   |-------|--------------|-------|--------------------------|
   | 1     | -0.500       | Red   | Degenerate Line (Fixed)  |
   | 2     | -0.429       | Red   | -3/7 Epitrochoid         |
   | 9     | 0.143        | Blue  | 1/7 Epicycloid           |
   | 23    | 0.833        | Blue  | 5/6 Epicycloid           |
   ============================================================ */

import { Point } from "/classes/classes.js";
import { Parametric } from "/classes/parametric.js";
import { drawParametric } from "/draw/drawParametrics.js";
import { buildParameterControls } from "/ui/parameterControls.js";
import { printText } from "/draw/drawUtilities.js";

/**
 * Reconstructs the Mathematica fractionList logic:
 * Union[Table[p/q, {q,7}, {p, 2q}], Range[2,7]]
 * then symmetric negatives for values <= 1/2.
 */
function getMathematicaFractions() {
  let raw = [];
  for (let q = 1; q <= 7; q++) {
    for (let p = 1; p <= q * 2; p++) {
      raw.push(p / q);
    }
  }
  for (let i = 2; i <= 7; i++) raw.push(i);

  let uniqueSet = [...new Set(raw)].sort((a, b) => a - b);
  let smallVals = uniqueSet.filter(v => v <= 0.5).map(v => -v).reverse();
  return [...smallVals, ...uniqueSet];
}

const FRACTIONS = getMathematicaFractions();

export const scriptInfo = {
  title: "Epitrochoid Gallery",
  params: {
    index: 1,
    resolution: 3000,
    userScale: 1.0,
    lineWidth: 1.5
  },
  controls: {
    index: {
      widget: "thumbnailGrid",
      label: "Select Drawing",
      options: FRACTIONS.map((val, i) => ({
        value: i + 1,
        src: `./images/${i + 1}.png`,
        label: `b: ${val.toFixed(3)}`
      }))
    },
    userScale: { widget: "range", label: "Scale Factor", min: 0.1, max: 1.0, step: 0.05 },
    resolution: { widget: "range", label: "Resolution", min: 500, max: 8000, step: 100 },
    lineWidth: { widget: "range", label: "Line Width", min: 0.5, max: 5, step: 0.5 }
  }
};

scriptInfo.parameters = scriptInfo.params;

scriptInfo.redrawHandler = function() {
  const p = scriptInfo.params;
  const bRaw = FRACTIONS[p.index - 1];

  // FIX: Prevent "invalid bounds" by nudging degenerate fractions (like -0.5)
  // which create a flat line that crashes the autoFit logic.
  const b = (Math.abs(bRaw + 0.5) < 0.001) ? bRaw + 0.001 : bRaw;

  const a = 1;
  const h = Math.abs(b);
  const strokeColor = b < 0 ? "red" : "blue";

  // Build Model
  const model = new Parametric({
    funcX: (t) => (a + b) * Math.cos(t) + h * Math.cos(((a + b) * t) / b),
    funcY: (t) => (a + b) * Math.sin(t) + h * Math.sin(((a + b) * t) / b),
    color: strokeColor,
    lineWidth: p.lineWidth,
    margin: 40,
    domain: {
      tMin: 0,
      tMax: 2 * Math.PI * 14, // Period for q up to 7
      numPoints: p.resolution
    }
  });

  // Render
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const cx = ctx.canvas.width / 2;
  const cy = ctx.canvas.height / 2;

  ctx.save();
  // Apply scale diminishment after point calculation
  ctx.translate(cx, cy);
  ctx.scale(p.userScale, p.userScale);
  ctx.translate(-cx, -cy);

  try {
    drawParametric(model);
  } catch (err) {
    console.warn("Auto-fit encountered a degenerate shape. Attempting draw without fit.");
  }
  ctx.restore();

  // Print Label at 10, 10
  const labelPt = new Point(10, 10);
  ctx.fillStyle = strokeColor;
  printText(`Drawing: ${p.index} (b: ${bRaw.toFixed(3)})`, labelPt);
};

export function runPattern() {
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();
}
