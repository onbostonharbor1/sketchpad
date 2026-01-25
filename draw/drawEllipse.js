import { Ellipse, START_END, FULL, TAPER, START_TAPER, END_TAPER }
                               from "../classes/ellipseClass.js";
import { Line, Point }         from "../classes/classes.js";
import { drawLine, drawNodes, toRadians } from "./drawUtilities.js";

const CLOSE     = true;
const DONT_DRAW = true;

/////////////////////////////////////////////////////////////////
// drawInCircle
/////////////////////////////////////////////////////////////////
export function drawInCircle(thing){
	thing.ellipse = { a: thing.radius, b: thing.radius } ;
	drawInEllipse(thing);
   }

/////////////////////////////////////////////////////////////////
// drawInEllipse
/////////////////////////////////////////////////////////////////
export function drawInEllipse(thing) {
  function drawStart(nodes, chordLength, thing, start, dist = 4) {
    // dist: initial chord length
    // chordLength: target (full) chord length
    // returns: index of first unused node after taper

    const len = nodes.length;
    const numLines = chordLength - dist; // taper length directly tied to dist
    let inc = dist;
    let j = start;
    let color = thing.color;
    let lineWidth = thing.lineWidth;

    for (let i = 0; i < numLines; i++) {
      j = (start + i) % len;
      const k = (j + inc) % len;
      drawLine(nodes[j], nodes[k], color, lineWidth);
      inc++;
    }

    // Return the next start index for drawWithin
    return (j + 1) % len;
  } // end drawStart

  // length = how many nodes to cover starting at `start` (not an index).
  // wrap=false (default) means: stop at length - chordLength so End can finish.
  // wrap=true means: draw the full length, allowing wraparound (used for FULL).
  function drawWithin(
    nodes,
    chordLength,
    thing,
    start,
    length,
    { wrap = false } = {}
  ) {
    const len = nodes.length;
    const numLines = wrap ? length : Math.max(0, length - chordLength);
    let j = start;
    let color = thing.color;
    let lineWidth = thing.lineWidth;

    for (let i = 0; i < numLines; i++) {
      j = (start + i) % len;
      const k = (j + chordLength) % len;
      drawLine(nodes[j], nodes[k], color, lineWidth);
    }

    // First unused node after the last chord start
    return (j + 1) % len;
  } // end drawWithin

  function drawEnd(nodes, chordLength, thing, start, length, dist = 4) {
    // Draws the taper-down phase at the end of the pattern.
    // Restores the original behavior: index increments by 2
    // so the lines thin and taper smoothly rather than abruptly.

    const len       = nodes.length;
    let color       = thing.color;
    let lineWidth   = thing.lineWidth;
    let currentSkip = chordLength;
    const numLines  = Math.max(0, currentSkip - dist);
    let j, k;

    for (
      let i = start, lineCount = 0;
      lineCount < numLines;
      i += 2, lineCount++
    ) {
      currentSkip--; // shorten chord
      j = i % len;
      k = (i + currentSkip + 1) % len;
      drawLine(nodes[j], nodes[k], color, lineWidth);
    }

    return (j + 1) % len;
  } // end drawEnd

  // ------------------------------------------------------------
  // Helper: optionally extend ellipse with attached arms
  // ------------------------------------------------------------
  function extendWithArms(nodes, arm1, arm2) {
    // If arm1 shares first circle point, remove overlap before concat
    if (Array.isArray(arm1)) {
      const sharesStart =
        arm1.length &&
        arm1[arm1.length - 1].x === nodes[0].x &&
        arm1[arm1.length - 1].y === nodes[0].y;
      if (sharesStart) nodes.shift();
      nodes = arm1.concat(nodes);
    }

    // Append arm2 directly
    if (Array.isArray(arm2)) {
      nodes = nodes.concat(arm2);
    }

    return nodes;
  } // end extendWithArms

  function adjustStartEnd(nodes, thing, start, end, length) {
    if (thing.startSkip > 0) {
      start   = thing.startSkip;
      length -= thing.startSkip;
    } else if (thing.startSkip < 0) {
      start   = nodes.length + thing.startSkip;
      length -= thing.startSkip;
    }

    if (thing.endSkip > 0) {
      end    = nodes.length - thing.endSkip;
      length -= thing.endSkip;
    } else if (thing.endSkip < 0) {
      end     = -thing.endSkip;
      length -= thing.endSkip;
    }

    return { start, end, length };
  } // end adjustStartEnd

  const DISTANCE = 4;
  let chordLength = thing.chordLength;
  let nodes       = getEllipsePoints(thing);
  let start       = 0;
  let end         = nodes.length;
  // length = total of nodes to be done
  // it will be greater than nodes.length
  // if startSkip or endSkip is negative
  let length      = end;

  // ------------------------------------------------------------
  // COMPLETE CIRCLE
  // ------------------------------------------------------------
  if (thing.withinCirc === FULL) {
    drawWithin(nodes, chordLength, thing, start, length, { wrap: true });
    drawNodes(thing, nodes);
    return;
  }

  // ------------------------------------------------------------
  // ADD ARMS (START_END mode)
  // ------------------------------------------------------------
  if (Array.isArray(thing.arm1) || Array.isArray(thing.arm2)) {
    thing.withinCirc = START_END; // enforce mode
    nodes = extendWithArms(nodes, thing.arm1, thing.arm2);
    drawWithin(nodes, chordLength, thing, start, length);
    return;
  }

  ({ start, end, length } = adjustStartEnd(nodes, thing, start, end, length));

  // DRAW OUTLINE OF ELLIPSE SEGMENT
  // This draws the visible outer arc of the ellipse based on startSkip/endSkip.
  // If both skips are zero, the full ellipse is drawn. Otherwise, only the
  // partial segment between the adjusted start and end indices is shown.

  for (let i = start; i < start + length - 1; i++) {
    const j = i % nodes.length;          // current point index (wraps)
    const k = (i + 1) % nodes.length;    // next point index (wraps)
    drawLine(nodes[j], nodes[k], thing);
  } // end outline loop

  // START_END: no taper, draw full within segment
  if (thing.withinCirc == START_END) {
    drawWithin(nodes, chordLength, thing, start, length);
    return;
  }

  // START_TAPER: gradual ramp-in at beginning
  if (thing.withinCirc == START_TAPER) {
    start = drawStart(nodes, chordLength, thing, start, DISTANCE);
    drawWithin(
      nodes,
      chordLength,
      thing,
      start,
      length - start + thing.startSkip
    );
    return;
  }

  // END_TAPER: gradual ramp-out at end
  if (thing.withinCirc == END_TAPER) {
    end = length - chordLength + DISTANCE;
    start = drawWithin(nodes, chordLength, thing, start, end);
    drawEnd(nodes, chordLength, thing, start, length - thing.startSkip);
    return;
  }

  // TAPER: both ramp-in and ramp-out
  start = drawStart(nodes, chordLength, thing, start, DISTANCE); // fade in
  end   = length - chordLength + DISTANCE - start + thing.startSkip; // middle section
  start = drawWithin(nodes, chordLength, thing, start, end); // steady section
  drawEnd(nodes, chordLength, thing, start, length); // fade out
}


