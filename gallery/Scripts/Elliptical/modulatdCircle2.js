/* ============================================================
   Modulated Circle Explorer (Waveforms)
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Converted from standalone HTML demo:
   - r(θ) = R + A * w(nθ + φ)
   - Multiple waveforms + harmonic sum + noise
   - Samples control
   - Removed: DOM UI, labels, resize/DPR handling, PNG export, animation loop

   GOAL
   ----
   - Run under Gallery calling runPattern()
   - Use parameterControls.js
   - Match drawRegistry-style lifecycle and naming

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - global ctx exists
   - #action exists
============================================================ */
/* ============================================================
   Explaining a modulated circle

   A modulated circle in math or graphics refers to a circle whose radius
   changes based on the angle, expressed as r(θ) = R + f(θ). This can be
   illustrated with the polar equation r = R + A sin(nθ), used in
   applications like spirographs, gear teeth, or wavetable synthesis.

   Types of modulation include radial, angular, and amplitude modulation.
   While the user didn't ask for visualizations, a simple parametric
   equation could always help clarify the concept.

   ------------------------------------------------------------
   Definition
   ------------------------------------------------------------
   A modulated circle is a circle whose radius (or shape) is varied
   according to a periodic function of the angle. Instead of a constant
   radius R, the radius becomes a function r(θ) so the curve is traced in
   polar coordinates by r = r(θ). That angular-dependent variation
   “modulates” the circle and produces petal-like, wavy, or scalloped
   outlines.

   ------------------------------------------------------------
   Mathematical form
   ------------------------------------------------------------

   • Basic modulated circle (sinusoidal radial modulation):

       r(θ) = R + A · sin(nθ)

     where:
       R = base radius
       A = modulation amplitude
       n = modulation frequency (number of lobes)
       θ ∈ [0, 2π]

   • More general:

       r(θ) = R + Σk Ak · fk(kθ + φk)

     where:
       - you can combine harmonics
       - phases φk
       - different wave shapes fk (sine, cosine, triangle, noise)

   • Parametric (Cartesian) coordinates:

       x(θ) = r(θ) · cos θ
       y(θ) = r(θ) · sin θ

   ------------------------------------------------------------
   Common special cases / names
   ------------------------------------------------------------

   • Rose curves:
       r = a · sin(nθ)   or   r = a · cos(nθ)
     produce n (or 2n) symmetric petals.

   • Sinusoidally modulated circle:
       R + A sin(nθ)
     scalloped circle with n lobes.

   • Spirograph / hypotrochoid / epitrochoid:
     different mechanism (rolling circles) but visually related to
     modulated-radius shapes.

   • Radial noise modulation:
     use random or fractal signals for organic outlines.

   ------------------------------------------------------------
   Visual / behavior intuition
   ------------------------------------------------------------

   • Increasing A (amplitude) makes lobes deeper; when A ≥ R the curve can
     self-intersect or loop.

   • Increasing n increases the number of repeated features (petals/lobes)
     around the circle.

   • Phase shifts move lobes around the circle. Combining harmonics creates
     richer, non-symmetric patterns.

   ------------------------------------------------------------
   Applications
   ------------------------------------------------------------

   • Generating floral or mandala patterns in generative art.
   • Procedural shapes in graphics, textures, and modeling (gear-like
     wheels, scalloped borders).
   • Signal/physics analogies: ring modulation, FM where a carrier (angle)
     is modulated by another waveform.
   • Mathematical demonstrations of symmetry, Fourier synthesis, and polar
     geometry.

   ------------------------------------------------------------
   Quick examples you can try mentally or in code
   ------------------------------------------------------------

   • Simple 8-lobed scallop:
       r(θ) = 100 + 30·sin(8θ)

   • Rose curve with 7 petals:
       r(θ) = 80·sin(7θ)

   • Two-harmonic modulation:
       r(θ) = 90 + 25·sin(5θ) + 10·sin(11θ + 0.3)

   If you’d like, I can produce a tiny HTML+canvas snippet that visualizes
   a modulated circle and exposes R, A, n, and waveform controls. Which
   waveform or visual style do you prefer (sinusoidal, triangle,
   multi-harmonic, or noisy)?

   ------------------------------------------------------------
   Overview
   ------------------------------------------------------------
   This program draws:

       r(θ) = R + A · w(nθ + φ)

   and lets you explore how base radius, amplitude, frequency, phase,
   waveform and sampling affect the resulting shape.

   ------------------------------------------------------------
   Quick start (one-minute)
   ------------------------------------------------------------

   1. Open the HTML file in a browser.
   2. Move the Base Radius and Amplitude sliders to set the overall size
      and lobe depth.
   3. Set Frequency (n) to choose how many repeating features appear.
   4. Pick a Waveform from the menu (Sine, Triangle, Saw, Square,
      Harmonic sum, Noise).
   5. Adjust Samples for resolution; increase it for smoother outlines.
   6. Toggle Animate to see continuous rotation/phase change; adjust Speed.
   7. Use Export PNG to save a high-resolution image.

   ------------------------------------------------------------
   Controls and what they change
   ------------------------------------------------------------

   • Base Radius:
     sets the circle’s base radius R. Larger = bigger shape.

   • Amplitude:
     sets A, the modulation depth. Positive increases lobes; if A ≈ R the
     curve can self-intersect.

   • Frequency (n):
     integer multiplier inside the waveform. Higher n = more lobes /
     oscillations around the circle.

   • Phase (deg):
     angular offset φ; shifts lobes around the circle. When animated, phase
     advances.

   • Waveform:
     chooses w(·).
       - Sine / Cos produce smooth rose-like lobes.
       - Triangle / Saw / Square create sharper, faceted lobes.
       - Harmonic sum stacks harmonics for richer detail.
       - Noise makes organic, irregular outlines.

   • Harmonic Amp:
     when waveform = Harmonic sum, scales the contribution of the harmonic
     series.

   • Samples:
     number of θ samples used to draw the outline. Low = faceted; high =
     smooth. Increase when amplitude or curvature is high.

   • Stroke Color and Line Width:
     visual styling of the outline.

   • Animate & Speed:
     toggles continuous motion; speed controls how quickly phase/rotation
     changes.

   • Export PNG:
     renders a higher-resolution image and downloads it.

   • Reset:
     restores defaults.

   • Info / coordinates:
     shows current formula and pointer coordinates over the canvas.

   ------------------------------------------------------------
   Practical recipes
   ------------------------------------------------------------

   • Classic rose curve:
     set Waveform = Sine
     Base Radius ≈ 0
     Amplitude = desired radius
     Frequency = k
     (r = A·sin(kθ))

   • Scalloped circle:
     Base Radius > 0
     Waveform = Sine
     small n (4–12)
     modest Amplitude for shallow scallops

   • Sharp petals:
     Waveform = Triangle or Saw
     raise Amplitude
     reduce Samples for a faceted look

   • Rich organic shapes:
     Waveform = Harmonic sum
     n around 6–12
     Harmonic Amp ≈ 0.4–0.8
     raise Samples

   • Natural outlines:
     Waveform = Noise
     moderate amplitude
     high samples for smooth randomness

   ------------------------------------------------------------
   Performance and quality tips
   ------------------------------------------------------------

   • Increase Samples when amplitude or frequency is high to avoid visible
     straight-segment artifacts.

   • If animation stutters, lower Samples or line width; modern CPUs handle
     several hundred samples easily.

   • For crisp exports, use Export PNG (it renders at higher internal
     resolution).

   • If petals overlap undesirably, reduce Amplitude or Frequency.

   ------------------------------------------------------------
   Explorations to try
   ------------------------------------------------------------

   • Sweep Frequency from 1 to 24 while holding Amplitude fixed and watch
     symmetry change.

   • Use Harmonic sum and vary Harmonic Amp to observe how higher harmonics
     add small detail without changing major lobes.

   • Combine small Base Radius with large Amplitude to produce looping rose
     curves and study self-intersections.

   • Turn on Animate and slowly increase Speed; observe phase relationships
     and traveling lobes.

   ------------------------------------------------------------
   Debug and learning notes
   ------------------------------------------------------------

   • The program computes each sample point at θ and converts
     polar → Cartesian. The waveform result is scaled by A then added to R.

   • Harmonic sum approximates a Fourier-like series; its visual richness
     increases with n but needs more Samples.

   • Noise is a cheap smooth approximator (sum of sines) rather than a full
     Perlin implementation; for finer-controlled randomness consider
     replacing noise1 with a seeded Perlin function.

   ------------------------------------------------------------
   Next steps I can add
   ------------------------------------------------------------

   • Arc-length parameterization for uniform segment lengths.
   • Per-petal coloring, multi-ring layers, or filled petals.
   • Export SVG for vector output.
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Modulated Circle (Waveforms)",

  params: {
    baseRadius: 180,
    amplitude: 60,
    frequency: 7,
    phaseDeg: 0,
    waveform: "sine",
    harmonicAmp: 0.6,
    samples: 720,

    strokeStyle: "#ff4fa3",
    lineWidth: 1
  },

  controls: {

    baseRadius: {
      widget: "range",
      label: "Base Radius",
      min: 10,
      max: 600,
      step: 1
    },

    amplitude: {
      widget: "range",
      label: "Amplitude",
      min: 0,
      max: 400,
      step: 1
    },

    frequency: {
      widget: "range",
      label: "Frequency (n)",
      min: 0,
      max: 24,
      step: 1
    },

    phaseDeg: {
      widget: "range",
      label: "Phase (deg)",
      min: 0,
      max: 360,
      step: 1
    },

    waveform: {
      widget: "selectSegment",
      label: "Waveform",
      options: [
        { value: "sine",     label: "Sine" },
        { value: "cos",      label: "Cosine" },
        { value: "triangle", label: "Triangle" },
        { value: "square",   label: "Square" },
        { value: "saw",      label: "Sawtooth" },
        { value: "sum",      label: "Harmonic sum (1..n)" },
        { value: "noise",    label: "Noise" }
      ]
    },

    harmonicAmp: {
      widget: "range",
      label: "Harmonic Amp",
      min: 0,
      max: 1,
      step: 0.01
    },

    samples: {
      widget: "range",
      label: "Samples",
      min: 32,
      max: 2048,
      step: 1
    },

    strokeStyle: {
      widget: "colorPicker",
      label: "Stroke Color"
    },

    lineWidth: {
      widget: "range",
      label: "Line Width",
      min: 0.2,
      max: 6,
      step: 0.1
    }

  },

  elements: {
    element: null
  }

}; // end scriptInfo


// Compatibility aliases (per your Gallery conversion rules)
scriptInfo.parameters = scriptInfo.params;

scriptInfo.redrawHandler = function redrawHandler() {
  update(scriptInfo.params);
  draw();
}; // end redrawHandler

scriptInfo.onParamChange = function onParamChange() {
  // Compatibility no-op
}; // end onParamChange


/* ============================================================
   runPattern()
   ------------------------------------------------------------
   Gallery entry point.
   NO ctx argument. NO ctx variable declared.
============================================================ */
export function runPattern() {

  init();

  buildParameterControls(scriptInfo, "tab-scripts", true);

  scriptInfo.redrawHandler();

} // end runPattern


