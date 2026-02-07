/* ============================================================
   Polygon Corner String Art (Curve-Stitch Envelopes)
   Gallery Script (ParameterControls-integrated)

   WHAT THIS MAKES
   ---------------
   This generates the family of figures shown in your image:
   - A "fan/parabola" when sides = 2 (a single corner)
   - Curved-sided polygonal “pillows” when sides >= 3
   - Increasing sides produces the star-like / rosette-like family

   CORE IDEA (THE ENVELOPE)
   ------------------------
   For each polygon vertex V, there are two incident edges:
     V -> PrevVertex   and   V -> NextVertex

   We place N points along each edge starting at V, moving outward.
   Then we draw N+1 straight segments that “cross” the corner:

     segment i connects:
       point i on edge(V->Prev)
       to
       point (N - i) on edge(V->Next)

   The straight lines form a smooth quadratic-like envelope curve
   near the corner. Doing this for every vertex produces the
   multi-lobed family you showed.

   SKETCHPAD GALLERY CONTRACT
   -------------------------
   - exports:
       export const scriptInfo
       export function runPattern()

   - uses global ctx (do NOT declare a ctx variable)
   - controls use: widget (not type)
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Polygon Corner String Art",

  params: {
    sides: 4,            // 2 = single corner fan; >=3 = polygon
    pointsPerEdge: 80,   // number of segments per corner curve (N)
    radius: 220,         // polygon size
    rotation: -90,       // degrees
    trim: 0.92,          // 0..1, stop short of the next vertex
    strokeWidth: 1,
    strokeColor: "#000000",
    showGuide: false
  },

  controls: {

    sides: {
      widget: "range",
      label: "Sides (2 = single corner)",
      min: 2,
      max: 12,
      step: 1
    },

    pointsPerEdge: {
      widget: "range",
      label: "Points per edge",
      min: 10,
      max: 400,
      step: 1
    },

    radius: {
      widget: "range",
      label: "Radius",
      min: 60,
      max: 360,
      step: 1
    },

    rotation: {
      widget: "range",
      label: "Rotation (deg)",
      min: -180,
      max: 180,
      step: 1
    },

    trim: {
      widget: "range",
      label: "Trim (avoid overlap)",
      min: 0.50,
      max: 0.99,
      step: 0.01
    },

    strokeWidth: {
      widget: "range",
      label: "Stroke width",
      min: 0.5,
      max: 3,
      step: 0.5
    },

    strokeColor: {
      widget: "colorPicker",
      label: "Stroke color"
    },

    showGuide: {
      widget: "checkbox",
      label: "Show guide polygon"
    }
  },

  elements: {
    vertices: null,    // polygon vertices
    segments: null     // list of [p1, p2] lines
  },

  parameters: null,      // alias (set in runPattern)
  redrawHandler: null,   // set in runPattern
  onParamChange: null    // set in runPattern

}; // end scriptInfo


/* ============================================================
   init()
============================================================ */
function init() {

  scriptInfo.elements.vertices = [];
  scriptInfo.elements.segments = [];

} // end init


/* ============================================================
   buildRegularPolygonVertices(sides, radius, rotationDeg, cx, cy)
============================================================ */
function buildRegularPolygonVertices(sides, radius, rotationDeg, cx, cy) {

  const verts = [];
  const rot = rotationDeg * Math.PI / 180;

  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    verts.push({
      x: cx + radius * Math.cos(a),
      y: cy + radius * Math.sin(a)
    });
  }

  return verts;

} // end buildRegularPolygonVertices


/* ============================================================
   pointOnSegment(a, b, t)
   t in [0..1]
============================================================ */
function pointOnSegment(a, b, t) {

  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  };

} // end pointOnSegment


/* ============================================================
   buildEdgePointsFromVertex(v, toward, count, trim)
   Returns array length (count + 1), including v at index 0.
============================================================ */
function buildEdgePointsFromVertex(v, toward, count, trim) {

  const pts = [];
  for (let i = 0; i <= count; i++) {
    const t = (i / count) * trim;
    pts.push(pointOnSegment(v, toward, t));
  }
  return pts;

} // end buildEdgePointsFromVertex


