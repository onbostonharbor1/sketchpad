/* ============================================================
   Lissajous Curve (Static)
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo:
   - Lissajous Curve with controls + animation
   - Animation removed (static redraw on parameter change)

   GOAL
   ----
   - Run under Gallery calling runPattern()
   - Use parameterControls.js
   - Match drawRegistry-style lifecycle and naming

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - window.ctx exists
   ============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ------------------------------------------------------------
   drawLissajous(thing)
------------------------------------------------------------ */
function drawLissajous(thing) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const cx = w / 2;
  const cy = h / 2;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.restore();

  ctx.beginPath();
  ctx.strokeStyle = thing.color;
  ctx.lineWidth = thing.lineWidth;

  const maxFreq = Math.max(thing.a, thing.b);

  for (let i = 0; i <= thing.steps; i++) {

    const t = (i / thing.steps) * 2 * Math.PI * maxFreq;

    const x = cx + thing.A * Math.sin(thing.a * t + thing.delta);
    const y = cy + thing.B * Math.sin(thing.b * t);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

  } // end for

  ctx.stroke();

} // end drawLissajous


/* ------------------------------------------------------------
   init()
------------------------------------------------------------ */
function init() {

  const p = scriptInfo.params;

  scriptInfo.elements = {
    element: {
      A:         p.A,
      B:         p.B,
      a:         p.a,
      b:         p.b,
      delta:     p.delta,
      steps:     p.steps,
      lineWidth: p.lineWidth,
      color:     p.color
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

  drawLissajous(scriptInfo.elements.element);

} // end draw


/* ------------------------------------------------------------
   scriptInfo (ParameterControls contract)
------------------------------------------------------------ */
export const scriptInfo = {

  title: "Lissajous Curve",

  controls: {
    a:         { label: "a (freq x)", widget: "range", min: 1, max: 10, step: 1, default: 3 },
    b:         { label: "b (freq y)", widget: "range", min: 1, max: 10, step: 1, default: 2 },
    delta:     { label: "δ (phase)",  widget: "range", min: 0, max: 6.28, step: 0.01, default: Math.PI / 2 },

    A:         { label: "A (amp x)",  widget: "range", min: 50,  max: 380, step: 1, default: 350 },
    B:         { label: "B (amp y)",  widget: "range", min: 50,  max: 380, step: 1, default: 350 },

    steps:     { label: "Steps",      widget: "range", min: 500, max: 8000, step: 100, default: 5000 },

    lineWidth: { label: "Line Width", widget: "range", min: 0.5, max: 6, step: 0.1, default: 2 },
    color:     { label: "Color",      widget: "colorPicker", default: "#0000ff" }
  },

  params: {
    A:         350,
    B:         350,
    a:         3,
    b:         2,
    delta:     Math.PI / 2,
    steps:     5000,
    lineWidth: 2,
    color:     "#0000ff"
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

  // Alias for parameterControls
  scriptInfo.parameters = scriptInfo.params;

  scriptInfo.init();

  buildParameterControls(
    scriptInfo,
    "tab-scripts",
    true
  );

  scriptInfo.redrawHandler();

} // end runPattern
