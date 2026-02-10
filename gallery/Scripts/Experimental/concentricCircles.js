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

   ============================================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";

export const scriptInfo = {
  title: "Concentric Stitch Engine — Chromatic Version",

  params: {
    /* Global */
    centerX: 350,
    centerY: 380,
    innerR: 120,
    outerR: 280,
    ringCount: 4,
    pairingMode: "adjacent",
    ringA: 0,
    ringB: 2,
    steps: 220,

    /* Colors */
    innerColor: "hsl(10, 80%, 50%)",
    outerColor: "hsl(210, 60%, 30%)",

    /* Mapping & Warp */
    mappingMode: "ratio",
    ratio: 3.0,
    phase: 0.0,
    warpAmp: 0.0,
    warpFreq: 3.0,

    /* Shape selector */
    boundaryType: "circle",

    /* Polygon */
    sides: 4,

    /* Ellipse */
    ellipseRatio: 0.70,

    /* Modulated */
    modAmp: 0.25,
    modFreq: 6,
    modPhase: 0.0,

    /* Hidden/Static Boilerplate */
    direction: "cw",
    tStart: 0.0,
    tEnd: 1.0,
    lineWidth: 1,
    offsetX: 0,
    offsetY: 0,
    showRings: true,
    ringWidth: 1,
    ringColor: "#888888"
  },

  parameters: null,

  controls: {
    /* --- GLOBAL --- */
    groupGlobal: { widget: "staticText", text: "--- UNIVERSAL SETTINGS ---" },
    centerX: { label: "Center X", widget: "range", min: 0, max: 700, step: 10 },
    centerY: { label: "Center Y", widget: "range", min: 0, max: 700, step: 10 },
    innerR:  { label: "Inner R",  widget: "range", min: 5, max: 300, step: 10 },
    outerR:  { label: "Outer R",  widget: "range", min: 10, max: 500, step: 10 },
    ringCount:{ label: "Ring count", widget: "range", min: 2, max: 12, step: 1 },
    pairingMode: { label: "Pairing mode", widget: "select", options: ["single", "adjacent", "all"] },
    steps:    { label: "Steps (Density)", widget: "range", min: 20, max: 400, step: 1 },

    /* Colors */
    innerColor: { label: "Inner Color", widget: "color" },
    outerColor: { label: "Outer Color", widget: "color" },

    /* --- MAPPING & WARP (Accordion) --- */
    mappingAccordion: {
      widget: "accordion",
      sections: [
        {
          title: "Mapping & Warp",
          controls: {
            mappingMode: { label: "Mapping Mode", widget: "select", options: ["ratio", "phase", "warp"] },
            ratio: { label: "Ratio (N)", widget: "range", min: -12.0, max: 12.0, step: 0.01 },
            phase: { label: "Phase", widget: "range", min: -1.0, max: 1.0, step: 0.01 },
            warpAmp:  { label: "Warp amp", widget: "range", min: 0.0, max: 0.5, step: 0.01 },
            warpFreq: { label: "Warp freq", widget: "range", min: 0.0, max: 24.0, step: 0.01 }
          }
        }
      ]
    },

    /* --- SHAPE TYPE SELECTOR (with grouping trigger) --- */
    boundaryType: {
      label: "SHAPE TYPE",
      widget: "select",
      options: ["circle", "ellipse", "modulated", "polygon"],
      showsGroup: true
    },

    /* --- POLYGON --- */
    sides: {
      label: "Polygon Sides",
      widget: "range",
      min: 3, max: 8, step: 1,
      belongsToGroup: "polygon"
    },

    /* --- ELLIPSE --- */
    ellipseRatio: {
      label: "Ellipse ratio",
      widget: "range",
      min: 0.1, max: 1.0, step: 0.01,
      belongsToGroup: "ellipse"
    },

    /* --- MODULATED --- */
    modAmp: {
      label: "Mod amp",
      widget: "range",
      min: 0.0, max: 0.9, step: 0.01,
      belongsToGroup: "modulated"
    },
    modFreq: {
      label: "Mod freq",
      widget: "range",
      min: 1, max: 24, step: 1,
      belongsToGroup: "modulated"
    },
    modPhase: {
      label: "Mod phase",
      widget: "range",
      min: -6.28, max: 6.28, step: 0.01,
      belongsToGroup: "modulated"
    }
  },

  onParamChange() {},
  redrawHandler: null
};

/* ============================================================
   Functions
============================================================ */

/**
 * Parse HSL string and return components
 */