/* ============================================================
   buildCornerSegments(v, prevV, nextV, count, trim)
   Returns array of segments: [p1, p2]
============================================================ */
function buildCornerSegments(v, prevV, nextV, count, trim) {

  const a = buildEdgePointsFromVertex(v, prevV, count, trim);
  const b = buildEdgePointsFromVertex(v, nextV, count, trim);

  const segs = [];

  for (let i = 0; i <= count; i++) {
    const p1 = a[i];
    const p2 = b[count - i];
    segs.push([p1, p2]);
  }

  return segs;

} // end buildCornerSegments


/* ============================================================
   update(params)
============================================================ */
function update(params) {

  const sides = Math.round(Number(params.sides));
  const pointsPerEdge = Math.round(Number(params.pointsPerEdge));
  const radius = Number(params.radius);
  const rotation = Number(params.rotation);
  const trim = Number(params.trim);

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  scriptInfo.elements.segments = [];

  // Special case: sides = 2 means a single "corner fan"
  // We model it as a V with two rays from the center point.
  if (sides === 2) {

    const v = { x: cx, y: cy - radius * 0.2 };

    const a1 = (rotation * Math.PI / 180);
    const a2 = a1 + Math.PI / 2;

    const prevV = { x: v.x + radius * Math.cos(a1), y: v.y + radius * Math.sin(a1) };
    const nextV = { x: v.x + radius * Math.cos(a2), y: v.y + radius * Math.sin(a2) };

    const segs = buildCornerSegments(v, prevV, nextV, pointsPerEdge, trim);
    scriptInfo.elements.vertices = [v, prevV, nextV];
    scriptInfo.elements.segments = segs;

    return;
  }

  // Regular polygon case
  const verts = buildRegularPolygonVertices(sides, radius, rotation, cx, cy);
  scriptInfo.elements.vertices = verts;

  for (let i = 0; i < sides; i++) {

    const v = verts[i];
    const prevV = verts[(i - 1 + sides) % sides];
    const nextV = verts[(i + 1) % sides];

    const segs = buildCornerSegments(v, prevV, nextV, pointsPerEdge, trim);

    for (let s = 0; s < segs.length; s++) {
      scriptInfo.elements.segments.push(segs[s]);
    }

  }

} // end update


/* ============================================================
   drawGuidePolygon(verts)
============================================================ */
function drawGuidePolygon(verts) {

  if (verts.length < 3) return;

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#888888";

  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) {
    ctx.lineTo(verts[i].x, verts[i].y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.restore();

} // end drawGuidePolygon


/* ============================================================
   draw()
============================================================ */
function draw() {

  const segs = scriptInfo.elements.segments;
  const verts = scriptInfo.elements.vertices;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.save();

  ctx.lineWidth = Number(scriptInfo.params.strokeWidth);
  ctx.strokeStyle = String(scriptInfo.params.strokeColor);

  // Draw all stitch lines
  for (let i = 0; i < segs.length; i++) {
    const p1 = segs[i][0];
    const p2 = segs[i][1];

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  ctx.restore();

  if (scriptInfo.params.showGuide) {
    drawGuidePolygon(verts);
  }

} // end draw


/* ============================================================
   runPattern()
============================================================ */
export function runPattern() {

  // ParameterControls compatibility aliases
  scriptInfo.parameters = scriptInfo.params;

  init();

  scriptInfo.redrawHandler = function () {
    update(scriptInfo.params);
    draw();
  }; // end scriptInfo.redrawHandler

  scriptInfo.onParamChange = function () {
    // no-op (some callers may expect it)
  }; // end scriptInfo.onParamChange

  buildParameterControls(scriptInfo, "tab-scripts", true);

  scriptInfo.redrawHandler();

} // end runPattern
