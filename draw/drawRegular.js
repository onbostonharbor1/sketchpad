// createArms
// createLinesFromNodesMiddle
// createLinesFromNodesOuter
// createParab
// createParabs
// drawManyParabs
// drawParab
//
// drawCircularParabola
// drawInnerStar
// drawInverseStar
// drawRegularPolygon
// drawRegularPolygonCorner
// drawRegularPolygonTouch
import { drawState } from "/draw/drawState.js";
import { Line, Point, StringThing }       from "../classes/classes.js";
import { createNodes, drawLines, drawParabs, drawNodes,
	 ptsOnLine, stitcher, getPreviousIndex, applyCutoffToParabSegments }            from "./draw_utilities.js";

function createArms(thing, lines) {
  const arms = [];
  for (let i = 0; i < lines.length; i++) {
    arms.push(ptsOnLine(thing, lines[i]));
  }
  return arms;
}

function createLinesFromNodesMiddle(nodes, midpoint) {
  const lines = [];
  for (let i = 0; i < nodes.length; i++) {
    lines.push(new Line(midpoint, nodes[i]));
  }
  return lines;
}

function createLinesFromNodesOuter(nodes) {
  const lines = [];
  for (let i = 0; i < nodes.length; i++) {
    let j = (i + 1) % nodes.length;
    lines.push(new Line(nodes[i], nodes[j]));
  }
  return lines;
}

function createParab(arm1, arm2) {
  if (arm1.length > arm2.length) {
    [arm1, arm2] = [arm2, arm1];
  }
  let parab = stitcher(arm1, arm2);
  return parab;
}

function createParabs(thing, arms1, arms2) {
  if (arms1.length > arms2.length) {
    [arms1, arms2] = [arms2, arms1];
  }
  const parabs = [];
  for (let i = 0; i < arms1.length; i++) {
    parabs.push(stitcher(arms1[i], arms2[i]));
  }
  return parabs;
}

function drawManyParabs(thing, parabs) {
  parabs.forEach((parab) => drawParab(thing, parab));
}

function drawAParab(thing, line1, line2) {
    const pts = [line1.start, line1.end, line2.start, line2.end];
    drawParab(thing,pts);
}

/* ============================================================
   drawParab(thing, pts)
   ------------------------------------------------------------
   PURPOSE
   - Build two arms from two lines and stitch them into a parabola.
   - Apply cutoff AFTER stitching and BEFORE drawing.

   HOW cutoff works (high level)
   - stitcher(arm1, arm2) returns an array of points (the “segments”).
   - applyCutoffToParabSegments trims the LAST k points from that array.
   - This prevents the last few lines from “running the circularity”
     near the end where the stitch converges toward the arc.

   NOTE
   - arm1.length is passed as armPointCount only as an available anchor.
     Your current applyCutoff function doesn’t actually require it, but
     it’s fine to pass it for future tuning.
   ============================================================ */
function drawParab(thing, pts) {

  if (pts.length === 3) pts.splice(1, 0, pts[1]);

  // Build the two defining lines
  const line1 = new Line(pts[0], pts[1]);
  const line2 = new Line(pts[2], pts[3]);

  // Build arms. Don't transform first line.
  const savedTransform = thing.lineTransform;
  thing.lineTransform = 0;
  const arm1 = ptsOnLine(thing, line1);

  // Restore transform for second line.
  thing.lineTransform = savedTransform;
  const arm2 = ptsOnLine(thing, line2);

  // Stitch into a parabola (array of points)
  let parab = stitcher(arm1, arm2);

  // Apply cutoff here (this is the only new behavior)
  // parab = applyCutoffToParabSegments(thing, parab, arm1.length);

  // Draw the (possibly trimmed) parabola
  drawLines(thing, parab);

} // end drawParab



