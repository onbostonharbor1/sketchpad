// lots in circle

import { Point, StringThing, Line }  from "/classes/classes.js";
import { drawInCircle }        from "/draw/drawEllipse.js";
import { createNodes, drawLines, drawManyLines, drawLinesAround, ptsOnLine, stitcher } from "/draw/drawUtilities.js";
import { Ellipse, START_END, FULL, TAPER, START_TAPER, END_TAPER }
                               from "/classes/ellipseClass.js";

export function runPattern(){
	let radius = 200;
	let center = new Point(200,227);
	let s = { midpoint:     center,
	      numNodes:     200,
	      skip:         20,
	      startSkip:    0,
	      endSkip:      0,
	      withinCirc:   START_END,
	      color:        "blue",
	      radius:       radius };
	let thing    = new StringThing(s);
	let nodes    = createNodes(thing);
	let l = { pts: nodes,
		  start: 0,
		  end:   nodes.length,
		  color: "blue",
		  close: true
	};
	drawManyLines(l);
	let ptLeft   = new Point(center.x-radius,center.y);
	let ptRight  = new Point(center.x+radius,center.y);
	let line     = new Line(center,ptLeft);
	let armLeft   = ptsOnLine(thing,line);
	line         = new Line(center,ptRight);
	let armRight = ptsOnLine(thing, line);
	let nodesTop = nodes.slice(0,nodes.length/2);
	let nodesBottom = nodes.slice(nodes.length/2,nodes.length);

	let arm1 = armLeft;
	let arm2 = nodesTop.toReversed();
	// stitcher(arm1,arm2);
	drawLines(thing, stitcher(arm1,arm2));

	arm1 = armRight;
	arm2 = nodesBottom.toReversed();
	// stitcher(thing);
	drawLines(thing,stitcher(arm1,arm2));

	let numNodes = 160;
	s = { midpoint:     center,
	      numNodes:     numNodes,
	      skip:         20,
	      startSkip:    numNodes/8,
	      endSkip:      numNodes/2,
	      withinCirc:   START_END,
	      color:        "blue",
	      radius:       radius
	    };
	thing = new StringThing(s);
	drawInCircle(thing);

	numNodes = 160;
	s = { midpoint:     center,
	      numNodes:     numNodes,
	      skip:         20,
	      startSkip:    5*numNodes/8,
	      endSkip:      0,
	      withinCirc:   START_END,
	      color:        "blue",
	      radius:       radius
	    };
	thing = new StringThing(s);
	drawInCircle(thing);

	let pts = armRight.concat(nodesTop);
	let skip = 48;
	drawLinesAround(pts,skip,"brown");

	skip = 70;
	pts = nodesTop.concat(armLeft.toReversed());
	pts = pts.concat(armRight);
        drawLinesAround(pts,skip,"slategray");

	pts = armLeft.concat(nodesBottom);
	skip = 48;
	drawLinesAround(pts,skip,"brown");

	skip = 70;
	pts = nodesBottom.concat(armRight.toReversed());
	pts = pts.concat(armLeft);
    drawLinesAround(pts,skip,"slategray");
}

