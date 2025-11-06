// createArms
// createLinesFromNodesMiddle
// createLinesFromNodesOuter
// createParab
// createParabs
// drawLines (move to draw_utilities?)
// drawManyParabs
// drawParab
//
// drawCircularParabola
// drawInnerStar
// drawInverseStar
// drawRegularPolygon
// drawRegularPolygonCorner
// drawRegularPolygonTouch

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

function drawLines(thing, lines) {
  for (let i = 0; i < lines.length; i++) {
    drawLine(lines[i].start, lines[i].end, thing.color, thing.lineWidth);
  }
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

function drawParab(thing, pts) {
  if (pts.length == 3) pts.splice(1, 0, pts[1]);
  const line1 = new Line(pts[0], pts[1]);
  const line2 = new Line(pts[2], pts[3]);
  let lineTransform = thing.lineTransform;
  thing.lineTransform = 0;
  let arm1 = ptsOnLine(thing, line1);
  thing.lineTransform = lineTransform;
  let arm2 = ptsOnLine(thing, line2);
  const parab = createParab(arm1, arm2);
  drawLines(thing, parab);
}

function drawCircularParabola(thing) {
  const numSteps = thing.numSteps;
  let nodes = createNodes(thing);
  const linesInner = createLinesFromNodesMiddle(nodes, thing.midpoint);
  const arms1 = createArms(thing, linesInner);

  const origNodes = thing.numNodes;
  thing.numNodes = origNodes * numSteps;
  nodes = createNodes(thing);
  drawNodes(nodes, thing.color);
  let arms2 = [];
  for (let i = 0; i < nodes.length; i += numSteps) {
    arms2.push(nodes.slice(i, i + numSteps));
  }
  let parabs = createParabs(thing, arms1, arms2);
  drawParabs(thing, parabs);

  // now draw counter-clockwise
  for (let arm of arms2) {
    arm.reverse();
  }
  arms2 = [arms2[arms2.length - 1], ...arms2.slice(0, -1)];
  parabs = createParabs(thing, arms1, arms2);
  drawParabs(thing, parabs);
}

function drawInnerStar(thing) {
  const nodes = createNodes(thing);
  const lines = createLinesFromNodesMiddle(nodes, thing.midpoint);
  const arms = createArms(thing, lines);
  const parabs = [];
  for (let i = 0; i < arms.length; i++) {
    j = (i + 1) % arms.length;
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
    j = (i + 1) % arms.length;
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
