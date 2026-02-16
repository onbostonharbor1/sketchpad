/* ============================================================
   Lissajous Curve Stitch
   Gallery Script (ParameterControls-integrated)

   SOURCE
   ------
   Adapted from parametricCurvesIntersections.js.
   Rose curve and its controls removed.
   Adds curve-stitch parabolas drawn inside interior cells
   of the Lissajous figure.

   HOW THE CELLS ARE FOUND
   -----------------------
   1. The Lissajous curve is sampled into points[].
   2. Self-intersections are found via spatial hashing
      (near-duplicate detection on the sample array).
   3. Intersection points are sorted into a 2D grid by
      canvas x then y — giving a cols × rows layout.
   4. Each 2×2 block of grid neighbours is one candidate cell.
   5. For each candidate cell, the four arc segments that
      bound it are extracted from points[] by finding the
      parameter interval between adjacent intersections.
   6. A checkerboard (every other cell) is selected.
   7. For each selected cell, opposite arc pairs become the
      two arms; stitcher() builds the parabola; drawParabs()
      renders it.

   INTERIOR CELLS ONLY (first version)
   ------------------------------------
   Boundary cells (touching the outer curve arc, with fewer
   than four intersection corners) are skipped entirely.

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - window.ctx exists
   - #action exists
   - stitcher, drawParabs exported from drawUtilities.js
============================================================ */

import { buildParameterControls }   from "/ui/parameterControls.js";
import { stitcher, drawParabs }      from "/draw/drawUtilities.js";


/* ============================================================
   scriptInfo
============================================================ */
export const scriptInfo = {

  title: "Lissajous Curve Stitch",

  params: {
    /* Sampling */
    steps:         1000,
    thetaMaxTurns: 1,

    /* Lissajous geometry */
    lissA:         180,
    lissB:         180,
    lissAFreq:     3,
    lissBFreq:     2,
    lissDelta:     Math.PI / 2,

    /* Curve appearance */
    strokeWidth:   1,
    strokeColor:   "#333333",

    /* Intersection detection */
    tol:           4.0,

    /* Curve stitch */
    stitchColor:   "#0044ff",
    stitchWidth:   0.5,
    numSteps:      20,        // points per arm (stitch density)
    showCurve:     true,
    showStitch:    true,
    checkerOffset: 0          // 0 or 1 — which checkerboard phase
  },

  parameters: null, // compatibility shim

  controls: {

    /* Lissajous geometry */
    lissA: {
      label:  "X amplitude (A)",
      widget: "range",
      min:    10, max: 300, step: 1
    },
    lissB: {
      label:  "Y amplitude (B)",
      widget: "range",
      min:    10, max: 300, step: 1
    },
    lissAFreq: {
      label:  "X frequency (a)",
      widget: "range",
      min:    1, max: 12, step: 1
    },
    lissBFreq: {
      label:  "Y frequency (b)",
      widget: "range",
      min:    1, max: 12, step: 1
    },
    lissDelta: {
      label:  "Phase delta",
      widget: "range",
      min:    0, max: 6.2832, step: 0.01
    },

    /* Sampling */
    steps: {
      label:  "Steps",
      widget: "range",
      min:    200, max: 2000, step: 50
    },
    thetaMaxTurns: {
      label:  "Theta turns",
      widget: "range",
      min:    1, max: 10, step: 1
    },

    /* Curve appearance */
    strokeWidth: {
      label:  "Curve width",
      widget: "range",
      min:    0.5, max: 4, step: 0.5
    },
    strokeColor: {
      label:  "Curve color",
      widget: "colorPicker"
    },

    /* Intersection tolerance */
    tol: {
      label:  "Intersection tol (px)",
      widget: "range",
      min:    .1, max: 5, step: .25
    },

    /* Curve stitch */
    stitchColor: {
      label:  "Stitch color",
      widget: "colorPicker"
    },
    stitchWidth: {
      label:  "Stitch width",
      widget: "range",
      min:    0.2, max: 3, step: 0.1
    },
    numSteps: {
      label:  "Stitch density",
      widget: "range",
      min:    5, max: 60, step: 1
    },
    showCurve: {
      label:  "Show curve",
      widget: "checkbox"
    },
    showStitch: {
      label:  "Show stitching",
      widget: "checkbox"
    },
    checkerOffset: {
      label:  "Checker phase",
      widget: "range",
      min:    0, max: 1, step: 1
    }

  },

  elements: null,

  onParamChange() {},

  redrawHandler: null

}; // end scriptInfo