function parseHSL(hslString) {
  const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (match) {
    return {
      h: parseInt(match[1]),
      s: parseInt(match[2]),
      l: parseInt(match[3])
    };
  }
  // Default fallback
  return { h: 0, s: 0, l: 0 };
}

/**
 * Utility: Linear interpolation between two HSL colors.
 */
function getRingColor(p, factor) {
  const inner = parseHSL(p.innerColor);
  const outer = parseHSL(p.outerColor);

  const h = inner.h + factor * (outer.h - inner.h);
  const s = inner.s + factor * (outer.s - inner.s);
  const l = inner.l + factor * (outer.l - inner.l);

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
 * The Stitch Equation: determines target index 'u' from source index 't'.
 */
function mapAngle(t, p) {
  const sign = (p.direction === "cw") ? 1 : -1;
  const base = (sign * p.ratio * t);
  if (p.mappingMode === "ratio") return base;
  if (p.mappingMode === "phase") return base + p.phase;
  return base + p.phase + (p.warpAmp * Math.sin(p.warpFreq * t * Math.PI * 2));
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
 * Perimeter re-parameterization to ensure uniform point distribution.
 */
function getArcLengthPoints(p, radius, count) {
  const resolution = 1000;
  let rawPoints = [];
  let distances = [0];
  let totalLength = 0;

  for (let i = 0; i <= resolution; i++) {
    const t = (i / resolution) * Math.PI * 2;
    const pt = pointOnBoundary(p, radius, t);
    rawPoints.push(pt);
    if (i > 0) {
      const d = Math.hypot(pt.x - rawPoints[i - 1].x, pt.y - rawPoints[i - 1].y);
      totalLength += d;
      distances.push(totalLength);
    }
  }

  let uniformPoints = [];
  for (let i = 0; i < count; i++) {
    const target = (i / count) * totalLength;
    let idx = distances.findIndex(d => d >= target);
    if (idx <= 0) {
      uniformPoints.push(rawPoints[0]);
    } else {
      const ratio = (target - distances[idx - 1]) / (distances[idx] - distances[idx - 1]);
      uniformPoints.push({
        x: rawPoints[idx - 1].x + ratio * (rawPoints[idx].x - rawPoints[idx - 1].x),
        y: rawPoints[idx - 1].y + ratio * (rawPoints[idx].y - rawPoints[idx - 1].y)
      });
    }
  }
  return uniformPoints;
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
 * The core stitch drawer: connects points on two radii using perimeter indices.
 */
function drawStitchPair(p, ptsA, ptsB, stroke) {
  ctx.save();
  ctx.lineWidth = p.lineWidth;
  ctx.strokeStyle = stroke;
  const len = ptsA.length;

  for (let i = 0; i < len; i++) {
    const t = i / len;
    const uRaw = mapAngle(t, p);
    const uIdx = Math.floor(((uRaw % 1 + 1) % 1) * len);

    const a = ptsA[i];
    const b = ptsB[uIdx];

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
function drawAllPairs(p, ringSets) {
  const n = ringSets.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const color = getRingColor(p, i / (n - 1));
      drawStitchPair(p, ringSets[i], ringSets[j], color);
    }
  }
}

/**
 * Topology: Rings connect only to their direct neighbor.
 */
function drawAdjacentPairs(p, ringSets) {
  const n = ringSets.length;
  for (let i = 0; i < n - 1; i++) {
    const color = getRingColor(p, i / (n - 1));
    drawStitchPair(p, ringSets[i], ringSets[i + 1], color);
  }
}

/**
 * Topology: Explicit connection between Ring A and Ring B indices.
 */
function drawSinglePair(p, ringSets) {
  const n = ringSets.length;
  const a = clampInt(p.ringA, 0, n - 1);
  const b = clampInt(p.ringB, 0, n - 1);
  if (a === b) return;
  const color = getRingColor(p, Math.min(a, b) / (n - 1));
  drawStitchPair(p, ringSets[a], ringSets[b], color);
}

/**
 * Master render call.
 */
function draw(p) {
  clearCanvas();
  ctx.save();
  applyGlobalOffset(p);
  const rings = computeRings(p);

  const ringSets = rings.map(r => getArcLengthPoints(p, r, p.steps));

  for (let r of rings) drawRing(p, r);

  if (p.pairingMode === "single") drawSinglePair(p, ringSets);
  else if (p.pairingMode === "adjacent") drawAdjacentPairs(p, ringSets);
  else drawAllPairs(p, ringSets);

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
