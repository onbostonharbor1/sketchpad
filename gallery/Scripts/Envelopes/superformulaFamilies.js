/* controls/scripts/superformulaAtlas.js
   ============================================================
   SUPERFORMULA ATLAS (INTEGRATED SELECT LOGIC)
   ============================================================ */

import { Point } from "/classes/classes.js";
import { drawLine, printText, drawCircle } from "/draw/drawUtilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";

export const scriptInfo = {
  title: "Superformula Atlas",

  params: {
    preset: "Petal",
    m: 5,
    n1: 1,
    n2: 1,
    n3: 1,
    userScale: 150,
    color: "#00d4ff",
    lineWidth: 1.5,
    alpha: 0.8,
    showPoints: false
  },

  controls: {
    // Moved back into the declarative flow for reliability
    preset: {
      widget: "select",
      label: "Shape Family",
      options: [
        "Petal", "Succulent", "Fern", "Clover", "Citrus",
        "Starfish", "Jellyfish", "Anemone",
        "Squircle", "Crystal", "Diatom",
        "Custom"
      ]
    },
    m: { widget: "range", label: "Symmetry (m)", min: 0, max: 20, step: 0.1 },
    n1: { widget: "range", label: "Sharpness (n1)", min: 0.1, max: 10, step: 0.1 },
    n2: { widget: "range", label: "Concavity (n2)", min: 0.1, max: 10, step: 0.1 },
    n3: { widget: "range", label: "Concavity (n3)", min: 0.1, max: 10, step: 0.1 },
    userScale: { widget: "range", label: "Scale", min: 10, max: 400, step: 10 },
    color: { widget: "colorPicker", label: "Color" },
    showPoints: { widget: "checkbox", label: "Show Stitches" }
  }
};

const shapeLibrary = {
  "Petal":     { m: 5, n1: 1, n2: 1, n3: 1 },
  "Succulent": { m: 6, n1: 0.5, n2: 2, n3: 2 },
  "Fern":      { m: 14, n1: 1, n2: 10, n3: 10 },
  "Clover":    { m: 3, n1: 0.5, n2: 1, n3: 1 },
  "Citrus":    { m: 10, n1: 0.5, n2: 0.5, n3: 0.5 },
  "Starfish":  { m: 5, n1: 0.2, n2: 1.7, n3: 1.7 },
  "Jellyfish": { m: 2.5, n1: 0.5, n2: 0.5, n3: 0.5 },
  "Anemone":   { m: 12, n1: 0.3, n2: 0.3, n3: 0.3 },
  "Squircle":  { m: 4, n1: 8, n2: 8, n3: 8 },
  "Crystal":   { m: 8, n1: 0.1, n2: 5, n3: 5 },
  "Diatom":    { m: 20, n1: 15, n2: 15, n3: 15 }
};

// Track the previous selection to detect changes
let lastPresetValue = scriptInfo.params.preset;

function superformula(theta, m, n1, n2, n3) {
  const a = 1, b = 1;
  const t1 = Math.pow(Math.abs(Math.cos((m * theta) / 4) / a), n2);
  const t2 = Math.pow(Math.abs(Math.sin((m * theta) / 4) / b), n3);
  return Math.pow(t1 + t2, -1 / n1);
}

scriptInfo.redrawHandler = function() {
  const p = scriptInfo.params;

  /* Check if the preset was changed via the dropdown.
     If so, overwrite manual params with the family genes.
  */
  if (p.preset !== lastPresetValue && p.preset !== "Custom") {
    const gene = shapeLibrary[p.preset];
    Object.assign(p, gene);
    lastPresetValue = p.preset;

    // Trigger a UI refresh so the sliders physically move to match the new preset
    buildParameterControls(scriptInfo, "tab-scripts", false);
  }

  /* Check if any slider was moved.
     If it no longer matches the current preset, flip dropdown to Custom.
  */
  if (p.preset !== "Custom") {
    const gene = shapeLibrary[p.preset];
    if (p.m !== gene.m || p.n1 !== gene.n1 || p.n2 !== gene.n2 || p.n3 !== gene.n3) {
      p.preset = "Custom";
      lastPresetValue = "Custom";
      // Update the dropdown UI visually
      buildParameterControls(scriptInfo, "tab-scripts", false);
    }
  }

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const cx = ctx.canvas.width / 2;
  const cy = ctx.canvas.height / 2;

  let prevPt = null;
  let firstPt = null;
  const steps = 600;

  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const r = superformula(theta, p.m, p.n1, p.n2, p.n3);
    const x = cx + r * Math.cos(theta) * p.userScale;
    const y = cy + r * Math.sin(theta) * p.userScale;
    const currPt = new Point(x, y);

    if (i === 0) firstPt = currPt;
    if (prevPt) drawLine(prevPt, currPt, p.color, 1.5);
    prevPt = currPt;
  }

  if (prevPt && firstPt) drawLine(prevPt, firstPt, p.color, 1.5);
};

export function runPattern() {
  // Always rebuild the controls on first run
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();
}