function drawCircularParabola(thing) {

  const numSteps = thing.numSteps;

  // ------------------------------------------------------------
  // Arms1: radial arms from center to the N polygon nodes
  // ------------------------------------------------------------
  const origNodes = thing.numNodes;

  let nodes = createNodes(thing);
  const linesInner = createLinesFromNodesMiddle(nodes, thing.midpoint);
  const arms1 = createArms(thing, linesInner);

  // ------------------------------------------------------------
  // Arms2: subdivide the circle perimeter into N arc-arms,
  // each with (numSteps + 1) points INCLUDING BOTH ENDPOINTS.
  // ------------------------------------------------------------
  thing.numNodes = origNodes * numSteps;
  nodes = createNodes(thing);

  // Confining circle
  drawNodes(thing, nodes);

  function buildWrappedArm(circleNodes, startIndex, steps) {
    const arm = [];
    for (let k = 0; k <= steps; k++) {
      arm.push(circleNodes[(startIndex + k) % circleNodes.length]);
    }
    return arm;
  } // end buildWrappedArm

  let arms2 = [];
  for (let i = 0; i < nodes.length; i += numSteps) {
    arms2.push(buildWrappedArm(nodes, i, numSteps));
  }

  // ------------------------------------------------------------
  // Clockwise set (apply cutoff HERE)
  // ------------------------------------------------------------
  let parabs = createParabs(thing, arms1, arms2);

  if (thing.cutoffFrac > 0 || (thing.cutoffLines !== null && thing.cutoffLines !== undefined)) {
    const armPointCount = numSteps + 1;
    parabs = parabs.map(p => applyCutoffToParabSegments(thing, p, armPointCount));
  }

  drawParabs(thing, parabs);

  // ------------------------------------------------------------
  // Counter-clockwise set (apply cutoff again)
  // ------------------------------------------------------------
  for (let arm of arms2) arm.reverse();
  arms2 = [arms2[arms2.length - 1], ...arms2.slice(0, -1)];

  parabs = createParabs(thing, arms1, arms2);

  if (thing.cutoffFrac > 0 || (thing.cutoffLines !== null && thing.cutoffLines !== undefined)) {
    const armPointCount = numSteps + 1;
    parabs = parabs.map(p => applyCutoffToParabSegments(thing, p, armPointCount));
  }

  drawParabs(thing, parabs);

  // Restore original polygon node count
  thing.numNodes = origNodes;

} // end drawCircularParabola

function drawInnerStar(thing) {
  const nodes = createNodes(thing);
  const lines = createLinesFromNodesMiddle(nodes, thing.midpoint);
  const arms = createArms(thing, lines);
  const parabs = [];
  for (let i = 0; i < arms.length; i++) {
    let j = (i + 1) % arms.length;
    parabs.push(stitcher(arms[i], arms[j].toReversed()));
  }
  drawParabs(thing, parabs);
  //  displayPoint(thing.midpoint);
}

function drawInverseStar(thing) {
  const nodes = createNodes(thing);
  const linesInner = createLinesFromNodesMiddle(nodes, thing.midpoint);
  let linesOuter = createLinesFromNodesOuter(nodes);
  const arms1 = createArms(thing, linesInner);
  let arms2 = createArms(thing, linesOuter);
  let parabs = createParabs(thing, arms1, arms2);
  drawParabs(thing, parabs);
  // do clockwise
  linesOuter.forEach((line) => {
    const temp = line.start;
    line.start = line.end;
    line.end = temp;
  });
  arms2 = createArms(thing, linesOuter);
  arms2 = [arms2[arms2.length - 1], ...arms2.slice(0, -1)];
  parabs = createParabs(thing, arms1, arms2);
  drawParabs(thing, parabs);
  // displayPoint(thing.midpoint);
}

function drawRegularPolygon(thing) {
  const nodes = createNodes(thing);
  const lines = createLinesFromNodesOuter(nodes);
  const arms = createArms(thing, lines);
  const parabs = [];
  for (let i = 0; i < arms.length; i++) {
    let j = (i + 1) % arms.length;
    parabs.push(stitcher(arms[i], arms[j]));
  }
  drawParabs(thing, parabs);
}

/*****************************************************
 * drawRegularPolygonCorner
 *   From each node, draw a curve-stitch parabola. The
 *   arms begin at the node and go halfway to to the
 *   next and previous line
 ****************************************************/
function drawRegularPolygonCorner(thing) {
  const nodes = createNodes(thing);
  let lines = createLinesFromNodesOuter(nodes);
  let shortLines = [];
  // Divide each connecting line into two parts
  for (let i = 0; i < lines.length; i++) {
    shortLines.push(new Line(lines[i].start, lines[i].midpoint()));
    shortLines.push(new Line(lines[i].midpoint(), lines[i].end));
  }
  // For each of these lines, figure out the where
  // each point it
  const arms = createArms(thing, shortLines);
  // Construct each parabola
  const parabs = [];
  for (let i = 0; i < arms.length; i += 2) {
    let armA = arms[i];
    let armB = arms[getPreviousIndex(i, arms.length)];
    parabs.push(stitcher(armA, armB));
  }
  drawParabs(thing, parabs);
}

function drawRegularPolygonTouch(thing) {
  const nodes = createNodes(thing);
  const lines = createLinesFromNodesOuter(nodes);
  const arms = createArms(thing, lines);
  const parabs = [];
  let length = thing.numNodes;
  if (length % 2 == 1) length--;
  for (let i = 0; i < length; i += 2) {
    parabs.push(stitcher(arms[i], arms[i + 1]));
  }
  drawParabs(thing, parabs);
}

export {
    drawAParab,
    drawCircularParabola,
    drawInnerStar,
    drawInverseStar,
    drawManyParabs,
    drawParab,
    drawRegularPolygon,
    drawRegularPolygonCorner,
    drawRegularPolygonTouch
};
