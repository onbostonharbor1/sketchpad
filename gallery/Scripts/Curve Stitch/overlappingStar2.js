/* ============================================================
   Overlapping Stars — Interactive (Gallery Script)

   CHANGELOG:
   - Added Reset Grid button at the top of controls.
   - Removed alpha and compositeOperation parameters/logic.
   - Simplified drawing loop for directness.
   ============================================================ */

import { drawState } from "/draw/drawState.js";
import { drawLine, printCircNum, _m } from "/draw/drawUtilities.js";
import { StringThing, Point } from "/classes/classes.js";
import { drawParab } from "/draw/drawRegular.js";
import { buildParameterControls } from "/ui/parameterControls.js";
import { armInteractor } from "/ui/interactor.js";

/* ============================================================
   scriptInfo
============================================================ */

export const scriptInfo = {
  title: "Overlapping Stars (Interactive)",

  params: {
    // --- geometry ---
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
    background: "",

    // --- draggable points ---
    points: []
  },

  controls: {
    // 1. Reset button at the top
    resetPoints: {
      widget: "button",
      label: "Reset Grid",
      onClick: () => {
        scriptInfo.params.points = [];
        scriptInfo.redrawHandler();
      }
    },

    color: {
      widget: "color",
      label: "Color"
    },

    lineWidth: {
      widget: "range",
      label: "Line",
      min: 0.25,
      max: 6,
      step: 0.25
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
    y1:      { widget: "range", label: "y1",      min: 0,  max: 500, step: 1, rebuildControls: false }
  },

  elements: null
};

scriptInfo.parameters = scriptInfo.params;

scriptInfo.redrawHandler = function redrawHandler() {
  update(scriptInfo.params);
  draw();
};

/* ============================================================
   Internal bookkeeping
============================================================ */

let lastGeomSig = "";

export function runPattern() {
  buildParameterControls(scriptInfo, "tab-scripts", true);
  ensurePointsArray(scriptInfo.params);
  armInteractor(scriptInfo);
  scriptInfo.redrawHandler();
}

/* ============================================================
   update / draw
============================================================ */

function update(params) {
  ensurePointsArray(params);

  // Build drawState.pts[1..20] from params.points
  drawState.pts = [];
  for (let i = 0; i < params.points.length; i++) {
    const p = params.points[i];
    drawState.pts[i + 1] = new Point(p.x, p.y);
  }

  drawState.ctr++;

  const s = {
    color: params.color,
    numSteps: params.numSteps,
    lineWidth: params.lineWidth,
    midpoint: _m(drawState.pts[4], drawState.pts[15])
  };

  scriptInfo.elements = {
    thing: new StringThing(s)
  };
}

function draw() {
  ctx.save();

  // Background handling
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1.0;

  if (scriptInfo.params.background) {
    ctx.fillStyle = scriptInfo.params.background;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  } else {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  // Construction lines
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

  // Point labels
  ctx.fillStyle = scriptInfo.params.color;
  for (let i = 1; i < drawState.pts.length; i++) {
    if (drawState.pts[i]) printCircNum(drawState.pts[i]);
  }

  // Parabolas
  const thing = scriptInfo.elements.thing;
  const pSet = [
    [1, 4, 8, 7], [1, 4, 9, 10], [18, 15, 9, 10], [15, 18, 7, 8],
    [9, 10, 5, 2], [2, 5, 11, 12], [6, 3, 11, 12], [3, 6, 13, 14],
    [14, 13, 17, 20], [20, 17, 12, 11], [12, 11, 16, 19], [19, 16, 10, 9],
    [7, 8, 5, 2], [7, 8, 16, 19], [2, 5, 13, 14], [14, 13, 16, 19]
  ];

  pSet.forEach(indices => {
    const parab = indices.map(idx => drawState.pts[idx]);
    drawParab(thing, parab);
  });

  ctx.restore();
}

/* ============================================================
   Points Seeding
============================================================ */

function ensurePointsArray(params) {
  if (params.points.length === 0) {
    const pts = computeGridPoints(params);
    params.points.length = 0;
    pts.forEach(p => params.points.push({ x: p.x, y: p.y }));
    return;
  }

  const sig = params.xDist + "|" + params.yDist + "|" + params.xLength + "|" + params.yLength + "|" + params.x1 + "|" + params.y1;
  if (sig !== lastGeomSig) {
    lastGeomSig = sig;
    const pts = computeGridPoints(params);
    params.points.length = 0;
    pts.forEach(p => params.points.push({ x: p.x, y: p.y }));
  }
}

function computeGridPoints(params) {
  const { xDist, yDist, xLength, yLength, x1, y1 } = params;

  const x2 = x1 + xLength;
  const x3 = x2 + xDist / 2;
  const x4 = x3 + xDist / 2;
  const x5 = x4 + xLength;

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

  return [
    new Point(x1, y3), new Point(x1, y6), new Point(x1, y9),
    new Point(x2, y3), new Point(x2, y6), new Point(x2, y9),
    new Point(x3, y1), new Point(x3, y2), new Point(x3, y4),
    new Point(x3, y5), new Point(x3, y7), new Point(x3, y8),
    new Point(x3, y10), new Point(x3, y11), new Point(x4, y3),
    new Point(x4, y6), new Point(x4, y9), new Point(x5, y3),
    new Point(x5, y6), new Point(x5, y9)
  ];
}
