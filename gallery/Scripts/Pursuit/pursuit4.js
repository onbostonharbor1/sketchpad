/* ============================================================
   Pursuit Polygon Curve Stitch
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo:
   - Polygon-based pursuit curve figure (hexagon example).
   - Each side is subdivided and stitched to the corresponding
     subdivision two sides away.

   NOTES
   -----
   Features:
   - Polygon sides (SIDES) — set to 6 for the hexagon example.
   - Reflection options (reflectX, reflectY) — flips across canvas width/height.
   - No translate or rotate — coordinates are computed directly with trig.

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - window.ctx exists
   - #action exists
   - parameterControls.js is available

Here's a polygon-based pursuit curve figure (a hexagon in
your image, where each side is stitched to the next with straight
pursuit chords). We can generalize to any n-sided polygon, and add
options for reflection across x or y axis — all without translate or
rotate

Features:

* Polygon sides (SIDES) — set to 6 for the hexagon in your example. Try
  4, 5, 7, etc. for other variations.

* Reflection options (reflectX, reflectY) — flips across the canvas width or height.

* No translate or rotate — coordinates are computed directly with
   trigonometry.

Pursuit curves — each side is subdivided and lines connect to the
corresponding subdivision two sides away, creating the “woven”
look
   ============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

let ctx = null;


/* ------------------------------------------------------------
   clearCanvasFull()
------------------------------------------------------------ */
function clearCanvasFull() {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.restore();

} // end clearCanvasFull


/* ------------------------------------------------------------
   drawPursuit(thing)
------------------------------------------------------------ */
function drawPursuit(thing) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  // const cx = w / 2;
  // const cy = h / 2;
  const cx = 400;
  const cy = 400;

  const sides = thing.SIDES;
  const steps = thing.STEPS;

  if (typeof sides !== "number" || sides < 3) {
    throw new Error("drawPursuit: SIDES must be >= 3");
  }

  if (typeof steps !== "number" || steps < 1) {
    throw new Error("drawPursuit: STEPS must be >= 1");
  }

  const reflectX = !!thing.reflectX;
  const reflectY = !!thing.reflectY;

  const R = w * 0.38;

  clearCanvasFull();

  // background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, w, h);

  ctx.lineWidth = 1;
  ctx.strokeStyle = "blue";

  function vertex(i) {

    const theta = (2 * Math.PI * i) / sides - Math.PI / 2; // start at top

    let x = cx + R * Math.cos(theta);
    let y = cy + R * Math.sin(theta);

    if (reflectX) x = w - x;
    if (reflectY) y = h - y;

    return { x, y };

  } // end vertex

  const verts = [];
  for (let i = 0; i < sides; i++) {
    verts.push(vertex(i));
  }

  // pursuit stitching
  for (let i = 0; i < sides; i++) {

    const v1 = verts[i];
    const v2 = verts[(i + 1) % sides];
    const v3 = verts[(i + 2) % sides];
    const v4 = verts[(i + 3) % sides];

    for (let j = 0; j <= steps; j++) {

      const t = j / steps;

      const x1 = v1.x + (v2.x - v1.x) * t;
      const y1 = v1.y + (v2.y - v1.y) * t;

      const x2 = v3.x + (v4.x - v3.x) * t;
      const y2 = v3.y + (v4.y - v3.y) * t;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

    }
  }

} // end drawPursuit


/* ------------------------------------------------------------
   init()
------------------------------------------------------------ */
function init() {

  const p = scriptInfo.params;

  scriptInfo.elements = {
    thing: {
      SIDES:    p.SIDES,
      STEPS:    p.STEPS,
      reflectX: p.reflectX,
      reflectY: p.reflectY
    }
  };

} // end init


/* ------------------------------------------------------------
   update(params)
------------------------------------------------------------ */
function update(params) {

  const t = scriptInfo.elements.thing;

  // preserve existing pattern: shallow copy from params to elements
  for (const key in scriptInfo.params) {
    const value = params[key];
    if (value === undefined) continue;
    t[key] = value;
  }

  // normalize numeric fields (range may deliver numbers or strings)
  t.SIDES = parseInt(t.SIDES, 10);
  t.STEPS = parseInt(t.STEPS, 10);

  if (t.SIDES < 3) t.SIDES = 3;
  if (t.STEPS < 1) t.STEPS = 1;

} // end update


/* ------------------------------------------------------------
   draw()
------------------------------------------------------------ */
function draw() {
  drawPursuit(scriptInfo.elements.thing);
} // end draw


/* ------------------------------------------------------------
   scriptInfo (ParameterControls contract)
------------------------------------------------------------ */
export const scriptInfo = {

  title: "Pursuit Polygon Curve Stitch",

  controls: {
    SIDES:    { label: "Sides",    widget: "range",     min: 3,  max: 16,  step: 1, default: 6 },
    STEPS:    { label: "Steps",    widget: "range",     min: 1,  max: 200, step: 1, default: 40 },
    reflectX: { label: "Reflect X", widget: "checkbox", default: false },
    reflectY: { label: "Reflect Y", widget: "checkbox", default: false }
  }, // end controls

  params: {
    SIDES: 6,
    STEPS: 40,
    reflectX: false,
    reflectY: false
  }, // end params

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
   runPattern() — Gallery entry point
------------------------------------------------------------ */
export function runPattern(_ctx) {

  ctx = _ctx || window.ctx;
  if (!ctx) throw new Error("pursuitPolygon.runPattern: no ctx provided and window.ctx is null");

  scriptInfo.parameters = scriptInfo.params;

  scriptInfo.init();

  buildParameterControls(
    scriptInfo,
    "tab-scripts",
    true
  );

  scriptInfo.redrawHandler();

} // end runPattern
