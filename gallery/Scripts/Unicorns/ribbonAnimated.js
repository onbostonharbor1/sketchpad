/* ============================================================
   Animated Color Curve-Stitch Ribbon
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo:
   - Animated color curve-stitch ribbon
   - Left/right anchor arcs generate interleaved stitch stripe
   - Gradient-filled ribbon with soft edge stroke

   CONVERSION RULES APPLIED
   -----------------------
   - Use global ctx directly (no window.ctx, no ctx variable)
   - drawRegistry-style lifecycle: init / update / draw
   - elements.element holds computed geometry for draw()
   - Animation restored using requestAnimationFrame()
   - Checkbox control starts/stops animation

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

  title: "Animated Color Curve-Stitch Ribbon",

  params: {
    N: 200,              // points per ribbon arc sample
    spacing: 6,          // stitch density (step between points)
    speed: 0.6,          // animation speed multiplier
    ribbons: 3,          // number of overlapping ribbons

    // animation toggle
    animate: true,

    // visual controls
    hueRate: 50,         // degrees per second
    huePerRibbon: 80,    // hue offset per ribbon
    hueTwist: 120,       // gradient spread (third stop offset)

    alphaBase: 0.22,     // base alpha
    alphaWave: 0.20,     // alpha variation amplitude
    alphaRate: 1.2,      // wave speed (per second)

    thickness: 4,        // polygon offset magnitude (thickness illusion)
    strokeWidth: 1.2,    // edge stroke width
    strokeAlpha: 0.12    // edge stroke alpha
  },

  controls: {
    animate: {
      label: "Animate",
      widget: "checkbox"
    },
    N: {
      label: "N (Points Per Ribbon)",
      widget: "range",
      min: 40,
      max: 600,
      step: 1
    },
    spacing: {
      label: "Spacing (Stitch Density)",
      widget: "range",
      min: 1,
      max: 30,
      step: 1
    },
    speed: {
      label: "Speed",
      widget: "range",
      min: 0,
      max: 3,
      step: 0.01
    },
    ribbons: {
      label: "Ribbons",
      widget: "range",
      min: 1,
      max: 8,
      step: 1
    },
    hueRate: {
      label: "Hue Rate (deg/sec)",
      widget: "range",
      min: 0,
      max: 240,
      step: 1
    },
    huePerRibbon: {
      label: "Hue Per Ribbon",
      widget: "range",
      min: 0,
      max: 180,
      step: 1
    },
    hueTwist: {
      label: "Hue Twist",
      widget: "range",
      min: 0,
      max: 240,
      step: 1
    },
    alphaBase: {
      label: "Alpha Base",
      widget: "range",
      min: 0,
      max: 1,
      step: 0.01
    },
    alphaWave: {
      label: "Alpha Wave",
      widget: "range",
      min: 0,
      max: 1,
      step: 0.01
    },
    alphaRate: {
      label: "Alpha Rate",
      widget: "range",
      min: 0,
      max: 6,
      step: 0.01
    },
    thickness: {
      label: "Thickness",
      widget: "range",
      min: 0,
      max: 20,
      step: 0.25
    },
    strokeWidth: {
      label: "Stroke Width",
      widget: "range",
      min: 0,
      max: 8,
      step: 0.1
    },
    strokeAlpha: {
      label: "Stroke Alpha",
      widget: "range",
      min: 0,
      max: 1,
      step: 0.01
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
   Internal animation state
============================================================ */

let _t0 = 0;
let _rafId = 0;

/* ============================================================
   Helpers
============================================================ */

function hslCss(h, s, l) {
  return "hsl(" + (h | 0) + ", " + Math.round(s * 100) + "%, " + Math.round(l * 100) + "%)";
} // end hslCss

function makeAnchors(index, w, h) {

  const r = Math.min(w, h) * 0.38;

  const left = {
    x: w * 0.15,
    y: h * 0.5 + Math.sin(index * 1.7) * h * 0.05,
    r: r
  };

  const right = {
    x: w * 0.85,
    y: h * 0.5 + Math.cos(index * 1.5) * h * 0.05,
    r: r
  };

  return { left: left, right: right };

} // end makeAnchors

function buildRibbonStripe(anchors, p, N, spacing) {

  const ptsL = [];
  const ptsR = [];

  for (let j = 0; j < N; j++) {

    const t = (N === 1) ? 0 : (j / (N - 1));
    const a = (t - 0.5) * Math.PI * 0.9;

    const phase = Math.sin((p * 2 * Math.PI) + t * 4.0);
    const rscale = 0.9 + 0.12 * phase;

    const lx = anchors.left.x + Math.cos(a + p * 1.4) * anchors.left.r * rscale;
    const ly = anchors.left.y + Math.sin(a + p * 1.4) * anchors.left.r * rscale;

    const rx = anchors.right.x + Math.cos(Math.PI - a - p * 1.2) * anchors.right.r * rscale;
    const ry = anchors.right.y + Math.sin(Math.PI - a - p * 1.2) * anchors.right.r * rscale;

    ptsL.push({ x: lx, y: ly });
    ptsR.push({ x: rx, y: ry });

  } // end for j

  const stripe = [];

  const step = Math.max(1, Math.floor(spacing));
  const half = Math.max(1, Math.floor(step / 2));

  for (let k = 0; k < N; k += step) {
    const i1 = k;
    const i2 = Math.min(k + half, N - 1);
    stripe.push(ptsL[i1], ptsR[i2]);
  } // end for k

  return stripe;

} // end buildRibbonStripe