/* ------------------------------------------------------------
   pointAtArcLength()
   Given cumulative arc-lengths (S) and corresponding points (X),
   returns the interpolated point at the specified arc length.
   ------------------------------------------------------------ */
function pointAtArcLength(targetLength, maxSamples, cumulativeLengths, pointArray) {
  // Binary search for the smallest index whose cumulative length >= targetLength
  let lowIndex = 1;
  let highIndex = maxSamples;

  while (lowIndex < highIndex) {
    const midIndex = (lowIndex + highIndex) >>> 1;
    if (cumulativeLengths[midIndex] < targetLength)
      lowIndex = midIndex + 1;
    else
      highIndex = midIndex;
  }

  const k = lowIndex;

  // Bracketing samples
  const prevLength = cumulativeLengths[k - 1];
  const nextLength = cumulativeLengths[k];
  const prevPoint  = pointArray[k - 1];
  const nextPoint  = pointArray[k];

  // Fraction of the way between those samples
  const t = (targetLength - prevLength) /
            Math.max(1e-9, nextLength - prevLength);

  // Linear interpolation between bracketing points
  const x = prevPoint.x + t * (nextPoint.x - prevPoint.x);
  const y = prevPoint.y + t * (nextPoint.y - prevPoint.y);

  return { x, y };
} // end pointAtArcLength

