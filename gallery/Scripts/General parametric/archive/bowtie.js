/* ============================================================
   Lemniscate — "Infinity Drift"
   Gallery Script (ParameterControls-integrated)

   INPUT SNIPPET
   -------------
   lemniscate: {
     label: "Infinity Drift",
     description: "Lemniscate curve shaped like a bowtie or infinity symbol.",
     defaults: { radius: 150, colorGradient: true },
     controls: {
       radius: { type: "range", min: 50, max: 300 },
       colorGradient: { type: "checkbox" }
     }
   }

   WHAT I DID WITH THAT
   --------------------
   Your snippet defines:
     - a label ("Infinity Drift")
     - a qualitative shape (bowtie / infinity)
     - one numeric control (radius)
     - one boolean control (colorGradient)

   It does NOT define an actual curve equation.

   So this conversion supplies a standard, well-known lemniscate
   equation (Bernoulli lemniscate) and maps your two controls
   onto it, while staying inside your Gallery script contract.

   LEMNISCATE CHOICE
   -----------------
   Bernoulli lemniscate in polar form:
     r^2 = a^2 * cos(2θ)
   which becomes:
     r = a * sqrt(cos(2θ))   when cos(2θ) >= 0

   Then convert polar -> Cartesian:
     x = r * cos(θ)
     y = r * sin(θ)

   This produces the classic sideways "∞" / bowtie.

   COLOR GRADIENT MODE
   -------------------
   If colorGradient is true:
     - draw the curve in many short segments
     - each segment gets a hue based on θ
   If false:
     - draw it as one path in a single stroke

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - ctx exists globally (your Sketchpad getter)
   - buildParameterControls exists at /ui/parameterControls.js
   - #action exists
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */

export const scriptInfo = {

  title: "Infinity Drift (Lemniscate)",

  description: "Lemniscate curve shaped like a bowtie or infinity symbol.",

  params: {
    radius: 150,
    colorGradient: true,

    // additional practical controls (safe defaults)
    step: 0.002,          // θ sampling step
    strokeStyle: "#000000",
    lineWidth: 1
  },

  parameters: null,

  controls: {

    radius: {
      widget: "range",
      label: "Radius (a)",
      min: 50,
      max: 300,
      step: 1
    },

    colorGradient: {
      widget: "checkbox",
      label: "Color gradient"
    },

    step: {
      widget: "range",
      label: "Step (Δθ)",
      min: 0.0005,
      max: 0.02,
      step: 0.0005
    },

    strokeStyle: {
      widget: "colorPicker",
      label: "Stroke (non-gradient)"
    },

    lineWidth: {
      widget: "range",
      label: "Line width",
      min: 0.25,
      max: 6,
      step: 0.25
    }
  },

  elements: {
    points: []
  },

  redrawHandler: null,

  onParamChange() {
    // no-op
  } // end onParamChange

}; // end scriptInfo


/* ============================================================
   init()
============================================================ */
function init() {

  scriptInfo.elements.points = [];

} // end init


/* ============================================================
   update(params)
   Build points for Bernoulli lemniscate using polar equation:
     r^2 = a^2 cos(2θ)
============================================================ */
function update(params) {

  const a = params.radius;
  const dTheta = params.step;

  const pts = [];

  // Sweep θ over [0, 2π]. Only keep where cos(2θ) >= 0.
  // That naturally yields the two loops of the "∞".

  for (let theta = 0; theta <= Math.PI * 2; theta += dTheta) {

    const c = Math.cos(2 * theta);

    if (c < 0) continue;

    const r = a * Math.sqrt(c);

    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);

    pts.push({ x, y, theta });

  }

  scriptInfo.elements.points = pts;

} // end update


/* ============================================================
   draw()
============================================================ */
function draw() {

  const pts = scriptInfo.elements.points;
  if (pts.length < 2) return;

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.save();
  ctx.translate(w / 2, h / 2);

  ctx.lineWidth = scriptInfo.params.lineWidth;

  if (!scriptInfo.params.colorGradient) {

    // single-stroke mode
    ctx.strokeStyle = scriptInfo.params.strokeStyle;

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }

    ctx.stroke();
    ctx.restore();
    return;
  }

  // gradient mode:
  // draw as many small segments, changing hue across θ
  // (simple, deterministic, and visually shows direction)

  for (let i = 1; i < pts.length; i++) {

    const p0 = pts[i - 1];
    const p1 = pts[i];

    // Map θ (0..2π) to hue (0..360)
    const hue = (p0.theta / (Math.PI * 2)) * 360;

    ctx.strokeStyle = "hsl(" + hue + ", 100%, 35%)";

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

  }

  ctx.restore();

} // end draw


/* ============================================================
   runPattern()
============================================================ */
export function runPattern() {

  scriptInfo.parameters = scriptInfo.params;

  init();

  buildParameterControls(scriptInfo, "tab-scripts", true);

  scriptInfo.redrawHandler = function redrawHandler() {

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    update(scriptInfo.params);
    draw();

  }; // end redrawHandler

  scriptInfo.redrawHandler();

} // end runPattern
