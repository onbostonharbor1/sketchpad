/* ============================================================
   Interactive Curve Stitch Oval Band
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo:
   - Curve-stitch oval band with phase + skew + inner scale + rotation
   - Color ramp from startColor to endColor
   - Alpha envelope across the band

   CONVERSION RULES APPLIED
   -----------------------
   - Use global ctx directly (no window.ctx, no ctx variable)
   - drawRegistry-style lifecycle: init / update / draw
   - elements.element holds computed geometry for draw()
   - Uses buildParameterControls(scriptInfo, "tab-scripts", true)
   - scriptInfo.parameters alias provided
   - scriptInfo.redrawHandler calls update(params) + draw()
   - scriptInfo.onParamChange is a no-op compatibility hook

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - ctx exists globally (provided by Sketchpad getter)
   - buildParameterControls exists at /ui/parameterControls.js
   - #action exists
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */

export const scriptInfo = {

  title: "Interactive Curve Stitch Oval Band",

  params: {
    rx: 300,
    ry: 200,
    lines: 3600,

    phase: 2.35,
    skewAmp: 0.38,
    skewFreq: 1,

    innerScale: 0.60,
    rotationDeg: 18,

    lineWidth: 0.8,

    startR: 0,
    startG: 180,
    startB: 255,

    endR: 255,
    endG: 100,
    endB: 0
  },

  controls: {
    rx: {
      label: "RX",
      widget: "range",
      min: 10,
      max: 800,
      step: 1
    },
    ry: {
      label: "RY",
      widget: "range",
      min: 10,
      max: 800,
      step: 1
    },
    lines: {
      label: "Lines",
      widget: "range",
      min: 100,
      max: 12000,
      step: 10
    },

    phase: {
      label: "Phase",
      widget: "range",
      min: 0,
      max: 6.283,
      step: 0.01
    },
    skewAmp: {
      label: "Skew Amp",
      widget: "range",
      min: 0,
      max: 1.5,
      step: 0.01
    },
    skewFreq: {
      label: "Skew Freq",
      widget: "range",
      min: 0,
      max: 10,
      step: 0.01
    },

    innerScale: {
      label: "Inner Scale",
      widget: "range",
      min: 0,
      max: 0.95,
      step: 0.01
    },
    rotationDeg: {
      label: "Rotation (Deg)",
      widget: "range",
      min: 0,
      max: 180,
      step: 1
    },

    lineWidth: {
      label: "Line Width",
      widget: "range",
      min: 0.1,
      max: 5,
      step: 0.1
    },

    startR: {
      label: "Start R",
      widget: "range",
      min: 0,
      max: 255,
      step: 1
    },
    startG: {
      label: "Start G",
      widget: "range",
      min: 0,
      max: 255,
      step: 1
    },
    startB: {
      label: "Start B",
      widget: "range",
      min: 0,
      max: 255,
      step: 1
    },

    endR: {
      label: "End R",
      widget: "range",
      min: 0,
      max: 255,
      step: 1
    },
    endG: {
      label: "End G",
      widget: "range",
      min: 0,
      max: 255,
      step: 1
    },
    endB: {
      label: "End B",
      widget: "range",
      min: 0,
      max: 255,
      step: 1
    }
  },

  background: null,
  overlays: [],
  transforms: [],

  elements: null,

  // Compatibility aliases filled in runPattern()
  parameters: null,
  redrawHandler: null,
  onParamChange: null
};

/* ============================================================
   Lifecycle
============================================================ */

function init() {

  scriptInfo.elements = {
    element: {
      segments: [],
      bg: "#0c0c0f"
    }
  };

} // end init

function update(params) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const cx = w / 2;
  const cy = h / 2;

  const rot = params.rotationDeg * Math.PI / 180;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);

  const n = Math.max(1, Math.floor(params.lines));

  const startR = params.startR;
  const startG = params.startG;
  const startB = params.startB;

  const endR = params.endR;
  const endG = params.endG;
  const endB = params.endB;

  const segments = [];

  for (let i = 0; i < n; i++) {

    const f = i / n;

    const t = f * 2 * Math.PI;

    const x1 = params.rx * Math.cos(t);
    const y1 = params.ry * Math.sin(t);

    const t2 = t + params.phase + params.skewAmp * Math.sin(params.skewFreq * t);

    const x2 = params.rx * params.innerScale * Math.cos(t2);
    const y2 = params.ry * params.innerScale * Math.sin(t2);

    const X1 = x1 * cosR - y1 * sinR + cx;
    const Y1 = x1 * sinR + y1 * cosR + cy;

    const X2 = x2 * cosR - y2 * sinR + cx;
    const Y2 = x2 * sinR + y2 * cosR + cy;

    const alpha = 0.5 * (1 + Math.sin(f * Math.PI));

    const r = startR + (endR - startR) * f;
    const g = startG + (endG - startG) * f;
    const b = startB + (endB - startB) * f;

    segments.push({
      x1: X1,
      y1: Y1,
      x2: X2,
      y2: Y2,
      r: r | 0,
      g: g | 0,
      b: b | 0,
      a: alpha
    });

  } // end for i

  scriptInfo.elements.element.segments = segments;

} // end update

function draw() {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.fillStyle = scriptInfo.elements.element.bg;
  ctx.fillRect(0, 0, w, h);

  ctx.lineWidth = scriptInfo.params.lineWidth;
  ctx.lineCap = "round";

  const segments = scriptInfo.elements.element.segments;

  for (let i = 0; i < segments.length; i++) {

    const s = segments[i];

    ctx.strokeStyle = "rgba(" + s.r + "," + s.g + "," + s.b + "," + s.a + ")";

    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();

  } // end for i

} // end draw

/* ============================================================
   runPattern (Gallery entry point)
============================================================ */

export function runPattern() {

  scriptInfo.parameters = scriptInfo.params;

  scriptInfo.onParamChange = function () {
    // no-op compatibility hook
  }; // end onParamChange

  scriptInfo.redrawHandler = function () {
    update(scriptInfo.params);
    draw();
  }; // end redrawHandler

  init();

  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler();

} // end runPattern
