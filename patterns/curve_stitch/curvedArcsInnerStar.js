import { Line, Point, StringThing } from "/classes/classes.js";
import { drawState }                from "/draw/drawState.js";
import { arcPoints }                from "/draw/drawEllipse.js";
import {
  createPrintNodes,
  _m,
  ptsOnLine,
  comparePoints,
  drawLine
} from "/draw/drawUtilities.js";

export function runPattern() {

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.fillStyle = "black";

  let mid = new Point(300, 300);

  let s = {
    numSteps: 20,
    numNodes: 6,
    midpoint: mid,
    color: "blue",
    rotate: 30,
    lineWidth: 0.4
  };

  let thing = new StringThing(s);

  let nodes = createPrintNodes(thing);

  // // ------------------------------------------------------------
  // // Arm1: spokes from center to each node
  // // ------------------------------------------------------------
  let Arm1 = [];
  let Arm2 = [];
  let Arm3 = [];
  for (let i = 0; i < drawState.pts.length; i++) {
    Arm1.push(ptsOnLine(thing, new Line(mid,drawState.pts[i])))
  }
  for (let i = 0; i < drawState.pts.length; i++) {
      let j = (i+1) % nodes.length;
    Arm2.push(arcPoints(drawState.pts[i], drawState.pts[j], 0.7, thing.numSteps + 1));
  }
  for (let i = 0; i < drawState.pts.length; i++) {
    Arm3.push(ptsOnLine(thing, new Line(drawState.pts[i], mid)))
  }

  let loops = [];
  for (let i = 0; i < nodes.length; i++) {
    let temp = Arm1[i].concat(Arm2[i]);
    let j = (i+1) % nodes.length;
    temp = temp.concat(Arm3[j]);
    loops.push(temp);
  }


  // // draw outside arcs
  for (let i = 0; i < Arm2.length; i++) {
    for (let j = 0; j < Arm2[i].length - 1; j++) {
      drawLine(Arm2[i][j], Arm2[i][j+1], "blue");
    }
  }

  // // ------------------------------------------------------------
  // // BLUE: first stitching pass
  // // ------------------------------------------------------------
  let startPos = thing.numSteps+2;
  let color = "blue";

  for (let i = 0; i < loops.length; i++) {
    for (let j = 0; j < loops[i].length - startPos; j++) {
      drawLine(loops[i][j], loops[i][j + startPos], color);
    }
  }


  // ------------------------------------------------------------
  // GREEN: second stitching pass (FIXED INDEXING)
  // ------------------------------------------------------------
  color = "green";

  for (let i = 0; i < loops.length; i++) {

    let length    = loops[i].length;
    let armLength = Arm1[i].length;

    // rotate the loop so the end arm is moved to the front
    let tail = loops[i].slice(-armLength);
    let head = loops[i].slice(0, armLength);

    loops[i] = tail.concat(loops[i]);
    loops[i] = loops[i].concat(head);

    for (let j = 0; j < length; j += 2) {

      drawLine(loops[i][j], loops[i][j + armLength + 1], color);

      // FIX: use armLength + 1 consistently (NOT startPos)
      if ((j + armLength + 1) < loops[i].length - 1) {
        if (comparePoints(loops[i][j], loops[i][j + 1])) j++;
        if (comparePoints(loops[i][j + armLength + 1], loops[i][j + armLength + 2])) j++;
      }
    }
  }

} // end runPattern
