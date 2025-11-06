// createNodes
// displayPoint
// drawCircle
// drawLine
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

const toRadians = (deg) => deg * (Math.PI / 180);
const toDegrees = (rad) => rad * (180 / Math.PI);

/////////////////////////////////////////////////////////////////
// createNodes
/////////////////////////////////////////////////////////////////
/* OK */
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

/* OK */
function drawNodes(nodes, color) {
  for (let i = 0; i < nodes.length; i++) {
    let j = (i + 1) % nodes.length;
    drawLine(nodes[i], nodes[j], color);
  }
}

/* OK */
function drawParabs(thing, parabs) {
  for (let parab of parabs) {
    if (parab.length == 3) parab.splice(1, 0, parab[1]);
    for (let j = 0; j < parab.length; j++) {
      let start = parab[j].start;
      let end = parab[j].end;
      drawLine(start, end, thing.color, thing.lineWidth);
    }
  }
}

/* OK */
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

/* OK */
function drawCircle(midpoint, radius, color = "black", width = 1) {
  save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  beginPath();
  arc(midpoint.x, midpoint.y, radius, 0, (Math.PI / 180) * 360);
  stroke();
  restore();
} // end drawCircle

/* OK */
function drawLine(point1, point2, color = "blue", lineWidth = 1) {
  //    pt1 = numbersToPoints(point1);
  //    pt2 = numbersToPoints(point2);
  let pt1 = point1;
  let pt2 = point2;

  save();
  beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  moveTo(pt1.x, pt1.y);
  lineTo(pt2.x, pt2.y);
  stroke();
  closePath();
  restore();
} // end drawLine

/* OK */
function printCircNum(pt, num = 9999) {
  drawCircle(pt, 8, "black");
  save();
  ctx.fillStyle = "black";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (num == 9999) {
    fillText(drawState.ctr, pt.x, pt.y);
    drawState.ctr++;
  } else fillText(num, pt.x, pt.y);
  restore();
}

/* OK */
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

/* OK */
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
/* */
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
  const halfLen = start.lengthBetween(end) / 2;

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

    const firstHalf = ptsOnStraightLine(start, mid, Math.floor(numSteps / 2));
    const secondHalf = ptsOnStraightLine(mid, bendPt, Math.ceil(numSteps / 2));
    return [...firstHalf, ...secondHalf.slice(1)];
  }

  // fallback → straight
  return ptsOnStraightLine(start, end, numSteps);
}

/* ?? */
function getPreviousIndex(i, length) {
  return i === 0 ? length - 1 : i - 1;
}

//////////////////////////////////////////////////////////////////
// numbersToPoints
//////////////////////////////////////////////////////////////////
/* ok */
function numbersToPoints(coords) {
  if (Array.isArray(coords)) {
    let nodes = [];
    for (let i = 0; i < coords.length; i++) {
      if (typeof coords[i] == "number") {
        nodes.push(drawState.pts[coords[i]]);
      } else {
        nodes.push(coords[i]);
      }
    }
    return nodes;
  }
  if (typeof coords == "number") return drawState.pts[coords];
  else return coords;
}
