/* ============================================================
   Modulated Circle Explorer + Lobe Curve Stitching
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Extended from standalone modulated circle demo:
     r(θ) = R + A · w(nθ + φ)

   EXTENSIONS ADDED
   ----------------
   - Per-lobe curve stitching on the outer circle.
     Each lobe is a contiguous slice of pts[]. Stitch line i
     connects pts[i] to pts[i + half], producing a parabolic
     curve-stitch effect contained entirely within that lobe.
   - A "skip" control thins the stitch density.
   - An inner modulated circle with n/2 lobes, R/2 base radius,
     its own amplitude control, and its own curve stitching.
     The inner circle is phase-adjusted so its lobe tips align
     with alternate lobe tips of the outer circle.
   - Waveform simplified to Sine / Cosine select only.
   - Lobe count (frequency) constrained to even numbers (4-18)
     so the outer/inner lobe relationship is always clean.

   GOAL
   ----
   - Run under Gallery calling runPattern()
   - Use parameterControls.js
   - Match drawRegistry-style lifecycle and naming

   ALIGNMENT MATH
   --------------
   Outer peak angles: nθ + ph = π/2  →  θ_out = (π/2 - ph) / n
   Inner peak angles: (n/2)θ + ph_in = π/2  →  θ_in = (π/2 - ph_in) / (n/2)

   Setting θ_in = θ_out and solving for ph_in:
     (π/2 - ph_in) / (n/2) = (π/2 - ph) / n
     2(π/2 - ph_in)        = (π/2 - ph)
     π - 2·ph_in           = π/2 - ph
     ph_in                 = (π/2 + ph) / 2
                           = π/4 + ph/2

   This guarantees every inner lobe tip lies on the radial line
   from the origin through a corresponding outer lobe tip.

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - global ctx exists
   - #action exists
============================================================ */

