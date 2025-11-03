// createNodes
// displayPoint
// drawCircle
// drawLine
// drawNodes
// drawParabs
// getLineEquation ?
// getPreviousIndex (obsolete?)
// inchesToPixels (will move to utilities)
// lineIntersect (obsolte -- now in class)
// numbersToPoints
// printCircNum
// printTitle
// ptsOnLine
// rotatePoint (obsolete--now in class?)
// shortenArms (obsolete)
// stitcher
// toDegrees
// toRadians

// CONSTANTS AND GLOBALS
const blue      = "blue";

const FULL        = 0;
const TAPER       = 1;
const START_TAPER = 2;
const END_TAPER   = 3;


/////////////////////////////////////////////////////////////////
// createNodes
/////////////////////////////////////////////////////////////////
function createNodes(thing) {
    const nodes = [];
    const { midpoint, radius, numNodes, rotate, xScale, yScale } = thing;

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

function drawNodes(nodes,color){
    for (let i=0; i<nodes.length;i++) {
	let j = (i+1) % nodes.length;
	drawLine(nodes[i],nodes[j],color);
    }
}


function drawParabs(thing,parabs) {
    for (let parab of parabs) {
	if (parab.length == 3)
	    parab.splice(1,0, parab[1]);
	for (let j=0; j<parab.length;j++) {
	    let start = parab[j].start;
	    let end   = parab[j].end;
	    drawLine(start,end,thing.color,thing.lineWidth);
	}
    }
}

function displayPoint(x, y, color = 'yellow') {
  /**
   * Draws a circle on the canvas with a default radius of 2 and a default color of yellow.
   *
   * @param {number} x The x-coordinate of the circle's center.
   * @param {number} y The y-coordinate of the circle's center.
   * @param {string} [color='yellow'] The fill color of the circle. Defaults to 'yellow'.
   */
  const radius = 2;

  beginPath();
  arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawCircle(midpoint,radius, color="black",width=1) {
    save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    beginPath();
    arc(midpoint.x,midpoint.y, radius,0, (Math.PI/180)*360);
    stroke();
    restore();
} // end drawCircle


function drawLine(point1,point2,color="blue",lineWidth=1) {
//    pt1 = numbersToPoints(point1);
//    pt2 = numbersToPoints(point2);
    let pt1 = point1;
    let pt2 = point2;

    save();
    beginPath();
    ctx.strokeStyle = color;;
    ctx.lineWidth = lineWidth;
    moveTo(pt1.x,pt1.y);
    lineTo(pt2.x,pt2.y);
    stroke();
    closePath();
    restore();
} // end drawLine

function printCircNum(pt,num=9999) {
    drawCircle(pt,8,"black");
    save();
    ctx.fillStyle = "black";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (num==9999) {
	fillText(drawState.ctr,pt.x,pt.y);
	drawState.ctr++;
    } else 
	fillText(num,pt.x,pt.y);
    restore();
}


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


/////////////////////////////////////////////////////////////////
// shortenArms
/////////////////////////////////////////////////////////////////
function shortenArms(thing) {
    // thing.shorten is the percent to shorten.
    // I want the amount left
    let shorten = (100 - thing.shorten)/100;
    let deltaX = Math.abs(thing.arm1[thing.arm1.length-1].x - thing.arm1[0].x);
    let length = shorten*deltaX;
    let j = 0;
    for (let i=0; i < thing.arm1.length -1; i++) {
	deltaX = Math.abs((thing.arm1[i].x - thing.arm1[0].x));
	if (deltaX > length ) {
	    j = i;
	    break;
	}
    }
    if (j==0) j=thing.arm1.length -1;;
    thing.arm1.length=j;
    thing.arm2.splice(j,thing.arm2.length-1);
    if (thing.arm2.length < thing.arm1.length)
	thing.arm2.splice(0,j-1);
}

function stitcher(arm1, arm2) {
    if (arm1.length > arm2.length) {
        [arm1, arm2] = [arm2, arm1];
    }
    const lines = [];
    for (let i = 0; i < arm1.length - 1; i++) {
        lines.push(new Line(arm1[i], arm2[i + 1]));
    }
    return lines;
}


/**
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
  const { numSteps } = thing;
  if (numSteps <= 0) return [];

  const { type = "straight", angle = 0 } = thing.lineTransform || {};
  const { start, end } = line;

  // --- base helper: straight interpolation ---
  function ptsOnStraightLine(p1, p2, steps) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push(new Point(
        p1.x + (p2.x - p1.x) * t,
        p1.y + (p2.y - p1.y) * t
      ));
    }
    return pts;
  }

  // --- deflection helper ---
  const angleRad = toRadians(angle);
  function deflectPoint(origin, angle, distance) {
    return new Point(
      origin.x + distance * Math.cos(angle),
      origin.y + distance * Math.sin(angle)
    );
  }

  // --- dispatcher ---
  if (type === "straight") {
    return ptsOnStraightLine(start, end, numSteps);
  }

  const mid = start.midpointBetween(end);
  const baseAngle = Math.atan2(end.y - start.y, end.x - start.x);
  const halfLen = start.lengthBetween(end) / 2;

  if (type === "flexAtMiddle") {
    // bend point off to the side, but endpoints fixed
    const bendPt = deflectPoint(mid, baseAngle + Math.PI / 2, halfLen * Math.sin(angleRad));

    const firstHalf = ptsOnStraightLine(start, bendPt, Math.floor(numSteps / 2));
    const secondHalf = ptsOnStraightLine(bendPt, end, Math.ceil(numSteps / 2));
    return [...firstHalf, ...secondHalf.slice(1)];
  }

  if (type === "bendAtMid") {
    // bend point becomes new endpoint
    const bendPt = deflectPoint(mid, baseAngle + angleRad, halfLen);

    const firstHalf = ptsOnStraightLine(start, mid, Math.floor(numSteps / 2));
    const secondHalf = ptsOnStraightLine(mid, bendPt, Math.ceil(numSteps / 2));
    return [...firstHalf, ...secondHalf.slice(1)];
  }

  // fallback → straight
  return ptsOnStraightLine(start, end, numSteps);
}


function getPreviousIndex(i, length) {
  return (i === 0) ? length - 1 : i - 1;
}


//NOT USED
function inchesToPixels() {
    let inches = prompt("What is the widest dimension in inches");
    alert (inches*300);
}



//NOT USED
function getLineEquation(pt1,pt2) {
    if (pt2.x - pt1.x === 0) {  // handle vertical line
	return {slope:0, b: 0} ;
//	return `x = ${pt1.x}`; // Equation for a vertical line
    }
    
    const m = (pt2.y - pt1.y) / (pt2.x - pt1.x);
    const b = pt1.y - m * pt1.x; // Calculate the y-intercept

    return `y = ${m}x + ${b}`;
}


/////////////////////////////////////////////////////////////////
// lineIntersection
/////////////////////////////////////////////////////////////////
//NOT USED
function lineIntersect(p1, p2, p3, p4) {
    var c2x = p3.x - p4.x; // (x3 - x4)
    var c3x = p1.x - p2.x; // (x1 - x2)
    var c2y = p3.y - p4.y; // (y3 - y4)
    var c3y = p1.y - p2.y; // (y1 - y2)
  
    // down part of intersection point formula
    var d  = c3x * c2y - c3y * c2x;
  
    if (d == 0) {
    	throw new Error('Number of intersection points is zero or infinity.');
    }
  
    // upper part of intersection point formula
    var u1 = p1.x * p2.y - p1.y * p2.x; // (x1 * y2 - y1 * x2)
    var u4 = p3.x * p4.y - p3.y * p4.x; // (x3 * y4 - y3 * x4)
  
    // intersection point formula
    var px = (u1 * c2x - c3x * u4) / d;
    var py = (u1 * c2y - c3y * u4) / d;
    var p = { x: px, y: py };
  
    return p;
}

//////////////////////////////////////////////////////////////////
// numbersToPoints
//////////////////////////////////////////////////////////////////
    function numbersToPoints(coords) {
	if (Array.isArray(coords)) {
	    let nodes = [];
	    for (let i=0;i<coords.length;i++){
		if (typeof(coords[i]) == "number") {
		    nodes.push(drawState.pts[coords[i]]);
		} else {
		    nodes.push(coords[i]);
		}
	    } 
	    return nodes;
	}
	if (typeof(coords) == "number")
	    return drawState.pts[coords];
	else return coords;
    }

//NOT USED
function rotatePoint(start, end, angle){
    let cos = Math.cos(angle);
    let sin = Math.sin(angle);
    let x = (cos*(end.x - start.x)) + (sin*(end.y - start.y)) + start.x;
    let y = (cos*(end.y - start.y)) - (sin*(end.x - start.x)) + start.y;
    return new Point(x,y);
}


const toRadians = deg => deg * (Math.PI / 180);
const toDegrees = rad => rad * (180 / Math.PI);







