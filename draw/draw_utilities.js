// createNodes
// displayPoint
// drawCircle
// drawLines
// drawLine
// drawALine
// drawNodes
// drawParabs
// getPreviousIndex (obsolete?)
// inchesToPixels (will move to utilities)
// numbersToPoints
// printCircNum
// printTitle
// ptsOnLine
// stitcher
// toDegrees
// toRadians
import { Point, Line } from "../classes/classes.js";
import { drawState }   from "./drawState.js";
import { drawParab }   from "/draw/drawRegular.js";
// import {
//   beginPath,
//   arc,
//   closePath,
//   fill,
//   fillText,
//   fillRect,
//   lineTo,
//   moveTo,
//   restore,
//   save,
//   stroke
// } from "../draw/drawRedefines.js";

const toRadians = (deg) => deg * (Math.PI / 180);
const toDegrees = (rad) => rad * (180 / Math.PI);

/////////////////////////////////////////////////////////////////
// createNodes
/////////////////////////////////////////////////////////////////
function createNodes(thing) {
  const nodes = [];
  let { midpoint, radius, numNodes, rotate, xScale, yScale } = thing;
  rotate = toRadians(rotate);

  for (let i = 0; i < numNodes; i++) {
    // Base angle for evenly spaced nodes
    const angle = (2 * Math.PI * i) / numNodes + rotate;

    // Circular coordinates before scaling
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;

    // Apply elliptical distortion
    const x = midpoint.x + dx * xScale;
    const y = midpoint.y + dy * yScale;

    nodes.push(new Point(x, y));
  }

  return nodes;
}

//////////////////////////////////////////////////////////////////
// CREATE PRINT NODES
//////////////////////////////////////////////////////////////////
function createPrintNodes(thing) {
	let nodes = createNodes(thing);
	let size = drawState.pts.length;
	for (let i=0; i < nodes.length; i++) {
	     printCircNum(nodes[i],i+size);
	     drawState.pts.push(nodes[i]);
	 }

	if (thing.mid) {
	    for (let i=0; i < nodes.length; i++) {
		      let j=i+1;
		      if (j==nodes.length) j=0;
		      let mid = midpoint(nodes[i],nodes[j]);
		      drawState.pts.push(mid);
		      printCircNum(mid);
	    }
	}
	return nodes;
}

function convertParabPtsToLines(parabs) {
  let converted = [];
  for (let parab of parabs) {
    if (parab.length == 3)
      parab.splice(1, 0, parab[1]);
    let line1 = new Line(parab[0],parab[1]);
    let line2 = new Line(parab[2],parab[3]);
    converted.push([line1,line2]);
  }
  return converted;
}

export function drawManyParabs(thing, parabs) {
  for (let parab of parabs) {
    if (parab.length == 3)
      parab.splice(1, 0, parab[1]);
    drawParab(thing,parab);
  }
}


function drawParabs(thing, parabs) {
  for (let parab of parabs) {
//    if (parab.length == 3) parab.splice(1, 0, parab[1]);
    for (let j = 0; j < parab.length; j++) {
      let start = parab[j].start;
      let end = parab[j].end;
      drawLine(start, end, thing.color, thing.lineWidth);
      if (drawState.debug) {
        printCircNum(start);
        printCircNum(end);
      }
    }
  }
}

