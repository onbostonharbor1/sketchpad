/* controls/scripts/maurerRoseSandbox.js
   ============================================================
   MAURER ROSE SANDBOX
   ============================================================
   Formula:
   r = sin(-k * fi - rotate) * size + expansion

   Added:
   - alpha: Controls line transparency for color accumulation.
   - showDots: Renders points as dots to mark nail positions.
   ============================================================ */

import { Point } from "/classes/classes.js";
import { buildParameterControls } from "/ui/parameterControls.js";
import { printText } from "/draw/drawUtilities.js";

export const scriptInfo = {
  title: "Maurer Rose Sandbox",

  params: {
    n: 6.93,
    d: 9.91,
    maurer: 101,
    size: 300,
    rotate: 1.63,
    gg: 300,
    lineWidth: 1.0,
    alpha: 0.3,         // New: transparency control
    drawMaurer: true,
    colorize: false,
    drawRose: true,
    showDots: false,    // New: dots toggle
    userScale: 1.0,
    colorMaurer: "#ffffff",
    colorRose: "#ff0000",
    colorBg: "#000000"
  },

  actions: {
    randomizeAction: function() {
      const p = this.params;
      p.n = Math.random() * 20;
      p.d = Math.random() * 30;
      p.maurer = Math.floor(Math.random() * 360);
      p.size = Math.random() * 500 + 50;
      p.gg = Math.random() * 400;
    },
    saveAction: function() {
      const link = document.createElement('a');
      link.download = `Maurer_Template_${Date.now()}.png`;
      link.href = ctx.canvas.toDataURL();
      link.click();
    }
  },

  controls: {
    n: { widget: "range", label: "Petal Count (n)", min: 0, max: 20, step: 0.01 },
    d: { widget: "range", label: "Overlapping (d)", min: 0.1, max: 30, step: 0.01 },
    maurer: { widget: "range", label: "Maurer Step", min: 0, max: 360, step: 1 },
    size: { widget: "range", label: "Size", min: 5, max: 1000, step: 1 },
    rotate: { widget: "range", label: "Rotate", min: 0, max: 6.3, step: 0.01 },
    gg: { widget: "range", label: "Expansion (gg)", min: 0, max: 500, step: 1 },
    lineWidth: { widget: "range", label: "Line Width", min: 0.1, max: 5, step: 0.1 },
    alpha: { widget: "range", label: "Transparency", min: 0.01, max: 1.0, step: 0.01 },
    drawMaurer: { widget: "checkbox", label: "Draw Maurer" },
    colorize: { widget: "checkbox", label: "Colorize" },
    drawRose: { widget: "checkbox", label: "Add Rose Color" },
    showDots: { widget: "checkbox", label: "Show Nail Dots" },
    colorMaurer: { widget: "colorPicker", label: "Maurer Color" },
    colorRose: { widget: "colorPicker", label: "Rose Color" },
    colorBg: { widget: "colorPicker", label: "Background" },
    userScale: { widget: "range", label: "Scale Factor", min: 0.1, max: 2.0, step: 0.05 },
    randomize: { widget: "button", label: "Randomize", action: "randomizeAction", fullRow: true, redraw: true },
    save: { widget: "button", label: "Save Image", action: "saveAction", fullRow: true, redraw: false }
  }
};

scriptInfo.parameters = scriptInfo.params;

/**
 * redrawHandler
 * Renders the pattern with support for transparency and point markers.
 */
scriptInfo.redrawHandler = function() {
  const p = scriptInfo.params;
  const k = p.n / p.d;

  ctx.fillStyle = p.colorBg;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const xStart = ctx.canvas.width / 2;
  const yStart = ctx.canvas.height / 2;
  let xPrev, yPrev;

  ctx.save();
  ctx.translate(xStart, yStart);
  ctx.scale(p.userScale, p.userScale);
  ctx.translate(-xStart, -yStart);

  // Apply global alpha for line accumulation
  ctx.globalAlpha = p.alpha;
  ctx.lineCap = 'round';

  if (p.drawMaurer) {
    for (let i = 0; i <= 3600; i++) {
      let fi = p.maurer * i * Math.PI / 180;
      let r = Math.sin(-k * fi - p.rotate) * p.size + Math.round(p.gg);
      let x = xStart + r * Math.cos(fi);
      let y = yStart + r * Math.sin(fi);

      // Draw the line segment
      ctx.strokeStyle = p.colorize ? `hsl(${i / 10}, 100%, 50%)` : p.colorMaurer;
      ctx.lineWidth = p.lineWidth;
      ctx.beginPath();

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.moveTo(xPrev, yPrev);
      }

      ctx.lineTo(x, y);
      ctx.stroke();

      // New: Optional Dots (Nail Positions)
      // Drawn with full opacity to remain visible as guides
      if (p.showDots) {
        ctx.save();
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = p.colorMaurer;
        ctx.beginPath();
        ctx.arc(x, y, p.lineWidth * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      xPrev = x;
      yPrev = y;
    }
  }

  if (p.drawRose) {
    ctx.beginPath();
    ctx.strokeStyle = p.colorRose;
    ctx.lineWidth = p.lineWidth * 0.5;
    for (let a = 0; a < 3600 * Math.ceil(p.d); a++) {
      let deg = a * Math.PI / 180;
      let r = Math.sin(-k * deg - p.rotate) * p.size + Math.round(p.gg);
      let x = xStart + r * Math.cos(deg);
      let y = yStart + r * Math.sin(deg);
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.restore();
  printText(`n/d: ${(p.n/p.d).toFixed(2)} | Step: ${p.maurer}`, new Point(10, 25));
};

export function runPattern() {
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();
}