/* ============================================================
   Overview
   --------
   This program draws:

       r(θ) = R + A · w(nθ + φ)

   for an outer circle with n lobes, and an inner circle with
   n/2 lobes at R/2 base radius, phase-aligned so inner tips
   point toward alternate outer tips.

   Controls and what they change
   -----------------------------

   • Base Radius:
     Sets R for the outer circle. Inner R is always R/2.

   • Amplitude:
     Sets A for the outer circle — the lobe depth. When A ≥ R
     the curve can self-intersect.

   • Lobes (n):
     Number of lobes on the outer circle. Always even (4-18)
     so inner has a whole number of lobes (n/2).

   • Phase (deg):
     Angular offset φ; rotates all lobes. Both circles rotate
     together, preserving alignment.

   • Waveform:
     Sine or Cosine. Cosine starts at its peak at θ = 0;
     sine starts at zero crossing.

   • Samples:
     Number of θ samples around the full circle. More = smoother.

   • Stroke Color / Line Width:
     Visual styling applied to both circle outlines.

   Curve Stitch section
   --------------------

   • Show Lobe Stitching:
     Toggles stitch lines on all outer lobes.

   • Stitch Skip:
     1 = every point stitched (dense). N = every Nth point.

   • Stitch Color / Stitch Line Width:
     Visual styling of the outer stitch lines.

   Inner Circle section
   --------------------

   • Show Inner Circle:
     Toggles the inner modulated circle and its stitching.

   • Inner Lobe Height:
     Amplitude of the inner lobes, independent of outer.

   • Inner Stitch Skip:
     Skip control for the inner lobe stitching.

   • Inner Circle Color:
     Color for both the inner outline and its stitch lines.

   Performance tips
   ----------------
   • Increase Samples when amplitude or frequency is high to
     avoid visible straight-segment artifacts.
   • Stitch Skip is the fastest way to reduce line count
     without changing the curve geometry.

   Stepper section
   ---------------
   Purpose: quickly walk through a range of values for one
   parameter to survey how it changes the drawing — not
   animation, but manual variation exploration.

   • Step Parameter:
     Selects which parameter the stepper controls:
     "Amplitude" or "Lobes".

   • Change (checkbox):
     When checked, immediately resets the selected parameter
     to its minimum value and arms the Next button.
     Unchecking does not change the current value.
     Checking again resets to minimum again.

   • Next (button):
     Advances the selected parameter by one step.
     At maximum, wraps back to minimum.
     Does nothing if Change is not checked.
     The corresponding slider updates to match.
============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Modulated Circle (Waveforms)",

  params: {
    baseRadius:      180,
    amplitude:       60,
    frequency:       6,
    phaseDeg:        0,
    waveform:        "sine",
    samples:         720,

    strokeStyle:     "#ff4fa3",
    lineWidth:       1,

    // --- Outer curve stitch ---
    showStitch:      true,
    stitchSkip:      1,
    stitchColor:     "#2277ff",
    stitchWidth:     1,

    // --- Inner circle ---
    showInner:       true,
    innerAmplitude:  30,
    innerStitchSkip: 1,
    innerColor:      "#ff4fa3",

    // --- Stepper ---
    stepTarget:      "amplitude",   // which param to step: "amplitude" | "frequency"
    changeArmed:     false          // when true, Next advances the target param
  },

  controls: {

    baseRadius: {
      widget: "range",
      label:  "Base Radius",
      min:    10,
      max:    600,
      step:   1
    },

    amplitude: {
      widget: "range",
      label:  "Amplitude",
      min:    0,
      max:    400,
      step:   1
    },

    frequency: {
      widget: "range",
      label:  "Lobes (n)",
      min:    4,
      max:    18,
      step:   2
    },

    phaseDeg: {
      widget: "range",
      label:  "Phase (deg)",
      min:    0,
      max:    360,
      step:   1
    },

    waveform: {
      widget:  "selectSegment",
      label:   "Waveform",
      options: [
        { value: "sine", label: "Sine"   },
        { value: "cos",  label: "Cosine" }
      ]
    },

    samples: {
      widget: "range",
      label:  "Samples",
      min:    32,
      max:    2048,
      step:   1
    },

    strokeStyle: {
      widget: "colorPicker",
      label:  "Stroke Color"
    },

    lineWidth: {
      widget: "range",
      label:  "Line Width",
      min:    0.2,
      max:    6,
      step:   0.1
    },

    // --- Outer curve stitch ---
    showStitch: {
      widget: "checkbox",
      label:  "Show Lobe Stitching"
    },

    stitchSkip: {
      widget: "range",
      label:  "Stitch Skip",
      min:    1,
      max:    20,
      step:   1
    },

    stitchColor: {
      widget: "colorPicker",
      label:  "Stitch Color"
    },

    stitchWidth: {
      widget: "range",
      label:  "Stitch Line Width",
      min:    0.2,
      max:    4,
      step:   0.1
    },

    // --- Inner circle ---
    showInner: {
      widget: "checkbox",
      label:  "Show Inner Circle"
    },

    innerAmplitude: {
      widget: "range",
      label:  "Inner Lobe Height",
      min:    0,
      max:    200,
      step:   1
    },

    innerStitchSkip: {
      widget: "range",
      label:  "Inner Stitch Skip",
      min:    1,
      max:    20,
      step:   1
    },

    innerColor: {
      widget: "colorPicker",
      label:  "Inner Circle Color"
    },

    // --- Stepper ---
    // stepTarget: which parameter the stepper advances.
    // changeArmed: when checked, resets target to min and arms Next.
    // nextStep: button that advances target by one step, wrapping at max.
    stepTarget: {
      widget:  "select",
      label:   "Step Parameter",
      options: [
        { value: "amplitude", label: "Amplitude" },
        { value: "frequency", label: "Lobes"     }
      ]
    },

    changeArmed: {
      widget: "checkbox",
      label:  "Change"
    },

    nextStep: {
      widget:   "button",
      label:    "Next",
      fullRow:  false,
      action:   function advanceStep(info) {
        const p      = info.params;
        if (!p.changeArmed) return;

        const target  = p.stepTarget;                  // "amplitude" or "frequency"
        const ctl     = info.controls[target];         // get min/max/step from control def
        const min     = Number(ctl.min);
        const max     = Number(ctl.max);
        const step    = Number(ctl.step);

        const current = Number(p[target]);
        const next    = current + step > max ? min : current + step;

        p[target] = next;

        // Sync the DOM slider so it reflects the new value visually
        const sliderId = "tab-scripts-" + target;
        const slider   = document.getElementById(sliderId);
        if (slider) slider.value = next;

        // Redraw is handled by def.redraw below
      },
      redraw: true
    }

  },

  elements: {
    element: null
  }

}; // end scriptInfo


// Compatibility aliases (per Gallery conversion rules)
scriptInfo.parameters = scriptInfo.params;

// Tracks previous armed state so we can detect the moment
// "Change" is checked — that transition resets the target to min.
let prevArmed = false;

scriptInfo.redrawHandler = function redrawHandler() {
  update(scriptInfo.params);
  draw();
}; // end redrawHandler

scriptInfo.onParamChange = function onParamChange() {
  const p = scriptInfo.params;

  // Detect rising edge: changeArmed just became true
  if (p.changeArmed && !prevArmed) {
    const target  = p.stepTarget;
    const ctl     = scriptInfo.controls[target];
    const min     = Number(ctl.min);

    p[target] = min;

    // Sync the DOM slider
    const sliderId = "tab-scripts-" + target;
    const slider   = document.getElementById(sliderId);
    if (slider) slider.value = min;
  }

  prevArmed = p.changeArmed;
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
    W:          0,
    H:          0,
    cx:         0,
    cy:         0,
    pts:        [],   // outer circle Cartesian points
    radii:      [],   // outer circle radius values (parallel to pts)
    lobes:      [],   // outer lobe descriptors { start, end, count }
    innerPts:   [],   // inner circle Cartesian points
    innerLobes: []    // inner lobe descriptors
  };

} // end init


/* ============================================================
   update(params)
============================================================ */
function update(params) {

  const e  = scriptInfo.elements.element;

  e.W  = ctx.canvas.width;
  e.H  = ctx.canvas.height;
  e.cx = e.W / 2;
  e.cy = e.H / 2;

  const ph = toRad(Number(params.phaseDeg));

  // --- Build outer circle ---
  const outer  = buildModulatedCircle(params, {
    R:  Number(params.baseRadius),
    A:  Number(params.amplitude),
    n:  Number(params.frequency),
    ph: ph
  });
  e.pts   = outer.pts;
  e.radii = outer.radii;
  e.lobes = detectLobes(outer.radii);

  // --- Build inner circle ---
  // Phase correction: ph_inner = π/4 + ph/2
  // Derived so inner lobe tips align with outer lobe tips.
  // See ALIGNMENT MATH in header comment.
  const phInner = Math.PI / 4 + ph / 2;

  const inner  = buildModulatedCircle(params, {
    R:  Number(params.baseRadius) / 2,
    A:  Number(params.innerAmplitude),
    n:  Number(params.frequency) / 2,
    ph: phInner
  });
  e.innerPts   = inner.pts;
  e.innerLobes = detectLobes(inner.radii);

} // end update