function displayPoint(pt, color = "yellow") {
  /**
   * Draws a circle on the canvas with a default radius of 2 and a default color of yellow.
   *
   * @param {number} pt a Poiint object with x and y properties

   * @param {string} [color='yellow'] The fill color of the circle. Defaults to 'yellow'.
   */
  const radius = 4;

  beginPath();
  arc(pt.x, pt.y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawCircle(midpoint, radius, color = "black", width = 1) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(midpoint.x, midpoint.y, radius, 0, (Math.PI / 180) * 360);
  ctx.stroke();
  ctx.restore();
} // end drawCircle

function drawNodes(thing,nodes) {
  const { color, lineWidth } = thing;
  const len = nodes.length;
  for (let i = 0; i < len; i++) {
	let j = i+1;
	j = j % len;
        drawLine(nodes[i], nodes[j], color, lineWidth);
    }
}

/* ==========================================================
   drawManyLines(s)
   ----------------------------------------------------------
   PURPOSE
   Draw a set of straight-line connections between points in
   an array, using a configurable skip pattern.

   INPUT
   s : object with the following properties

     pts   (required)
       Array of Point objects.

     start (optional, default 0)
       Starting index i.

     end   (optional, default pts.length)
       Loop runs while i < end.

     skip  (optional, default 1)
       Second endpoint index is computed as:
         j = i + skip

     chop  (optional, default false)
       false → wrap around using modulo
       true  → stop drawing when j exceeds array bounds

     color (optional, default "blue")
       Line color passed to drawLine().

     close (optional, default false)
       If true, draws one final line from pts[0] to the
       last computed j.

   BEHAVIOR
   - Uses drawLine(), so rendering respects drawState.final.
   - Fail-fast: assumes pts exists and contains valid Points.
========================================================== */

function drawManyLines(s) {

  const {
    pts,
    start = 0,
    end   = pts.length,
    skip  = 1,
    color = "blue",
    chop  = false,
    close = false
  } = s;

  let j = 0;

  for (let i = start; i < end; i++) {

    j = i + skip;

    if (chop) {
      if (j >= pts.length) return;
    }

    j = j % pts.length;

    drawLine(pts[i], pts[j], color);
  }

  if (close) {
    drawLine(pts[0], pts[j], color);
  }

} // end drawManyLines


function drawLines(thing, lines, close = false) {
    const { color, lineWidth } = thing;

    for (let i = 0; i < lines.length; i++) {
        drawLine(lines[i].start, lines[i].end, color, lineWidth);
    }

    if (close && lines.length > 1) {
        const first = lines[0].start;
        const last  = lines[lines.length - 1].end;
        drawLine(last, first, color, lineWidth);
    }
} // end drawLines

/*
====================================================================
drawLinesAround(ptArray, skip, color)
--------------------------------------------------------------------
PURPOSE
- Draw a sequence of straight-line segments between points in ptArray,
  where each point i is connected to point (i + skip).
- This is commonly used for curve-stitch / chord-drawing patterns.

PARAMETERS
- ptArray : array of Point objects (or indexable via numbersToPoints
            indirectly through drawLine)
- skip    : integer ≥ 1
            Defines how far ahead in the array the second endpoint is.
            Examples:
              skip = 1  → connect consecutive points
                          (0→1, 1→2, 2→3, ...)
              skip = 2  → skip one point between connections
                          (0→2, 1→3, 2→4, ...)
              skip = n  → longer chords, more “woven” patterns
- color   : stroke color passed to drawLine

BEHAVIOR
- Iterates forward through ptArray.
- For each index i, draws a line from ptArray[i] to ptArray[i + skip].
- Stops (“chops”) as soon as i + skip would exceed the array bounds.
- No wraparound, no closing segment, no partial line at the end.

ASSUMPTIONS
- ptArray.length > skip
- drawLine() handles the current drawing mode (full line vs endpoints).
- Fail-fast philosophy: no defensive bounds or type checks beyond this.

RETURN
- None (side effect: drawing to canvas)
====================================================================
*/

function drawLinesAround(ptArray, skip = 1, color = "blue") {

    let i = 0;

    while (true) {

        let j = i + skip;

        // Stop once we would run past the array
        if (j >= ptArray.length) {
            return;
        }

        drawLine(ptArray[i], ptArray[j], color);

        i++;
    }

} // end drawLinesAround


/*
====================================================================
drawLinesWithin(ptArray, skip, color, start, end, close, chop)
--------------------------------------------------------------------
PURPOSE
- Draw many straight line segments between points in an array.
- For each index i, draw a line from ptArray[i] to ptArray[i + skip].

PARAMETERS
- ptArray : array of Point-like objects: {x:number, y:number}
- skip    : how far forward to connect (integer)
            examples (N = ptArray.length):
              skip = 1  → 0->1, 1->2, 2->3, ...
              skip = 2  → 0->2, 1->3, 2->4, ...
              skip = N/2→ “diameters” on a circle (if N even)
- color   : stroke color passed to drawLine()
- start   : first index to use (inclusive)
- end     : last index to use (exclusive). default is ptArray.length
- close   : if true, add one final “closing” line after the loop
- chop    : controls wraparound
            false → wrap with modulo: j = (i + skip) % ptArray.length
            true  → do NOT wrap; if (i + skip) is out of range, stop.

NOTES
- This function assumes drawLine(p1, p2, color) already exists.
- This is fail-fast: bad inputs throw immediately.
====================================================================
*/
function drawLinesWithin(
  ptArray,
  skip = 1,
  color = "blue",
  start = 0,
  end = null,
  close = false,
  chop = false
) {
  if (!Array.isArray(ptArray)) throw new Error("drawLinesWithin: ptArray must be an array");
  if (ptArray.length < 2) return;
  if (!Number.isInteger(skip) || skip === 0) throw new Error("drawLinesWithin: skip must be a non-zero integer");
  if (!Number.isInteger(start) || start < 0) throw new Error("drawLinesWithin: start must be an integer >= 0");

  if (end === null) end = ptArray.length;
  if (!Number.isInteger(end) || end < 0) throw new Error("drawLinesWithin: end must be an integer >= 0");

  let lastJ = null;

  for (let i = start; i < end; i++) {
    let j = i + skip;

    if (chop) {
      if (j < 0 || j >= ptArray.length) break;   // stop as soon as we’d go out of range
    } else {
      j = ((j % ptArray.length) + ptArray.length) % ptArray.length; // safe modulo for negative skip
    }

    drawLine(ptArray[i], ptArray[j], color);
    lastJ = j;
  }

  if (close) {
    if (lastJ === null) throw new Error("drawLinesWithin: close=true but no lines were drawn");
    drawLine(ptArray[0], ptArray[lastJ], color);
  }
} // end drawLinesWithin


function drawALine(color = "blue", lineWidth = 1, line) {
  // Defensive check: ensure line has valid structure
  if (!line || !line.start || !line.end) {
    console.error("drawALine: invalid Line object", line);
    return;
  }
  drawLine(line.start, line.end, color, lineWidth);
} // end drawALine


function drawLine(arg1, arg2, arg3 = "blue", arg4 = 1) {

    let pt1, pt2;
    let color, lineWidth;

    // ------------------------------------------------------------
    // Case 1: drawLine(Line [, color [, lineWidth]])
    // ------------------------------------------------------------
    if (arg1 instanceof Line) {

        pt1 = numbersToPoints(arg1.start);
        pt2 = numbersToPoints(arg1.end);

        color     = arg2 !== undefined ? arg2 : "blue";
        lineWidth = arg3 !== undefined ? arg3 : 1;
    }

    // ------------------------------------------------------------
    // Case 2: drawLine(Point|index, Point|index [, color [, lineWidth]])
    // ------------------------------------------------------------
    else {

        pt1 = numbersToPoints(arg1);
        pt2 = numbersToPoints(arg2);

        color     = arg3;
        lineWidth = arg4;
    }

    // ------------------------------------------------------------
    // Final mode: draw only endpoints
    // ------------------------------------------------------------
    if (drawState.final === true) {
        drawCircle(pt1, 1, color, lineWidth);
        drawCircle(pt2, 1, color, lineWidth);
        return;
    }

    // ------------------------------------------------------------
    // Normal line drawing
    // ------------------------------------------------------------
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.moveTo(pt1.x, pt1.y);
    ctx.lineTo(pt2.x, pt2.y);
    ctx.stroke();
    ctx.closePath();
    ctx.restore();

} // end drawLine



/////////////////////////////////////////////////////////////////
// midpoint
/////////////////////////////////////////////////////////////////
function midpoint(a, b) {
    return new Point((a.x + b.x)/2, (a.y + b.y)/2);
}
function _m(a, b) {
    return new Point((a.x + b.x)/2, (a.y + b.y)/2);
}


function printCircNum(pt, num = 9999) {
  if (drawState.final) {
     drawState.ctr++;
     return;
  }
  drawCircle(pt, 8, "black");
  ctx.save();
  ctx.fillStyle = "black";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (num == 9999) {
    ctx.fillText(drawState.ctr, pt.x, pt.y);
    drawState.ctr++;
  } else
    ctx.fillText(num, pt.x, pt.y);
  ctx.restore();
}

function printText(text, pt) {

  if (!ctx) throw new Error("printText: ctx is null (canvas not initialized / ctx getter failing)");

  if (!pt) throw new Error("printText: pt missing");
  if (pt.x === undefined || pt.y === undefined) throw new Error("printText: pt missing x/y");

  ctx.save();

  // Make text visible and deterministic
  ctx.font = "16px sans-serif";
  ctx.textBaseline = "top";
  ctx.fillStyle = "blue";

  ctx.fillText(String(text), pt.x, pt.y);

  ctx.restore();

} // end printText


function printTitle(text = "No Title") {
  drawState.currentTitle = text;
  //   updateOverlayTitle(); // Sync overlay if present
}
//function printTitle(options = {}) {
//  // If options is a string, treat it as the text
//  if (typeof options === "string") {
//    options = { text: options };
//  }
//
//  const {
//    text = "No Title",
//    color = "blue",
//    x = 150,
//    y = 20
//  } = options;
//
//  ctx.save();
//  ctx.font = "20px sans-serif";
//  ctx.textAlign = "center";
//  ctx.fillStyle = color;
//  ctx.fillText(text, x, y);
//  ctx.restore();
//}

/////////////////////////////////////////////////////////////////////////
// stitcher
//    returns an array of lines
/////////////////////////////////////////////////////////////////////////
function stitcher(arm1, arm2) {
  if (arm1.length > arm2.length) {
    [arm1, arm2] = [arm2, arm1];
  }
  const lines = [];
  for (let i = 0; i < arm1.length; i++) {
    lines.push(new Line(arm1[i], arm2[i]));
  }
  return lines;
}

/**
 * PTSONLINE
 *
 * Generate equally spaced points along a line segment,
 * using transforms stored in thing.lineTransform.
 *
 * Supported types:
 *   "straight"      – evenly spaced points start → end
 *   "flexAtMiddle"  – deflect at midpoint, endpoints fixed
 *   "bendAtMid"     – deflect at midpoint, replace far endpoint
 *
 * @param {StringThing} thing - must have numSteps and lineTransform { type, angle }
 * @param {Line} line - line with start and end Points
 * @returns {Point[]} array of generated points
 */
function ptsOnLine(thing, line) {
  let { numSteps } = thing;
  numSteps ??= thing.numNodes;
  if (numSteps <= 0) return [];

  const { type = "straight", angle = 0 } = thing.lineTransform || {};
  const { start, end } = line;

  // --- base helper: straight interpolation ---
  function ptsOnStraightLine(p1, p2, steps) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push(new Point(p1.x + (p2.x - p1.x) * t, p1.y + (p2.y - p1.y) * t));
    }
    return pts;
  }

  // --- DEFLECTION HELPER ---
  const angleRad = toRadians(angle);
  function deflectPoint(origin, angle, distance) {
    return new Point(
      origin.x + distance * Math.cos(angle),
      origin.y + distance * Math.sin(angle)
    );
  }

  // --- DISPATCHER ---
  if (type === "straight") {
    return ptsOnStraightLine(start, end, numSteps);
  }

    const mid = start.midpointBetween(end);
    const baseAngle = Math.atan2(end.y - start.y, end.x - start.x);
  const halfLen = start.distanceTo(end) / 2;
  if (type === "flexAtMiddle") {
      // bend point off to the side, but endpoints fixed
      const bendPt = deflectPoint(
	  mid,
	  baseAngle + Math.PI / 2,
	  halfLen * Math.sin(angleRad)
      );

    const firstHalf = ptsOnStraightLine(
      start,
      bendPt,
      Math.floor(numSteps / 2)
    );
    const secondHalf = ptsOnStraightLine(bendPt, end, Math.ceil(numSteps / 2));
    return [...firstHalf, ...secondHalf.slice(1)];
  }

  if (type === "bendAtMid") {
    // bend point becomes new endpoint
    const bendPt = deflectPoint(mid, baseAngle + angleRad, halfLen);

    const firstHalf  = ptsOnStraightLine(start, mid, Math.floor(numSteps / 2));
    const secondHalf = ptsOnStraightLine(mid, bendPt, Math.ceil(numSteps / 2));
    return [...firstHalf, ...secondHalf.slice(1)];
  }

  // fallback → straight
  return ptsOnStraightLine(start, end, numSteps);
}