function computeBounds(points) {

  const b = {
    minX: 1e9,
    minY: 1e9,
    maxX: -1e9,
    maxY: -1e9
  };

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.x < b.minX) b.minX = p.x;
    if (p.x > b.maxX) b.maxX = p.x;
    if (p.y < b.minY) b.minY = p.y;
    if (p.y > b.maxY) b.maxY = p.y;
  } // end for i

  return b;

} // end computeBounds

function drawOneRibbon(ribbon) {

  const stripe = ribbon.stripe;
  const thickness = ribbon.thickness;

  ctx.beginPath();
  ctx.moveTo(stripe[0].x, stripe[0].y);

  for (let i = 1; i < stripe.length; i++) {
    const p = stripe[i];
    ctx.lineTo(p.x, p.y);
  } // end for i

  for (let i = stripe.length - 1; i >= 0; i--) {

    const p = stripe[i];

    const dx = (i % 2) ? thickness : -thickness;
    const dy = (i % 2) ? -thickness : thickness;

    ctx.lineTo(p.x + dx, p.y + dy);

  } // end for i

  ctx.closePath();

  const bounds = ribbon.bounds;

  const grad = ctx.createLinearGradient(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY);

  const h0 = ribbon.hueShift;
  const h1 = (h0 + 60) % 360;
  const h2 = (h0 + ribbon.hueTwist) % 360;

  grad.addColorStop(0.0, hslCss(h0, 0.85, 0.55));
  grad.addColorStop(0.5, hslCss(h1, 0.90, 0.60));
  grad.addColorStop(1.0, hslCss(h2, 0.85, 0.45));

  ctx.fillStyle = grad;

  ctx.globalAlpha = ribbon.alpha * 0.9;
  ctx.fill();
  ctx.globalAlpha = 1.0;

  ctx.lineWidth = ribbon.strokeWidth;
  ctx.strokeStyle = "rgba(255,255,255," + ribbon.strokeAlpha + ")";
  ctx.stroke();

} // end drawOneRibbon

/* ============================================================
   Lifecycle
============================================================ */

function init() {

  scriptInfo.elements = {
    element: {
      ribbons: []
    }
  };

} // end init

function update(params, elapsedSeconds) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const N = Math.max(2, Math.floor(params.N));
  const spacing = Math.max(1, params.spacing);
  const ribbons = Math.max(1, Math.floor(params.ribbons));

  const speed = params.speed;

  // progress loops 0..1 (matching original "elapsed % 4 / 4")
  const p = ((elapsedSeconds * speed) % 4) / 4;

  scriptInfo.elements.element.ribbons.length = 0;

  for (let r = 0; r < ribbons; r++) {

    const anchors = makeAnchors(r, w, h);

    const rp = (p + r * 0.15) % 1.0;
    const stripe = buildRibbonStripe(anchors, rp, N, spacing);
    const bounds = computeBounds(stripe);

    const hueShift = ((elapsedSeconds * params.hueRate) + (r * params.huePerRibbon)) % 360;

    const alphaRaw = params.alphaBase + params.alphaWave * Math.sin((elapsedSeconds * params.alphaRate) + r);
    const alpha = Math.abs(alphaRaw);

    scriptInfo.elements.element.ribbons.push({
      stripe: stripe,
      bounds: bounds,
      hueShift: hueShift,
      hueTwist: params.hueTwist,
      alpha: alpha,
      thickness: params.thickness,
      strokeWidth: params.strokeWidth,
      strokeAlpha: params.strokeAlpha
    });

  } // end for r

} // end update

function draw() {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);

  const list = scriptInfo.elements.element.ribbons;

  for (let i = 0; i < list.length; i++) {
    drawOneRibbon(list[i]);
  } // end for i

} // end draw

/* ============================================================
   Animation loop
============================================================ */

function renderFrame(nowMs) {

  const elapsedSeconds = (nowMs - _t0) * 0.001;

  update(scriptInfo.params, elapsedSeconds);
  draw();

  _rafId = requestAnimationFrame(renderFrame);

} // end renderFrame

function startAnimation() {

  stopAnimation();

  _t0 = performance.now();
  _rafId = requestAnimationFrame(renderFrame);

} // end startAnimation

function stopAnimation() {

  if (_rafId) {
    cancelAnimationFrame(_rafId);
    _rafId = 0;
  }

} // end stopAnimation

/* ============================================================
   runPattern (Gallery entry point)
============================================================ */

export function runPattern() {

  scriptInfo.parameters = scriptInfo.params;

  scriptInfo.onParamChange = function () {
    // no-op compatibility hook
  }; // end onParamChange

  scriptInfo.redrawHandler = function () {

    // If animation is ON, ensure it is running.
    if (scriptInfo.params.animate) {
      startAnimation();
      return;
    }

    // If animation is OFF, stop and draw one frame.
    stopAnimation();
    update(scriptInfo.params, 0);
    draw();

  }; // end redrawHandler


  init();

  buildParameterControls(scriptInfo, "tab-scripts", true);

  // Honor initial checkbox state
  scriptInfo.redrawHandler();

} // end runPattern

/* ============================================================
   TEARDOWN (Crucial for Gallery)
   ============================================================ */
export function stop() {
  stopAnimation();
} // end stop
