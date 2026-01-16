/* ============================================================
   gallery/Scripts/Elliptical/ellipseStitchDemo.js
   ------------------------------------------------------------
   Ellipse Curve Stitching — Gallery Script (Interactive)

   Converted from standalone HTML to Sketchpad Gallery script.

   Lifecycle shape (drawRegistry-style):
     params / controls / elements / init / update / draw

   ParameterControls compatibility:
     parameters
     redrawHandler

   FAIL-FAST assumptions:
     - window.ctx exists
     - buildParameterControls exists
     - Gallery scripts panel id = "tab-scripts"
   ============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   Informational text (display-only)
   NOTE:
   Must be declared BEFORE scriptInfo uses it.
============================================================ */
const INFO_TEXT =
"Ellipse curve stitching\n" +
"\n" +
"• Large point counts produce smooth envelopes\n" +
"• Prime or near-prime skips reduce repetition\n" +
"• Small skips emphasize parabolic structure\n" +
"• Animation rotates the stitch phase\n";


/* ============================================================
   scriptInfo  (drawRegistry-shaped top object)
============================================================ */

export const scriptInfo = {
  // --- identity / metadata (drawRegistry-like) ---
  name:        "Ellipse Curve Stitching",
  id:          "ellipseCurveStitching",
  version:     0.1,
  category:    "Elliptical",
  source:      "gallery",
  tags:        ["ellipse", "curve-stitch", "animation"],
  description: "Curve stitching chords across an ellipse with optional animation.",

  // --- visual styling placeholders (drawRegistry-like) ---
  background: null,
  overlays:   [],
  transforms: [],

  // --- persistent runtime state (drawRegistry-like) ---
  elements: null,

  // --------------------------------------------------------
  // controls (as close as possible to drawRegistry)
  // --------------------------------------------------------
  controls: {

    infoText: {
      widget: "staticText",
      text: INFO_TEXT
    },

    n: {
      label: "Points",
      widget: "range",
      min: 10,
      max: 1500,
      step: 1,
      default: 200
    },

    skip: {
      label: "Skip",
      widget: "range",
      min: 1,
      max: 749,
      step: 1,
      default: 71
    },

    width: {
      label: "Stroke width",
      widget: "range",
      min: 0.1,
      max: 4,
      step: 0.1,
      default: 0.8
    },

    color: {
      label: "Color",
      widget: "colorPicker",
      default: "#1b7bd6"
    },

    outline: {
      label: "Show ellipse outline",
      widget: "checkbox",
      default: true
    },

    points: {
      label: "Show points",
      widget: "checkbox",
      default: false
    },

    animate: {
      label: "Animate",
      widget: "checkbox",
      default: false
    },

    rotationSpeed: {
      label: "Rotation speed",
      widget: "range",
      min: 0,
      max: 3,
      step: 0.05,
      default: 0.30
    },

    skipSpeed: {
      label: "Skip speed",
      widget: "range",
      min: 0,
      max: 60,
      step: 1,
      default: 10
    },

    cx: {
      label: "Center X offset",
      widget: "range",
      min: -400,
      max: 400,
      step: 1,
      default: 0
    },

    cy: {
      label: "Center Y offset",
      widget: "range",
      min: -400,
      max: 400,
      step: 1,
      default: 0
    },

    paddingFrac: {
      label: "Padding fraction",
      widget: "range",
      min: 0,
      max: 0.25,
      step: 0.005,
      default: 0.07
    },

    alpha: {
      label: "Stitch alpha",
      widget: "range",
      min: 0.05,
      max: 1,
      step: 0.05,
      default: 0.9
    }

  }, // end controls

  // --------------------------------------------------------
  // parameters (authoritative live object; ParameterControls expects this name)
  // --------------------------------------------------------
  parameters: {
    n: 200,
    skip: 71,
    width: 0.8,
    color: "#1b7bd6",
    outline: true,
    points: false,
    animate: false,
    rotationSpeed: 0.30,
    skipSpeed: 10,
    cx: 0,
    cy: 0,
    paddingFrac: 0.07,
    alpha: 0.9
  },

  // Optional alias (drawRegistry vocabulary) pointing to the SAME object
  params: null,

  // --------------------------------------------------------
  // lifecycle wrappers (thin; defer to workers)
  // --------------------------------------------------------
  init() {
    doInit(this);
  }, // end init

  update(params) {
    doUpdate(this, params);
  }, // end update

  draw() {
    doDraw(this);
  }, // end draw

  // --------------------------------------------------------
  // ParameterControls contract
  // --------------------------------------------------------
  redrawHandler() {

    // Apply current live parameters into the persistent element
    this.update(this.parameters);

    // Animation policy:
    // - if animate is true: ensure loop is running
    // - else: stop loop and draw once
    if (this.elements.element.animate) {
      startAnimationLoop(this);
    } else {
      stopAnimationLoop(this);
      this.draw();
    }

  } // end redrawHandler

}; // end scriptInfo

scriptInfo.params = scriptInfo.parameters;

/* ============================================================
   runPattern(ctx) — Gallery entry point
============================================================ */
export function runPattern(_ctx) {

  if (!window.ctx) throw new Error("ellipseStitchDemo: window.ctx missing");

  // Cold init each run; stop any prior loop first.
  if (scriptInfo.elements && scriptInfo.elements.element) {
    stopAnimationLoop(scriptInfo);
  }

  scriptInfo.init();

  buildParameterControls(
    scriptInfo,
    "tab-scripts",
    true
  );

  scriptInfo.redrawHandler();

} // end runPattern