/* ------------------------------------------------------------
   getEllipsePoints()
   Returns evenly spaced points along an ellipse.
   Spacing can be by equal angle or equal arc length.
   ------------------------------------------------------------ */
//function getEllipsePoints(width, height, centerX, centerY, rotationDeg
//			  numPoints, spacingMode = "arc") {
export function getEllipsePoints(thing) {
    let width     = thing.ellipse.a*thing.xScale;
    let height    = thing.ellipse.b*thing.yScale;
    let midX      = thing.midpoint.x;
    let midY      = thing.midpoint.y;
    let rotate    = thing.rotate;
    let numNodes  = thing.numNodes;
  // --- Step 1: Local geometry setup ---
  const radiusX   = width / 2;
  const radiusY   = height / 2;
  const rotationRad = toRadians(rotate);
  const cosR      = Math.cos(rotationRad);
  const sinR      = Math.sin(rotationRad);

  // --- Step 2: Function to compute a rotated point on ellipse ---
  // NOT USED
  function pointAtAngle(theta) {
    const rawX = radiusX * Math.cos(theta);
    const rawY = radiusY * Math.sin(theta);
    return {
      x: midX + rawX * cosR - rawY * sinR,
      y: midY + rawX * sinR + rawY * cosR
    };
  }

    // --- Step 3: If spacing by equal angle, trivial loop ---
    // NOT USED
//  if (spacingMode === "angle") {
//    const points = new Array(numNodes);
//    for (let i = 0; i < numNodes; i++) {
//      const theta = (i * 2 * Math.PI) / numNodes;
//      points[i]   = pointAtAngle(theta);
//    }
//    return points;
//  }

  // --- Step 4: Otherwise, approximate equal arc-length spacing ---
  const samples           = Math.max(2048, numNodes * 16);
  const samplePoints      = new Array(samples + 1);
  const cumulativeLengths = new Float64Array(samples + 1);

  let cumulativeDistance = 0;
  let previousPoint      = null;

  for (let i = 0; i <= samples; i++) {
    const theta = (i * 2 * Math.PI) / samples;
    const currentPoint = pointAtAngle(theta);
    samplePoints[i] = currentPoint;

    if (previousPoint) {
      const dx = currentPoint.x - previousPoint.x;
      const dy = currentPoint.y - previousPoint.y;
      cumulativeDistance += Math.hypot(dx, dy);
    }
    cumulativeLengths[i] = cumulativeDistance;
    previousPoint = currentPoint;
  }

  const totalArcLength = cumulativeLengths[samples];
  const segmentLength = totalArcLength / numNodes;

  // --- Step 5: Compute target points along the curve ---
  const points = new Array(numNodes);
  for (let i = 0; i < numNodes; i++) {
    const targetLength = i * segmentLength;
    points[i] = pointAtArcLength(targetLength, samples,
				   cumulativeLengths, samplePoints);
  }

  return points;
} // end getEllipsePoints

export function arcPoints(a, b, r_frac, n) {
	  // a:      origin point
	  // b:      destination point
	  // r_frac: arc radius as a fraction of half the distance
	  //         between a and b
	  //         -- 1 results in a semicircle arc, the arc flattens out the
	  //            closer to 0 the number is set, 0 is invalid
	  // n:      number of points to sample from arc
	  let c = getCenter(a, b, r_frac);
	  let r = dist(c, a);

	  let aAngle = Math.atan2(a.y - c.y, a.x - c.x),
	      bAngle = Math.atan2(b.y - c.y, b.x - c.x);

	  if (aAngle > bAngle) {
	      bAngle += 2 * Math.PI;
	  }

          let points = range(aAngle, bAngle, (bAngle-aAngle)/n);
	  let sampledPoints = points.map(
	      (d) => new Point(Math.cos(d) * r + c.x,
			       Math.sin(d) * r + c.y));
	  return sampledPoints;
}

