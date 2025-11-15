/* ============================================================
   Template 3 — Gallery Script (With UI Controls)
   ------------------------------------------------------------
   Usage:
     - Appears in Gallery > Scripts
     - gallery.js detects patternMeta/initPattern/drawPattern
     - Automatically builds UI controls in #action
     - Controls live-update the drawing
   ============================================================ */

import { printTitle } from "../../draw/draw_utilities.js";

/* ------------------------------------------------------------
   patternMeta
   Defines parameter controls displayed in Gallery.
------------------------------------------------------------ */
export const patternMeta = {
  id: "template3Demo",
  title: "Template 3 — UI Script",
  parameters: [
    {
      key: "radius",
      label: "Radius",
      widget: "range",
      min: 20,
      max: 300,
      step: 2,
      default: 120
    },
    {
      key: "count",
      label: "Count",
      widget: "range",
      min: 3,
      max: 200,
      step: 1,
      default: 60
    },
    {
      key: "showDots",
      label: "Show Dots",
      widget: "checkbox",
      default: true
    }
  ]
};

/* ------------------------------------------------------------
   initPattern()
   Provides the initial parameter object.
------------------------------------------------------------ */
export function initPattern() {
  return {
    radius: 120,
    count: 60,
    showDots: true
  };
} // end initPattern

/* ------------------------------------------------------------
   drawPattern(params)
   Main drawing entry point used by Gallery.
------------------------------------------------------------ */
export function drawPattern(params) {
  const { radius, count, showDots } = params;
  const w2 = drawCanvas.width / 2;
  const h2 = drawCanvas.height / 2;

  // --- Clear canvas ---
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,drawCanvas.width,drawCanvas.height);
  ctx.restore();

  // --- Draw radial lines ---
  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 1.2;

  for (let i=0; i<count; i++) {
    const t = i * (2*Math.PI / count);
    const x = w2 + radius * Math.cos(t);
    const y = h2 + radius * Math.sin(t);

    ctx.beginPath();
    ctx.moveTo(w2, h2);
    ctx.lineTo(x, y);
    ctx.stroke();

    if (showDots) {
      ctx.beginPath();
      ctx.fillStyle = "#f59e0b";
      ctx.arc(x, y, 2.6, 0, Math.PI*2);
      ctx.fill();
    }
  }
} // end drawPattern

/* ------------------------------------------------------------
   Optional legacy entry point.
   Gallery uses this if no UI controls system is detected.
------------------------------------------------------------ */
export function runPattern() {
  printTitle(patternMeta.title);
  const params = initPattern();
  drawPattern(params);
} // end runPattern