/* ============================================================
   init()
   ------------------------------------------------------------
   Cold-start only.
============================================================ */
function init() {

  scriptInfo.elements.element = {
    W: 0,
    H: 0,
    cx: 0,
    cy: 0,
    pts: []
  };

} // end init


/* ============================================================
   update(params)
============================================================ */
function update(params) {

  const e = scriptInfo.elements.element;

  e.W = ctx.canvas.width;
  e.H = ctx.canvas.height;

  e.cx = e.W / 2;
  e.cy = e.H / 2;

  e.pts = buildPoints(params);

} // end update


/* ============================================================
   buildPoints(params)
============================================================ */
function buildPoints(params) {

  const pts = [];

  const TAU = Math.PI * 2;

  const R = Number(params.baseRadius);
  const A = Number(params.amplitude);
  const n = Number(params.frequency);
  const ph = toRad(Number(params.phaseDeg));

  const samp = clampInt(params.samples, 32, 1000000);

  const wname = String(params.waveform);
  const harmAmp = Number(params.harmonicAmp);

  const dt = TAU / samp;

  for (let i = 0; i <= samp; i++) {

    const theta = i * dt;

    const x = n * theta + ph;

    let wv;

    if (wname === "sum") {
      wv = harmonicSum(x, Math.max(1, n), harmAmp);
    } else if (wname === "noise") {
      wv = noise1(x) * harmAmp;
    } else {
      wv = waveformValue(wname, x);
    }

    const r = R + A * wv;

    pts.push({
      x: r * Math.cos(theta),
      y: r * Math.sin(theta)
    });

  }

  return pts;

} // end buildPoints


