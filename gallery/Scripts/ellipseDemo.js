/* ============================================================
   Ellipse Points — Angle vs Arc-Length
   ES-Module version for Gallery Scripts.
   Now supports optional parameter controls via:
      patternMeta, initPattern(), drawPattern()
   Still supports legacy runPattern().

   No connection to Draw-side classes at all.
   ============================================================ */

import { printTitle } from "../../draw/draw_utilities.js";

/* ------------------------------------------------------------
   Helper: getEllipsePoints() and pointAtArcLength()
------------------------------------------------------------ */

function pointAtArcLength(targetLength, maxSamples, cumulative, pts) {
  let low = 1, high = maxSamples;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (cumulative[mid] < targetLength) low = mid + 1;
    else high = mid;
  }
  const k = low;
  const prevL = cumulative[k - 1];
  const nextL = cumulative[k];
  const t = (targetLength - prevL) / Math.max(1e-9, nextL - prevL);
  const A = pts[k - 1], B = pts[k];
  return { x: A.x + t * (B.x - A.x), y: A.y + t * (B.y - A.y) };
} // end pointAtArcLength

function getEllipsePoints(width, height, cx, cy, rotDeg, n, mode="arc") {
  const rx = width / 2, ry = height / 2;
  const rot = rotDeg * Math.PI / 180;
  const cR = Math.cos(rot), sR = Math.sin(rot);

  const pointAtAngle = theta => {
    const x0 = rx * Math.cos(theta);
    const y0 = ry * Math.sin(theta);
    return {
      x: cx + x0 * cR - y0 * sR,
      y: cy + x0 * sR + y0 * cR
    };
  };

  if (mode === "angle") {
    const out = [];
    for (let i = 0; i < n; i++) out.push(pointAtAngle(i * 2*Math.PI / n));
    return out;
  }

  // arc-length
  const samples = Math.max(2048, n * 16);
  const pts = new Array(samples + 1);
  const cumulative = new Float64Array(samples + 1);

  let dist = 0, prev = null;
  for (let i = 0; i <= samples; i++) {
    const p = pointAtAngle(i * 2*Math.PI / samples);
    pts[i] = p;
    if (prev) dist += Math.hypot(p.x - prev.x, p.y - prev.y);
    cumulative[i] = dist;
    prev = p;
  }

  const total = cumulative[samples];
  const seg = total / n;

  const out = [];
  for (let i = 0; i < n; i++)
    out.push(pointAtArcLength(i * seg, samples, cumulative, pts));
  return out;
} // end getEllipsePoints

/* ------------------------------------------------------------
   drawEllipsePoints
------------------------------------------------------------ */
function drawEllipsePoints(p) {
  const {
    width,
    height,
    rotate,
    cx,
    cy,
    numPoints,
    mode,
    showDots,
    lineWidth
  } = p;

  const w2 = drawCanvas.width / 2;
  const h2 = drawCanvas.height / 2;

  // --- Clear canvas (always clear in identity transform) ---
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  ctx.restore();

  // --- Compute main sample points (orange dots & polyline) ---
  const pts = getEllipsePoints(width, height, cx, cy, rotate, numPoints, mode);

  // --- Compute outline points using equal-angle sampling ---
  //     (360 points gives a smooth outline)
  const outline = getEllipsePoints(width, height, cx, cy, rotate, 360, "angle");

  // --- Draw outline ---
  ctx.beginPath();
  ctx.lineWidth = lineWidth + 0.6;
  ctx.strokeStyle = "rgba(96,165,250,0.35)";

  for (let i = 0; i < outline.length; i++) {
    const pnt = outline[i];
    const X = pnt.x + w2;
    const Y = pnt.y + h2;
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  }
  ctx.closePath();
  ctx.stroke();

  // --- Draw connecting polyline (sampled points) ---
  ctx.beginPath();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = "#60a5fa";

  for (let i = 0; i < pts.length; i++) {
    const pnt = pts[i];
    const X = pnt.x + w2;
    const Y = pnt.y + h2;
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  }
  ctx.closePath();
  ctx.stroke();

  // --- Draw the dots ---
  if (showDots) {
    ctx.fillStyle = "#f59e0b";
    for (const pnt of pts) {
      const X = pnt.x + w2;
      const Y = pnt.y + h2;
      ctx.beginPath();
      ctx.arc(X, Y, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
} // end drawEllipsePoints

/* ------------------------------------------------------------
   Parameter interface for Gallery
------------------------------------------------------------ */

export const patternMeta = {
  id: "ellipsePointsDemo",
  title: "Ellipse Points Demo",
  parameters: [
    {
      key: "width",
      label: "Width",
      widget: "range",
      min: 60,
      max: 1000,
      step: 2,
      default: 600
    },
    {
      key: "height",
      label: "Height",
      widget: "range",
      min: 60,
      max: 1000,
      step: 2,
      default: 360
    },
    {
      key: "rotate",
      label: "Rotation",
      widget: "range",
      min: -180,
      max: 180,
      step: 1,
      default: 0
    },
    {
      key: "cx",
      label: "Center X",
      widget: "range",
      min: -300,
      max: 300,
      step: 1,
      default: 0
    },
    {
      key: "cy",
      label: "Center Y",
      widget: "range",
      min: -300,
      max: 300,
      step: 1,
      default: 0
    },
    {
      key: "numPoints",
      label: "Count",
      widget: "range",
      min: 3,
      max: 600,
      step: 1,
      default: 120
    },
    {
      key: "mode",
      label: "Spacing",
      widget: "select",
      options: ["angle", "arc"],
      default: "arc"
    },
    {
      key: "showDots",
      label: "Show Dots",
      widget: "checkbox",
      default: false
    },
    {
      key: "lineWidth",
      label: "Line Width",
      widget: "range",
      min: 0.3,
      max: 4,
      step: 0.1,
      default: 1.2
    }
  ]
};


export function initPattern() {
  return {
    width: 600,
    height: 360,
    rotate: 0,
    cx: 0,
    cy: 0,
    numPoints: 120,
    mode: "arc",
    showDots: false,
    lineWidth: 1.2
  };
} // end initPattern

export function drawPattern(params) {
  drawEllipsePoints(params);
} // end drawPattern

/* ------------------------------------------------------------
   Legacy runPattern() – no controls
------------------------------------------------------------ */

export function runPattern() {
  printTitle(patternMeta.title);
  const p = initPattern();
  drawEllipsePoints(p);
} // end runPattern
