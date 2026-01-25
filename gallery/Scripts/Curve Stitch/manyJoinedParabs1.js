/* ============================================================
   Parab Recipe Variants + PointPicker Vertices — Gallery Script

   CHANGE FROM PRIOR VERSION
   -------------------------
   - Keeps the ORIGINAL 8-parab recipe exactly.
   - Replaces the middle point of each parab with a draggable
     pointPicker param: vertex0..vertex7.
   - Vertices are reseeded whenever patternVariant or offset changes.

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - global ctx exists
   - drawState.pts exists
   - createPrintNodes(thing) populates drawState.pts
   - _m(a,b) exists
   - drawManyParabs(thing, parabs) exists
   - buildParameterControls supports widget: "pointPicker"
   ============================================================ */

import { Point, StringThing } from "/classes/classes.js";
import { drawState } from "/draw/drawState.js";
import { createPrintNodes, _m, drawManyParabs } from "/draw/drawUtilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */

export const scriptInfo = {

  title: "Parab Recipe Variants + Draggable Vertices",

  params: {
    // --- containment envelope ---
    mid: true,
    radius: 250,
    rotate: 45,
    xScale: 1,
    numSteps: 19,
    color: "blue",
    midpointX: 250,
    midpointY: 300,

    // --- rendering ---
    lineWidth: 1,
    alpha: 1.0,
    background: "",
    compositeOperation: "source-over",

    // --- recipe controls ---
    patternVariant: "original",
    offset: 0,

    // --- draggable vertices (middle point of each parab triple) ---
    vertex0: { x: 0, y: 0 },
    vertex1: { x: 0, y: 0 },
    vertex2: { x: 0, y: 0 },
    vertex3: { x: 0, y: 0 },
    vertex4: { x: 0, y: 0 },
    vertex5: { x: 0, y: 0 },
    vertex6: { x: 0, y: 0 },
    vertex7: { x: 0, y: 0 }
  },

  controls: {

    patternVariant: {
      widget: "select",
      label: "Variant",
      options: [
        { value: "original",        label: "Original" },
        { value: "rotated",         label: "Rotated (uses Offset)" },
        { value: "mirrored",        label: "Mirrored" },
        { value: "rotatedMirrored", label: "Rotated + Mirrored" }
      ]
    },

    offset: {
      widget: "range",
      label: "Offset",
      min: 0,
      max: 60,
      step: 1
    },

    compositeOperation: {
      widget: "select",
      label: "Composite",
      options: [
        { value: "source-over", label: "source-over" },
        { value: "multiply",    label: "multiply" },
        { value: "screen",      label: "screen" },
        { value: "overlay",     label: "overlay" },
        { value: "lighter",     label: "lighter" }
      ]
    },

    // --- containment controls ---
    numSteps: { widget: "range", label: "Steps", min: 7, max: 80, step: 1 },
    radius:   { widget: "range", label: "Radius", min: 50, max: 380, step: 1 },
    rotate:   { widget: "range", label: "Rotate", min: 0, max: 360, step: 1 },
    xScale:   { widget: "range", label: "X Scale", min: 0.2, max: 3.0, step: 0.01 },
    mid:      { widget: "checkbox", label: "Midpoints" },

    // --- rendering controls ---
    lineWidth: { widget: "range", label: "Line", min: 0.25, max: 6, step: 0.25 },
    alpha:     { widget: "range", label: "Alpha", min: 0.05, max: 1.0, step: 0.01 },
    color:     { widget: "color", label: "Color" },
    background:{ widget: "text",  label: "BG (css color)" },

    // --- point pickers (one per parab) ---
    vertex0: { widget: "pointPicker", label: "V0" },
    vertex1: { widget: "pointPicker", label: "V1" },
    vertex2: { widget: "pointPicker", label: "V2" },
    vertex3: { widget: "pointPicker", label: "V3" },
    vertex4: { widget: "pointPicker", label: "V4" },
    vertex5: { widget: "pointPicker", label: "V5" },
    vertex6: { widget: "pointPicker", label: "V6" },
    vertex7: { widget: "pointPicker", label: "V7" }
  },

  elements: null
};

