/* draw/drawLinkedCircles.js
   ------------------------------------------------------------
   drawLinkedCircles(thing)
   - thing is an instance of LinkedCircles
   - Preserves the three modes from your original file:
       * "pairwise"  (0->1, 1->2, …)
       * "ring"      (pairwise plus last->first)
       * "allToAll"  (every circle links to every other circle)
   - Uses ctx directly (fail-fast)
   ------------------------------------------------------------ */

function drawOneCircle(ctx, center, radius) {
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
  ctx.stroke();
} // end drawOneCircle

function buildAllToAllPairs(n) {
  const pairs = [];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      pairs.push([i, j]);
    }
  }

  return pairs;
} // end buildAllToAllPairs

function buildCirclePairs(n, mode) {
  if (mode === "allToAll") {
    return buildAllToAllPairs(n);
  }

  // Default to "pairwise"
  const ring = (mode === "ring");
  const pairs = [];

  for (let i = 0; i < n - 1; i++) {
    pairs.push([i, i + 1]);
  }

  if (ring && n > 2) {
    pairs.push([n - 1, 0]);
  }

  return pairs;
} // end buildCirclePairs

export function drawLinkedCircles(thing) {
  if (!thing) throw new Error("drawLinkedCircles: thing is required");

  const ctx = window.ctx;
  if (!ctx) throw new Error("drawLinkedCircles: window.ctx is null");

  if (!thing.midpoints) throw new Error("drawLinkedCircles: thing.midpoints is required");
  if (thing.midpoints.length !== thing.numCircles) throw new Error("drawLinkedCircles: midpoints length must match numCircles");

  if (thing.numCircles < 2 || thing.numCircles > 7) throw new Error("drawLinkedCircles: numCircles must be in range 2..7");
  if (thing.linkMode !== "pairwise" && thing.linkMode !== "ring" && thing.linkMode !== "allToAll") {
    throw new Error('drawLinkedCircles: linkMode must be "pairwise", "ring", or "allToAll"');
  }

  // Style
  ctx.strokeStyle = thing.color;
  ctx.lineWidth = thing.lineWidth;

  // ----------------------------------------------------------
  // 1) Draw all circles first (same as your original function)
  // ----------------------------------------------------------
  for (let k = 0; k < thing.midpoints.length; k++) {
    drawOneCircle(ctx, thing.midpoints[k], thing.radius);
  }

  // ----------------------------------------------------------
  // 2) Build pairs according to the chosen mode
  // ----------------------------------------------------------
  const pairs = buildCirclePairs(thing.numCircles, thing.linkMode);

  // ----------------------------------------------------------
  // 3) Draw all link lines for each pair
  //    (matches your original stepAngle/numSteps logic)
  // ----------------------------------------------------------
  const stepAngle = (2 * Math.PI) / thing.numPoints;

  ctx.beginPath();

  for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
    const a = pairs[pairIndex][0];
    const b = pairs[pairIndex][1];

    const c1 = thing.midpoints[a];
    const c2 = thing.midpoints[b];

    for (let i = 0; i < 2 * Math.PI; i += stepAngle) {
      const h = i + stepAngle * thing.numSteps;

      // Same structure as your original: lineTo on circle 1, moveTo on circle 2.
      // (Yes, this produces the same visual behavior you had.)
      ctx.lineTo(
        c1.x + thing.radius * Math.sin(i),
        c1.y - thing.radius * Math.cos(i)
      );

      ctx.moveTo(
        c2.x + thing.radius * Math.sin(h),
        c2.y - thing.radius * Math.cos(h)
      );
    }
  }

  ctx.stroke();
} // end drawLinkedCircles
