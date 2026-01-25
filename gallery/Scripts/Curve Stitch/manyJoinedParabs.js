/* ============================================================
   Parab Envelope + Recipe Variants (Curve Stitch) — Gallery Script

   GOAL
   ----
   Keep your ORIGINAL parab recipe recognizable, but add:
     - patternVariant select (original / rotated / mirrored / rotated+mirrored)
     - offset control (rotates the recipe around the ring)
     - compositeOperation select

   NOTES
   -----
   - We redraw deterministically from scratch on every change.
   - We explicitly clear drawState.pts before calling createPrintNodes().
   - We keep your original construction: lPt = _m(pts[0], pts[6]),
     rPt = _m(pts[1], pts[6]), then the same 8 parabs list.

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - global ctx exists
   - drawState.pts exists
   - createPrintNodes(thing) populates drawState.pts for THIS draw
   - _m(a,b) exists and returns the midpoint (or equivalent blend)
   - drawManyParabs(thing, parabs) draws the parabs array
   ============================================================ */

import { Point, StringThing } from "/classes/classes.js";
import { drawState } from "/draw/drawState.js";
import { createPrintNodes, _m, drawManyParabs } from "/draw/drawUtilities.js";
import { buildParameterControls } from "/ui/parameterControls.js";


/* ============================================================
   scriptInfo
============================================================ */

export const scriptInfo = {

  title: "Parab Recipe Variants (Original + Offset + Mirror)",

  params: {
    // --- your original containment envelope ---
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
    offset: 0
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
    numSteps: {
      widget: "range",
      label: "Steps",
      min: 7,
      max: 80,
      step: 1
    },

    radius: {
      widget: "range",
      label: "Radius",
      min: 50,
      max: 380,
      step: 1
    },

    rotate: {
      widget: "range",
      label: "Rotate",
      min: 0,
      max: 360,
      step: 1
    },

    xScale: {
      widget: "range",
      label: "X Scale",
      min: 0.2,
      max: 3.0,
      step: 0.01
    },

    mid: {
      widget: "checkbox",
      label: "Midpoints"
    },

    // --- rendering controls ---
    lineWidth: {
      widget: "range",
      label: "Line",
      min: 0.25,
      max: 6,
      step: 0.25
    },

    alpha: {
      widget: "range",
      label: "Alpha",
      min: 0.05,
      max: 1.0,
      step: 0.01
    },

    color: {
      widget: "color",
      label: "Color"
    },

    background: {
      widget: "text",
      label: "BG (css color)"
    }
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

  // Deterministic rebuild
  init(params);

  // Critical: reset the point pool that the recipe indexes into
  if (!drawState.pts) throw new Error("drawState.pts missing");
  drawState.pts.length = 0;

  // Populates drawState.pts (nodes + optional mids) for THIS draw
  createPrintNodes(scriptInfo.elements.thing);

  const pts = drawState.pts;
  if (!pts.length) throw new Error("drawState.pts empty after createPrintNodes()");

  // Build parabs using your original recipe, but with (variant, offset) mapping
  scriptInfo.elements.parabs = buildParabs_OriginalRecipe(params, pts);

} // end update


function draw() {

  ctx.save();

  // Background/clear (always start clean)
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

  // Composite + alpha
  ctx.globalCompositeOperation = scriptInfo.params.compositeOperation;
  ctx.globalAlpha = scriptInfo.params.alpha;

  // Stroke styling
  ctx.strokeStyle = scriptInfo.params.color;
  ctx.lineWidth = scriptInfo.params.lineWidth;

  // Draw
  drawManyParabs(scriptInfo.elements.thing, scriptInfo.elements.parabs);

  ctx.restore();

} // end draw


/* ============================================================
   Recipe Builder — ORIGINAL script recipe, with mapping
============================================================ */

function buildParabs_OriginalRecipe(params, pts) {

  // Your original uses pts indices: 0,1,2,3,4,6
  // We keep that, but map indices through offset/mirror/rotation.

  const base = [0, 1, 2, 3, 4, 6];

  // Validate those base indices are possible
  for (let i = 0; i < base.length; i++) {
    validateIndex(base[i], pts.length, "baseIndex[" + i + "]");
  }

  const mode = params.patternVariant;
  const offset = params.offset;

  const mapIndex = function mapIndex(k) {
    // k is one of the base indices above (0,1,2,3,4,6)

    // We'll treat "rotation" as adding offset around the pts ring.
    // NOTE: this rotates within the entire pts[] pool (nodes + mids),
    // which is what your original recipe implicitly indexed.
    let i = k;

    if (mode === "rotated" || mode === "rotatedMirrored") {
      i = i + offset;
    }

    // "Mirror" swaps the two “base” anchors (0 <-> 1) and also swaps
    // the “side” anchors (2 <-> 3). The center (4) and apex (6) stay put.
    if (mode === "mirrored" || mode === "rotatedMirrored") {
      if (i === (0 + (mode.indexOf("rotated") === 0 ? offset : 0))) i = 1 + (mode.indexOf("rotated") === 0 ? offset : 0);
      else if (i === (1 + (mode.indexOf("rotated") === 0 ? offset : 0))) i = 0 + (mode.indexOf("rotated") === 0 ? offset : 0);
      else if (i === (2 + (mode.indexOf("rotated") === 0 ? offset : 0))) i = 3 + (mode.indexOf("rotated") === 0 ? offset : 0);
      else if (i === (3 + (mode.indexOf("rotated") === 0 ? offset : 0))) i = 2 + (mode.indexOf("rotated") === 0 ? offset : 0);
    }

    // Wrap
    i = ((i % pts.length) + pts.length) % pts.length;

    return i;
  }; // end mapIndex

  // Mapped points corresponding to your original named anchors
  const p0 = pts[mapIndex(0)];
  const p1 = pts[mapIndex(1)];
  const p2 = pts[mapIndex(2)];
  const p3 = pts[mapIndex(3)];
  const p4 = pts[mapIndex(4)];
  const p6 = pts[mapIndex(6)];

  // Your original derived points
  const lPt = _m(p0, p6);
  const rPt = _m(p1, p6);

  // Your original parabs list, unchanged in structure
  const parabs = [];

  parabs.push([p0, lPt, p4]);
  parabs.push([lPt, p4, rPt]);
  parabs.push([p1, rPt, p4]);
  parabs.push([p1, rPt, p2]);
  parabs.push([p2, rPt, p6]);
  parabs.push([rPt, p6, lPt]);
  parabs.push([p3, lPt, p6]);
  parabs.push([p3, lPt, p0]);

  return parabs;

} // end buildParabs_OriginalRecipe


/* ============================================================
   Helpers
============================================================ */

function validateIndex(i, n, label) {
  if (!Number.isInteger(i)) throw new Error(label + " must be an integer");
  if (i < 0 || i >= n) throw new Error(label + " out of range: " + i + " (n=" + n + ")");
} // end validateIndex