function getPreviousIndex(i, length) {
  return i === 0 ? length - 1 : i - 1;
}

//////////////////////////////////////////////////////////////////
/*
====================================================================
numbersToPoints(coords)
--------------------------------------------------------------------
PURPOSE
- Normalize mixed “index-or-point” inputs into actual Point objects.
- Accepts numbers (indices into drawState.pts), Point objects, or
  arrays containing any mix of the two.
- This allows higher-level drawing code to stay concise and flexible
  without caring how points are referenced.

INPUT
- coords may be:
    1) An array containing:
         - numbers → treated as indices into drawState.pts
         - Point objects → passed through unchanged
    2) A single number
         - treated as an index into drawState.pts
    3) A single Point object
         - passed through unchanged

ASSUMPTIONS
- drawState.pts exists and contains valid Point objects.
- No bounds checking is performed; invalid indices should fail fast.

RETURN
- If coords is an array:
    → returns a new array of Point objects
- If coords is a number:
    → returns drawState.pts[coords]
- Otherwise:
    → returns coords unchanged (assumed to be a Point)

DESIGN NOTES
- This function performs *no copying* of Point objects; it returns
  references to existing points.
- This is intentional so that dragging or mutating a point updates
  all dependent geometry.
- Mixed arrays (numbers + Points) are supported by design.
====================================================================
*/