scriptInfo.parameters = scriptInfo.params;

scriptInfo.redrawHandler = function redrawHandler() {
  update(scriptInfo.params);
  draw();
}; // end redrawHandler

scriptInfo.onParamChange = function onParamChange() {
  // No-op (compatibility)
}; // end onParamChange


/* ============================================================
   Internal reseed tracking
============================================================ */

let lastVariant = null;
let lastOffset = null;
let verticesSeeded = false;


/* ============================================================
   runPattern
============================================================ */

export function runPattern() {
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();
} // end runPattern


/* ============================================================
   init / update / draw
============================================================ */

function init(params) {

  const s = {
    mid: params.mid,
    radius: params.radius,
    rotate: params.rotate,
    xScale: params.xScale,
    numSteps: params.numSteps,
    color: params.color,
    midpoint: new Point(params.midpointX, params.midpointY)
  };

  scriptInfo.elements = {
    thing: new StringThing(s),
    parabs: []
  };

} // end init


function update(params) {

  init(params);

  if (!drawState.pts) throw new Error("drawState.pts missing");
  drawState.pts.length = 0;

  createPrintNodes(scriptInfo.elements.thing);

  const pts = drawState.pts;
  if (!pts.length) throw new Error("drawState.pts empty after createPrintNodes()");

  const mustReseed =
    (!verticesSeeded) ||
    (params.patternVariant !== lastVariant) ||
    (params.offset !== lastOffset);

  if (mustReseed) {
    reseedVerticesFromOriginalRecipe(params, pts);
    verticesSeeded = true;
    lastVariant = params.patternVariant;
    lastOffset = params.offset;
  }

  scriptInfo.elements.parabs = buildParabs_OriginalRecipe_WithVertices(params, pts);

} // end update


