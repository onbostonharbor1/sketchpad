/* ============================================================
   Curve Stitch on a 3-lobed Epitrochoid (Static)
   Gallery Script (ParameterControls-integrated)

   CHANGE REQUESTS
   ---------------
   1) Remove the gray background (use white).
   2) Start scaled smaller (fits the disk / canvas better).
   3) Guarantee an initial display without touching controls.

   RULES
   -----
   - Use ONLY the existing global ctx (do not declare or pass ctx)
   - No animation
   ============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ------------------------------------------------------------
   lerp(a, b, t)
------------------------------------------------------------ */
function lerp(a, b, t) {
  return a + (b - a) * t;
} // end lerp


/* ------------------------------------------------------------
   epiPoint(t, p, w, h)
------------------------------------------------------------ */
function epiPoint(t, p, w, h) {

  const cx = w / 2;
  const cy = h / 2;

  const k = (p.Rbig + p.rsm) / p.rsm;

  const x = (p.Rbig + p.rsm) * Math.cos(t) - p.doff * Math.cos(k * t);
  const y = (p.Rbig + p.rsm) * Math.sin(t) - p.doff * Math.sin(k * t);

  return [cx + p.scale * x, cy + p.scale * y];

} // end epiPoint


/* ------------------------------------------------------------
   buildArcLUT(p, w, h)
------------------------------------------------------------ */
function buildArcLUT(p, w, h) {

  const lut = [];

  let s = 0;
  const p0 = epiPoint(0, p, w, h);
  let x0 = p0[0];
  let y0 = p0[1];

  lut.push({ t: 0, x: x0, y: y0, s: 0 });

  for (let i = 1; i <= p.over; i++) {

    const t = i * 2 * Math.PI / p.over;
    const pt = epiPoint(t, p, w, h);
    const x = pt[0];
    const y = pt[1];

    const dx = x - x0;
    const dy = y - y0;

    s += Math.hypot(dx, dy);

    lut.push({ t, x, y, s });

    x0 = x;
    y0 = y;

  } // end for

  return lut;

} // end buildArcLUT


/* ------------------------------------------------------------
   pointAtArc(u, lut, totalLen)
   ------------------------------------------------------------
   Fixed:
   - prevents lut[-1] access when u === 0 by starting i at 1.
------------------------------------------------------------ */
function pointAtArc(u, lut, totalLen) {

  const target = u * totalLen;

  let i = 1;
  while (i < lut.length && lut[i].s < target) i++;

  const a = lut[i - 1];
  const b = lut[i] || lut[0];

  const h = (target - a.s) / (b.s - a.s || 1);

  return [
    a.x + h * (b.x - a.x),
    a.y + h * (b.y - a.y)
  ];

} // end pointAtArc


/* ------------------------------------------------------------
   buildNodes(p, w, h)
------------------------------------------------------------ */
function buildNodes(p, w, h) {

  const lut = buildArcLUT(p, w, h);
  const totalLen = lut[lut.length - 1].s;

  const pts = [];
  for (let i = 0; i < p.nodes; i++) {
    pts.push(pointAtArc(i / p.nodes, lut, totalLen));
  }

  return { pts, lut };

} // end buildNodes


/* ------------------------------------------------------------
   stitchBand(p, pts, skip, alpha)
------------------------------------------------------------ */
function stitchBand(p, pts, skip, alpha) {

  ctx.lineCap = "round";
  ctx.lineWidth = p.lineWidth;

  for (let i = 0; i < p.nodes; i++) {

    const j = (i + skip) % p.nodes;

    const a = pts[i];
    const b = pts[j];

    const x1 = a[0];
    const y1 = a[1];
    const x2 = b[0];
    const y2 = b[1];

    ctx.strokeStyle = `rgba(55,60,70,${alpha})`;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

  } // end for

} // end stitchBand


/* ------------------------------------------------------------
   drawNails(p, pts)
------------------------------------------------------------ */
function drawNails(p, pts) {

  if (!p.showNails) return;

  ctx.fillStyle = "#cfd3d8";

  for (let i = 0; i < pts.length; i++) {
    const x = pts[i][0];
    const y = pts[i][1];

    ctx.beginPath();
    ctx.arc(x, y, p.nailRadius, 0, Math.PI * 2);
    ctx.fill();
  }

} // end drawNails


