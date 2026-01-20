import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   Parametric Sketchpad — Curve Selector (Static)
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone multi-module demo:
     - curve selector (ellipse / rose / hypo / epi / fourier)
     - per-curve controls
     - equation display

   GOAL
   ----
   - Run under Gallery calling runPattern()
   - Use parameterControls.js
   - Match drawRegistry-style lifecycle and naming

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - ctx exists globally (getter already installed)
   - #action exists
============================================================ */

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Parametric Sketchpad — Curves",

  params: {

    curveType: "ellipse",

    // shared
    rotation: 0,
    resolution: 1000,

    // ellipse stitch
    nodeCount: 200,
    skip: 30,
    radiusX: 250,
    radiusY: 150,

    // rose
    roseA: 150,
    roseK: 5,
    roseUseSine: 0,

    // hypotrochoid / epitrochoid
    R: 150,
    r: 60,
    d: 70,

    // fourier-ish
    taper: 0,
    fourierSkip: 1

  },

  controls: {

    curveType: {
      label: "Curve Type",
      widget: "select",
      options: [
        { value: "ellipse", label: "Ellipse Stitch" },
        { value: "rose",    label: "Rose Curve" },
        { value: "hypo",    label: "Hypotrochoid" },
        { value: "epi",     label: "Epitrochoid" },
        { value: "fourier", label: "Fourier Wave" }
      ]
    },

    rotation: {
      label: "Rotation (deg)",
      widget: "range",
      min: 0,
      max: 360,
      step: 1
    },

    resolution: {
      label: "Resolution",
      widget: "range",
      min: 100,
      max: 3000,
      step: 10
    },

    nodeCount: {
      label: "Node Count",
      widget: "range",
      min: 10,
      max: 600,
      step: 1
    },

    skip: {
      label: "Skip Distance",
      widget: "range",
      min: 1,
      max: 200,
      step: 1
    },

    radiusX: {
      label: "Radius X",
      widget: "range",
      min: 20,
      max: 380,
      step: 1
    },

    radiusY: {
      label: "Radius Y",
      widget: "range",
      min: 20,
      max: 280,
      step: 1
    },

    roseA: {
      label: "Petal Length (a)",
      widget: "range",
      min: 10,
      max: 350,
      step: 1
    },

    roseK: {
      label: "Petal Count Factor (k)",
      widget: "range",
      min: 1,
      max: 30,
      step: 1
    },

    roseUseSine: {
      label: "Use Sine (0/1)",
      widget: "range",
      min: 0,
      max: 1,
      step: 1
    },

    R: {
      label: "Outer Radius (R)",
      widget: "range",
      min: 20,
      max: 350,
      step: 1
    },

    r: {
      label: "Rolling Radius (r)",
      widget: "range",
      min: 5,
      max: 200,
      step: 1
    },

    d: {
      label: "Pen Offset (d)",
      widget: "range",
      min: 0,
      max: 250,
      step: 1
    },

    taper: {
      label: "Taper (%)",
      widget: "range",
      min: 0,
      max: 100,
      step: 1
    },

    fourierSkip: {
      label: "Skip Distance",
      widget: "range",
      min: 1,
      max: 50,
      step: 1
    }

  }

}; // end scriptInfo

/* ============================================================
   Compatibility Aliases (required by your rules)
============================================================ */
scriptInfo.parameters = scriptInfo.params;

scriptInfo.redrawHandler = function redrawHandler() {
  update(scriptInfo.params);
  draw();
}; // end redrawHandler

scriptInfo.onParamChange = function onParamChange() {
  // no-op compatibility hook
}; // end onParamChange

/* ============================================================
   elements
============================================================ */
const elements = {
  element: null
}; // end elements

/* ============================================================
   runPattern()
============================================================ */
export function runPattern() {

  buildParameterControls(scriptInfo, "tab-scripts", true);

  init();
  scriptInfo.redrawHandler();

} // end runPattern

/* ============================================================
   init()  (cold start only)
============================================================ */
function init() {

  elements.element = {
    points: [],
    lines: [],
    equationText: ""
  };

} // end init

/* ============================================================
   update(params)
============================================================ */
function update(params) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const centerX = w / 2;
  const centerY = h / 2;

  const rot = params.rotation * Math.PI / 180;

  if (params.curveType === "ellipse") {
    updateEllipseStitch(params, centerX, centerY, rot);
    return;
  }

  if (params.curveType === "rose") {
    updateRose(params, centerX, centerY, rot);
    return;
  }

  if (params.curveType === "hypo") {
    updateHypotrochoid(params, centerX, centerY, rot);
    return;
  }

  if (params.curveType === "epi") {
    updateEpitrochoid(params, centerX, centerY, rot);
    return;
  }

  if (params.curveType === "fourier") {
    updateFourier(params, centerX, centerY, rot);
    return;
  }

  throw new Error("Unknown curveType: " + params.curveType);

} // end update