/* ============================================================
   Worker: doInit(info)
============================================================ */
function doInit(info) {

  if (!info) throw new Error("doInit: info missing");
  if (!info.parameters) throw new Error("doInit: info.parameters missing");

  const p = info.parameters;

  info.elements = {
    element: {
      n:             p.n,
      skip:          p.skip,
      width:         p.width,
      color:         p.color,
      outline:       p.outline,
      points:        p.points,
      animate:       p.animate,
      rotationSpeed: p.rotationSpeed,
      skipSpeed:     p.skipSpeed,
      cx:            p.cx,
      cy:            p.cy,
      paddingFrac:   p.paddingFrac,
      alpha:         p.alpha,

      rotation:    0,
      skipOffset:  0,
      animReqId:   0,
      animRunning: false,
      lastTs:      0
    }
  };

} // end doInit


/* ============================================================
   Worker: doUpdate(info, params)
============================================================ */
function doUpdate(info, params) {

  if (!info) throw new Error("doUpdate: info missing");
  if (!info.elements || !info.elements.element) throw new Error("doUpdate: info.elements.element missing");
  if (!params) throw new Error("doUpdate: params missing");

  const e = info.elements.element;

  e.n             = parseInt(params.n, 10);
  e.skip          = parseInt(params.skip, 10);
  e.width         = parseFloat(params.width);
  e.color         = params.color;
  e.outline       = !!params.outline;
  e.points        = !!params.points;
  e.animate       = !!params.animate;
  e.rotationSpeed = parseFloat(params.rotationSpeed);
  e.skipSpeed     = parseFloat(params.skipSpeed);
  e.cx            = parseFloat(params.cx);
  e.cy            = parseFloat(params.cy);
  e.paddingFrac   = parseFloat(params.paddingFrac);
  e.alpha         = parseFloat(params.alpha);

  if (e.n < 3) e.n = 3;
  if (e.skip < 1) e.skip = 1;

} // end doUpdate


/* ============================================================
   Worker: doDraw(info)
============================================================ */
function doDraw(info) {

  if (!info) throw new Error("doDraw: info missing");
  if (!info.elements || !info.elements.element) throw new Error("doDraw: info.elements.element missing");

  drawEllipseStitching(info.elements.element);

} // end doDraw


/* ============================================================
   Renderer: drawEllipseStitching(thing)
============================================================ */
function drawEllipseStitching(thing) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  clearCanvasFull();

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  const padding = Math.min(w, h) * thing.paddingFrac;

  const cx = (w / 2) + thing.cx;
  const cy = (h / 2) + thing.cy;

  const a = (w / 2) - padding;
  const b = (h / 2) - padding;

  let n = thing.n;
  let skip = thing.skip;

  if (n < 3) n = 3;

  if (skip >= n) {
    skip = skip % n;
    if (skip === 0) skip = 1;
  }

  const pts = buildEllipsePoints(
    n,
    cx,
    cy,
    a,
    b,
    thing.rotation
  );

  // Outline
  if (thing.outline) {

    ctx.save();
    ctx.beginPath();

    const segs = Math.max(60, Math.min(360, Math.floor(n)));

    for (let i = 0; i <= segs; i++) {
      const t = (i / segs) * Math.PI * 2 + thing.rotation;
      const p = ellipsePoint(cx, cy, a, b, t);

      if (i === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    }

    ctx.closePath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#999";
    ctx.stroke();
    ctx.restore();
  }

  // Stitches
  ctx.save();
  ctx.lineWidth = thing.width;
  ctx.strokeStyle = thing.color;
  ctx.globalAlpha = thing.alpha;

  ctx.beginPath();
  for (let i = 0; i < n; i++) {

    const j = (i + skip + thing.skipOffset) % n;

    const p1 = pts[i];
    const p2 = pts[j];

    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
  }
  ctx.stroke();
  ctx.restore();

  // Points
  if (thing.points) {

    ctx.save();
    ctx.fillStyle = "#222";

    const r = Math.max(1, Math.min(3, Math.round(3 * (200 / n))));

    for (let i = 0; i < n; i++) {
      const p = pts[i];
      ctx.beginPath();
      ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

} // end drawEllipseStitching


/* ============================================================
   Animation helpers
============================================================ */

function startAnimationLoop(info) {

  const e = info.elements.element;

  if (e.animRunning) return;

  e.animRunning = true;
  e.lastTs = 0;

  function frame(ts) {

    if (!e.animate) {
      e.animRunning = false;
      e.lastTs = 0;
      info.draw();
      return;
    }

    if (!e.lastTs) e.lastTs = ts;

    const dt = (ts - e.lastTs) / 1000;
    e.lastTs = ts;

    e.rotation   += dt * e.rotationSpeed;
    e.skipOffset += (dt * e.skipSpeed) | 0;

    info.draw();
    e.animReqId = requestAnimationFrame(frame);

  } // end frame

  e.animReqId = requestAnimationFrame(frame);

} // end startAnimationLoop


function stopAnimationLoop(info) {

  const e = info.elements.element;

  if (!e.animRunning) return;

  cancelAnimationFrame(e.animReqId);

  e.animRunning = false;
  e.animReqId = 0;
  e.lastTs = 0;

} // end stopAnimationLoop


/* ============================================================
   Geometry helpers
============================================================ */

function ellipsePoint(cx, cy, a, b, t) {
  return [cx + a * Math.cos(t), cy + b * Math.sin(t)];
} // end ellipsePoint

function buildEllipsePoints(n, cx, cy, a, b, rotation) {

  const pts = new Array(n);

  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 + rotation;
    pts[i] = ellipsePoint(cx, cy, a, b, t);
  }

  return pts;

} // end buildEllipsePoints

function clearCanvasFull() {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.restore();

} // end clearCanvasFull