/* ============================================================
   buildModulatedCircle(params, overrides)
   ------------------------------------------------------------
   Samples r(θ) = R + A · w(nθ + ph) around [0, 2π].

   'overrides' lets the caller supply different R, A, n, ph
   values — used to build the inner circle without duplicating
   all the sampling logic.

   Returns { pts, radii }:
     pts   — array of { x, y } Cartesian points
     radii — parallel array of radius values at each θ
============================================================ */
function buildModulatedCircle(params, overrides = {}) {

  const pts   = [];
  const radii = [];

  const TAU = Math.PI * 2;
  const R   = overrides.R  !== undefined ? overrides.R  : Number(params.baseRadius);
  const A   = overrides.A  !== undefined ? overrides.A  : Number(params.amplitude);
  const n   = overrides.n  !== undefined ? overrides.n  : Number(params.frequency);
  const ph  = overrides.ph !== undefined ? overrides.ph : toRad(Number(params.phaseDeg));

  const samp = clampInt(params.samples, 32, 1000000);
  const dt   = TAU / samp;

  for (let i = 0; i <= samp; i++) {
    const theta = i * dt;
    const wv    = waveformValue(String(params.waveform), n * theta + ph);
    const r     = R + A * wv;

    radii.push(r);
    pts.push({
      x: r * Math.cos(theta),
      y: r * Math.sin(theta)
    });
  }

  return { pts, radii };

} // end buildModulatedCircle


