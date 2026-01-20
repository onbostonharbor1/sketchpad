/* ============================================================
   Radial Petal Outlines — Segments Mode
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo:
   - Petals are drawn as outlines built from two cubic Beziers
   - Sampling modes:
       half     = segments per half-bezier
       total    = total segments per petal (split across halves)
       outline  = samples across full outline
       adaptive = recursive subdivision by chord-error tolerance

   GOAL
   ----
   - Run under Gallery calling runPattern()
   - Use parameterControls.js
   - Match drawRegistry-style lifecycle and naming

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - ctx exists globally (provided by Sketchpad getter)
   - #action exists
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Radial Petal Outlines — Segments Mode",

  params: {
    petals: 8,
    radius: 140,

    curvature: 0.6,
    cpScale: 0.9,

    segMode: "half",
    segments: 24,

    color: "#ff4fa3",
    debugPoints: false,

    lineWidth: 1
  },

  controls: {

    petals: {
      widget: "range",
      label: "Petal Count",
      min: 3,
      max: 48,
      step: 1
    },

    radius: {
      widget: "range",
      label: "Radius",
      min: 20,
      max: 380,
      step: 1
    },

    curvature: {
      widget: "range",
      label: "Curvature",
      min: 0.0,
      max: 1.5,
      step: 0.01
    },

    cpScale: {
      widget: "range",
      label: "Control Point Scale",
      min: 0.0,
      max: 2.0,
      step: 0.01
    },

    segMode: {
      widget: "select",
      label: "Segments Mode",
      options: [
        { value: "half",     label: "half (segments per half-bezier)" },
        { value: "total",    label: "total (total segments per petal)" },
        { value: "outline",  label: "outline (samples across complete outline)" },
        { value: "adaptive", label: "adaptive (subdivide by tolerance)" }
      ]
    },

    segments: {
      widget: "range",
      label: "Segments / Slider",
      min: 1,
      max: 240,
      step: 1
    },

    color: {
      widget: "colorPicker",
      label: "Color"
    },

    lineWidth: {
      widget: "range",
      label: "Line Width",
      min: 0.5,
      max: 6,
      step: 0.5
    },

    debugPoints: {
      widget: "checkbox",
      label: "Debug Points"
    }

  },

  elements: {
    element: null
  }

}; // end scriptInfo

// Compatibility aliases (per your Gallery conversion rules)
scriptInfo.parameters = scriptInfo.params;

scriptInfo.redrawHandler = function redrawHandler() {
  updatePetals(scriptInfo.params);
  drawPetals();
}; // end redrawHandler

scriptInfo.onParamChange = function onParamChange() {
  // Compatibility no-op
}; // end onParamChange


/* ============================================================
   runPattern()
   ------------------------------------------------------------
   Gallery entry point.
   NO ctx argument. NO ctx variable declared.
============================================================ */
export function runPattern() {

  buildParameterControls(scriptInfo, "tab-scripts", true);

  initPetals();
  scriptInfo.redrawHandler();

} // end runPattern


/* ============================================================
   initPetals()
   ------------------------------------------------------------
   Cold-start only: establish stable element state.
============================================================ */
function initPetals() {

  scriptInfo.elements.element = {
    w: 0,
    h: 0,
    cx: 0,
    cy: 0
  };

} // end initPetals


/* ============================================================
   updatePetals(params)
   ------------------------------------------------------------
   Apply parameter changes to element state.
============================================================ */
function updatePetals(params) {

  scriptInfo.elements.element.w  = ctx.canvas.width;
  scriptInfo.elements.element.h  = ctx.canvas.height;
  scriptInfo.elements.element.cx = ctx.canvas.width / 2;
  scriptInfo.elements.element.cy = ctx.canvas.height / 2;

} // end updatePetals


/* ============================================================
   drawPetals()
   ------------------------------------------------------------
   Deterministic draw from elements + params only.
============================================================ */
function drawPetals() {

  const e = scriptInfo.elements.element;
  const p = scriptInfo.params;

  // Clear
  ctx.clearRect(0, 0, e.w, e.h);

  // Stroke style
  ctx.strokeStyle = p.color;
  ctx.lineWidth = p.lineWidth;
  ctx.lineJoin = "round";

  const petals = clampInt(p.petals, 1, 10000);
  const radius = clampInt(p.radius, 2, 100000);

  const anglePerPetal = (2 * Math.PI) / petals;
  const baseRotation = -Math.PI / 2;

  for (let i = 0; i < petals; i++) {
    const baseAngle = baseRotation + i * anglePerPetal;
    drawOnePetal(e.cx, e.cy, baseAngle, radius, p);
  }

} // end drawPetals


