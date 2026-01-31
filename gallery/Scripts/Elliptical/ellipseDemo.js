/* ============================================================
   gallery/Scripts/Elliptical/ellipseDemo.js
   ------------------------------------------------------------
   Ellipse Points — Angle vs Arc-Length
   Gallery Script (ParameterControls-integrated)

   FIX
   ---
   parameterControls.js expects:
     - info.controls
     - info.parameters
     - info.redrawHandler()   << REQUIRED (your error)

   GOALS
   -----
   - drawRegistry-like top object, worker functions below
   - init / update / draw lifecycle
============================================================ */

import { printTitle }             from "/draw/drawUtilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo  (drawRegistry-shaped)
============================================================ */

export const scriptInfo = {
  // --- identity / metadata (drawRegistry-like) ---
  name:        "Ellipse Points Demo",
  id:          "ellipsePointsDemo",
  version:     0.1,
  category:    "Elliptical",
  source:      "gallery",
  tags:        ["ellipse", "points", "arc-length"],
  description: "Ellipse points spaced by equal angle or equal arc-length.",

  // --- visual styling placeholders (drawRegistry-like) ---
  background: null,
  overlays:   [],
  transforms: [],

  // --- persistent runtime state (drawRegistry-like) ---
  elements: null,

  // --- UI controls metadata (drawRegistry-like) ---
  controls: {
    width:     { label: "Width",      widget: "range",    min: 60,   max: 1000, step: 2,   default: 600,
                 rangeHeader: true    },
    height:    { label: "Height",     widget: "range",    min: 60,   max: 1000, step: 2,   default: 360 },
    rotate:    { label: "Rotation",   widget: "range",    min: -180, max: 180,  step: 1,   default: 0   },
    cx:        { label: "Center X",   widget: "range",    min: -300, max: 300,  step: 1,   default: 0   },
    cy:        { label: "Center Y",   widget: "range",    min: -300, max: 300,  step: 1,   default: 0   },
    numPoints: { label: "Count",      widget: "range",    min: 3,    max: 600,  step: 1,   default: 120 },
    mode:      { label: "Spacing",    widget: "select",   options: ["angle", "arc"],       default: "arc" },
    showDots:  { label: "Show Dots",  widget: "checkbox",                                  default: false },
    lineWidth: { label: "Line Width", widget: "range",    min: 0.3,  max: 4,    step: 0.1, default: 1.2 }
  },

  // --- parameters (authoritative live object; ParameterControls expects this name) ---
  parameters: {
    width:     600,
    height:    360,
    rotate:    0,
    cx:        0,
    cy:        0,
    numPoints: 120,
    mode:      "arc",
    showDots:  false,
    lineWidth: 1.2
  },

  // Optional alias (drawRegistry vocabulary) pointing to the SAME object
  params: null,

  // --- lifecycle wrappers (thin; defer to workers) ---
  init() {
    doInit(this);
  }, // end init

  update(params) {
    doUpdate(this, params);
  }, // end update

  draw() {
    doDraw(this);
  }, // end draw

  // --- ParameterControls contract (REQUIRED by your current parameterControls.js) ---
  // Called after any slider/select/checkbox change.
  redrawHandler() {
    this.update(this.parameters);
    this.draw();
  }, // end redrawHandler

  // Optional hook (ParameterControls calls this only if it exists)
  onParamChange() {
    // no-op (intentionally)
  } // end onParamChange
}; // end scriptInfo

scriptInfo.params = scriptInfo.parameters;

/* ============================================================
   runPattern() — Gallery entry point
============================================================ */
export function runPattern() {
  if (!window.drawCanvas) throw new Error("ellipseDemo: window.drawCanvas missing");
  if (!window.ctx) throw new Error("ellipseDemo: window.ctx missing");

  printTitle(scriptInfo.name);

  // Cold init every time (Gallery semantics today)
  scriptInfo.init();

  // Build controls into Scripts environment action panel
  buildParameterControls(scriptInfo, "tab-scripts", true);

  // First render
  scriptInfo.redrawHandler();
} // end runPattern