/* ============================================================
   draw()
============================================================ */
function draw() {

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#000000";

  const thing = elements.element;

  if (thing.lines.length > 0) {
    ctx.beginPath();
    for (let i = 0; i < thing.lines.length; i++) {
      const seg = thing.lines[i];
      const p1 = seg[0];
      const p2 = seg[1];
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (thing.points.length > 1) {
    ctx.beginPath();
    ctx.moveTo(thing.points[0].x, thing.points[0].y);
    for (let i = 1; i < thing.points.length; i++) {
      ctx.lineTo(thing.points[i].x, thing.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.restore();

} // end draw

/* ============================================================
   Curve Updates
============================================================ */
function updateEllipseStitch(params, cx, cy, rot) {

  const nodeCount = params.nodeCount;
  const skip = params.skip;

  const radiusX = params.radiusX;
  const radiusY = params.radiusY;

  const points = [];

  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * Math.PI * 2;

    const x0 = radiusX * Math.cos(angle);
    const y0 = radiusY * Math.sin(angle);

    const xRot = x0 * Math.cos(rot) - y0 * Math.sin(rot);
    const yRot = x0 * Math.sin(rot) + y0 * Math.cos(rot);

    points.push({ x: cx + xRot, y: cy + yRot });
  }

  const lines = [];
  for (let i = 0; i < nodeCount; i++) {
    const j = (i + skip) % nodeCount;
    lines.push([points[i], points[j]]);
  }

  elements.element.points = points;
  elements.element.lines = lines;
  elements.element.equationText =
    "Connect node[i] to node[i + " + skip + "] on an ellipse with " + nodeCount + " nodes.";

} // end updateEllipseStitch

function updateRose(params, cx, cy, rot) {

  const a = params.roseA;
  const k = params.roseK;
  const useSine = (params.roseUseSine === 1);

  const count = params.resolution;

  const points = [];

  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2;

    const r = a * (useSine ? Math.sin(k * theta) : Math.cos(k * theta));

    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);

    const xRot = x * Math.cos(rot) - y * Math.sin(rot);
    const yRot = x * Math.sin(rot) + y * Math.cos(rot);

    points.push({ x: cx + xRot, y: cy + yRot });
  }

  elements.element.points = points;
  elements.element.lines = [];
  elements.element.equationText =
    "r(theta) = " + a + " * " + (useSine ? "sin" : "cos") + "(" + k + " * theta)";

} // end updateRose

function updateHypotrochoid(params, cx, cy, rot) {

  const R = params.R;
  const r = params.r;
  const d = params.d;

  const count = params.resolution;

  const points = [];

  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2;

    const x = (R - r) * Math.cos(theta) + d * Math.cos(((R - r) / r) * theta);
    const y = (R - r) * Math.sin(theta) - d * Math.sin(((R - r) / r) * theta);

    const xRot = x * Math.cos(rot) - y * Math.sin(rot);
    const yRot = x * Math.sin(rot) + y * Math.cos(rot);

    points.push({ x: cx + xRot, y: cy + yRot });
  }

  elements.element.points = points;
  elements.element.lines = [];
  elements.element.equationText =
    "x(theta) = (R-r)cos(theta) + d cos(((R-r)/r)theta)";

} // end updateHypotrochoid

function updateEpitrochoid(params, cx, cy, rot) {

  const R = params.R;
  const r = params.r;
  const d = params.d;

  const count = params.resolution;

  const points = [];

  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2;

    const x = (R + r) * Math.cos(theta) - d * Math.cos(((R + r) / r) * theta);
    const y = (R + r) * Math.sin(theta) - d * Math.sin(((R + r) / r) * theta);

    const xRot = x * Math.cos(rot) - y * Math.sin(rot);
    const yRot = x * Math.sin(rot) + y * Math.cos(rot);

    points.push({ x: cx + xRot, y: cy + yRot });
  }

  elements.element.points = points;
  elements.element.lines = [];
  elements.element.equationText =
    "x(theta) = (R+r)cos(theta) - d cos(((R+r)/r)theta)";

} // end updateEpitrochoid

function updateFourier(params, cx, cy, rot) {

  const count = params.resolution;
  const skip = params.fourierSkip;
  const taper = params.taper;

  const coeffs = [];
  for (let n = 0; n < 10; n++) {
    if (n === 0) {
      coeffs.push({ a: 0, b: 0 });
      continue;
    }
    if (n % 2 === 1) {
      coeffs.push({ a: 0, b: 4 / (Math.PI * n) });
    } else {
      coeffs.push({ a: 0, b: 0 });
    }
  }

  const points = [];

  for (let i = 0; i <= count; i += skip) {

    const theta = (i / count) * Math.PI * 2;

    let r = coeffs[0].a;

    for (let n = 1; n < coeffs.length; n++) {
      const a = coeffs[n].a;
      const b = coeffs[n].b;
      r += a * Math.cos(n * theta) + b * Math.sin(n * theta);
    }

    r *= 1 - (taper / 100) * Math.sin(theta);

    const x = r * Math.cos(theta) * 200;
    const y = r * Math.sin(theta) * 200;

    const xRot = x * Math.cos(rot) - y * Math.sin(rot);
    const yRot = x * Math.sin(rot) + y * Math.cos(rot);

    points.push({ x: cx + xRot, y: cy + yRot });

  }

  elements.element.points = points;
  elements.element.lines = [];
  elements.element.equationText =
    "f(theta) = sum[a_n cos(n theta) + b_n sin(n theta)] * (1 - taper*sin(theta))";

} // end updateFourier
