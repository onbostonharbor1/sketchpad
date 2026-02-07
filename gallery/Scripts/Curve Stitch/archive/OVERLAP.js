/* ============================================================
   Overlapping Stars — Interactive (Gallery Script)

   WHAT THIS DOES
   --------------
   - Keeps your drawing logic (grid points + drawParab calls).
   - Adds parameterControls:
       • compositeOperation (select)
       • color + lineWidth + alpha + bg
       • geometry sliders: xDist, yDist, xLength, yLength, x1, y1
       • numSteps
       • pointPickerArray for ALL grid points (pts[1]..pts[20])
         so you can drag the construction points.

   IMPORTANT
   ---------
   - The point pickers require the interaction overlay to be a DIV layer,
     not a CANVAS (as you just confirmed).

   CONTRACT
   --------
   - Uses global ctx (no ctx variable declared).
   - Exports scriptInfo + runPattern().
   ============================================================ */

import { drawState } from "/draw/drawState.js";
import { drawLine, printCircNum, _m } from "/draw/drawUtilities.js";
import { StringThing, Point } from "/classes/classes.js";
import { drawParab } from "/draw/drawRegular.js";
import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */

export const scriptInfo = {

  title: "Overlapping Stars (Interactive)",

  params: {
    // --- geometry (original constants promoted to params) ---
    xDist: 80,
    yDist: 100,
    xLength: 100,
    yLength: 100,
    x1: 50,
    y1: 50,

    // --- drawing style ---
    color: "blue",
    numSteps: 18,
    lineWidth: 0.8,
    alpha: 1.0,
    background: "",
    compositeOperation: "source-over",

    // --- draggable construction points (pts[1]..pts[20]) ---
    // seeded from geometry the first time (and whenever geometry sliders change)
    points: []  // array of {x,y}
  },

  controls: {

    // --- rendering ---
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

    color: {
      widget: "colorPicker",
      label: "Color"
    },

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

    background: {
      widget: "text",
      label: "BG (css color)"
    },

    numSteps: {
      widget: "range",
      label: "Steps",
      min: 3,
      max: 80,
      step: 1
    },

    // --- geometry sliders ---
    xDist:   { widget: "range", label: "xDist",   min: 10, max: 250, step: 1, rebuildControls: false },
    yDist:   { widget: "range", label: "yDist",   min: 10, max: 250, step: 1, rebuildControls: false },
    xLength: { widget: "range", label: "xLength", min: 20, max: 250, step: 1, rebuildControls: false },
    yLength: { widget: "range", label: "yLength", min: 20, max: 250, step: 1, rebuildControls: false },
    x1:      { widget: "range", label: "x1",      min: 0,  max: 500, step: 1, rebuildControls: false },
    y1:      { widget: "range", label: "y1",      min: 0,  max: 500, step: 1, rebuildControls: false },

    // --- draggable points ---
    points: {
      widget: "pointPickerArray",
      label: "Drag Points",
      noReadout: true
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
   Internal bookkeeping:
   - If geometry sliders change, we reseed the points array from geometry.
   - If you drag points, we do NOT overwrite them.
============================================================ */

let lastGeomSig = "";


/* ============================================================
   runPattern
============================================================ */

export function runPattern() {
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();
} // end runPattern


/* ============================================================
   update / draw
============================================================ */

function update(params) {

  ensurePointsArray(params);

  // Build drawState.pts[1..20] from params.points
  drawState.pts = [];
  for (let i = 0; i < params.points.length; i++) {
    const p = params.points[i];
    if (!p) throw new Error("points[" + i + "] missing");
    if (typeof p.x !== "number") throw new Error("points[" + i + "].x invalid");
    if (typeof p.y !== "number") throw new Error("points[" + i + "].y invalid");
    drawState.pts[i + 1] = new Point(p.x, p.y);
  }

  // Keep your global counter behavior intact (fail-fast if missing)
  drawState.ctr++;

  // Prepare the StringThing (your original used midpoint = _m(pts[4], pts[15]))
  const s = {
    color: params.color,
    numSteps: params.numSteps,
    lineWidth: params.lineWidth,
    midpoint: _m(drawState.pts[4], drawState.pts[15])
  };

  scriptInfo.elements = {
    thing: new StringThing(s)
  };

} // end update


function draw() {

  // Background / clear
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

  // Composite + alpha
  ctx.globalCompositeOperation = scriptInfo.params.compositeOperation;
  ctx.globalAlpha = scriptInfo.params.alpha;

  // Construction lines (your originals)
  drawLine(drawState.pts[1],  drawState.pts[4],  scriptInfo.params.color);
  drawLine(drawState.pts[2],  drawState.pts[5],  scriptInfo.params.color);
  drawLine(drawState.pts[3],  drawState.pts[6],  scriptInfo.params.color);

  drawLine(drawState.pts[7],  drawState.pts[8],  scriptInfo.params.color);
  drawLine(drawState.pts[9],  drawState.pts[10], scriptInfo.params.color);
  drawLine(drawState.pts[11], drawState.pts[12], scriptInfo.params.color);
  drawLine(drawState.pts[13], drawState.pts[14], scriptInfo.params.color);

  drawLine(drawState.pts[15], drawState.pts[18], scriptInfo.params.color);
  drawLine(drawState.pts[16], drawState.pts[19], scriptInfo.params.color);
  drawLine(drawState.pts[17], drawState.pts[20], scriptInfo.params.color);

  // Point labels (your originals)
  ctx.fillStyle = scriptInfo.params.color;
  for (let i = 1; i < drawState.pts.length; i++) {
    if (drawState.pts[i]) printCircNum(drawState.pts[i]);
  }

  // Parab set (your originals, unchanged)
  const thing = scriptInfo.elements.thing;

  let parab;

  parab = [drawState.pts[1],  drawState.pts[4],  drawState.pts[8],  drawState.pts[7]];
  drawParab(thing, parab);

  parab = [drawState.pts[1],  drawState.pts[4],  drawState.pts[9],  drawState.pts[10]];
  drawParab(thing, parab);

  parab = [drawState.pts[18], drawState.pts[15], drawState.pts[9],  drawState.pts[10]];
  drawParab(thing, parab);

  parab = [drawState.pts[15], drawState.pts[18], drawState.pts[7],  drawState.pts[8]];
  drawParab(thing, parab);

  parab = [drawState.pts[9],  drawState.pts[10], drawState.pts[5],  drawState.pts[2]];
  drawParab(thing, parab);

  parab = [drawState.pts[2],  drawState.pts[5],  drawState.pts[11], drawState.pts[12]];
  drawParab(thing, parab);

  parab = [drawState.pts[6],  drawState.pts[3],  drawState.pts[11], drawState.pts[12]];
  drawParab(thing, parab);

  parab = [drawState.pts[3],  drawState.pts[6],  drawState.pts[13], drawState.pts[14]];
  drawParab(thing, parab);

  parab = [drawState.pts[14], drawState.pts[13], drawState.pts[17], drawState.pts[20]];
  drawParab(thing, parab);

  parab = [drawState.pts[20], drawState.pts[17], drawState.pts[12], drawState.pts[11]];
  drawParab(thing, parab);

  parab = [drawState.pts[12], drawState.pts[11], drawState.pts[16], drawState.pts[19]];
  drawParab(thing, parab);

  parab = [drawState.pts[19], drawState.pts[16], drawState.pts[10], drawState.pts[9]];
  drawParab(thing, parab);

  parab = [drawState.pts[7],  drawState.pts[8],  drawState.pts[5],  drawState.pts[2]];
  drawParab(thing, parab);

  parab = [drawState.pts[7],  drawState.pts[8],  drawState.pts[16], drawState.pts[19]];
  drawParab(thing, parab);

  parab = [drawState.pts[2],  drawState.pts[5],  drawState.pts[13], drawState.pts[14]];
  drawParab(thing, parab);

  parab = [drawState.pts[14], drawState.pts[13], drawState.pts[16], drawState.pts[19]];
  drawParab(thing, parab);

  ctx.restore();

} // end draw


/* ============================================================
   Points Seeding
============================================================ */

function ensurePointsArray(params) {

  const sig =
    params.xDist + "|" + params.yDist + "|" +
    params.xLength + "|" + params.yLength + "|" +
    params.x1 + "|" + params.y1;

  if (params.points.length === 20 && sig === lastGeomSig) {
    return;
  }

  // If points array is empty or geometry sliders changed, reseed.
  lastGeomSig = sig;

  const pts = computeGridPoints(params);

  params.points.length = 0;
  for (let i = 0; i < pts.length; i++) {
    params.points.push({ x: pts[i].x, y: pts[i].y });
  }

} // end ensurePointsArray


function computeGridPoints(params) {

  const xDist = params.xDist;
  const yDist = params.yDist;
  const xLength = params.xLength;
  const yLength = params.yLength;

  const x1 = params.x1;
  const x2 = x1 + xLength;
  const x3 = x2 + xDist / 2;
  const x4 = x3 + xDist / 2;
  const x5 = x4 + xLength;

  const y1  = params.y1;
  const y2  = y1 + yLength;
  const y3  = y2 + yDist / 2;
  const y4  = y3 + yDist / 2;
  const y5  = y4 + yLength;
  const y6  = y5 + yDist / 2;
  const y7  = y6 + yDist / 2;
  const y8  = y7 + yLength;
  const y9  = y8 + yDist / 2;
  const y10 = y9 + yDist / 2;
  const y11 = y10 + yLength;

  // Return an array corresponding to drawState.pts[1..20]
  // i.e., length 20, index 0 maps to pts[1]
  return [
    new Point(x1, y3),   // 1
    new Point(x1, y6),   // 2
    new Point(x1, y9),   // 3
    new Point(x2, y3),   // 4
    new Point(x2, y6),   // 5
    new Point(x2, y9),   // 6
    new Point(x3, y1),   // 7
    new Point(x3, y2),   // 8
    new Point(x3, y4),   // 9
    new Point(x3, y5),   // 10
    new Point(x3, y7),   // 11
    new Point(x3, y8),   // 12
    new Point(x3, y10),  // 13
    new Point(x3, y11),  // 14
    new Point(x4, y3),   // 15
    new Point(x4, y6),   // 16
    new Point(x4, y9),   // 17
    new Point(x5, y3),   // 18
    new Point(x5, y6),   // 19
    new Point(x5, y9)    // 20
  ];

} // end computeGridPoints