function numbersToPoints(coords) {

    // Case 1: coords is an array (mixed indices and/or Points)
    if (Array.isArray(coords)) {

        let nodes = [];

        for (let i = 0; i < coords.length; i++) {

            // If element is a number, treat it as an index
            // into drawState.pts
            if (typeof coords[i] === "number") {
                nodes.push(drawState.pts[coords[i]]);
            }

            // Otherwise assume it is already a Point
            else {
                nodes.push(coords[i]);
            }

        }

        return nodes;
    }

    // Case 2: coords is a single number → index into drawState.pts
    if (typeof coords === "number") {
        return drawState.pts[coords];
    }

    // Case 3: coords is assumed to already be a Point
    return coords;

} // end numbersToPoints


function comparePoints(pt1,pt2) {
  if (pt1.x.toFixed(2) == pt2.x.toFixed(2)) {
	  if (pt1.y.toFixed(2) == pt2.y.toFixed(2)) {
	    return true;
	  }
  }
  return false;
}

function getLineEquation(pt1, pt2) {

  if (pt2.x - pt1.x === 0) {  // vertical line
    return "x = " + pt1.x;
  }

  const m = (pt2.y - pt1.y) / (pt2.x - pt1.x);
  const b = pt1.y - m * pt1.x;

  return "y = " + m + "x + " + b;

} // end getLineEquation