/* ------------------------------------------------------------
   drawAnchorCurve(p, lut)
------------------------------------------------------------ */
function drawAnchorCurve(p, lut) {

  if (!p.showAnchor) return;

  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  for (let i = 0; i < lut.length; i++) {
    const x = lut[i].x;
    const y = lut[i].y;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

} // end drawAnchorCurve


/* ------------------------------------------------------------
   drawEpitrochoidStitch(p)
------------------------------------------------------------ */
function drawEpitrochoidStitch(p) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  // CHANGE #1: white background (no gray)
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  const built = buildNodes(p, w, h);
  const pts = built.pts;
  const lut = built.lut;

  const skipA = Math.max(1, Math.round(p.nodes * p.skipFracA));
  const skipB = Math.max(1, Math.round(p.nodes * p.skipFracB));

  stitchBand(p, pts, skipA, p.alphaA);
  stitchBand(p, pts, skipB, p.alphaB);

  drawNails(p, pts);
  drawAnchorCurve(p, lut);

} // end drawEpitrochoidStitch


/* ------------------------------------------------------------
   init()
------------------------------------------------------------ */
function init() {
  scriptInfo.elements = { element: {} };
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
  drawEpitrochoidStitch(scriptInfo.elements.element);
} // end draw


/* ------------------------------------------------------------
   scriptInfo
------------------------------------------------------------ */
export const scriptInfo = {

  title: "Epitrochoid Stitch (3-lobed)",

  controls: {
    nodes:      { label: "Nodes",        widget: "range", min: 60,   max: 600,  step: 10,   default: 210 },
    over:       { label: "Oversample",   widget: "range", min: 500,  max: 12000,step: 500,  default: 6000 },

    Rbig:       { label: "R (big)",      widget: "range", min: 50,   max: 400,  step: 1,    default: 200 },
    rsm:        { label: "r (small)",    widget: "range", min: 20,   max: 250,  step: 1,    default: 100 },
    doff:       { label: "d (roundness)",widget: "range", min: 1,    max: 200,  step: 1,    default: 70 },

    // CHANGE #2: smaller default scale so it fits initially
    scale:      { label: "Scale",        widget: "range", min: 0.5,  max: 3.5,  step: 0.1,  default: 1.2 },

    skipFracA:  { label: "Skip A (frac)",widget: "range", min: 0.05, max: 0.49, step: 0.01, default: 0.27 },
    skipFracB:  { label: "Skip B (frac)",widget: "range", min: 0.05, max: 0.49, step: 0.01, default: 0.33 },

    alphaA:     { label: "Alpha A",      widget: "range", min: 0.05, max: 1.0,  step: 0.01, default: 0.35 },
    alphaB:     { label: "Alpha B",      widget: "range", min: 0.05, max: 1.0,  step: 0.01, default: 0.22 },

    lineWidth:  { label: "Line Width",   widget: "range", min: 0.2,  max: 4.0,  step: 0.1,  default: 1.0 },

    showNails:  { label: "Show Nails",   widget: "checkbox", default: true },
    showAnchor: { label: "Show Anchor",  widget: "checkbox", default: false },

    nailRadius: { label: "Nail Radius",  widget: "range", min: 0.5,  max: 6.0,  step: 0.1,  default: 2.2 }
  },

  params: {
    nodes: 210,
    over:  6000,

    Rbig:  200,
    rsm:   100,
    doff:  70,

    // CHANGE #2: smaller initial scale
    scale: 1.2,

    skipFracA: 0.27,
    skipFracB: 0.33,

    alphaA: 0.35,
    alphaB: 0.22,

    lineWidth: 1.0,

    showNails: true,
    showAnchor: false,

    nailRadius: 2.2
  },

  elements: null,

  init,
  update,
  draw,

  // parameterControls compatibility
  parameters: null,
  redrawHandler() {
    this.update(this.params);
    this.draw();
  }, // end redrawHandler

  onParamChange() {
  } // end onParamChange

}; // end scriptInfo


/* ------------------------------------------------------------
   runPattern()
   ------------------------------------------------------------
   CHANGE #3: guaranteed initial draw immediately.
------------------------------------------------------------ */
export function runPattern(_unused) {

  scriptInfo.parameters = scriptInfo.params;

  scriptInfo.init();

  buildParameterControls(
    scriptInfo,
    "tab-scripts",
    true
  );

  scriptInfo.redrawHandler();

} // end runPattern
