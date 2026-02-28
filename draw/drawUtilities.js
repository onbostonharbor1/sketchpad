/* ====================================================================
DRAWING ROUTINES ("d")
--------------------------------------------------------------------
displayPoint(pt, color)
- Renders a small, filled circle (dot) at a specific Point. Useful
  for highlighting vertices or interactive handles.

drawCircle(midpoint, radius, color, width)
- Renders a standard stroked circle based on a center Point and
  radius. Respects current stroke styling.

drawLines(thing, lines, close)
- Iterates through an array of Line objects and renders each one.
  Optionally connects the last point back to the first.

drawLine(arg1, arg2, arg3, arg4)
- The core polyfilled drawing method. Handles Line objects, Point
  objects, or numeric indices. Supports "final" mode to draw only
  endpoints for draft visualization.

drawALine(color, lineWidth, line)
- A specialized wrapper that renders a single Line object with
  defensive checks to ensure the Line structure is valid.

drawNodes(thing, nodes)
- Connects an array of Points in a sequence (0 to 1, 1 to 2, etc.)
  to visualize the perimeter or "skeleton" of a shape.

drawParabs(thing, parabs)
- Renders a collection of parabola segments. Can handle both
  geometric structures and debug numbering for individual points.

drawManyParabs(thing, parabs)
- An exported wrapper that handles the rendering of multiple
  stitched parabolas, ensuring proper point-count normalization.

drawManyLines(s) / drawLinesAround / drawLinesWithin
- High-level pattern generators that connect points in an array
  using skip-counts, wrapping, and clipping (chop) logic for
  complex curve-stitching.
====================================================================
*/


import { Point, Line } from "../classes/classes.js";
import { drawState }   from "./drawState.js";
import { drawParab }   from "/draw/drawRegular.js";
import { createNodes } from "/draw/createNodes.js";

const toRadians = (deg) => deg * (Math.PI / 180);
const toDegrees = (rad) => rad * (180 / Math.PI);

//////////////////////////////////////////////////////////////////
// CREATE PRINT NODES
//////////////////////////////////////////////////////////////////
function createPrintNodes(thing) {
  const nodes = createNodes(thing);
  const offset = drawState.pts.length;

  nodes.forEach((node, i) => {
    printCircNum(node, offset + i);
    drawState.pts.push(node);
  });

  if (thing.mid) {
    nodes.forEach((node, i) => {
      const next = nodes[(i + 1) % nodes.length];
      const mid  = midpoint(node, next);
      printCircNum(mid, offset + nodes.length + i);
      drawState.pts.push(mid);
    });
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
   if (parab.length == 3) parab.splice(1, 0, parab[1]);
    for (let j = 0; j < parab.length-thing.truncate; j++) {
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

function displayPoint(pt, color = "red") {
  /**
   * Draws a circle on the canvas with a default radius of 2 and a default color of yellow.
   *
   * @param {number} pt a Poiint object with x and y properties

   * @param {string} [color='yellow'] The fill color of the circle. Defaults to 'yellow'.
   */
  const radius = 4;

  ctx.beginPath();
  ctx.arc(pt.x, pt.y, radius, 0, 2 * Math.PI);
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
       false â†’ wrap around using modulo
       true  â†’ stop drawing when j exceeds array bounds

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
- skip    : integer â‰¥ 1
            Defines how far ahead in the array the second endpoint is.
            Examples:
              skip = 1  â†’ connect consecutive points
                          (0â†’1, 1â†’2, 2â†’3, ...)
              skip = 2  â†’ skip one point between connections
                          (0â†’2, 1â†’3, 2â†’4, ...)
              skip = n  â†’ longer chords, more â€œwovenâ€ patterns
- color   : stroke color passed to drawLine

BEHAVIOR
- Iterates forward through ptArray.
- For each index i, draws a line from ptArray[i] to ptArray[i + skip].
- Stops (â€œchopsâ€) as soon as i + skip would exceed the array bounds.
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
              skip = 1  â†’ 0->1, 1->2, 2->3, ...
              skip = 2  â†’ 0->2, 1->3, 2->4, ...
              skip = N/2â†’ â€œdiametersâ€ on a circle (if N even)
- color   : stroke color passed to drawLine()
- start   : first index to use (inclusive)
- end     : last index to use (exclusive). default is ptArray.length
- close   : if true, add one final â€œclosingâ€ line after the loop
- chop    : controls wraparound
            false â†’ wrap with modulo: j = (i + skip) % ptArray.length
            true  â†’ do NOT wrap; if (i + skip) is out of range, stop.

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
      if (j < 0 || j >= ptArray.length) break;   // stop as soon as weâ€™d go out of range
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
    // Final mode: draw line with reduced alpha for light visibility
    // ------------------------------------------------------------
    if (drawState.final === true) {
        ctx.save();
        ctx.globalAlpha = 0.15;  // Reduced alpha for light visibility
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
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
  drawState.title = text;
  //   updateOverlayTitle(); // Sync overlay if present
}

export function shortenArm(arm) {
  // thing.shorten is the percent to shorten.
  // I want the amount left
  let shorten = (100 - thing.shorten) / 100;
  let deltaX = Math.abs(arm[arm.length - 1].x - arm[0].x);
  //	if (deltaX == 0)
  //	    deltaX = 100;
  let length = shorten * deltaX;
  let j = 0;
  for (let i = 0; i < arm.length - 1; i++) {
    deltaX = Math.abs((arm[i].x - arm1[0].x));
    if (deltaX > length) {
      j = i;
      break;
    }
  }
  if (j == 0) j = arm.length - 1;;
  return j;

  // if (BOTH) {
  //     let k = 0;
  //     for (let i=0; i < thing.arm2.length -1; i++) {
  // 	        deltaX = Math.abs((thing.arm2[i].x - thing.arm2[0].x));
  // 	        if (deltaX > length ) {
  // 	        	k = i;
  // 	        	break;
  // 	   		}
  //  	}
  //     	if (k==0) k=thing.arm2.length -1;;
  //     	thing.arm2.length=k;
  // }
  // thing.arm2.splice(j,thing.arm2.length-1);
  // if (thing.arm2.length < thing.arm1.length)
  // thing.arm2.splice(0,j-1);
}

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
 *   "straight"      â€“ evenly spaced points start â†’ end
 *   "flexAtMiddle"  â€“ deflect at midpoint, endpoints fixed
 *   "bendAtMid"     â€“ deflect at midpoint, replace far endpoint
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

  // fallback â†’ straight
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
- Normalize mixed â€œindex-or-pointâ€ inputs into actual Point objects.
- Accepts numbers (indices into drawState.pts), Point objects, or
  arrays containing any mix of the two.
- This allows higher-level drawing code to stay concise and flexible
  without caring how points are referenced.

INPUT
- coords may be:
    1) An array containing:
         - numbers â†’ treated as indices into drawState.pts
         - Point objects â†’ passed through unchanged
    2) A single number
         - treated as an index into drawState.pts
    3) A single Point object
         - passed through unchanged

ASSUMPTIONS
- drawState.pts exists and contains valid Point objects.
- No bounds checking is performed; invalid indices should fail fast.

RETURN
- If coords is an array:
    â†’ returns a new array of Point objects
- If coords is a number:
    â†’ returns drawState.pts[coords]
- Otherwise:
    â†’ returns coords unchanged (assumed to be a Point)

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

    // Case 2: coords is a single number â†’ index into drawState.pts
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