/* ============================================================
   lissajousPointAt(theta, p)  →  { x, y }
   x = A sin(aθ + δ),  y = B sin(bθ)
============================================================ */
function lissajousPointAt(theta, p) {
  return {
    x:  p.lissA * Math.sin(p.lissAFreq * theta + p.lissDelta),
    y:  p.lissB * Math.sin(p.lissBFreq * theta)
  };
} // end lissajousPointAt


/* ============================================================
   generatePoints(p)  →  points[]
   Each point: { x, y, theta }
============================================================ */
function generatePoints(p) {

  const points   = [];
  const thetaMax = p.thetaMaxTurns * Math.PI * 2;

  for (let i = 0; i < p.steps; i++) {
    const theta = (thetaMax * i) / p.steps;
    const pt    = lissajousPointAt(theta, p);
    points.push({ x: pt.x, y: pt.y, theta });
  }

  return points;

} // end generatePoints


/* ============================================================
   findIntersections(points, p)  →  hits[]
   Spatial-hash near-duplicate detection.
   Each hit: { x, y }

   NOTE ON MERGE RADIUS
   --------------------
   The detection tolerance (tol) is the distance at which two
   sample points are considered "the same location". But the
   curve passes through an intersection region over several
   consecutive samples, so multiple detections cluster around
   each true crossing. We use a larger merge radius (tol * 5)
   so that all detections near the same crossing collapse into
   one hit. A final consolidation pass merges any hits that
   are still too close after the main loop.
============================================================ */
function findIntersections(points, p) {

  const tol       = p.tol;
  const tol2      = tol * tol;
  const mergeDist = tol * 5;          // larger merge radius
  const merge2    = mergeDist * mergeDist;
  const cellSize  = mergeDist;        // bucket size matches merge radius

  if (tol <= 0) return [];

  const buckets    = new Map();
  const hits       = [];
  const hitBuckets = new Map();

  const adjacencyWindow = Math.max(6, Math.floor(p.steps / 300));

  function key(cx, cy) { return cx + "," + cy; }

  function cellOf(pt, size) {
    return {
      cx: Math.floor(pt.x / size),
      cy: Math.floor(pt.y / size)
    };
  }

  function neighborhood(map, cx, cy) {
    const out = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const arr = map.get(key(cx + dx, cy + dy));
        if (arr) for (const v of arr) out.push(v);
      }
    }
    return out;
  }

  function bucketAdd(map, cx, cy, val) {
    const k = key(cx, cy);
    const a = map.get(k);
    if (a) a.push(val); else map.set(k, [val]);
  }

  function dist2(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  // Accept a new detection — merge into nearest existing hit
  // within mergeDist, otherwise create a new hit.
  // The hit position is a running average of all merged detections.
  function acceptHit(pt) {
    const c    = cellOf(pt, cellSize);
    const near = neighborhood(hitBuckets, c.cx, c.cy);

    for (const hi of near) {
      if (dist2(hits[hi], pt) <= merge2) {
        // Running average keeps the hit centred on the cluster
        hits[hi].count++;
        hits[hi].x += (pt.x - hits[hi].x) / hits[hi].count;
        hits[hi].y += (pt.y - hits[hi].y) / hits[hi].count;
        return;
      }
    }

    // New hit
    const c2 = cellOf(pt, cellSize);
    bucketAdd(hitBuckets, c2.cx, c2.cy, hits.length);
    hits.push({ x: pt.x, y: pt.y, count: 1 });
  }

  // Detection loop — same spatial hash, tol radius for detection
  const detBuckets = new Map();
  for (let i = 0; i < points.length; i++) {
    const pi    = points[i];
    const c     = cellOf(pi, tol);
    const cands = neighborhood(detBuckets, c.cx, c.cy);

    for (const j of cands) {
      if (Math.abs(i - j) < adjacencyWindow) continue;
      if (dist2(pi, points[j]) <= tol2) {
        acceptHit({
          x: (pi.x + points[j].x) / 2,
          y: (pi.y + points[j].y) / 2
        });
      }
    }

    const cb = cellOf(pi, tol);
    bucketAdd(detBuckets, cb.cx, cb.cy, i);
  }

  // Final consolidation pass: merge any hits still closer than
  // mergeDist to each other (can happen when early hits were placed
  // before enough detections arrived to merge them)
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < hits.length; i++) {
      for (let j = i + 1; j < hits.length; j++) {
        if (dist2(hits[i], hits[j]) <= merge2) {
          // Merge j into i (weighted average)
          const ci = hits[i].count, cj = hits[j].count;
          hits[i].x = (hits[i].x * ci + hits[j].x * cj) / (ci + cj);
          hits[i].y = (hits[i].y * ci + hits[j].y * cj) / (ci + cj);
          hits[i].count = ci + cj;
          hits.splice(j, 1);
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }

  return hits;

} // end findIntersections


/* ============================================================
   markHitZones(points, hits, tol)
   ------------------------------------------------------------
   After intersection detection, do a second pass to mark
   every sample index that falls within tol of any hit.
   This ensures sampleHit[] is dense around each intersection,
   not just at the exact detecting sample.
============================================================ */
function markHitZones(points, hits, tol) {

  const tol2     = tol * tol;
  const n        = points.length;
  const cellSize = tol;

  // Build spatial index of hits for fast lookup
  const hitBuckets = new Map();

  function key(cx, cy) { return cx + "," + cy; }
  function cellOf(pt) {
    return {
      cx: Math.floor(pt.x / cellSize),
      cy: Math.floor(pt.y / cellSize)
    };
  }
  function neighborhood(cx, cy) {
    const out = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const arr = hitBuckets.get(key(cx + dx, cy + dy));
        if (arr) for (const v of arr) out.push(v);
      }
    return out;
  }

  for (let hi = 0; hi < hits.length; hi++) {
    const c = cellOf(hits[hi]);
    const k = key(c.cx, c.cy);
    const a = hitBuckets.get(k);
    if (a) a.push(hi); else hitBuckets.set(k, [hi]);
  }

  // Mark each sample with the nearest hit index within tol
  const sampleHit = new Int32Array(n).fill(-1);

  for (let i = 0; i < n; i++) {
    const c    = cellOf(points[i]);
    const near = neighborhood(c.cx, c.cy);
    for (const hi of near) {
      const dx = points[i].x - hits[hi].x;
      const dy = points[i].y - hits[hi].y;
      if (dx * dx + dy * dy <= tol2) {
        sampleHit[i] = hi;
        break;
      }
    }
  }

  return sampleHit;

} // end markHitZones


