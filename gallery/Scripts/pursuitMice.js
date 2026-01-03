/* ============================================================
   Mice Pursuit (Curve Stitch / Visualization) — Interactive

   Retained source comments:

/**
 * Draws a curve stitching visualization of the mice problem.
 * @param {CanvasRenderingContext2D} ctx The 2D rendering context of the canvas.
 * @param {number} nMice The number of mice (and polygon vertices). Must be >= 3.
 * @param {number} sideLength The side length of the initial regular polygon.
 * @param {number} iterations The number of lines to draw for the stitching effect.
 * @param {number} tStep The time increment for each step of the simulation.
 * @param {number} scale A scaling factor for the drawing.

   GOAL
   ----
   Gallery Scripts file that:
     - exports runPattern(ctx)
     - draws into the shared Sketchpad canvas
     - uses parameterControls.js in #action (Gallery/Scripts region)

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
     - window.ctx exists
     - parameterControls.js exports buildParameterControls
     - Gallery Scripts panel id is "tab-scripts"
   ============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ------------------------------------------------------------
   drawMicePursuit(thing)
------------------------------------------------------------ */
function drawMicePursuit(thing) {

  const nMice      = thing.nMice;
  const sideLength = thing.sideLength;
  const iterations = thing.iterations;
  const tStep      = thing.tStep;
  const scale      = thing.scale;

  if (nMice < 3) {
    throw new Error("drawMicePursuit: nMice must be >= 3");
  }

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  // Clear full canvas in default coordinate system
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.restore();

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  // Translate origin to center (like original)
  const centerX = w / 2;
  const centerY = h / 2;

  ctx.save();
  ctx.translate(centerX, centerY);

  // Initialize mouse positions on a regular polygon
  const initialPositions = [];
  const radius = (sideLength / 2) / Math.sin(Math.PI / nMice);

  for (let i = 0; i < nMice; i++) {
    let angle = (2 * Math.PI * i / nMice);
    if (nMice % 2 === 0) angle = angle + (Math.PI / nMice);

    initialPositions.push({
      x: radius * Math.cos(angle) * scale,
      y: radius * Math.sin(angle) * scale
    });
  }

  let currentPositions = initialPositions.slice();

  ctx.lineWidth = 1;
  ctx.strokeStyle = thing.color;

  for (let i = 0; i < iterations; i++) {

    // Draw polygon edges between current mouse positions
    for (let j = 0; j < nMice; j++) {
      const nextMouse = (j + 1) % nMice;

      ctx.beginPath();
      ctx.moveTo(currentPositions[j].x, currentPositions[j].y);
      ctx.lineTo(currentPositions[nextMouse].x, currentPositions[nextMouse].y);
      ctx.stroke();
    }

    // Compute next positions: each mouse moves toward the next mouse
    const nextPositions = [];

    for (let j = 0; j < nMice; j++) {
      const targetMouse = (j + 1) % nMice;

      const dx = currentPositions[targetMouse].x - currentPositions[j].x;
      const dy = currentPositions[targetMouse].y - currentPositions[j].y;

      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance === 0) {
        nextPositions.push({ x: currentPositions[j].x, y: currentPositions[j].y });
        continue;
      }

      // Unit direction toward target (constant speed model)
      const vx = dx / distance;
      const vy = dy / distance;

      // Advance by time step (scaled like original)
      const newX = currentPositions[j].x + vx * tStep * scale;
      const newY = currentPositions[j].y + vy * tStep * scale;

      nextPositions.push({ x: newX, y: newY });
    }

    currentPositions = nextPositions;
  }

  ctx.restore();

} // end drawMicePursuit


/* ------------------------------------------------------------
   init()
------------------------------------------------------------ */
function init() {
  const p = scriptInfo.params;

  scriptInfo.elements = {
    element: {
      nMice:      p.nMice,
      sideLength: p.sideLength,
      iterations: p.iterations,
      tStep:      p.tStep,
      scale:      p.scale,
      color:      p.color
    }
  };
} // end init


/* ------------------------------------------------------------
   update(params)
------------------------------------------------------------ */
function update(params) {
  const e = scriptInfo.elements.element;

  for (const key in scriptInfo.params) {
    const value = params[key];
    if (value === undefined) continue;
    e[key] = value;
  }
} // end update


/* ------------------------------------------------------------
   draw()
------------------------------------------------------------ */
function draw() {
  drawMicePursuit(scriptInfo.elements.element);
} // end draw


/* ------------------------------------------------------------
   scriptInfo (ParameterControls contract)
------------------------------------------------------------ */
export const scriptInfo = {
  title: "Mice Pursuit (Curve Stitch)",

  controls: {
    nMice: {
      label: "Mice (vertices)",
      widget: "range",
      min: 3,
      max: 20,
      step: 1,
      default: 5
    },
    sideLength: {
      label: "Side Length",
      widget: "range",
      min: 40,
      max: 600,
      step: 5,
      default: 250
    },
    iterations: {
      label: "Iterations",
      widget: "range",
      min: 1,
      max: 400,
      step: 1,
      default: 95
    },
    tStep: {
      label: "Time Step",
      widget: "range",
      min: 0.1,
      max: 20,
      step: 0.1,
      default: 4
    },
    scale: {
      label: "Scale",
      widget: "range",
      min: 0.1,
      max: 3,
      step: 0.1,
      default: 1
    },
    color: {
      label: "Color",
      widget: "colorPicker",
      default: "#0000ff"
    }
  },

  params: {
    nMice: 5,
    sideLength: 250,
    iterations: 95,
    tStep: 4,
    scale: 1,
    color: "#0000ff"
  },

  elements: null,

  init,
  update,
  draw,

  // parameterControls compatibility
  parameters: null,    // assigned in runPattern()

  redrawHandler() {
    this.update(this.params);
    this.draw();
  }, // end redrawHandler

  onParamChange() {
    // required by some parameterControls flows
  } // end onParamChange

}; // end scriptInfo


/* ------------------------------------------------------------
   runPattern(ctx) — Gallery entry point
------------------------------------------------------------ */
export function runPattern(_ctx) {

  // Alias for parameterControls (your existing pattern)
  scriptInfo.parameters = scriptInfo.params;

  scriptInfo.init();

  buildParameterControls(
    scriptInfo,
    "tab-scripts",
    true
  );

  scriptInfo.redrawHandler();

} // end runPattern
