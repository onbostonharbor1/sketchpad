/* ====================================================================
CREATION & DRAWING ROUTINES
--------------------------------------------------------------------
createArms(thing, lines)
- Converts an array of Line objects into "arms" (arrays of Points)
  by subdividing each line based on numSteps or numNodes.

createLinesFromNodesMiddle(nodes, midpoint)
- Generates a set of radial Lines connecting a shared central
  midpoint to each Point in a provided nodes array.

createLinesFromNodesOuter(nodes)
- Generates a set of boundary Lines by connecting consecutive nodes
  in a loop (0 to 1, 1 to 2, ... last to 0).

createParab(arm1, arm2) / createParabs(thing, arms1, arms2)
- High-level wrappers for the stitcher; createParabs iterates
  through two sets of arms to build a collection of parabolas.

drawManyParabs(thing, parabs)
- Iterates through an array of pre-stitched parabolas and renders
  each one using the current style settings.

drawParab(thing, pts)
- The workhorse for single parabolas. It constructs two arms from
  input points, applies optional line transforms (like flexing),
  stitches them, and renders the result.

drawCircularParabola(thing)
- Generates the complex "Circular Parabola" pattern by stitching
  radial center-to-perimeter arms with arc-segments along the
  circumference in both directions.

drawInnerStar(thing)
- Creates a star-burst pattern by stitching radial arms to their
  immediate neighbors, reversing the direction of the second arm
  to create the characteristic star-point pinch.

drawInverseStar(thing)
- Combines radial center-to-node arms with outer perimeter arms
  to create an "inside-out" star pattern in both directions.

drawRegularPolygon(thing)
- Connects consecutive outer boundary arms with curve-stitching
  to fill the perimeter of a regular polygon with parabolas.

drawRegularPolygonCorner(thing)
- Creates parabolas anchored at each polygon vertex; it subdivides
  the outer edges and stitches the two segments meeting at the node.

drawRegularPolygonTouch(thing)
- A variation of polygon stitching where pairs of adjacent outer
  boundary arms are stitched together in a sequence.
====================================================================
*/


import { drawState } from "/draw/drawState.js";
import { Line, Point, StringThing }       from "../classes/classes.js";
import { createNodes, drawLines, drawParabs, drawNodes,
	 ptsOnLine, stitcher, getPreviousIndex, applyCutoffToParabSegments }            from "./drawUtilities.js";

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
  const lines = createLinesFromNodesOuter(nodes);
  let shortLines = [];

  // 1. Break each perimeter edge into two segments: leading-out and leading-in
  for (let i = 0; i < lines.length; i++) {
    // Segment A: from vertex to midpoint (leading out)
    shortLines.push(new Line(lines[i].start, lines[i].midpoint()));
    // Segment B: from midpoint to next vertex (leading in)
    shortLines.push(new Line(lines[i].midpoint(), lines[i].end));
  }

  const arms = createArms(thing, shortLines);
  const parabs = [];

  // 2. Pair them to center the parabola on the vertex
  // We want the end of the previous edge and the start of the current edge
  for (let i = 0; i < nodes.length; i++) {
    // The "leading in" arm of the previous edge is at index (2*i - 1)
    // The "leading out" arm of the current edge is at index (2*i)

    let prevInIdx = (2 * i - 1);
    if (prevInIdx < 0) prevInIdx = arms.length - 1; // Wrap to last "leading in" segment

    let currentOutIdx = 2 * i;

    let armA = arms[prevInIdx];   // This arm ends at the vertex
    let armB = arms[currentOutIdx]; // This arm starts at the vertex

    // To get a sharp corner, one arm must be reversed so both
    // "start" their stitching from the vertex point.
    parabs.push(stitcher(armA.toReversed(), armB));
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