/* ============================================================
   buildCellArcs(points, hits, p)
   ------------------------------------------------------------
   For each hit, we have a list of sample indices where the
   curve passes near that intersection.

   Strategy:
   - For each hit, sort its sample indices.
   - Between consecutive passages through a hit, the curve
     travels to some other hit.
   - We build a graph: edge (hitA, hitB) → arc (sample slice).
   - An arc is the slice points[k0..k1] between two passages.

   Returns { grid, arcs }:
     grid  — hits sorted into 2D grid: grid[col][row] = hitIndex
     arcs  — Map keyed "hi,hj" → { pts: [{x,y},...] }
             where hi < hj by grid position
============================================================ */
function buildCellData(points, hits, p) {

  const n = points.length;

  // --- Step 1: Mark each sample with its hit index (-1 = travelling) ---
  const sampleHit = markHitZones(points, hits, p.tol);

  // --- Step 2: Two-state walk to extract arc segments ---
  //
  // States:  INZONE (near a hit)  |  TRAVELLING (between hits)
  //
  // INZONE → TRAVELLING : sampleHit[k] flips from ≥0 to -1
  //   Action: record lastHit, start collecting arc pts,
  //           seed arc with the hit's canvas position as first point.
  //
  // TRAVELLING → INZONE : sampleHit[k] flips from -1 to ≥0
  //   Action: close arc with the hit's canvas position,
  //           push arc { from, to, pts }.
  //
  // Same→Same: skip (INZONE) or append (TRAVELLING).

  const arcs = [];

  let state    = sampleHit[0] >= 0 ? "INZONE" : "TRAVELLING";
  let lastHit  = sampleHit[0];   // valid only in INZONE
  let arcPts   = [];
  let arcFrom  = -1;

  // If we start mid-travel (no leading hit) we can't know arcFrom —
  // those partial arcs are discarded (they wrap around the seam).

  for (let k = 0; k < n; k++) {
    const h = sampleHit[k];

    if (state === "INZONE") {
      if (h >= 0) lastHit = h;  // track which hit we're currently in

      if (h < 0) {
        // Transition INZONE → TRAVELLING
        arcFrom = lastHit;
        // Seed the arc with the intersection's own position so the
        // arm starts exactly at the corner
        arcPts  = [{ x: hits[arcFrom].x, y: hits[arcFrom].y }];
        state   = "TRAVELLING";
      }

    } else {
      // TRAVELLING
      if (h >= 0) {
        // Transition TRAVELLING → INZONE
        // Close arc with the intersection's own position
        arcPts.push({ x: hits[h].x, y: hits[h].y });

        if (arcFrom >= 0 && arcPts.length >= 2) {
          arcs.push({ from: arcFrom, to: h, pts: arcPts });
        }

        arcPts  = [];
        arcFrom = -1;
        lastHit = h;
        state   = "INZONE";
      } else {
        // Still travelling — collect point
        arcPts.push({ x: points[k].x, y: points[k].y });
      }
    }
  }

  // --- Step 3: Sort hits into a 2D grid by canvas x then y ---
  // Canvas coords: cx + x, cy - y  (y flips)
  const W  = ctx.canvas.width;
  const H  = ctx.canvas.height;
  const cx = W / 2;
  const cy = H / 2;

  // Convert hits to canvas coords for sorting
  const hitCanvas = hits.map(h => ({
    x: cx + h.x,
    y: cy - h.y
  }));

  // Find unique x columns (cluster within tol)
  const cols = clusterValues(hitCanvas.map(h => h.x), p.tol * 3);
  const rows = clusterValues(hitCanvas.map(h => h.y), p.tol * 3);

  // Assign each hit to a grid cell
  const hitGrid = new Array(hits.length).fill(null);
  for (let hi = 0; hi < hits.length; hi++) {
    const col = findBucket(hitCanvas[hi].x, cols);
    const row = findBucket(hitCanvas[hi].y, rows);
    hitGrid[hi] = { col, row };
  }

  // Build 2D lookup: grid[col][row] = hitIndex
  const grid = {};
  for (let hi = 0; hi < hits.length; hi++) {
    const { col, row } = hitGrid[hi];
    if (!grid[col]) grid[col] = {};
    grid[col][row] = hi;
  }

  // --- Step 4: Build arc lookup: arcMap["hi,hj"] = pts[] ---
  // Key is sorted so "3,7" and "7,3" both find the same arc
  const arcMap = new Map();
  for (const arc of arcs) {
    const k = arcKey(arc.from, arc.to);
    if (!arcMap.has(k)) {
      arcMap.set(k, arc.pts);
    }
  }

  console.log(`[LCS] raw arcs extracted: ${arcs.length}, unique arcMap entries: ${arcMap.size}`);
  if (arcs.length > 0) {
    console.log(`[LCS] sample arcs:`, arcs.slice(0, 5).map(a => `${a.from}→${a.to}(${a.pts.length}pts)`).join(' '));
  } else {
    // Diagnose: show sampleHit coverage
    const zones = Array.from(sampleHit).filter(h => h >= 0).length;
    console.log(`[LCS] sampleHit: ${zones}/${points.length} samples in hit zones`);
  }

  return { grid, cols, rows, arcMap, hitGrid };

} // end buildCellData