/* ============================================================
   drawOnePetal(cx0, cy0, baseAngle, radius, params)
============================================================ */
function drawOnePetal(cx0, cy0, baseAngle, radius, params) {

  // Keep petal from starting exactly at center
  const petalInnerRadius = Math.max(2, radius * 0.08);

  const beziers = computePetalBeziers(
    cx0,
    cy0,
    baseAngle,
    radius,
    params.curvature,
    petalInnerRadius,
    params.cpScale
  );

  const sampling = computeSampling(params.segMode, params.segments);

  if (sampling.mode === "half") {
    drawPetalModeHalf(beziers, sampling.segmentsPerHalf, params.debugPoints);
    return;
  }

  if (sampling.mode === "outline") {
    drawPetalModeOutline(beziers, sampling.totalSamples, params.debugPoints);
    return;
  }

  if (sampling.mode === "adaptive") {
    drawPetalModeAdaptive(beziers, sampling.tol, params.debugPoints);
    return;
  }

  throw new Error("drawOnePetal: invalid sampling mode '" + String(sampling.mode) + "'");

} // end drawOnePetal


/* ============================================================
   drawPetalModeHalf(beziers, segPerHalf, debugPoints)
============================================================ */
function drawPetalModeHalf(beziers, segPerHalf, debugPoints) {

  const n = clampInt(segPerHalf, 1, 100000);

  ctx.beginPath();

  // Left half (0..1)
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const pt = cubic(beziers.left.p0, beziers.left.p1, beziers.left.p2, beziers.left.p3, t);
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
    if (debugPoints) drawPoint(pt.x, pt.y);
  }

  // Right half sampled in reverse so outline continues left->tip->right
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    const pt = cubic(beziers.right.p0, beziers.right.p1, beziers.right.p2, beziers.right.p3, t);
    ctx.lineTo(pt.x, pt.y);
    if (debugPoints) drawPoint(pt.x, pt.y);
  }

  ctx.stroke();

} // end drawPetalModeHalf


/* ============================================================
   drawPetalModeOutline(beziers, totalSamples, debugPoints)
============================================================ */
function drawPetalModeOutline(beziers, totalSamples, debugPoints) {

  const total = clampInt(totalSamples, 2, 100000);

  ctx.beginPath();

  for (let i = 0; i <= total; i++) {

    const t = i / total; // 0..1
    let tt, side;

    if (t <= 0.5) {
      tt = t * 2;
      side = "left";
    } else {
      tt = 1 - (t - 0.5) * 2;
      side = "right";
    }

    const pt = cubic(beziers[side].p0, beziers[side].p1, beziers[side].p2, beziers[side].p3, tt);

    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);

    if (debugPoints) drawPoint(pt.x, pt.y);
  }

  ctx.stroke();

} // end drawPetalModeOutline


/* ============================================================
   drawPetalModeAdaptive(beziers, tol, debugPoints)
============================================================ */
function drawPetalModeAdaptive(beziers, tol, debugPoints) {

  const ptsLeft = [];
  subdivideCubic(beziers.left.p0, beziers.left.p1, beziers.left.p2, beziers.left.p3, tol, ptsLeft);
  ptsLeft.push(beziers.left.p3);

  const ptsRight = [];
  subdivideCubic(beziers.right.p0, beziers.right.p1, beziers.right.p2, beziers.right.p3, tol, ptsRight);
  ptsRight.push(beziers.right.p3);

  ctx.beginPath();

  for (let i = 0; i < ptsLeft.length; i++) {
    const p = ptsLeft[i];
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
    if (debugPoints) drawPoint(p.x, p.y);
  }

  for (let i = ptsRight.length - 1; i >= 0; i--) {
    const p = ptsRight[i];
    ctx.lineTo(p.x, p.y);
    if (debugPoints) drawPoint(p.x, p.y);
  }

  ctx.stroke();

} // end drawPetalModeAdaptive


