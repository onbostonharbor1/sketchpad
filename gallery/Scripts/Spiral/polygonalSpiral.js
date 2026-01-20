/* ============================================================
   Polygonal Spiral (from pasted createShape/draw function)
   Gallery Script (ParameterControls-integrated)

   SOURCE (USER-PASTED LOGIC)
   -------------------------
   shapeRegistry['polygonSpiral'] = {
     label: 'Polygonal Spiral',
     description: 'Expanding polygonal spiral',
     controls: {
       sides: { type: 'slider', min: 3, max: 12, step: 1, default: 6 },
       stepSize: { type: 'slider', min: 5, max: 50, step: 1, default: 10 },
       turns: { type: 'slider', min: 1, max: 50, step: 1, default: 20 }
     },
     createShape: (params) => ({
       draw(ctx) {
         const { sides, stepSize, turns } = params;
         const angle = (2 * Math.PI) / sides;
         let x = 0, y = 0, dir = 0;
         ctx.beginPath();
         ctx.moveTo(x, y);
         for (let i = 0; i < turns; i++) {
           x += stepSize * i * Math.cos(dir);
           y += stepSize * i * Math.sin(dir);
           ctx.lineTo(x, y);
           dir += angle;
         }
         ctx.stroke();
       }
     })
   };

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - buildParameterControls() exists at /ui/parameterControls.js
   - A global canvas context exists (ctx), provided by your getter
   - #action exists (parameterControls uses it)
   - This file is executed by the Gallery Scripts runner (runPattern)

   IMPORTANT USER RULES
   --------------------
   - No local ctx variable is declared in this file.
   - No ctx is passed into helper functions.
   - Controls are object-keyed; do NOT use "key" fields.
   - Controls use "widget".
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Polygonal Spiral",

  params: {

    sides: 6,
    stepSize: 10,
    turns: 20,

    strokeWidth: 1,
    strokeColor: "#000000"

  },

  /* Alias for compatibility with existing scriptRunner expectations. */
  parameters: null,

  controls: {

    sides: {
      label: "Sides",
      widget: "range",
      min: 3,
      max: 12,
      step: 1
    },

    stepSize: {
      label: "Step size",
      widget: "range",
      min: 3,
      max: 30,
      step: 1
    },

    turns: {
      label: "Turns",
      widget: "range",
      min: 1,
      max: 50,
      step: 1
    },

    strokeWidth: {
      label: "Stroke width",
      widget: "range",
      min: 1,
      max: 8,
      step: 1
    },

    strokeColor: {
      label: "Stroke color",
      widget: "color"
    }

  },

  /* Elements cache (drawRegistry-style). */
  elements: null,

  /* Compatibility no-op. */
  onParamChange() {
    /* Intentionally empty. */
  }, // end onParamChange

  redrawHandler: null

}; // end scriptInfo


/* ============================================================
   Drawing helpers
============================================================ */
function clearCanvas() {

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

} // end clearCanvas


/* ============================================================
   Geometry builder (from your pasted draw() logic)
============================================================ */
function buildPolygonSpiralPoints(p) {

  const pts = [];

  const angle = (2 * Math.PI) / p.sides;

  let x = 0;
  let y = 0;
  let dir = 0;

  pts.push({ x: x, y: y });

  for (let i = 0; i < p.turns; i++) {

    x += p.stepSize * i * Math.cos(dir);
    y += p.stepSize * i * Math.sin(dir);

    pts.push({ x: x, y: y });

    dir += angle;

  }

  return pts;

} // end buildPolygonSpiralPoints


/* ============================================================
   Render
============================================================ */
function drawPolylineCentered(points, p) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const cx = w / 2;
  const cy = h / 2;

  ctx.save();

  /* Center the spiral at canvas center (original spiral starts at 0,0). */
  ctx.translate(cx, cy);

  ctx.lineWidth = p.strokeWidth;
  ctx.strokeStyle = p.strokeColor;

  ctx.beginPath();

  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.stroke();

  ctx.restore();

} // end drawPolylineCentered


/* ============================================================
   Update / Draw lifecycle (drawRegistry-style)
============================================================ */
function init(p) {

  scriptInfo.elements = {
    element: {
      points: []
    }
  };

} // end init

function update(p) {

  scriptInfo.elements.element.points = buildPolygonSpiralPoints(p);

} // end update

function draw(p) {

  clearCanvas();
  drawPolylineCentered(scriptInfo.elements.element.points, p);

} // end draw


/* ============================================================
   runPattern (Gallery script entry point)
============================================================ */
export function runPattern() {

  scriptInfo.parameters = scriptInfo.params;

  buildParameterControls(scriptInfo, "tab-scripts", true);

  scriptInfo.redrawHandler = function () {

    update(scriptInfo.params);
    draw(scriptInfo.params);

  }; // end redrawHandler

  init(scriptInfo.params);
  scriptInfo.redrawHandler();

} // end runPattern
