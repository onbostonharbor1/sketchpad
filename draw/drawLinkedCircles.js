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
  // ------------------------------------------------------------
  // Fail-fast validation
  // ------------------------------------------------------------
  // The function expects a fully-formed LinkedCircles object.
  // If anything fundamental is missing, we want to crash
  // immediately so the error is visible in the console.
  // ------------------------------------------------------------

  if (!thing) throw new Error("drawLinkedCircles: thing is required");

  const ctx = window.ctx;
  if (!ctx) throw new Error("drawLinkedCircles: window.ctx is null");

  if (!thing.midpoints) {
    throw new Error("drawLinkedCircles: thing.midpoints is required");
  }

  if (thing.midpoints.length !== thing.numCircles) {
    throw new Error("drawLinkedCircles: midpoints length must match numCircles");
  }

  if (thing.numCircles < 2 || thing.numCircles > 7) {
    throw new Error("drawLinkedCircles: numCircles must be in range 2..7");
  }

  if (
    thing.linkMode !== "pairwise" &&
    thing.linkMode !== "ring" &&
    thing.linkMode !== "allToAll"
  ) {
    throw new Error(
      'drawLinkedCircles: linkMode must be "pairwise", "ring", or "allToAll"'
    );
  }

  // ------------------------------------------------------------
  // Drawing style
  // ------------------------------------------------------------
  // These are applied once and remain in effect for everything
  // drawn by this function (circles and linking stitches).
  // ------------------------------------------------------------

  ctx.strokeStyle = thing.color;
  ctx.lineWidth   = thing.lineWidth;

  // ------------------------------------------------------------
  // 1) Draw the base circles
  // ------------------------------------------------------------
  // Each circle is drawn independently using drawOneCircle().
  // This is purely visual structure; no linking occurs here.
  // ------------------------------------------------------------

  for (let k = 0; k < thing.midpoints.length; k++) {
    drawOneCircle(ctx, thing.midpoints[k], thing.radius);
  }

  // ------------------------------------------------------------
  // 2) Determine which circles should be linked
  // ------------------------------------------------------------
  // buildCirclePairs() returns an array of index pairs.
  //
  // Example (pairwise, 3 circles):
  //   [ [0,1], [1,2] ]
  //
  // Example (ring, 3 circles):
  //   [ [0,1], [1,2], [2,0] ]
  //
  // Example (allToAll, 3 circles):
  //   [ [0,1], [0,2], [1,2] ]
  // ------------------------------------------------------------

  const pairs = buildCirclePairs(thing.numCircles, thing.linkMode);

  // ------------------------------------------------------------
  // 3) Draw the linking "string" stitches
  // ------------------------------------------------------------
  // The circle is parameterized by angle.
  // stepAngle determines how many points we sample around
  // each circle.
  // ------------------------------------------------------------

  const stepAngle = (2 * Math.PI) / thing.numPoints;

  // We collect ALL stitch segments into one path for efficiency.
  ctx.beginPath();

  // ------------------------------------------------------------
  // For each pair of circles...
  // ------------------------------------------------------------

  for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
    const a = pairs[pairIndex][0];
    const b = pairs[pairIndex][1];

    const c1 = thing.midpoints[a];
    const c2 = thing.midpoints[b];

    // ----------------------------------------------------------
    // Walk once around the circle in angular steps.
    // Each iteration draws ONE explicit line segment:
    //
    //   circle A at angle i
    //        →
    //   circle B at angle h
    //
    // where h is offset by numSteps.
    // ----------------------------------------------------------

    for (let i = 0; i < 2 * Math.PI; i += stepAngle) {
      // Offset angle on the second circle.
      const h = i + stepAngle * thing.numSteps;

      // Compute the point on circle 1 at angle i
      const x1 = c1.x + thing.radius * Math.sin(i);
      const y1 = c1.y - thing.radius * Math.cos(i);

      // Compute the point on circle 2 at angle h
      const x2 = c2.x + thing.radius * Math.sin(h);
      const y2 = c2.y - thing.radius * Math.cos(h);

      // --------------------------------------------------------
      // IMPORTANT:
      //
      // We explicitly start each stitch with moveTo(),
      // then draw the stitch with lineTo().
      //
      // This guarantees that EVERY stitch is drawn and
      // avoids the missing-line gap caused by relying on
      // a previous pen position.
      // --------------------------------------------------------

      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
  }

  // ------------------------------------------------------------
  // Render all stitches at once
  // ------------------------------------------------------------

  ctx.stroke();

} // end drawLinkedCircles