/* ============================================================
   Helpers for grid building
============================================================ */

// Cluster a list of values into buckets separated by > gap
// Returns sorted array of bucket centre values
function clusterValues(values, gap) {
  const sorted = [...values].sort((a, b) => a - b);
  const clusters = [];
  let current = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] < gap) {
      current.push(sorted[i]);
    } else {
      clusters.push(current.reduce((s, v) => s + v, 0) / current.length);
      current = [sorted[i]];
    }
  }
  clusters.push(current.reduce((s, v) => s + v, 0) / current.length);
  return clusters;
}

// Find index of nearest cluster centre to value v
function findBucket(v, clusters) {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < clusters.length; i++) {
    const d = Math.abs(clusters[i] - v);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

// Canonical arc key: smaller index first
function arcKey(a, b) {
  return a < b ? a + "," + b : b + "," + a;
}


/* ============================================================
   buildStitchCells(grid, cols, rows, arcMap, hitGrid, p)
   ------------------------------------------------------------
   The Lissajous intersections form a DIAGONAL grid — hits
   appear only at alternating (col+row even) positions, like
   a checkerboard. This means cells are DIAMONDS, not squares.

   Each diamond has four corners:
     left:   (col,   row)
     top:    (col+1, row-1)
     right:  (col+2, row)
     bottom: (col+1, row+1)

   We iterate over every hit as a potential left corner and
   check whether the other three diamond corners exist and
   all four edges have arcs.

   Checkerboard: alternate which set of diamonds gets stitched
   by using checkerOffset (0 or 1) on the hit's col index.
============================================================ */
function buildStitchCells(grid, cols, rows, arcMap, hitGrid, p) {

  const cells = [];
  const nCols = cols.length;
  const nRows = rows.length;

  // Reverse lookup: (col,row) → hit index
  // hitGrid[hi] = { col, row }  →  revGrid[col][row] = hi
  const revGrid = {};
  for (let hi = 0; hi < hitGrid.length; hi++) {
    const { col, row } = hitGrid[hi];
    if (!revGrid[col]) revGrid[col] = {};
    revGrid[col][row] = hi;
  }

  // Iterate over all hits as potential LEFT corner of a diamond
  for (let hi = 0; hi < hitGrid.length; hi++) {

    const { col, row } = hitGrid[hi];

    // Diamond corners in grid coords:
    //   left   = (col,   row)       = hi (current)
    //   top    = (col+1, row-1)
    //   right  = (col+2, row)
    //   bottom = (col+1, row+1)

    const cTop = col + 1, rTop = row - 1;
    const cRight = col + 2, rRight = row;
    const cBot = col + 1, rBot = row + 1;

    // Check bounds
    if (cRight >= nCols) continue;
    if (rTop < 0 || rBot >= nRows) continue;

    const hiTop   = revGrid[cTop]?.[rTop];
    const hiRight = revGrid[cRight]?.[rRight];
    const hiBot   = revGrid[cBot]?.[rBot];

    if (hiTop === undefined || hiRight === undefined ||
        hiBot === undefined) {
      console.log(`[LCS] diamond hi=${hi}(${col},${row}): top=${hiTop} right=${hiRight} bot=${hiBot}`);
      continue;
    }

    // All four edges of the diamond must have arcs:
    //   left→top, top→right, left→bottom, bottom→right
    const arcLT = arcMap.get(arcKey(hi,     hiTop));
    const arcTR = arcMap.get(arcKey(hiTop,  hiRight));
    const arcLB = arcMap.get(arcKey(hi,     hiBot));
    const arcBR = arcMap.get(arcKey(hiBot,  hiRight));

    if (!arcLT || !arcTR || !arcLB || !arcBR) continue;

    // Checkerboard: alternate by col parity of the left corner
    if (col % 2 !== p.checkerOffset) continue;

    // Two arm pairings for stitching:
    //   pair A: left→top  vs  bottom→right  (both going "upward")
    //   pair B: left→bottom vs top→right    (both going "downward")
    // Pick the pair with more balanced arc lengths.
    const lenLT = arcLT.length, lenTR = arcTR.length;
    const lenLB = arcLB.length, lenBR = arcBR.length;

    const ratioA = Math.max(lenLT, lenBR) / Math.max(1, Math.min(lenLT, lenBR));
    const ratioB = Math.max(lenLB, lenTR) / Math.max(1, Math.min(lenLB, lenTR));

    let arm1, arm2;
    if (ratioA <= ratioB) {
      arm1 = arcLT;
      arm2 = arcBR;
    } else {
      arm1 = arcLB;
      arm2 = arcTR;
    }

    cells.push({ arm1, arm2 });
  }

  return cells;

} // end buildStitchCells


/* ============================================================
   toCanvasPts(mathPts)
   Convert math-coord points {x,y} to canvas-coord Points.
   Canvas: x → cx + x,  y → cy - y  (y-flip)
============================================================ */
function toCanvasPts(mathPts) {
  const W  = ctx.canvas.width;
  const H  = ctx.canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  return mathPts.map(p => ({ x: cx + p.x, y: cy - p.y }));
}


/* ============================================================
   Resample arm to numSteps+1 evenly spaced points.
   stitcher() needs both arms to have the same length.
============================================================ */
function resampleArm(pts, numSteps) {

  if (pts.length < 2) return pts;

  // Build cumulative arc-lengths
  const cumLen = [0];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    cumLen.push(cumLen[i - 1] + Math.hypot(dx, dy));
  }
  const total = cumLen[cumLen.length - 1];
  if (total === 0) return pts;

  const result = [];
  for (let s = 0; s <= numSteps; s++) {
    const target = (s / numSteps) * total;
    // Binary search
    let lo = 0, hi = cumLen.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (cumLen[mid] < target) lo = mid; else hi = mid;
    }
    const t = (target - cumLen[lo]) / Math.max(1e-9, cumLen[hi] - cumLen[lo]);
    result.push({
      x: pts[lo].x + t * (pts[hi].x - pts[lo].x),
      y: pts[lo].y + t * (pts[hi].y - pts[lo].y)
    });
  }
  return result;

} // end resampleArm


