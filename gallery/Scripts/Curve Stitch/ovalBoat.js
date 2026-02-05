/* ============================================================
   WHAT THIS SCRIPT DOES
   ---------------------
   This Gallery script draws a “curve-stitch oval band” by
   repeatedly drawing straight line segments between two
   related ellipses:
     • an OUTER ellipse (rx, ry)
     • an INNER ellipse (rx*innerScale, ry*innerScale)

   For each line index i:
     1) We compute a parameter angle t around the outer ellipse.
     2) We compute a second angle t2 for the inner ellipse:
          t2 = t + phase + skewAmp * sin(t * skewFreq)
        This is what creates the “twist” and asymmetry.
     3) We compute the outer point P1 = (x1, y1) at angle t.
     4) We compute the inner point P2 = (x2, y2) at angle t2.
     5) We rotate BOTH points by rotationDeg around the center.
     6) We draw a straight line segment from P1 to P2.

   COLOR + FADE
   ------------
   The line color is interpolated (lerp3) from startColor to
   endColor across the full set of lines.
   If fadeEdges is true, alpha is reduced near the ends of the
   band so the edges soften visually.

   CONTROLS
   --------
   The parameterControls panel lets you interactively change:
     • phase        (twist amount)
     • skewAmp      (asymmetry / density variation)
     • innerScale   (band thickness)
     • rotationDeg  (overall rotation)
     • rx, ry       (ellipse radii)
     • lines        (number of stitch lines)
     • lineWidth    (stroke thickness)
     • fadeEdges    (edge fade on/off)

   RENDERING MODEL (GALLERY CONTRACT)
   ---------------------------------
   - This script is NOT animated.
   - The drawing is redone from scratch on every parameter change.
   - Background is forced to white each redraw.
   ============================================================ */


import { buildParameterControls } from "/ui/parameterControls.js";

/* ------------------------------------------------------------
   lerp(a, b, t)
------------------------------------------------------------ */
function lerp(a, b, t) {
  return a + (b - a) * t;
} // end lerp


/* ------------------------------------------------------------
   lerp3(a, b, t)
------------------------------------------------------------ */
function lerp3(a, b, t) {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t)
  ];
} // end lerp3


/* ------------------------------------------------------------
   drawBand(thing)
------------------------------------------------------------ */
function drawBand(thing) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const cx = w / 2;
  const cy = h / 2;

  // FIX #2: white background (no black)
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  ctx.lineCap = "round";
  ctx.lineWidth = thing.lineWidth;
  ctx.globalCompositeOperation = "source-over";

  const rx = thing.rx;
  const ry = thing.ry;

  const irx = rx * thing.innerScale;
  const iry = ry * thing.innerScale;

  const rot = thing.rotationDeg * Math.PI / 180;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);

  for (let i = 0; i < thing.lines; i++) {

    const t = (i / thing.lines) * Math.PI * 2;

    const x1 = rx * Math.cos(t);
    const y1 = ry * Math.sin(t);

    const t2 = t + thing.phase + thing.skewAmp * Math.sin(t * thing.skewFreq);

    const x2 = irx * Math.cos(t2);
    const y2 = iry * Math.sin(t2);

    const ox1 = cx + x1 * cosR - y1 * sinR;
    const oy1 = cy + x1 * sinR + y1 * cosR;

    const ox2 = cx + x2 * cosR - y2 * sinR;
    const oy2 = cy + x2 * sinR + y2 * cosR;

    const k = i / (thing.lines - 1);

    const rgb = lerp3(thing.startColor, thing.endColor, k);

    const a = thing.fadeEdges
      ? 0.3 + 0.7 * Math.pow(Math.sin(Math.PI * k), 0.7)
      : 1.0;

    ctx.strokeStyle = `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${a.toFixed(3)})`;

    ctx.beginPath();
    ctx.moveTo(ox1, oy1);
    ctx.lineTo(ox2, oy2);
    ctx.stroke();

  } // end for

} // end drawBand


/* ------------------------------------------------------------
   init()
------------------------------------------------------------ */
function init() {

  const p = scriptInfo.params;

  scriptInfo.elements = {
    element: {
      rx:          p.rx,
      ry:          p.ry,
      innerScale:  p.innerScale,
      rotationDeg: p.rotationDeg,
      phase:       p.phase,
      skewAmp:     p.skewAmp,
      skewFreq:    p.skewFreq,
      lines:       p.lines,
      lineWidth:   p.lineWidth,
      startColor:  p.startColor,
      endColor:    p.endColor,
      fadeEdges:   p.fadeEdges
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
  drawBand(scriptInfo.elements.element);
} // end draw


/* ------------------------------------------------------------
   scriptInfo (ParameterControls contract)
------------------------------------------------------------ */
export const scriptInfo = {

  title: "Curve Stitch Oval Band",

  controls: {
    phase:       { label: "Phase",       widget: "range", min: 0,    max: 6.28, step: 0.01, default: 2.35 },
    skewAmp:     { label: "Skew Amp",    widget: "range", min: 0,    max: 1.5,  step: 0.01, default: 0.38 },
    innerScale:  { label: "Inner Scale", widget: "range", min: 0.2,  max: 0.95, step: 0.01, default: 0.60 },
    rotationDeg: { label: "Rotation",    widget: "range", min: 0,    max: 90,   step: 1,    default: 18 },

    rx:          { label: "Radius X",    widget: "range", min: 100,  max: 520,  step: 1,    default: 460 },
    ry:          { label: "Radius Y",    widget: "range", min: 100,  max: 420,  step: 1,    default: 300 },

    lines:       { label: "Lines",       widget: "range", min: 500,  max: 8000, step: 100,  default: 3200 },
    lineWidth:   { label: "Line Width",  widget: "range", min: 0.1,  max: 2.0,  step: 0.1,  default: 0.5 },

    fadeEdges:   { label: "Fade Edges",  widget: "checkbox", default: true }
  },

  params: {
    rx:          460,
    ry:          300,
    innerScale:  0.60,
    rotationDeg: 18,
    phase:       2.35,
    skewAmp:     0.38,
    skewFreq:    1,
    lines:       3200,
    lineWidth:   0.5,

    startColor:  [78, 159, 229],
    endColor:    [173, 216, 230],

    fadeEdges:   true
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
export function runPattern(_unused) {

  // Alias for parameterControls
  scriptInfo.parameters = scriptInfo.params;

  scriptInfo.init();

  buildParameterControls(
    scriptInfo,
    "tab-scripts",
    true
  );

  // FIX #1: initial draw
  scriptInfo.redrawHandler();

} // end runPattern
