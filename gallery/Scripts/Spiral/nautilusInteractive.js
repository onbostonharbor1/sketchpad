/* ============================================================
   Nautilus — Curve Stitching (Interactive)
   ------------------------------------------------------------
   Converted from standalone HTML to Sketchpad Scripts/Gallery script.

   UI GOAL
   -------
   Use the new "rangeHeader" control style (label + live value above slider).

   Lifecycle shape (drawRegistry-style):
     controls / params / elements / init / update / draw

   ParameterControls compatibility:
     parameters alias
     redrawHandler
     onParamChange (stub, required by some control flows)

   FAIL-FAST assumptions:
     - window.ctx exists (shared canvas 2D context)
     - buildParameterControls exists
     - target panel id = "tab-scripts"
   ============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";


/* ------------------------------------------------------------
   Static text blocks (kept out of widget clutter)
------------------------------------------------------------ */
const NAUTILUS_INTRO_TEXT =
  "A parametric / logarithmic spiral with chord-stitching produces shell-like ridges."; // end NAUTILUS_INTRO_TEXT

const NAUTILUS_TIP_TEXT =
  "Tip: increase points and lower opacity for smoother shells. Try different skip values to change ridges."; // end NAUTILUS_TIP_TEXT


/* ------------------------------------------------------------
   lerp(a, b, t)
------------------------------------------------------------ */
function lerp(a, b, t) {
  return a + (b - a) * t;
} // end lerp


/* ------------------------------------------------------------
   clearCanvasFull()
------------------------------------------------------------ */
function clearCanvasFull() {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.restore();

} // end clearCanvasFull


/* ------------------------------------------------------------
   generateSpiralPoints(spec)
   Logarithmic spiral in polar: r = a * e^(b * theta)
------------------------------------------------------------ */
function generateSpiralPoints(spec) {

  const points  = spec.points;
  const turns   = spec.turns;
  const a       = spec.a;
  const b       = spec.b;
  const centerX = spec.centerX;
  const centerY = spec.centerY;
  const scale   = spec.scale;

  const pts = new Array(points);

  const thetaMax = turns * Math.PI * 2;

  for (let i = 0; i < points; i++) {

    const t = i / (points - 1);
    const theta = t * thetaMax;
    const r = a * Math.exp(b * theta);

    const x = centerX + r * Math.cos(theta) * scale;
    const y = centerY + r * Math.sin(theta) * scale;

    pts[i] = { x, y, theta, r };
  }

  return pts;

} // end generateSpiralPoints


/* ------------------------------------------------------------
   exportCanvasPng(filenameBase)
------------------------------------------------------------ */
function exportCanvasPng(filenameBase) {

  const canvas = ctx.canvas;

  const tmp = document.createElement("canvas");
  tmp.width  = canvas.width;
  tmp.height = canvas.height;

  const tctx = tmp.getContext("2d");
  tctx.drawImage(canvas, 0, 0);

  const url = tmp.toDataURL("image/png");

  const a = document.createElement("a");
  a.href = url;
  a.download = filenameBase + ".png";
  a.click();

} // end exportCanvasPng


/* ------------------------------------------------------------
   drawNautilus(thing)
------------------------------------------------------------ */
function drawNautilus(thing) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  clearCanvasFull();

  // ----------------------------------------------------------
  // Parameters (already normalized in update())
  // ----------------------------------------------------------
  const points = thing.points;
  const turns  = thing.turns;
  const b      = thing.b;
  const skip   = thing.skip;
  const alpha  = thing.alpha;

  // ----------------------------------------------------------
  // Background (linear gradient, like the original)
  // ----------------------------------------------------------
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#071025");
  grad.addColorStop(1, "#07111d");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();

  // ----------------------------------------------------------
  // Center placement (keeps aperture offset left)
  // ----------------------------------------------------------
  const cx = w * 0.36;
  const cy = h * 0.50;

  // ----------------------------------------------------------
  // Scale so spiral fits
  // ----------------------------------------------------------
  const a0 = 2.8;

  const thetaMax = turns * Math.PI * 2;
  const rMax = a0 * Math.exp(b * thetaMax);

  const scale = Math.min(w, h) * 0.55 / rMax;

  const pts = generateSpiralPoints({
    points:  points,
    turns:   turns,
    a:       a0,
    b:       b,
    centerX: cx,
    centerY: cy,
    scale:   scale
  });

  // ----------------------------------------------------------
  // Color palette along curve (shell-ish)
  // ----------------------------------------------------------
  function colorForIndex(i) {

    const t = i / points;

    const rr = Math.round(lerp(220, 255, Math.pow(t, 0.6)));
    const gg = Math.round(lerp(160, 245, Math.pow(t, 0.9)));
    const bb = Math.round(lerp(120, 220, t));

    return "rgba(" + rr + "," + gg + "," + bb + "," + alpha + ")";

  } // end colorForIndex

  ctx.lineCap = "round";

  // ----------------------------------------------------------
  // Curve stitching layers
  // ----------------------------------------------------------
  const layerSkips = [
    skip,
    Math.max(1, Math.floor(skip * 0.6)),
    Math.max(1, Math.floor(skip * 1.5))
  ];

  for (let layer = 0; layer < layerSkips.length; layer++) {

    const s = layerSkips[layer];

    for (let i = 0; i < points; i++) {

      const j = (i + s) % points;

      const p = pts[i];
      const q = pts[j];

      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);

      ctx.strokeStyle = colorForIndex(i);
      ctx.lineWidth = 1.0;
      ctx.stroke();

    }
  }

  // ----------------------------------------------------------
  // Outline spiral accent
  // ----------------------------------------------------------
  ctx.beginPath();

  for (let i = 0; i < points; i++) {
    const p = pts[i];
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // ----------------------------------------------------------
  // Aperture highlight
  // ----------------------------------------------------------
  ctx.beginPath();

  const apertureR = Math.max(6, Math.min(40, Math.log(points) * 2));

  ctx.arc(cx, cy, apertureR, 0, Math.PI * 2);

  ctx.fillStyle = "rgba(8,10,15,0.9)";
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

} // end drawNautilus


