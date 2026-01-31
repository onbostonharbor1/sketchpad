/* ============================================================
   Curve Stitch Ribbon (Static)
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo:
   - Curve Stitch Ribbon
   - Animation removed (static redraw on parameter change)

   NOTES (from original <pre>)
   ---------------------------
       offset → slowly rotates the second curve.
       scale → oscillates with a sine wave, making the ribbon
               “breathe.”
       Lines update every frame with requestAnimationFrame.

   You can tweak:

       offset speed (time * 0.0004) → faster or slower rotation.
       scale formula → change 0.6 + 0.4*Math.sin(...) for
                  different pulsing amplitudes.
       Mapping multiplier (i*7) → drastically changes the folds.
   ============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ------------------------------------------------------------
   circlePoints(n, R, offset, scale)
------------------------------------------------------------ */
function circlePoints(n, R, offset = 0, scale = 1) {

  const w = window.ctx.canvas.width;
  const h = window.ctx.canvas.height;

  const cx = w / 2;
  const cy = h / 2;

  const pts = [];

  for (let i = 0; i < n; i++) {
    const ang = 2 * Math.PI * i / n + offset;

    pts.push([
      cx + scale * R * Math.cos(ang),
      cy + scale * R * Math.sin(ang)
    ]);
  }

  return pts;

} // end circlePoints


/* ------------------------------------------------------------
   drawRibbon(thing)
------------------------------------------------------------ */
function drawRibbon(thing) {

  const w = window.ctx.canvas.width;
  const h = window.ctx.canvas.height;

  window.ctx.save();
  window.ctx.setTransform(1, 0, 0, 1, 0, 0);
  window.ctx.clearRect(0, 0, w, h);
  window.ctx.restore();

  window.ctx.lineWidth = thing.lineWidth;
  window.ctx.strokeStyle = thing.strokeStyle;

  const n = thing.n;
  const R = thing.radius;

  const pts1 = circlePoints(n, R, 0, 1);

  const pts2 = circlePoints(
    n,
    R * thing.radius2Mult,
    thing.offset,
    thing.scale
  );

  for (let i = 0; i < n; i++) {

    const p1 = pts1[i];
    const j = (i * thing.mapMult) % n;
    const p2 = pts2[j];

    window.ctx.beginPath();
    window.ctx.moveTo(p1[0], p1[1]);
    window.ctx.lineTo(p2[0], p2[1]);
    window.ctx.stroke();

  } // end for

} // end drawRibbon


/* ------------------------------------------------------------
   init()
------------------------------------------------------------ */
function init() {

  const p = scriptInfo.params;

  scriptInfo.elements = {
    element: {
      n:           p.n,
      radius:      p.radius,
      radius2Mult: p.radius2Mult,
      offset:      p.offset,
      scale:       p.scale,
      mapMult:     p.mapMult,
      lineWidth:   p.lineWidth,
      strokeStyle: p.strokeStyle
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

  drawRibbon(scriptInfo.elements.element);

} // end draw


/* ------------------------------------------------------------
   scriptInfo (ParameterControls contract)
------------------------------------------------------------ */
export const scriptInfo = {

  title: "Curve Stitch Ribbon",

  controls: {
    n:           { label: "Lines (n)",          widget: "range", min: 100, max: 3000, step: 50, default: 1200 },
    radius:      { label: "Base Radius",        widget: "range", min: 50,  max: 450,  step: 1,  default: 250 },
    radius2Mult: { label: "2nd Radius Mult",    widget: "range", min: 0.2, max: 3.0,  step: 0.05, default: 1.2 },

    offset:      { label: "Offset (radians)",   widget: "range", min: -6.28, max: 6.28, step: 0.01, default: Math.PI / 3 },
    scale:       { label: "Scale",             widget: "range", min: 0.1, max: 2.0, step: 0.01, default: 0.6 },

    mapMult:     { label: "Mapping Mult",       widget: "range", min: 1, max: 40, step: 1, default: 7 },

    lineWidth:   { label: "Line Width",         widget: "range", min: 0.05, max: 2.0, step: 0.05, default: 0.25 },
    strokeStyle: { label: "Stroke RGBA",        widget: "text", default: "rgba(0,0,0,0.2)" }
  },

  params: {
    n:           1200,
    radius:      250,
    radius2Mult: 1.2,
    offset:      Math.PI / 3,
    scale:       0.6,
    mapMult:     7,
    lineWidth:   0.25,
    strokeStyle: "rgba(0,0,0,0.2)"
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
export function runPattern() {

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
