/* ============================================================================
   CONCENTRIC STITCH ENGINE: Multi-Ring + Boundary Types + Mapping Modes
   ============================================================================

   PURPOSE
   -------
   Generalize the "Concentric circles" concept into a single explicit engine.
   This script generates interference patterns and envelopes by connecting
   mathematically mapped points between concentric boundaries.

   ENGINE LOGIC (THE "ATOMIC" STEP)
   -------------------------------
   1) Sample boundary A at parameter t (angle in radians).
   2) Compute mapped parameter u = map(t).
   3) Sample boundary B at u.
   4) Draw segment A(t) -> B(u).

   Straight segments produce emergent curves, envelopes, and moiré patterns.

   CONTROL DICTIONARY
   ------------------
   PLACEMENT & SHIFT:
   - centerX / centerY: The origin (0,0) for all polar math.
   - offsetX / offsetY: A final translation applied to the entire rendering.

   RING GEOMETRY:
   - innerR / outerR: The radius bounds for the concentric system.
   - ringCount: The number of nested boundaries (rings) to generate.

   PAIRING LOGIC:
   - pairingMode:
     * 'single'   : Connects only two specific rings (ringA and ringB).
     * 'adjacent' : Connects neighbors (0-1, 1-2, 2-3).
     * 'all'      : Connects every ring to every other ring (high complexity).
   - ringA / ringB: The specific indices used when in 'single' mode.

   BOUNDARY TYPES:
   - boundaryType:
     * 'circle'    : Standard uniform radius.
     * 'ellipse'   : Uses ellipseRatio to squash/stretch the Y-axis.
     * 'modulated' : Varies the radius using a sine wave (modAmp/Freq/Phase).
     * 'polygon'   : Uses a polar equation to force points onto flat edges (sides 3-8).

   MAPPING MODES:
   - direction: Clockwise (cw) or Counter-clockwise (ccw) point sampling.
   - mappingMode:
     * 'ratio' : Simple linear multiplier (u = N * t).
     * 'phase' : Adds a constant rotation offset (u = N * t + phase).
     * * 'warp'  : Adds a secondary sine-wave distortion for organic fluid effects.

   COLOR MODES & INTERPOLATION (HSL Edition):
   - hStart, sStart, lStart: HSL components for the innermost ring (Index 0).
   - hEnd, sEnd, lEnd: HSL components for the outermost ring.
   - Interpolation: The engine calculates the specific color for each ring
     by blending HSL values based on the ring's index.

   CORE LOGIC HUBS (Study Guide)
   -----------------------------
   1. MECHANICAL MATH (pointOnBoundary): Resolves polar (r, t) to Cartesian (x, y).
   2. THE STITCH EQUATION (mapAngle): Determines the interference by defining
      the relationship between source angle 't' and target angle 'u'.
   3. TOPOLOGY LOGIC (drawSingle/Adjacent/All): Orchestrates the layering
      of the atomic "Stitch Pair" into a complex network.
   ============================================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

export const scriptInfo = {
  title: "Concentric Stitch Engine — HSL Chromatic Version",

  params: {
    /* Group 1: Global */
    groupGlobal: "UNIVERSAL SETTINGS", // Static Header
    centerX: 350,
    centerY: 380,
    innerR: 120,
    outerR: 280,
    ringCount: 4,
    pairingMode: "adjacent",
    ringA: 0,
    ringB: 2,
    steps: 220,

    /* Inner Color Anchor */
    hStart: 10,
    sStart: 80,
    lStart: 50,

    /* Outer Color Anchor */
    hEnd: 210,
    sEnd: 60,
    lEnd: 30,

    boundaryType: "circle",

    /* Group 2: Polygon */
    groupPolygon: "POLYGON MODULE", // Static Header
    sides: 4,

    /* Group 3: Ellipse */
    groupEllipse: "ELLIPSE MODULE", // Static Header
    ellipseRatio: 0.70,

    /* Group 4: Modulated */
    groupModulated: "MODULATED MODULE", // Static Header
    modAmp: 0.25,
    modFreq: 6,
    modPhase: 0.0,

    /* Group 5: Mapping & Warp */
    groupMapping: "RELATIONSHIP & WARP", // Static Header
    mappingMode: "ratio",
    ratio: 3.0,
    phase: 0.0,
    warpAmp: 0.0,
    warpFreq: 3.0,

    /* Hidden/Static Boilerplate */
    direction: "cw",
    tStart: 0.0,
    tEnd: (Math.PI * 2),
    lineWidth: 1,
    offsetX: 0,
    offsetY: 0,
    showRings: true,
    ringWidth: 1,
    ringColor: "#888888"
  },

  parameters: null,

  controls: {
    /* --- GROUP 1: GLOBAL --- */
    groupGlobal: { widget: "staticText", text: "--- Used By All ---" },
    centerX: { label: "Center X", widget: "range", min: 0, max: 700, step: 10 },
    centerY: { label: "Center Y", widget: "range", min: 0, max: 700, step: 10 },
    innerR:  { label: "Inner R",  widget: "range", min: 5, max: 300, step: 10 },
    outerR:  { label: "Outer R",  widget: "range", min: 10, max: 500, step: 10 },
    ringCount:{ label: "Ring count", widget: "range", min: 2, max: 12, step: 1 },
    pairingMode: { label: "Pairing mode", widget: "select", options: ["single", "adjacent", "all"] },
    steps:    { label: "Steps (Density)", widget: "range", min: 20, max: 400, step: 1 },

    /* HSL Sliders */
    hStart: { label: "Inner Hue", widget: "range", min: 0, max: 360 },
    sStart: { label: "Inner Sat", widget: "range", min: 0, max: 100 },
    lStart: { label: "Inner Light", widget: "range", min: 0, max: 100 },
    hEnd:   { label: "Outer Hue", widget: "range", min: 0, max: 360 },
    sEnd:   { label: "Outer Sat", widget: "range", min: 0, max: 100 },
    lEnd:   { label: "Outer Light", widget: "range", min: 0, max: 100 },

    boundaryType: { label: "SHAPE TYPE", widget: "select", options: ["circle", "ellipse", "modulated", "polygon"] },

    /* --- GROUP 2: POLYGON --- */
    groupPolygon: { widget: "staticText", text: "--- Polygon ---" },
    sides: { label: "Polygon Sides", widget: "range", min: 3, max: 8, step: 1 },

    /* --- GROUP 3: ELLIPSE --- */
    groupEllipse: { widget: "staticText", text: "--- Ellipse ---" },
    ellipseRatio: { label: "Ellipse ratio", widget: "range", min: 0.1, max: 1.0, step: 0.01 },

    /* --- GROUP 4: MODULATED --- */
    groupModulated: { widget: "staticText", text: "--- Modulated ---" },
    modAmp:   { label: "Mod amp", widget: "range", min: 0.0, max: 0.9, step: 0.01 },
    modFreq:  { label: "Mod freq", widget: "range", min: 1, max: 24, step: 1 },
    modPhase: { label: "Mod phase", widget: "range", min: -6.28, max: 6.28, step: 0.01 },

    /* --- GROUP 5: MAPPING & WARP --- */
    groupMapping:  { widget: "staticText", text: "--- Mapping & Warp  ---" },
    mappingMode: { label: "Mapping Mode", widget: "select", options: ["ratio", "phase", "warp"] },
    ratio: { label: "Ratio (N)", widget: "range", min: -12.0, max: 12.0, step: 0.01 },
    phase: { label: "Phase", widget: "range", min: -6.28, max: 6.28, step: 0.01 },
    warpAmp:  { label: "Warp amp", widget: "range", min: 0.0, max: 6.28, step: 0.01 },
    warpFreq: { label: "Warp freq", widget: "range", min: 0.0, max: 24.0, step: 0.01 }
  },

  onParamChange() {},
  redrawHandler: null
};

