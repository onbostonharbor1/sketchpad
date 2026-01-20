/* ============================================================
   Cardioid From Circles (REM) — Gallery Script
   ------------------------------------------------------------
   This reproduces the classic construction shown in your image:

     A = R * sin(T)
     D = R * cos(T)
     H = sqrt( A^2 + (R - D)^2 )
     draw circle centered at (A, -D) with radius H

   Interpretation:
   - The circle centers move around a base circle of radius R.
   - Each drawn circle passes through a fixed cusp point (top of base circle).
   - The envelope of the family resembles a cardioid-like boundary.

   VARIATIONS ADDED (interactive)
   ------------------------------
   1) lobes (k):
      Centers use sin(kT), cos(kT) to wind multiple times per 2π,
      producing multi-lobe variants.

   2) notch depth controls:
      - notchBias shifts the fixed cusp point up/down.
      - notchMix blends radius between:
          dist-to-fixed-point (cardioid-like)  <->  constant R (rounder)
      - notchScale scales final radius.

   CONTRACT (Gallery scripts)
   -------------------------
   - exports scriptInfo + runPattern() (NO ctx argument)
   - uses global ctx (NO ctx variable declared)
   - drawRegistry-style lifecycle: init / update / draw
   - scriptInfo.controls uses 'widget' (not 'type')
   - buildParameterControls(scriptInfo, "tab-scripts", true)
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Cardioid From Circles (REM)",

  params: {

    // geometry
    R: 160,
    circles: 36,

    // variations
    lobes: 1,
    notchBias: 0,
    notchMix: 1.0,
    notchScale: 1.0,

    // render
    strokeColor: "#000000",
    lineWidth: 1,
    drawBaseCircle: true

  },

  controls: {

    circles: {
      widget: "range",
      label: "How Many Circles",
      min: 3,
      max: 240,
      step: 1,
      showValue: true,
      showButtons: true
    },

    R: {
      widget: "range",
      label: "Base Radius (R)",
      min: 10,
      max: 360,
      step: 1,
      showValue: true,
      showButtons: true
    },

    lobes: {
      widget: "range",
      label: "Lobes (k)",
      min: 1,
      max: 12,
      step: 1,
      showValue: true,
      showButtons: true
    },

    notchBias: {
      widget: "range",
      label: "Notch Bias (px)",
      min: -240,
      max: 240,
      step: 1,
      showValue: true,
      showButtons: true
    },

    notchMix: {
      widget: "range",
      label: "Notch Mix (0..1)",
      min: 0,
      max: 1,
      step: 0.01,
      showValue: true,
      showButtons: true
    },

    notchScale: {
      widget: "range",
      label: "Notch Scale",
      min: 0.1,
      max: 2.5,
      step: 0.01,
      showValue: true,
      showButtons: true
    },

    lineWidth: {
      widget: "range",
      label: "Line Width",
      min: 0.5,
      max: 6,
      step: 0.5,
      showValue: true,
      showButtons: true
    },

    strokeColor: {
      widget: "color",
      label: "Stroke Color"
    },

    drawBaseCircle: {
      widget: "checkbox",
      label: "Draw Base Circle"
    }

  },

  parameters: null,
  redrawHandler: null,
  onParamChange: null

}; // end scriptInfo


/* ============================================================
   elements + lifecycle
============================================================ */
const elements = {
  element: null
}; // end elements


function init() {

  elements.element = {

    last: {
      R: null,
      circles: null,
      lobes: null,
      notchBias: null,
      notchMix: null,
      notchScale: null,
      strokeColor: null,
      lineWidth: null,
      drawBaseCircle: null
    }

  };

} // end init