/* ------------------------------------------------------------
   init()
------------------------------------------------------------ */
function init() {

  const p = scriptInfo.params;

  scriptInfo.elements = {
    element: {
      introText: p.introText,
      tipText:   p.tipText,

      points: p.points,
      turns:  p.turns,
      b:      p.b,
      skip:   p.skip,
      alpha:  p.alpha
    }
  };

} // end init


/* ------------------------------------------------------------
   update(params)
------------------------------------------------------------ */
function update(params) {

  const e = scriptInfo.elements.element;

  e.introText = params.introText;
  e.tipText   = params.tipText;

  e.points = parseInt(params.points, 10);
  e.turns  = parseInt(params.turns, 10);
  e.b      = parseFloat(params.b);
  e.skip   = parseInt(params.skip, 10);
  e.alpha  = parseFloat(params.alpha);

  if (e.points < 64) e.points = 64;
  if (e.turns  < 1)  e.turns  = 1;
  if (e.skip   < 1)  e.skip   = 1;

  if (e.b < 0.05) e.b = 0.05;
  if (e.alpha < 0.01) e.alpha = 0.01;

} // end update


/* ------------------------------------------------------------
   draw()
------------------------------------------------------------ */
function draw() {
  drawNautilus(scriptInfo.elements.element);
} // end draw


/* ------------------------------------------------------------
   scriptInfo
------------------------------------------------------------ */
export const scriptInfo = {

  title: "Nautilus — Curve Stitching",

  controls: {

    introText: {
      widget: "staticText",
      getText: function (info) {
        return info.params.introText;
      }
    }, // end introText

    points: {
      label: "Points",
      widget: "rangeHeader",
      min: 64,
      max: 3000,
      step: 1,
      default: 600
    }, // end points

    turns: {
      label: "Turns (θ max / 2π)",
      widget: "rangeHeader",
      min: 1,
      max: 20,
      step: 1,
      default: 6
    }, // end turns

    b: {
      label: "Spiral tightness (b)",
      widget: "rangeHeader",
      min: 0.05,
      max: 0.8,
      step: 0.01,
      default: 0.20
    }, // end b

    skip: {
      label: "Chord skip (connect i → i + skip)",
      widget: "rangeHeader",
      min: 1,
      max: 200,
      step: 1,
      default: 10
    }, // end skip

    alpha: {
      label: "Stroke opacity",
      widget: "rangeHeader",
      min: 0.01,
      max: 0.5,
      step: 0.01,
      default: 0.12
    }, // end alpha

    exportPng: {
      label: "Export PNG",
      widget: "button",
      action: function () {
        exportCanvasPng("nautilus");
      }
    }, // end exportPng

    tipText: {
      widget: "staticText",
      getText: function (info) {
        return info.params.tipText;
      }
    } // end tipText

  }, // end controls

  params: {
    introText: NAUTILUS_INTRO_TEXT,
    tipText:   NAUTILUS_TIP_TEXT,

    points: 600,
    turns:  6,
    b:      0.20,
    skip:   10,
    alpha:  0.12
  }, // end params

  elements: null,

  init,
  update,
  draw,

  // parameterControls compatibility
  parameters: null,

  onParamChange() {
    // required by some parameterControls flows
  }, // end onParamChange

  redrawHandler() {
    this.update(this.params);
    this.draw();
  } // end redrawHandler

}; // end scriptInfo


/* ------------------------------------------------------------
   runPattern(ctx)
------------------------------------------------------------ */
export function runPattern(_ctx) {

  scriptInfo.parameters = scriptInfo.params;

  scriptInfo.init();

  buildParameterControls(
    scriptInfo,
    "tab-scripts",
    true
  );

  scriptInfo.redrawHandler();

} // end runPattern
