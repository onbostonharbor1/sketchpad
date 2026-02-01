import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {
  title: "Silk Interference",

  params: {
    lines: 180,
    res: 800,
    amplitude: 120,
    baseRadius: 180,
    shiftRate: 0.015,
    strokeStyle: "rgba(0, 0, 0, 0.15)",
    lineWidth: 0.6
  },

  controls: {
    lines: {
      widget: "range",
      label: "Line Density",
      min: 10,
      max: 500,
      step: 1
    },
    amplitude: {
      widget: "range",
      label: "Wave Amplitude",
      min: 0,
      max: 300,
      step: 1
    },
    baseRadius: {
      widget: "range",
      label: "Base Radius",
      min: 10,
      max: 400,
      step: 1
    },
    shiftRate: {
      widget: "range",
      label: "Interference Shift",
      min: 0,
      max: 0.1,
      step: 0.001
    },
    strokeStyle: {
      widget: "colorPicker",
      label: "Stroke Color"
    },
    lineWidth: {
      widget: "range",
      label: "Line Weight",
      min: 0.1,
      max: 3,
      step: 0.1
    }
  },

  elements: {
    element: null
  }
};

scriptInfo.parameters = scriptInfo.params;

scriptInfo.redrawHandler = function redrawHandler() {
  update(scriptInfo.params);
  draw();
};

/* ============================================================
   runPattern()
============================================================ */
export function runPattern() {
  init();
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();
}

function init() {
  scriptInfo.elements.element = {
    W: 0,
    H: 0,
    cx: 0,
    cy: 0,
    linePaths: [] // Array of arrays (each sub-array is a polyline)
  };
}

/* ============================================================
   update(params)
============================================================ */
function update(params) {
  const e = scriptInfo.elements.element;
  e.W = ctx.canvas.width;
  e.H = ctx.canvas.height;
  e.cx = e.W / 2;
  e.cy = e.H / 2;

  e.linePaths = [];
  const TWO_PI = Math.PI * 2;

  for (let i = 0; i < params.lines; i++) {
    const currentPath = [];
    const shift = i * params.shiftRate;
    const distortion = (i / params.lines) * 0.1;

    for (let j = 0; j <= params.res; j++) {
      const a = (j * TWO_PI) / params.res;

      const r1 = params.amplitude * Math.sin(a * 2 + shift);
      const r2 = (params.amplitude / 2) * Math.cos(a * 5 - shift);
      const r = params.baseRadius + r1 + r2;

      // Cartesian
      const xRaw = r * Math.cos(a);
      const yRaw = r * Math.sin(a);

      // Spatial "Pull" Rotation
      const xFinal = xRaw * Math.cos(distortion) - yRaw * Math.sin(distortion);
      const yFinal = xRaw * Math.sin(distortion) + yRaw * Math.cos(distortion);

      currentPath.push({ x: xFinal, y: yFinal });
    }
    e.linePaths.push(currentPath);
  }
}

/* ============================================================
   draw()
============================================================ */
function draw() {
  const e = scriptInfo.elements.element;
  const p = scriptInfo.params;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, e.W, e.H);

  ctx.save();
  ctx.translate(e.cx, e.cy);
  ctx.strokeStyle = p.strokeStyle;
  ctx.lineWidth = p.lineWidth;

  e.linePaths.forEach(path => {
    if (path.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
  });

  ctx.restore();
}