/* ============================================================
   Worker: doInit(info)
============================================================ */
function doInit(info) {
  if (!info) throw new Error("doInit: info missing");
  if (!info.parameters) throw new Error("doInit: info.parameters missing");

  const p = info.parameters;

  // Persistent runtime element (drawRegistry-style: elements.element)
  info.elements = {
    element: {
      width:     p.width,
      height:    p.height,
      rotate:    p.rotate,
      cx:        p.cx,
      cy:        p.cy,
      numPoints: p.numPoints,
      mode:      p.mode,
      showDots:  p.showDots,
      lineWidth: p.lineWidth
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

  const keys = Object.keys(info.parameters);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = params[key];
    if (value === undefined) continue;
    e[key] = value;
  }
} // end doUpdate

/* ============================================================
   Worker: doDraw(info)
============================================================ */
function doDraw(info) {
  if (!info) throw new Error("doDraw: info missing");
  if (!info.elements || !info.elements.element) throw new Error("doDraw: info.elements.element missing");

  drawEllipsePoints(info.elements.element);
} // end doDraw

/* ============================================================
   Renderer: drawEllipsePoints(thing)
============================================================ */
function drawEllipsePoints(thing) {
  if (!thing) throw new Error("drawEllipsePoints: thing missing");
  if (!window.drawCanvas) throw new Error("drawEllipsePoints: window.drawCanvas missing");
  if (!window.ctx) throw new Error("drawEllipsePoints: window.ctx missing");

  const width     = thing.width;
  const height    = thing.height;
  const rotate    = thing.rotate;
  const cx        = thing.cx;
  const cy        = thing.cy;
  const numPoints = thing.numPoints;
  const mode      = thing.mode;
  const showDots  = thing.showDots;
  const lineWidth = thing.lineWidth;

  const w2 = drawCanvas.width / 2;
  const h2 = drawCanvas.height / 2;

  // Clear canvas (identity transform)
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  ctx.restore();

  // Points for polyline
  const pts = getEllipsePoints(width, height, cx, cy, rotate, numPoints, mode);

  // Outline points (smooth)
  const outline = getEllipsePoints(width, height, cx, cy, rotate, 360, "angle");

  // Outline
  ctx.beginPath();
  ctx.lineWidth = lineWidth + 0.6;
  ctx.strokeStyle = "rgba(96,165,250,0.35)";

  for (let i = 0; i < outline.length; i++) {
    const p = outline[i];
    const X = p.x + w2;
    const Y = p.y + h2;
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  }
  ctx.closePath();
  ctx.stroke();

  // Connecting polyline
  ctx.beginPath();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = "#60a5fa";

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const X = p.x + w2;
    const Y = p.y + h2;
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  }
  ctx.closePath();
  ctx.stroke();

  // Dots
  if (showDots) {
    ctx.fillStyle = "#f59e0b";
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const X = p.x + w2;
      const Y = p.y + h2;
      ctx.beginPath();
      ctx.arc(X, Y, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
} // end drawEllipsePoints

/* ============================================================
   Geometry helpers
============================================================ */

function pointAtArcLength(targetLength, maxSamples, cumulative, pts) {
  let low = 1;
  let high = maxSamples;

  while (low < high) {
    const mid = (low + high) >>> 1;
    if (cumulative[mid] < targetLength) low = mid + 1;
    else high = mid;
  }

  const k = low;
  const prevL = cumulative[k - 1];
  const nextL = cumulative[k];

  const denom = (nextL - prevL);
  const t = (targetLength - prevL) / (denom === 0 ? 1e-9 : denom);

  const A = pts[k - 1];
  const B = pts[k];

  return {
    x: A.x + t * (B.x - A.x),
    y: A.y + t * (B.y - A.y)
  };
} // end pointAtArcLength

function getEllipsePoints(width, height, cx, cy, rotDeg, n, mode) {
  const rx = width / 2;
  const ry = height / 2;

  const rot = rotDeg * Math.PI / 180;
  const cR = Math.cos(rot);
  const sR = Math.sin(rot);

  function pointAtAngle(theta) {
    const x0 = rx * Math.cos(theta);
    const y0 = ry * Math.sin(theta);

    return {
      x: cx + x0 * cR - y0 * sR,
      y: cy + x0 * sR + y0 * cR
    };
  } // end pointAtAngle

  if (mode === "angle") {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(pointAtAngle(i * 2 * Math.PI / n));
    }
    return out;
  }

  const samples = Math.max(2048, n * 16);
  const pts = new Array(samples + 1);
  const cumulative = new Float64Array(samples + 1);

  let dist = 0;
  let prev = null;

  for (let i = 0; i <= samples; i++) {
    const p = pointAtAngle(i * 2 * Math.PI / samples);
    pts[i] = p;

    if (prev) dist += Math.hypot(p.x - prev.x, p.y - prev.y);
    cumulative[i] = dist;

    prev = p;
  }

  const total = cumulative[samples];
  const seg = total / n;

  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(pointAtArcLength(i * seg, samples, cumulative, pts));
  }

  return out;
} // end getEllipsePoints