function draw() {

  ctx.save();

  if (scriptInfo.params.background) {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = scriptInfo.params.background;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1.0;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  ctx.globalCompositeOperation = scriptInfo.params.compositeOperation;
  ctx.globalAlpha = scriptInfo.params.alpha;

  ctx.strokeStyle = scriptInfo.params.color;
  ctx.lineWidth = scriptInfo.params.lineWidth;

  drawManyParabs(scriptInfo.elements.thing, scriptInfo.elements.parabs);

  ctx.restore();

} // end draw


/* ============================================================
   Recipe Builder (ORIGINAL) using draggable middle points
============================================================ */

function buildParabs_OriginalRecipe_WithVertices(params, pts) {

  // Original uses pts indices: 0,1,2,3,4,6
  const base = [0, 1, 2, 3, 4, 6];
  for (let i = 0; i < base.length; i++) {
    validateIndex(base[i], pts.length, "baseIndex[" + i + "]");
  }

  const mapIndex = buildIndexMapper(params, pts.length);

  const p0 = pts[mapIndex(0)];
  const p1 = pts[mapIndex(1)];
  const p2 = pts[mapIndex(2)];
  const p3 = pts[mapIndex(3)];
  const p4 = pts[mapIndex(4)];
  const p6 = pts[mapIndex(6)];

  const v0 = pointFromParam(params.vertex0);
  const v1 = pointFromParam(params.vertex1);
  const v2 = pointFromParam(params.vertex2);
  const v3 = pointFromParam(params.vertex3);
  const v4 = pointFromParam(params.vertex4);
  const v5 = pointFromParam(params.vertex5);
  const v6 = pointFromParam(params.vertex6);
  const v7 = pointFromParam(params.vertex7);

  const parabs = [];

  // EXACT original parab list shape, but the middle point is draggable.
  parabs.push([p0, v0, p4]);  // was [p0, lPt, p4]
  parabs.push([v0, v1, v2]);  // was [lPt, p4, rPt]
  parabs.push([p1, v2, p4]);  // was [p1, rPt, p4]
  parabs.push([p1, v3, p2]);  // was [p1, rPt, p2]
  parabs.push([p2, v4, p6]);  // was [p2, rPt, p6]
  parabs.push([v2, v5, v0]);  // was [rPt, p6, lPt]
  parabs.push([p3, v6, p6]);  // was [p3, lPt, p6]
  parabs.push([p3, v7, p0]);  // was [p3, lPt, p0]

  return parabs;

} // end buildParabs_OriginalRecipe_WithVertices


/* ============================================================
   Variant mapping (same intent as prior version)
============================================================ */

function buildIndexMapper(params, n) {

  const mode = params.patternVariant;
  const offset = params.offset;

  return function mapIndex(k) {

    let i = k;

    if (mode === "rotated" || mode === "rotatedMirrored") {
      i = i + offset;
    }

    if (mode === "mirrored" || mode === "rotatedMirrored") {

      const off = (mode === "rotatedMirrored") ? offset : 0;

      if (i === (0 + off)) i = 1 + off;
      else if (i === (1 + off)) i = 0 + off;
      else if (i === (2 + off)) i = 3 + off;
      else if (i === (3 + off)) i = 2 + off;
    }

    i = ((i % n) + n) % n;
    return i;

  }; // end mapIndex

} // end buildIndexMapper


/* ============================================================
   Vertex reseeding (default vertices follow original recipe)
============================================================ */

function reseedVerticesFromOriginalRecipe(params, pts) {

  const mapIndex = buildIndexMapper(params, pts.length);

  const p0 = pts[mapIndex(0)];
  const p1 = pts[mapIndex(1)];
  const p2 = pts[mapIndex(2)];
  const p3 = pts[mapIndex(3)];
  const p4 = pts[mapIndex(4)];
  const p6 = pts[mapIndex(6)];

  const lPt = _m(p0, p6);
  const rPt = _m(p1, p6);

  // Map directly to the “middle point” of each original triple:
  // 0: [p0, lPt, p4]          -> lPt
  // 1: [lPt, p4, rPt]         -> p4
  // 2: [p1, rPt, p4]          -> rPt
  // 3: [p1, rPt, p2]          -> rPt
  // 4: [p2, rPt, p6]          -> rPt
  // 5: [rPt, p6, lPt]         -> p6
  // 6: [p3, lPt, p6]          -> lPt
  // 7: [p3, lPt, p0]          -> lPt

  setParamPoint(scriptInfo.params.vertex0, lPt);
  setParamPoint(scriptInfo.params.vertex1, p4);
  setParamPoint(scriptInfo.params.vertex2, rPt);
  setParamPoint(scriptInfo.params.vertex3, rPt);
  setParamPoint(scriptInfo.params.vertex4, rPt);
  setParamPoint(scriptInfo.params.vertex5, p6);
  setParamPoint(scriptInfo.params.vertex6, lPt);
  setParamPoint(scriptInfo.params.vertex7, lPt);

} // end reseedVerticesFromOriginalRecipe


/* ============================================================
   Helpers
============================================================ */

function validateIndex(i, n, label) {
  if (!Number.isInteger(i)) throw new Error(label + " must be an integer");
  if (i < 0 || i >= n) throw new Error(label + " out of range: " + i + " (n=" + n + ")");
} // end validateIndex


function pointFromParam(p) {
  if (p == null) throw new Error("pointFromParam: point is null/undefined");
  if (typeof p.x !== "number") throw new Error("pointFromParam: x missing or not a number");
  if (typeof p.y !== "number") throw new Error("pointFromParam: y missing or not a number");
  return new Point(p.x, p.y);
} // end pointFromParam


function setParamPoint(dst, src) {
  if (dst == null) throw new Error("setParamPoint: dst is null/undefined");
  if (src == null) throw new Error("setParamPoint: src is null/undefined");
  dst.x = src.x;
  dst.y = src.y;
} // end setParamPoint