/* ============================================================
   computeSampling(segMode, sliderValue)
============================================================ */
function computeSampling(segMode, sliderValue) {

  const s = clampInt(sliderValue, 1, 240);

  if (segMode === "half") {
    return { mode: "half", segmentsPerHalf: s };
  }

  if (segMode === "total") {
    const half = Math.max(1, Math.ceil(s / 2));
    return { mode: "half", segmentsPerHalf: half };
  }

  if (segMode === "outline") {
    const total = Math.max(2, s);
    return { mode: "outline", totalSamples: total };
  }

  if (segMode === "adaptive") {
    // Map slider 1..240 to tolerance 1e-1 .. ~1e-5 (non-linear)
    const tol = 1e-1 * Math.pow(10, -((s - 1) / 60));
    return { mode: "adaptive", tol: tol };
  }

  throw new Error("computeSampling: invalid segMode '" + String(segMode) + "'");

} // end computeSampling


/* ============================================================
   computePetalBeziers(cx0, cy0, baseAngle, radius, curvature, petalInnerRadius, cpScale)
============================================================ */
function computePetalBeziers(cx0, cy0, baseAngle, radius, curvature, petalInnerRadius, cpScale) {

  const innerY = petalInnerRadius;
  const tipY = radius;

  const cpBase = clamp(curvature, 0, 2) * radius * cpScale;

  const cp1Factor = 0.9;
  const cp2Factor = 0.5;

  const cpInnerY = innerY + (tipY - innerY) * 0.28;
  const cpOuterY = innerY + (tipY - innerY) * 0.64;

  const L0 = { x: -0.0001, y: innerY };
  const L1 = { x: -cpBase * cp2Factor, y: cpInnerY };
  const L2 = { x: -cpBase * cp1Factor, y: cpOuterY };
  const L3 = { x: 0, y: tipY };

  const R0 = { x: 0.0001, y: innerY };
  const R1 = { x: cpBase * cp1Factor, y: cpOuterY };
  const R2 = { x: cpBase * cp2Factor, y: cpInnerY };
  const R3 = { x: 0, y: tipY };

  function toWorld(pt) {
    const a = baseAngle;
    const x = pt.x * Math.cos(a) - pt.y * Math.sin(a);
    const y = pt.x * Math.sin(a) + pt.y * Math.cos(a);
    return { x: cx0 + x, y: cy0 + y };
  } // end toWorld

  return {
    left:  { p0: toWorld(L0), p1: toWorld(L1), p2: toWorld(L2), p3: toWorld(L3) },
    right: { p0: toWorld(R0), p1: toWorld(R1), p2: toWorld(R2), p3: toWorld(R3) }
  };

} // end computePetalBeziers


/* ============================================================
   cubic(p0, p1, p2, p3, t)
============================================================ */
function cubic(p0, p1, p2, p3, t) {

  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
  };

} // end cubic


/* ============================================================
   subdivideCubic(p0, p1, p2, p3, tol, out)
============================================================ */
function subdivideCubic(p0, p1, p2, p3, tol, out) {

  const e1 = chordError(p0, p1, p3);
  const e2 = chordError(p0, p2, p3);

  if (Math.max(e1, e2) <= tol) {
    out.push(p0);
    return;
  }

  const p01 = mid(p0, p1);
  const p12 = mid(p1, p2);
  const p23 = mid(p2, p3);
  const p012 = mid(p01, p12);
  const p123 = mid(p12, p23);
  const p0123 = mid(p012, p123);

  subdivideCubic(p0,    p01,   p012,  p0123, tol, out);
  subdivideCubic(p0123, p123,  p23,   p3,    tol, out);

} // end subdivideCubic


/* ============================================================
   chordError(a, b, c)
============================================================ */
function chordError(a, b, c) {

  const vx = c.x - a.x;
  const vy = c.y - a.y;

  const n2 = vx * vx + vy * vy;

  if (n2 === 0) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  const proj = ((b.x - a.x) * vx + (b.y - a.y) * vy) / n2;

  const px = a.x + proj * vx;
  const py = a.y + proj * vy;

  return Math.hypot(b.x - px, b.y - py);

} // end chordError


/* ============================================================
   mid(a, b)
============================================================ */
function mid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
} // end mid


/* ============================================================
   clamp(v, a, b)
============================================================ */
function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v));
} // end clamp


/* ============================================================
   clampInt(v, a, b)
============================================================ */
function clampInt(v, a, b) {

  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return a;

  if (n < a) return a;
  if (n > b) return b;
  return n;

} // end clampInt


/* ============================================================
   drawPoint(x, y)
============================================================ */
function drawPoint(x, y) {

  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.arc(x, y, 1.25, 0, Math.PI * 2);
  ctx.fill();

} // end drawPoint