/* ============================================================
   waveformValue(name, x)
   Returns value in [-1, 1]
============================================================ */
function waveformValue(name, x) {

  if (name === "sine") return Math.sin(x);
  if (name === "cos") return Math.cos(x);
  if (name === "triangle") return triWave(x);
  if (name === "square") return squareWave(x);
  if (name === "saw") return sawWave(x);

  return Math.sin(x);

} // end waveformValue


/* ============================================================
   triWave(x)
============================================================ */
function triWave(x) {

  const s = (x / Math.PI) % 2;
  const u = (s + 2) % 2;
  return 1 - 2 * Math.abs(u - 1);

} // end triWave


/* ============================================================
   squareWave(x)
============================================================ */
function squareWave(x) {

  const s = Math.sign(Math.sin(x));
  if (s === 0) return 1;
  return s;

} // end squareWave


/* ============================================================
   sawWave(x)
============================================================ */
function sawWave(x) {

  return 2 * ((x / (2 * Math.PI)) - Math.floor(0.5 + x / (2 * Math.PI)));

} // end sawWave


/* ============================================================
   noise1(x)
   Cheap smooth pseudo-noise: sum of sines
============================================================ */
function noise1(x) {

  return (
    Math.sin(x * 1.0 * 1.0) +
    Math.sin(x * 1.7 * 1.3) * 0.6 +
    Math.sin(x * 2.9 * 0.7) * 0.35
  ) / (1 + 0.6 + 0.35);

} // end noise1


/* ============================================================
   harmonicSum(x, n, ampScale)
============================================================ */
function harmonicSum(x, n, ampScale) {

  let s = 0;

  for (let k = 1; k <= n; k++) {
    s += Math.sin(k * x) * (1 / k);
  }

  const H = Math.log(Math.max(2, n)) + 0.5772156649;

  return (s / H) * ampScale;

} // end harmonicSum


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

  const pts = e.pts;
  if (!pts.length) throw new Error("draw: no points");

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }

  ctx.closePath();

  ctx.strokeStyle = p.strokeStyle;
  ctx.lineWidth = p.lineWidth;
  ctx.lineJoin = "round";

  ctx.stroke();

  ctx.restore();

} // end draw


/* ============================================================
   toRad(deg)
============================================================ */
function toRad(deg) {

  return deg * Math.PI / 180;

} // end toRad


/* ============================================================
   clampInt(v, a, b)
============================================================ */
function clampInt(v, a, b) {

  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return a;

  if (n < a) return a;
  if (n > b) return b;
  return n;

} // end clampInt