/* ============================================================
   Drawing
============================================================ */
function clearCanvas() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawCurve(points, p) {

  const W  = ctx.canvas.width;
  const H  = ctx.canvas.height;
  const cx = W / 2;
  const cy = H / 2;

  ctx.save();
  ctx.lineWidth   = p.strokeWidth;
  ctx.strokeStyle = p.strokeColor;
  ctx.beginPath();

  for (let i = 0; i < points.length; i++) {
    const x = cx + points[i].x;
    const y = cy - points[i].y;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }

  ctx.stroke();
  ctx.restore();

} // end drawCurve

function drawStitchedCells(cells, p) {

  if (!cells.length) return;

  // Build a fake "thing" that drawParabs expects
  const thing = {
    color:     p.stitchColor,
    lineWidth: p.stitchWidth
  };

  for (const cell of cells) {

    // Convert to canvas coords and resample to uniform length
    const canvasArm1 = resampleArm(toCanvasPts(cell.arm1), p.numSteps);
    const canvasArm2 = resampleArm(toCanvasPts(cell.arm2), p.numSteps);

    if (canvasArm1.length < 2 || canvasArm2.length < 2) continue;

    const parab = stitcher(canvasArm1, canvasArm2);
    drawParabs(thing, [parab]);
  }

} // end drawStitchedCells


