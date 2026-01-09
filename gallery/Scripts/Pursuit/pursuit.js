/* ============================================================
   Pursuit Curves in Polygon
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Abstracted from a standalone HTML demo:
   - Draw repeated “pursuit” updates on a polygon’s vertices.
   - Each iteration draws the current polygon, then moves each vertex
     a fraction (step) toward its neighbor (cw or ccw).

   GOAL
   ----
   - Run under Gallery calling runPattern()
   - Use parameterControls.js to build controls in #action
   - No uiState usage

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - window.drawCanvas exists
   - window.ctx exists
   - #action exists
   ============================================================ */

import { printTitle } from "/draw/draw_utilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";

/* ------------------------------------------------------------
   pursuitPolygon()
   - Draws iterations worth of polygon paths in a single stroke
------------------------------------------------------------ */
function pursuitPolygon(thing) {
  const sides      = thing.sides;
  const iterations = thing.iterations;
  const step       = thing.step;
  const direction  = thing.direction;

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const R  = Math.min(w, h) * 0.4;
  // const cx = w / 2;
  // const cy = h / 2;
  const cx = 100;
  const cy = 200;

  // initial vertices
  let pts = [];
  for (let i = 0; i < sides; i++) {
    const ang = (2 * Math.PI * i / sides) - (Math.PI / 2); // start pointing up
    pts.push([cx + R * Math.cos(ang), cy + R * Math.sin(ang)]);
  }

  // Clear canvas (identity transform)
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.restore();

  ctx.strokeStyle = thing.color;
  ctx.lineWidth = thing.lineWidth;

  ctx.beginPath();

  for (let k = 0; k < iterations; k++) {

    // draw polygon path
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < sides; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.closePath();

    // compute next positions
    let next = [];
    for (let i = 0; i < sides; i++) {
      let j;
      if (direction === "cw") j = (i + 1) % sides;
      else j = (i - 1 + sides) % sides;

      const x  = pts[i][0];
      const y  = pts[i][1];
      const tx = pts[j][0];
      const ty = pts[j][1];

      const nx = x + step * (tx - x);
      const ny = y + step * (ty - y);

      next.push([nx, ny]);
    }

    pts = next;
  }

  ctx.stroke();
} // end pursuitPolygon


/* ------------------------------------------------------------
   init()
------------------------------------------------------------ */
function init() {
  const p = scriptInfo.params;

  scriptInfo.elements = {
    element: {
      sides:      p.sides,
      iterations: p.iterations,
      step:       p.step,
      direction:  p.direction,
      color:      p.color,
      lineWidth:  p.lineWidth
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
  pursuitPolygon(scriptInfo.elements.element);
} // end draw


/* ------------------------------------------------------------
   scriptInfo (ParameterControls contract)
   ------------------------------------------------------------
   We use drawRegistry-style internal names:
     - params / init / update / draw / elements

   Compatibility aliases for current parameterControls expectation:
     - parameters  → params
     - redrawHandler() drives update + draw
------------------------------------------------------------ */
export const scriptInfo = {
  title: "Pursuit Curves in Polygon",

  controls: {
    sides:      { label: "Sides",      widget: "range",  min: 3,    max: 12,   step: 1,    default: 5 },
    iterations: { label: "Iterations", widget: "range",  min: 10,   max: 2000, step: 10,   default: 200 },
    step:       { label: "Step",       widget: "range",  min: 0.01, max: 0.5,  step: 0.01, default: 0.05 },
    direction:  { label: "Direction",  widget: "select", options: ["cw", "ccw"],            default: "cw" },
    lineWidth:  { label: "Line Width", widget: "range",  min: 0.2,  max: 4,    step: 0.1,  default: 1 },
    color:      { label: "Color",      widget: "colorPicker",                              default: "#00ff00" }
  },

  params: {
    sides:      5,
    iterations: 200,
    step:       0.05,
    direction:  "cw",
    lineWidth:  1,
    color:      "#00ff00"
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
   runPattern() — Gallery entry point
------------------------------------------------------------ */
export function runPattern(_ctx) {
  printTitle(scriptInfo.title);

  // Alias for parameterControls (if it still expects .parameters)
  scriptInfo.parameters = scriptInfo.params;

  // Create persistent element once
  scriptInfo.init();

  // Build controls
  buildParameterControls(
    scriptInfo,
    "tab-scripts",
    true
  );

  // First draw
  scriptInfo.redrawHandler();
} // end runPattern
