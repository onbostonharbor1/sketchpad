/* ============================================================
   Overlapping Stars — Interactive (Gallery Script)
   ============================================================ */

import { drawState } from "/draw/drawState.js";
import { drawLine, printCircNum, _m } from "/draw/drawUtilities.js";
import { StringThing, Point } from "/classes/classes.js";
import { drawParab } from "/draw/drawRegular.js";
import { buildParameterControls } from "/ui/parameterControls.js";

export const scriptInfo = {
  title: "Overlapping Stars (Interactive)",
  params: {
    xDist: 80,
    yDist: 100,
    xLength: 100,
    yLength: 100,
    x1: 50,
    y1: 50,
    color: "blue",
    numSteps: 18,
    lineWidth: 0.8,
    alpha: 1.0,
    points: [] // [0-19] mapped to drawState.pts[1-20]
  },

  controls: {
    color: { widget: "color", label: "Color" },
    lineWidth: { widget: "range", label: "Line", min: 0.25, max: 6, step: 0.25 },
    alpha: { widget: "range", label: "Alpha", min: 0.05, max: 1.0, step: 0.01 },
    numSteps: { widget: "range", label: "Steps", min: 3, max: 80, step: 1 },
    xDist:   { widget: "range", label: "xDist",   min: 10, max: 250, step: 1 },
    yDist:   { widget: "range", label: "yDist",   min: 10, max: 250, step: 1 },
    xLength: { widget: "range", label: "xLength", min: 20, max: 250, step: 1 },
    yLength: { widget: "range", label: "yLength", min: 20, max: 250, step: 1 },
    x1:      { widget: "range", label: "x1",      min: 0,  max: 500, step: 1 },
    y1:      { widget: "range", label: "y1",      min: 0,  max: 500, step: 1 }
  }
};

scriptInfo.parameters = scriptInfo.params;

scriptInfo.redrawHandler = function redrawHandler() {
  update(scriptInfo.params);
  draw();
};

let lastGeomSig = "";

/* ============================================================
   runPattern
   ============================================================ */
export function runPattern() {
  // 1. Setup UI
  buildParameterControls(scriptInfo, "tab-scripts", true);

  // 2. Clear and Seed (Lifecycle Cleanup)
  scriptInfo.params.points.length = 0;
  ensurePointsArray(scriptInfo.params);

  // 3. Arm the interactor
  if (window.armInteractor) {
    window.armInteractor(scriptInfo);

    // 4. Force Immediate Visibility (The Wake Up)
    if (window.interactor && typeof window.interactor.draw === 'function') {
        window.interactor.draw();
    }
  }

  scriptInfo.redrawHandler();
}

/* ============================================================
   update / draw
   ============================================================ */
function update(params) {
  ensurePointsArray(params);

  // Sync registry points to the internal drawState logic
  drawState.pts = [];
  params.points.forEach((p, i) => {
    drawState.pts[i + 1] = new Point(p.x, p.y);
  });

  drawState.ctr++;

  const s = {
    color: params.color,
    numSteps: params.numSteps,
    lineWidth: params.lineWidth,
    midpoint: _m(drawState.pts[4], drawState.pts[15])
  };

  scriptInfo.elements = { thing: new StringThing(s) };
}

function draw() {
  ctx.save();

  // Clear background
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1.0;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Apply transparency
  ctx.globalAlpha = scriptInfo.params.alpha;

  // Draw Grid Lines
  const c = scriptInfo.params.color;
  drawLine(drawState.pts[1],  drawState.pts[4],  c);
  drawLine(drawState.pts[2],  drawState.pts[5],  c);
  drawLine(drawState.pts[3],  drawState.pts[6],  c);
  drawLine(drawState.pts[7],  drawState.pts[8],  c);
  drawLine(drawState.pts[9],  drawState.pts[10], c);
  drawLine(drawState.pts[11], drawState.pts[12], c);
  drawLine(drawState.pts[13], drawState.pts[14], c);
  drawLine(drawState.pts[15], drawState.pts[18], c);
  drawLine(drawState.pts[16], drawState.pts[19], c);
  drawLine(drawState.pts[17], drawState.pts[20], c);

  // Labels
  ctx.fillStyle = c;
  for (let i = 1; i < drawState.pts.length; i++) {
    if (drawState.pts[i]) printCircNum(drawState.pts[i]);
  }

  const thing = scriptInfo.elements.thing;

  // Parab sets
  const sets = [
    [1, 4, 8, 7], [1, 4, 9, 10], [18, 15, 9, 10], [15, 18, 7, 8],
    [9, 10, 5, 2], [2, 5, 11, 12], [6, 3, 11, 12], [3, 6, 13, 14],
    [14, 13, 17, 20], [20, 17, 12, 11], [12, 11, 16, 19], [19, 16, 10, 9],
    [7, 8, 5, 2], [7, 8, 16, 19], [2, 5, 13, 14], [14, 13, 16, 19]
  ];

  sets.forEach(indices => {
    drawParab(thing, indices.map(idx => drawState.pts[idx]));
  });

  ctx.restore();
}

function ensurePointsArray(params) {
  const sig = `${params.xDist}|${params.yDist}|${params.xLength}|${params.yLength}|${params.x1}|${params.y1}`;

  // If geometry sliders change or it's the first run, recompute.
  if (params.points.length === 0 || sig !== lastGeomSig) {
    lastGeomSig = sig;
    const computed = computeGridPoints(params);
    params.points.length = 0;
    computed.forEach(p => params.points.push({ x: p.x, y: p.y }));
  }
}

function computeGridPoints(params) {
  const { xDist, yDist, xLength, yLength, x1, y1 } = params;
  const x2 = x1 + xLength, x3 = x2 + xDist / 2, x4 = x3 + xDist / 2, x5 = x4 + xLength;
  const y2 = y1 + yLength, y3 = y2 + yDist / 2, y4 = y3 + yDist / 2, y5 = y4 + yLength;
  const y6 = y5 + yDist / 2, y7 = y6 + yDist / 2, y8 = y7 + yLength;
  const y9 = y8 + yDist / 2, y10 = y9 + yDist / 2, y11 = y10 + yLength;

  return [
    {x: x1, y: y3}, {x: x1, y: y6}, {x: x1, y: y9}, {x: x2, y: y3}, {x: x2, y: y6},
    {x: x2, y: y9}, {x: x3, y: y1}, {x: x3, y: y2}, {x: x3, y: y4}, {x: x3, y: y5},
    {x: x3, y: y7}, {x: x3, y: y8}, {x: x3, y: y10}, {x: x3, y: y11}, {x: x4, y: y3},
    {x: x4, y: y6}, {x: x4, y: y9}, {x: x5, y: y3}, {x: x5, y: y6}, {x: x5, y: y9}
  ];
}