/* ============================================================
   Lifecycle
============================================================ */
function init(p) {
  scriptInfo.elements = { element: { points: [], cells: [] } };
}

function update(p) {

  const points    = generatePoints(p);
  const allHits   = findIntersections(points, p);

  // Filter to interior hits only — boundary touches (where the curve
  // grazes the amplitude limits) are not true crossings and corrupt
  // the grid topology. A hit is interior if it is clearly inside the
  // amplitude bounding box on both axes.
  const boundaryMargin = Math.min(p.lissA, p.lissB) * 0.15;
  const hits = allHits.filter(h =>
    Math.abs(h.x) < p.lissA - boundaryMargin &&
    Math.abs(h.y) < p.lissB - boundaryMargin
  );

  console.log(`[LCS] points: ${points.length}, allHits: ${allHits.length}, interiorHits: ${hits.length}`);
  console.log(`[LCS] hit positions (math coords):`,
    hits.map((h,i) => `${i}:(${h.x.toFixed(1)},${h.y.toFixed(1)})`).join(' '));

  let cells = [];

  if (p.showStitch && hits.length >= 4) {
    const { grid, cols, rows, arcMap, hitGrid } =
      buildCellData(points, hits, p);

    console.log(`[LCS] cols: ${cols.length}, rows: ${rows.length}, arcs: ${arcMap.size}`);
    console.log(`[LCS] grid keys:`, Object.keys(grid).map(c => `col${c}:[${Object.keys(grid[c])}]`).join(' '));

    cells = buildStitchCells(grid, cols, rows, arcMap, hitGrid, p);
    console.log(`[LCS] cells found: ${cells.length}`);
  }

  scriptInfo.elements.element.points = points;
  scriptInfo.elements.element.cells  = cells;

} // end update

function draw(p) {

  clearCanvas();

  if (p.showCurve) {
    drawCurve(scriptInfo.elements.element.points, p);
  }

  if (p.showStitch) {
    drawStitchedCells(scriptInfo.elements.element.cells, p);
  }

} // end draw


/* ============================================================
   runPattern — Gallery entry point
============================================================ */
export function runPattern() {

  scriptInfo.parameters = scriptInfo.params;

  buildParameterControls(scriptInfo, "tab-scripts", true);

  scriptInfo.redrawHandler = function () {
    update(scriptInfo.params);
    draw(scriptInfo.params);
  };

  init(scriptInfo.params);
  scriptInfo.redrawHandler();

} // end runPattern