function update(params) {

  // fail-fast numeric sanity (controls should ensure this, but we enforce anyway)
  if (!Number.isFinite(params.R)) throw new Error("cardioidFromCircles: R must be numeric");
  if (!Number.isFinite(params.circles)) throw new Error("cardioidFromCircles: circles must be numeric");
  if (!Number.isFinite(params.lobes)) throw new Error("cardioidFromCircles: lobes must be numeric");
  if (!Number.isFinite(params.notchBias)) throw new Error("cardioidFromCircles: notchBias must be numeric");
  if (!Number.isFinite(params.notchMix)) throw new Error("cardioidFromCircles: notchMix must be numeric");
  if (!Number.isFinite(params.notchScale)) throw new Error("cardioidFromCircles: notchScale must be numeric");
  if (!Number.isFinite(params.lineWidth)) throw new Error("cardioidFromCircles: lineWidth must be numeric");

  // normalize integer-like params deterministically
  params.circles = clampInt(params.circles, 1, 2000);
  params.lobes = clampInt(params.lobes, 1, 2000);

  // clamp mix to [0,1] (UI should do this)
  params.notchMix = clamp(params.notchMix, 0, 1);

  // cache-check (cheap)
  const L = elements.element.last;

  const same =
    L.R === params.R &&
    L.circles === params.circles &&
    L.lobes === params.lobes &&
    L.notchBias === params.notchBias &&
    L.notchMix === params.notchMix &&
    L.notchScale === params.notchScale &&
    L.strokeColor === params.strokeColor &&
    L.lineWidth === params.lineWidth &&
    L.drawBaseCircle === params.drawBaseCircle;

  if (same) return;

  L.R = params.R;
  L.circles = params.circles;
  L.lobes = params.lobes;
  L.notchBias = params.notchBias;
  L.notchMix = params.notchMix;
  L.notchScale = params.notchScale;
  L.strokeColor = params.strokeColor;
  L.lineWidth = params.lineWidth;
  L.drawBaseCircle = params.drawBaseCircle;

} // end update


function draw() {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);

  // center the construction
  ctx.save();
  ctx.translate(w / 2, h / 2);

  ctx.strokeStyle = scriptInfo.params.strokeColor;
  ctx.lineWidth = scriptInfo.params.lineWidth;

  const R = scriptInfo.params.R;
  const V = scriptInfo.params.circles;
  const k = scriptInfo.params.lobes;

  const notchBias = scriptInfo.params.notchBias;
  const notchMix = scriptInfo.params.notchMix;
  const notchScale = scriptInfo.params.notchScale;

  // fixed cusp point (relative to center)
  // original cusp is at (0, -R); bias moves it up/down
  const fx = 0;
  const fy = -R - notchBias;

  // step size (mirrors the old BASIC pattern: p = 2π/(V+1), T = p..V*p)
  const p = (2 * Math.PI) / (V + 1);

  for (let i = 1; i <= V; i++) {

    const T = i * p;

    // center moves on base circle, but can loop k times
    const A = R * Math.sin(k * T);
    const D = R * Math.cos(k * T);

    // moving circle center is (A, -D)
    const cx = A;
    const cy = -D;

    // distance from moving center to fixed point determines cardioid radius
    const dx = fx - cx;
    const dy = fy - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // notchMix blends:
    //   1.0 -> dist (original cardioid-like)
    //   0.0 -> constant radius R (rounder / shallower notch)
    const blended = (notchMix * dist) + ((1 - notchMix) * R);

    // notchScale gives a direct exaggeration/softening control
    const H = notchScale * blended;

    drawCircle(cx, cy, H);

  }

  // optional base circle
  if (scriptInfo.params.drawBaseCircle) {
    drawCircle(0, 0, R);
  }

  ctx.restore();

} // end draw


/* ============================================================
   runPattern()
============================================================ */
export function runPattern() {

  scriptInfo.parameters = scriptInfo.params;

  scriptInfo.onParamChange = function () {
    // no-op (compatibility)
  }; // end onParamChange

  scriptInfo.redrawHandler = function () {
    update(scriptInfo.params);
    draw();
  }; // end redrawHandler

  init();

  buildParameterControls(scriptInfo, "tab-scripts", true);

  scriptInfo.redrawHandler();

} // end runPattern


/* ============================================================
   drawing helpers
============================================================ */
function drawCircle(x, y, r) {

  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.stroke();

} // end drawCircle


/* ============================================================
   numeric helpers
============================================================ */
function clamp(v, a, b) {

  if (v < a) return a;
  if (v > b) return b;
  return v;

} // end clamp


function clampInt(v, a, b) {

  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) throw new Error("clampInt: value must be numeric");

  if (n < a) return a;
  if (n > b) return b;
  return n;

} // end clampInt