/////////////////////////////////////////////////////////////////
// dist
/////////////////////////////////////////////////////////////////
function dist(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

/////////////////////////////////////////////////////////////////
// getCenter
/////////////////////////////////////////////////////////////////
function getCenter(a, b, frac) {
    let c  = getP3(a, b, frac);
    let b1 = yIntercept(a, b);
    let b2 = yIntercept(a, c);
    let m1 = inverseSlope(a, b);
    let m2 = inverseSlope(a, c);

    // find the intersection of the two perpendicular bisectors
    // i.e. solve m1 * x + b2 = m2 * x + b2 for x
    let x = (b2 - b1) / (m1 - m2);
    // sub x back into one of the linear equations to get y
    let y = m1 * x + b1;
    return new Point(x,y);
}

/////////////////////////////////////////////////////////////////
// getP3
/////////////////////////////////////////////////////////////////
function getP3(a, b, frac) {
    let mid = midpoint(a, b);

    let m = inverseSlope(a, b);
    // check if B is below A
    let bLower = b.y < a.y ? -1 : 1;

    // distance from midpoint along slope: between 0 and half
    // the distance between the two points
    let d = 0.5 * dist(a, b) * frac;

    let x = d / Math.sqrt(1 + Math.pow(m, 2));
    let y = m * x;
    return new Point(bLower * x + mid.x, bLower * y + mid.y);
    // return [mid[0] + d, mid[1] - (d * (b[0] - a[0])) / (b[1] - a[1])];
}

/////////////////////////////////////////////////////////////////
// inverseSlope
/////////////////////////////////////////////////////////////////
function inverseSlope(a, b) {
    // returns the inverse of the slope of the line from point A to B
    // which is the slope of the perpendicular bisector
    return -1 * (1 / slope(a, b));
}

/////////////////////////////////////////////////////////////////
// midpoint
/////////////////////////////////////////////////////////////////
function midpoint(a, b) {
    return new Point((a.x + b.x)/2, (a.y + b.y)/2);
}
function _m(a, b) {
    return new Point((a.x + b.x)/2, (a.y + b.y)/2);
}

/////////////////////////////////////////////////////////////////
// range
/////////////////////////////////////////////////////////////////
function range(start, end,step=1){
    const result = [];
    for (let i=start; i<end; i += step){
	result.push(i);
    }
    return result;
}

/////////////////////////////////////////////////////////////////
// slope
/////////////////////////////////////////////////////////////////
function slope(a, b) {
    // returns the slope of the line from point A to B
    return (b.y - a.y) / (b.x - a.x);
}

/////////////////////////////////////////////////////////////////
// yIntercept
/////////////////////////////////////////////////////////////////
function yIntercept(a, b) {
    // returns the y intercept of the perpendicular bisector of
    // the line from point A to B
    let m = inverseSlope(a, b);
    let p = midpoint(a, b);
    let x = p.x;
    let y = p.y;
    return y - m * x;
}



/*
====================================================================
arcPoints(a, b, r_frac, n)
--------------------------------------------------------------------
PURPOSE
- Generate a sampled circular arc between points A and B.
- The arc is defined by A, B, and a constructed third point (bulge).
- Uses Point and Line classes only (no slopes, no intercept math).

PARAMETERS
- a, b    : Point instances (arc endpoints)
- r_frac  : bulge factor as a fraction of half the chord length
            * 1   → roughly a semicircle
            * < 1 → flatter arc
            * must be > 0
- n       : number of segments (returns n+1 points, incl. endpoints)

BEHAVIOR
- Arc bends to one side of the chord based on relative vertical
  orientation of B to A (same rule as your original code).
- Throws if:
    * a or b is not a Point
    * a and b coincide
    * r_frac <= 0
    * arc degenerates to collinear points (too flat)

RETURN
- Array of Point objects suitable for stitching with line segments.

DESIGN NOTES
- Geometry is expressed directly (vectors + circumcenter).
- No special cases for vertical lines.
- Easy to extend later with an explicit “side” parameter if desired.
====================================================================
*/

export function arcPointsNew(a, b, r_frac, n) {

    if (!(a instanceof Point)) throw new Error("arcPoints: a must be a Point");
    if (!(b instanceof Point)) throw new Error("arcPoints: b must be a Point");
    if (!(r_frac > 0))        throw new Error("arcPoints: r_frac must be > 0");
    if (!(n >= 1))            throw new Error("arcPoints: n must be >= 1");

    const chord = new Line(a, b);
    const mid   = chord.midpoint();

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);

    if (len === 0) {
        throw new Error("arcPoints: a and b must be different points");
    }

    // Unit perpendicular to the chord
    let nx = -dy / len;
    let ny =  dx / len;

    // Preserve original “which side” convention
    const bLower = (b.y < a.y) ? -1 : 1;
    nx *= bLower;
    ny *= bLower;

    // Bulge distance from midpoint
    const d = 0.5 * len * r_frac;

    const p3 = new Point(
        mid.x + nx * d,
        mid.y + ny * d
    );

    const c = circumcenter(a, b, p3);
    const r = c.distanceTo(a);

    let aAng = Math.atan2(a.y - c.y, a.x - c.x);
    let bAng = Math.atan2(b.y - c.y, b.x - c.x);

    // Force forward sweep
    if (aAng > bAng) bAng += 2 * Math.PI;

    const pts = [];

    for (let i = 0; i <= n; i++) {
        const t = aAng + (bAng - aAng) * (i / n);
        pts.push(new Point(
            c.x + Math.cos(t) * r,
            c.y + Math.sin(t) * r
        ));
    }

    return pts;

} // end arcPoints