/* ============================================================
   Functions
============================================================ */

/**
 * Utility: Linear interpolation between two HSL states.
 * @param {Object} p - The current script parameters.
 * @param {number} factor - 0.0 to 1.0 blend.
 * @returns {string} hsl css string.
 */
function getRingColor(p, factor) {
  const h = p.hStart + factor * (p.hEnd - p.hStart);
  const s = p.sStart + factor * (p.sEnd - p.sStart);
  const l = p.lStart + factor * (p.lEnd - p.lStart);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Resets context transformation and clears the visible canvas.
 */
function clearCanvas() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/**
 * Translates the entire rendering based on offsetX/offsetY.
 * @param {Object} p - The current script parameters.
 */
function applyGlobalOffset(p) {
  ctx.translate(p.offsetX, p.offsetY);
}

/**
 * Utility to ensure indices stay within valid array bounds.
 */
function clampInt(v, lo, hi) {
  const n = Math.floor(v);
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

/**
 * Calculates radii for ringCount boundaries between innerR and outerR.
 */
function computeRings(p) {
  const rings = [];
  const n = p.ringCount;
  const span = p.outerR - p.innerR;
  for (let i = 0; i < n; i++) {
    rings.push(p.innerR + (span * i) / (n - 1));
  }
  return rings;
}

/**
 * The Stitch Equation: determines target angle 'u' from source angle 't'.
 */
function mapAngle(t, p) {
  const sign = (p.direction === "cw") ? 1 : -1;
  const base = (sign * p.ratio * t);
  if (p.mappingMode === "ratio") return base;
  if (p.mappingMode === "phase") return base + p.phase;
  return base + p.phase + (p.warpAmp * Math.sin(p.warpFreq * t));
}

/**
 * Resolves a polar coordinate to Cartesian {x, y} based on boundary type.
 */

function pointOnBoundary(p, radius, angle) {
  const cx = p.centerX;
  const cy = p.centerY;

  if (p.boundaryType === "circle") {
    return { x: cx + radius * Math.sin(angle), y: cy - radius * Math.cos(angle) };
  }
  if (p.boundaryType === "ellipse") {
    return { x: cx + radius * Math.sin(angle), y: cy - radius * p.ellipseRatio * Math.cos(angle) };
  }
  if (p.boundaryType === "modulated") {
    const r = radius * (1 + (p.modAmp * Math.sin((p.modFreq * angle) + p.modPhase)));
    return { x: cx + r * Math.sin(angle), y: cy - r * Math.cos(angle) };
  }
  if (p.boundaryType === "polygon") {
    const n = p.sides;
    const segment = (2 * Math.PI) / n;
    const halfSeg = Math.PI / n;
    const r = (radius * Math.cos(halfSeg)) / Math.cos(((angle % segment + segment) % segment) - halfSeg);
    return { x: cx + r * Math.sin(angle), y: cy - r * Math.cos(angle) };
  }
}

/**
 * Draws the boundary ring path.
 */
function drawRing(p, radius) {
  if (!p.showRings) return;
  ctx.save();
  ctx.lineWidth = p.ringWidth;
  ctx.strokeStyle = p.ringColor;
  ctx.beginPath();
  for (let i = 0; i <= 360; i++) {
    const pt = pointOnBoundary(p, radius, i * (Math.PI / 180));
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * The core stitch drawer: connects points on two radii.
 */

function drawStitchPair(p, rA, rB, stroke) {
  ctx.save();
  ctx.lineWidth = p.lineWidth;
  ctx.strokeStyle = stroke;
  const dt = (p.tEnd - p.tStart) / (p.steps - 1);
  for (let i = 0; i < p.steps; i++) {
    const t = p.tStart + (i * dt);
    const u = mapAngle(t, p);
    const a = pointOnBoundary(p, rA, t);
    const b = pointOnBoundary(p, rB, u);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Topology: Every ring connects to every other ring.
 */
function drawAllPairs(p, rings) {
  for (let i = 0; i < rings.length; i++) {
    for (let j = i + 1; j < rings.length; j++) {
      const factor = i / (rings.length - 1);
      const color = getRingColor(p, factor);
      drawStitchPair(p, rings[i], rings[j], color);
    }
  }
}

/**
 * Topology: Rings connect only to their direct neighbor.
 */
function drawAdjacentPairs(p, rings) {
  for (let i = 0; i < rings.length - 1; i++) {
    const factor = i / (rings.length - 1);
    const color = getRingColor(p, factor);
    drawStitchPair(p, rings[i], rings[i + 1], color);
  }
}

/**
 * Topology: Explicit connection between Ring A and Ring B indices.
 */
function drawSinglePair(p, rings) {
  const maxIdx = rings.length - 1;
  const a = clampInt(p.ringA, 0, maxIdx);
  const b = clampInt(p.ringB, 0, maxIdx);
  if (a === b) return;
  const factor = Math.min(a, b) / maxIdx;
  const color = getRingColor(p, factor);
  drawStitchPair(p, rings[Math.min(a, b)], rings[Math.max(a, b)], color);
}

/**
 * Master render call.
 */
function draw(p) {
  clearCanvas();
  ctx.save();
  applyGlobalOffset(p);
  const rings = computeRings(p);
  for (let r of rings) drawRing(p, r);

  if (p.pairingMode === "single") drawSinglePair(p, rings);
  else if (p.pairingMode === "adjacent") drawAdjacentPairs(p, rings);
  else drawAllPairs(p, rings);
  ctx.restore();
}

/**
 * Entry point for the Gallery system.
 */
export function runPattern() {
  scriptInfo.parameters = scriptInfo.params;
  buildParameterControls(scriptInfo, "tab-scripts", true);
  scriptInfo.redrawHandler = () => {
    draw(scriptInfo.params);
  };
  scriptInfo.redrawHandler();
}