/* ============================================================
   detectLobes(radii)
   ------------------------------------------------------------
   Finds valley indices (local minima of radius) marking lobe
   boundaries. Returns an array of lobe descriptors:

     { start, end, count }

   where pts[start .. start+count-1] (wrapping) is the full
   lobe boundary.

   Strategy:
   1. Smooth radii with a small window to suppress micro-jitter.
   2. Find local minima of the smoothed signal.
   3. Between each consecutive valley pair, record one lobe.
   4. Reject lobes whose peak-to-valley height is negligible.
============================================================ */
function detectLobes(radii) {

  const len   = radii.length - 1; // last point == first (closed curve)
  const lobes = [];

  if (len < 6) return lobes;

  // --- Smooth radii with a small window to suppress micro-jitter ---
  const winSize = Math.max(1, Math.floor(len / 200));
  const smooth  = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    let sum = 0;
    for (let w = -winSize; w <= winSize; w++) {
      sum += radii[(i + w + len) % len];
    }
    smooth[i] = sum / (2 * winSize + 1);
  }

  // --- Find local minima of smoothed radii ---
  // Suppress duplicates within minGap samples to avoid double-counting
  // flat-bottomed valleys.
  const valleys = [];
  const minGap  = Math.floor(len / 60);

  for (let i = 0; i < len; i++) {
    const prev = smooth[(i - 1 + len) % len];
    const curr = smooth[i];
    const next = smooth[(i + 1) % len];
    if (curr <= prev && curr <= next) {
      if (valleys.length === 0 || i - valleys[valleys.length - 1] >= minGap) {
        valleys.push(i);
      }
    }
  }

  if (valleys.length < 2) return lobes;

  // --- One lobe per consecutive valley pair ---
  for (let v = 0; v < valleys.length; v++) {
    const start = valleys[v];
    const end   = valleys[(v + 1) % valleys.length];

    // Count is wrap-aware
    const count = end > start
      ? end - start + 1
      : (len - start) + end + 1;

    if (count < 4) continue;

    // Verify genuine lobe: peak must be meaningfully above valley floor
    let peakR = -Infinity;
    for (let k = 0; k < count; k++) {
      const idx = (start + k) % len;
      if (smooth[idx] > peakR) peakR = smooth[idx];
    }
    const valleyR = Math.max(smooth[start], smooth[end % len]);
    if (peakR - valleyR < 0.5) continue;

    lobes.push({ start, end, count });
  }

  return lobes;

} // end detectLobes


/* ============================================================
   drawOutline(pts, color, lineWidth)
   ------------------------------------------------------------
   Draws a closed polyline through pts[].
   ctx must already be translated to canvas centre.
============================================================ */
function drawOutline(pts, color, lineWidth) {

  if (!pts.length) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth   = lineWidth;
  ctx.lineJoin    = "round";
  ctx.stroke();
  ctx.restore();

} // end drawOutline


/* ============================================================
   drawStitch(lobes, pts, color, lineWidth, skip)
   ------------------------------------------------------------
   For each lobe, collect its pts[] slice (wrapping if needed),
   then draw stitch lines:

     line i:  lobePts[i]  →  lobePts[i + half]

   where half = floor(count / 2).

   This produces the classic parabolic curve-stitch envelope
   within each lobe. Both endpoints of every line belong to the
   same lobe slice, so no line can escape into another lobe.

   skip > 1 thins the line density: only every skip-th line
   is drawn, while the parabolic shape is preserved.

   ctx must already be translated to canvas centre.
============================================================ */
function drawStitch(lobes, pts, color, lineWidth, skip) {

  if (!lobes.length || !pts.length) return;

  const totalPts = pts.length - 1; // closed: last point == first
  const sk       = Math.max(1, Math.round(Number(skip)));

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth   = Number(lineWidth);
  ctx.lineJoin    = "round";
  ctx.lineCap     = "round";

  for (const lobe of lobes) {
    const { start, count } = lobe;

    // Collect this lobe's points in traversal order (wrap-aware)
    const lobePts = [];
    for (let k = 0; k < count; k++) {
      lobePts.push(pts[(start + k) % totalPts]);
    }

    const half = Math.floor(lobePts.length / 2);
    if (half < 2) continue;

    // Stitch line i: lobePts[i] → lobePts[i + half]
    //   i = 0       : left base to right base (longest, through tip)
    //   i = half-1  : just before tip to just after tip (shortest)
    for (let i = 0; i < half; i += sk) {
      const p1 = lobePts[i];
      const p2 = lobePts[i + half];
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }

  ctx.restore();

} // end drawStitch


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

  if (!e.pts.length) throw new Error("draw: no points");

  // --- Outer circle outline ---
  drawOutline(e.pts, p.strokeStyle, p.lineWidth);

  // --- Outer lobe stitching ---
  if (p.showStitch) {
    drawStitch(e.lobes, e.pts, p.stitchColor, p.stitchWidth, p.stitchSkip);
  }

  // --- Inner circle outline + stitching ---
  if (p.showInner) {
    drawOutline(e.innerPts, p.innerColor, p.lineWidth);
    drawStitch(e.innerLobes, e.innerPts, p.innerColor, p.stitchWidth, p.innerStitchSkip);
  }

  ctx.restore();

} // end draw


/* ============================================================
   waveformValue(name, x)
   ------------------------------------------------------------
   Returns waveform value in [-1, 1].
   Only sine and cosine are exposed in the UI.
   - Sine:   zero at θ=0, peaks at θ=π/2
   - Cosine: peak at θ=0, useful when phaseDeg=0 and you want
             a lobe pointing straight up (θ=0 direction)
============================================================ */
function waveformValue(name, x) {

  if (name === "cos") return Math.cos(x);
  return Math.sin(x); // default: sine

} // end waveformValue


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
