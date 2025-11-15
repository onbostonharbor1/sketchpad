import { Ellipse, START_END, FULL, TAPER, START_TAPER, END_TAPER }
                               from "../classes/ellipseClass.js";
import { Point }               from "../classes/classes.js";
import { drawLine, drawNodes } from "./draw_utilities.js";
import {
  beginPath,
  arc,
  closePath,
  fill,
  fillText,
  fillRect,
  lineTo,
  moveTo,
  restore,
  save,
  stroke
} from "./drawRedefines.js";

const CLOSE     = true;
const DONT_DRAW = true;

/////////////////////////////////////////////////////////////////
// drawInCircle
/////////////////////////////////////////////////////////////////
export   function drawInCircle(thing){
	thing.ellipse = { a: thing.radius, b: thing.radius } ;
	drawInEllipse(thing);
   }

/////////////////////////////////////////////////////////////////
// drawInEllipse
/////////////////////////////////////////////////////////////////
export function drawInEllipse(thing) {

    function drawStart(nodes, chordLength, color, start, dist = 4) {
	// dist: initial chord length
	// chordLength: target (full) chord length
	// returns: index of first unused node after taper

	const len = nodes.length;
	const numLines = chordLength - dist;     // taper length directly tied to dist
	let inc = dist;
	let j = start;

	for (let i = 0; i < numLines; i++) {
	    j = (start + i) % len;
	    const k = (j + inc) % len;
	    drawLine(nodes[j], nodes[k], color);
	    inc++;
	}

	// Return the next start index for drawWithin
	return (j + 1) % len;
    } // end drawStart
    
    
    // length = how many nodes to cover starting at `start` (not an index).
    // wrap=false (default) means: stop at length - chordLength so End can finish.
    // wrap=true means: draw the full length, allowing wraparound (used for FULL).
    function drawWithin(nodes, chordLength, color, start, length, { wrap = false } = {}) {
	const len = nodes.length;
	const numLines = wrap ? length : Math.max(0, length - chordLength);
	let j = start;

	for (let i = 0; i < numLines; i++) {
	    j = (start + i) % len;
	    const k = (j + chordLength) % len;
	    drawLine(nodes[j], nodes[k], color);
	}

	// First unused node after the last chord start
	return (j + 1) % len;
    } // end drawWithin


    function drawEnd(nodes, chordLength, color, start, length, dist = 4) {
	// Draws the taper-down phase at the end of the pattern.
	// Restores the original behavior: index increments by 2
	// so the lines thin and taper smoothly rather than abruptly.

	const len = nodes.length;
	let j, k;
	let currentSkip = chordLength;
	const numLines = Math.max(0, currentSkip - dist);

	for (let i = start, lineCount = 0; lineCount < numLines; i += 2, lineCount++) {
	    currentSkip--; // shorten chord
	    j = i % len;
	    k = (i + currentSkip + 1) % len;
	    drawLine(nodes[j], nodes[k], color);
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
            end     = nodes.length - thing.endSkip;
            length -= thing.endSkip;
	} else if (thing.endSkip < 0) {
            end     = -thing.endSkip;
            length -= thing.endSkip;
	}

	return { start, end, length };
    } // end adjustStartEnd

    const DISTANCE = 4;
    let color  = thing.color;
    let chordLength   = thing.chordLength;
    let nodes  = getEllipsePoints(thing);
    let start  = 0;
    let end    = nodes.length;
    // length = total of nodes to be done
    // it will be greater than nodes.length
    // if startSkip or endSkip is negative
    let length = end;


    // ------------------------------------------------------------
    // COMPLETE CIRCLE
    // ------------------------------------------------------------
    if (thing.withinCirc === FULL) {
        drawWithin(nodes, chordLength, color, start, length, { wrap: true });
        drawNodes(thing, nodes);
        return;
    }


    // ------------------------------------------------------------
    // ADD ARMS (START_END mode)
    // ------------------------------------------------------------
    if (Array.isArray(thing.arm1) || Array.isArray(thing.arm2)) {
        thing.withinCirc = START_END;  // enforce mode
        nodes = extendWithArms(nodes, thing.arm1, thing.arm2);
        drawWithin(nodes, chordLength, color, start, length);
        return;
    }

    ({ start, end, length } = adjustStartEnd(nodes, thing, start, end, length));

    // DRAW OUTLINE OF ELLIPSE SEGMENT
    // This draws the visible outer arc of the ellipse based on startSkip/endSkip.
    // If both skips are zero, the full ellipse is drawn. Otherwise, only the
    // partial segment between the adjusted start and end indices is shown.

    for (let i = start; i < start + length - 1; i++) {
        const j = i % nodes.length;         // current point index (wraps)
        const k = (i + 1) % nodes.length;   // next point index (wraps)
        drawLine(nodes[j], nodes[k], color);
    } // end outline loop

	    
	// START_END: no taper, draw full within segment
	if (thing.withinCirc == START_END) {
	    drawWithin(nodes,chordLength, color, start, length);
	    return;
	}

	// START_TAPER: gradual ramp-in at beginning
	if (thing.withinCirc == START_TAPER) {
	    start=drawStart(nodes,chordLength,color,start,DISTANCE);
	    drawWithin(nodes,chordLength,color,start,length-start+thing.startSkip);
	    return;
	}

	// END_TAPER: gradual ramp-out at end
	if (thing.withinCirc == END_TAPER) {
	    end = length-chordLength+DISTANCE;
	    start = drawWithin(nodes,chordLength,color,start,end);
	    drawEnd(nodes,chordLength,color,start,length-thing.startSkip);
	    return;
	}

    // TAPER: both ramp-in and ramp-out
    start = drawStart(nodes, chordLength, color, start, DISTANCE);   // fade in
    end   = length - chordLength + DISTANCE - start + thing.startSkip; // middle section
    start = drawWithin(nodes, chordLength, color, start, end);       // steady section
    drawEnd(nodes, chordLength, color, start, length);               // fade out
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
function getEllipsePoints(thing) {
    let width     = thing.ellipse.a;
    let height    = thing.ellipse.b;
    let midX      = thing.midpoint.x;
    let midY      = thing.midpoint.y;
    let rotate    = thing.rotate;
    let numNodes  = thing.numNodes;
  // --- Step 1: Local geometry setup ---
  const radiusX = width / 2;
  const radiusY = height / 2;
  const rotationRad = rotate * Math.PI / 180;
  const cosR = Math.cos(rotationRad);
  const sinR = Math.sin(rotationRad);

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
//      points[i] = pointAtAngle(theta);
//    }
//    return points;
//  }

  // --- Step 4: Otherwise, approximate equal arc-length spacing ---
  const samples = Math.max(2048, numNodes * 16);
  const samplePoints = new Array(samples + 1);
  const cumulativeLengths = new Float64Array(samples + 1);

  let cumulativeDistance = 0;
  let previousPoint = null;

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