function setPt(pt,draw=true) {
    drawState.pts.push(pt);
	  if (draw)
	    printCircNum(pt);
	  return drawState.pts.length - 1;
}

/*
====================================================================
applyCutoffToParabSegments(thing, segments, armPointCount)
--------------------------------------------------------------------
PURPOSE
- Trim the last part of a stitched parabola so the drawn lines do not
  “run the circularity” near the perimeter.

KEY IDEA
- Use the actual segment list length as the baseline.
  That makes the cutoff stable even when thing.numNodes is temporarily
  changed inside drawCircularParabola (origNodes * numSteps).

PARAMETERS
- thing:
    thing.cutoffFrac  : fraction of the parabola to trim off the END.
                        0.00 = no trimming
                        0.10 = trim last 10% of the parabola
                        Typical: 0.05 .. 0.25
    thing.cutoffLines : optional explicit override; integer count of
                        trailing points to remove (>= 0). If set, it
                        overrides cutoffFrac.
- segments:
    Array of Points returned by stitcher(arm1, arm2).
- armPointCount:
    Kept for compatibility with your earlier signature; not required
    for the proportional method, but harmless to pass.

BEHAVIOR
- If cutoffLines is a number >= 0, remove exactly that many trailing
  points (but never remove everything).
- Else, compute k from cutoffFrac and segments.length:
      k = round(segments.length * cutoffFrac)
- Returns a NEW array (slice), does not mutate the original.
====================================================================
*/
export function applyCutoffToParabSegments(thing, segments, armPointCount) {

  if (!Array.isArray(segments)) {
    throw new Error("applyCutoffToParabSegments: segments must be an array");
  }
  if (!(typeof armPointCount === "number") || armPointCount <= 1) {
    throw new Error("applyCutoffToParabSegments: armPointCount must be a number > 1");
  }

  const total = segments.length;
  if (total === 0) return segments;

  let k = 0;

  // Explicit override: “trim exactly this many line segments”
  if (thing.cutoffLines !== null && thing.cutoffLines !== undefined) {
    if (!(typeof thing.cutoffLines === "number") || thing.cutoffLines < 0) {
      throw new Error("applyCutoffToParabSegments: cutoffLines must be null or a number >= 0");
    }
    k = Math.floor(thing.cutoffLines);
  } else {

    // Fractional mode: trim proportional to the number of points on the arm.
    const frac = thing.cutoffFrac;

    if (!(typeof frac === "number")) throw new Error("applyCutoffToParabSegments: cutoffFrac must be a number");
    if (frac <= 0) return segments;

    // segments are points; line segments are one fewer
    const maxSegs = Math.max(0, total - 1);

    // Use armPointCount as the stable scale driver
    k = Math.round((armPointCount - 1) * frac);

    // Clamp
    if (k > maxSegs) k = maxSegs;
  }

  if (k <= 0) return segments;

  // Never trim everything (keep at least 2 points = 1 segment)
  if (k >= total - 1) k = total - 2;

  return segments.slice(0, total - k);

} // end applyCutoffToParabSegments



export {
  toRadians,
  toDegrees,
  comparePoints,
  convertParabPtsToLines,
  createNodes,
  createPrintNodes,
  drawParabs,
  displayPoint,
  drawCircle,
  drawNodes,
  drawLines,
  drawLinesWithin,
  drawLinesAround,
  drawManyLines,
  drawALine,
  drawLine,
  getLineEquation,
  midpoint,
  _m,
  printCircNum,
  printText,
  printTitle,
  setPt,
  stitcher,
  ptsOnLine,
  getPreviousIndex,
  numbersToPoints
};