/*
====================================================================
circumcenter(A, B, C)
--------------------------------------------------------------------
PURPOSE
- Compute the center of the unique circle passing through
  three non-collinear points.

WHY THIS VERSION
- Pure determinant form.
- No slopes → no division-by-zero from vertical lines.
- Fails fast if points are collinear.

RETURN
- Point representing the circle center.
====================================================================
*/

function circumcenter(A, B, C) {

    const ax = A.x, ay = A.y;
    const bx = B.x, by = B.y;
    const cx = C.x, cy = C.y;

    const d = 2 * (
        ax * (by - cy) +
        bx * (cy - ay) +
        cx * (ay - by)
    );

    if (d === 0) {
        throw new Error(
            "circumcenter: points are collinear (arc too flat / r_frac too small)"
        );
    }

    const ax2ay2 = ax * ax + ay * ay;
    const bx2by2 = bx * bx + by * by;
    const cx2cy2 = cx * cx + cy * cy;

    const ux =
        (ax2ay2 * (by - cy) +
         bx2by2 * (cy - ay) +
         cx2cy2 * (ay - by)) / d;

    const uy =
        (ax2ay2 * (cx - bx) +
         bx2by2 * (ax - cx) +
         cx2cy2 * (bx - ax)) / d;

    return new Point(ux, uy);

} // end circumcenter

export function arcCurvature(pt1, pt2, curve, numPoints = 32) {
    // Lets me specify using a real looking number
    let curvature = curve/1000;
    let pts = [];
    // Use the same math to find center, radius, and sweep
    const dx = pt2.x - pt1.x;
    const dy = pt2.y - pt1.y;
    const d  = Math.hypot(dx, dy);
    if (d === 0) return;

    if (curvature === 0) {
	pts.push(pt1);
	pts.push(pt2);
	return pts;
    }

    const sign = Math.sign(curvature);
    let   R    = Math.abs(1 / curvature);
    const Rmin = d / 2;
    if (R < Rmin)
	R = Rmin;

    const mx = (pt1.x + pt2.x) / 2;
    const my = (pt1.y + pt2.y) / 2;
    const ux = dx / d;
    const uy = dy / d;
    const nx = -uy;
    const ny = ux;
    const h  = Math.sqrt(Math.max(0, R * R - (d / 2) * (d / 2)));
    const Cx = mx + sign * h * nx;
    const Cy = my + sign * h * ny;

    let a0 = Math.atan2(pt1.y - Cy, pt1.x - Cx);
    let a1 = Math.atan2(pt2.y - Cy, pt2.x - Cx);
    const twoPi = Math.PI * 2;
    // CCW sweep in [0, 2π)
    let delta  = ((a1 - a0) % twoPi + twoPi) % twoPi;
    // choose minor sweep in (-π, π]
    if (delta > Math.PI) delta -= twoPi;

    for (let i = 0; i <= numPoints; i++) {
	const t = i / numPoints;
	const a = a0 + t * delta;
	const x = Cx + R * Math.cos(a);
	const y = Cy + R * Math.sin(a);
	pts.push(new Point(x,y));
    }
    return pts;
}

