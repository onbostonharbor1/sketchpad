/* ============================================================
   Ellipse Points — Angle vs Arc-Length
   Gallery Script (ParameterControls-integrated)

   GOAL
   ----
   - Draw ellipse points (equal-angle or equal-arc spacing)
   - Use Sketchpad parameterControls.js to build controls in #action
   - No uiState usage
   - Works via Gallery calling runPattern()

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - window.drawCanvas exists
   - window.ctx exists
   - #action exists
   ============================================================ */

import { printTitle } from "../../draw/draw_utilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";

/* ------------------------------------------------------------
   Helper: pointAtArcLength()
------------------------------------------------------------ */
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


/* ------------------------------------------------------------
   Helper: getEllipsePoints()
------------------------------------------------------------ */
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


/* ------------------------------------------------------------
   draw()
   - This is the actual renderer (matches drawRegistry naming)
------------------------------------------------------------ */
function draw(thing) {
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
} // end draw


/* ------------------------------------------------------------
   init()
   - Create persistent runtime element
------------------------------------------------------------ */
function init() {
  const p = scriptInfo.params;

  scriptInfo.elements = {
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
} // end init


/* ------------------------------------------------------------
   update(params)
   - Apply changes to the persistent element
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
   scriptInfo (ParameterControls contract)
   - Uses drawRegistry-style internal names:
       params (not parameters)
       init / update / draw
       elements.element (persistent runtime state)
------------------------------------------------------------ */
export const scriptInfo = {
  title: "Ellipse Points Demo",

  // Controls definition for parameterControls.js
  controls: {
    width:     { label: "Width",      widget: "range",    min: 60,   max: 1000, step: 2,   default: 600 },
    height:    { label: "Height",     widget: "range",    min: 60,   max: 1000, step: 2,   default: 360 },
    rotate:    { label: "Rotation",   widget: "range",    min: -180, max: 180,  step: 1,   default: 0   },
    cx:        { label: "Center X",   widget: "range",    min: -300, max: 300,  step: 1,   default: 0   },
    cy:        { label: "Center Y",   widget: "range",    min: -300, max: 300,  step: 1,   default: 0   },
    numPoints: { label: "Count",      widget: "range",    min: 3,    max: 600,  step: 1,   default: 120 },
    mode:      { label: "Spacing",    widget: "select",   options: ["angle", "arc"],       default: "arc" },
    showDots:  { label: "Show Dots",  widget: "checkbox",                                  default: false },
    lineWidth: { label: "Line Width", widget: "range",    min: 0.3,  max: 4,    step: 0.1, default: 1.2 }
  },

  // Default values (renamed to match drawRegistry convention)
  params: {
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

  // Persistent runtime state (same naming as drawRegistry files)
  elements: null,

  // Lifecycle hooks (same naming as drawRegistry files)
  init,
  update,
  draw
}; // end scriptInfo


/* ------------------------------------------------------------
   runPattern() — Gallery entry point
   ------------------------------------------------------------
   Gallery calls: await mod.runPattern(ctx)
------------------------------------------------------------ */
export function runPattern(_ctx) {
  printTitle(scriptInfo.title);

  // 1) Create persistent element once
  scriptInfo.init();

  // 2) Build controls
  //    Your parameterControls flow should call:
  //      scriptInfo.update(scriptInfo.params) (or similar)
  //      scriptInfo.draw(scriptInfo.elements.element)
  //
  //    We do not add new assumptions here; we just pass scriptInfo.
  buildParameterControls(
    scriptInfo,
    "tab-scripts",
    true
  );

  // 3) First draw
  scriptInfo.draw(scriptInfo.elements.element);
} // end runPattern
