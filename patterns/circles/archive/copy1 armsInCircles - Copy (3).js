import { Ellipse, START_END, FULL, TAPER, START_TAPER, END_TAPER }
                               from "/classes/ellipseClass.js";
import { Line, Point }         from "/classes/classes.js";
import { createNodes, drawLine, drawLines, ptsOnLine, stitcher, printCircNum }
                               from "/draw/draw_utilities.js";
import { drawInCircle }        from "/draw/drawEllipse.js";

export function runPattern() {
	// printTitle("Figure 209");
	let radius = 200;
	let center = new Point(200,227);
	let s = { midpoint:     center,
	      numNodes:     150,
        lineWidth:    .6,
	      rotate:       0,
	      chordLength:  40,
	      startSkip:    0,
	      endSkip:      0,
	      withinCirc:   START_END,
	      color:        "#5a6673",
	      radius:       radius };
	let thing       = new Ellipse(s);
	let pt          = new Point(center.x+radius/2, center.y);
	thing.numSteps = 21;
	let line        = new Line(center,pt);
	thing.arm1      = ptsOnLine(thing,line);
	let arm1        = thing.arm1;
	drawInCircle(thing);

	s = { midpoint:     center,
	      numNodes:     150,
        lineWidth:    .5,
	      rotate:       0,
	      chordLength:  21,
	      startSkip:    30,
	      endSkip:      0,
	      withinCirc:   START_END,
	      color:        "black",
	      radius:       radius };
	thing = new Ellipse(s);
	thing.numSteps = 21;
	thing.arm2      = ptsOnLine(thing,line);
	let arm2        = thing.arm2;
	drawInCircle(thing);

	s = { midpoint:     center,
	      numNodes:     150,
	      lineWidth:    .3,
	      chordLength:  50,
	      startSkip:    0,
	      endSkip:      0,
	      withinCirc:   START_END,
	      color:        "#acb5bf",
	      radius:       radius };
	thing = new Ellipse(s);
	drawInCircle(thing);

 	s = { midpoint:     center,
	      numNodes:     150,
	      chordLength:  50,
	      startSkip:    0,
	      endSkip:      0,
	      withinCirc:   START_END,
	      color:        "black",
	      radius:       radius/2 };
	thing     = new Ellipse(s);
	let nodes = createNodes(thing);
	drawLine(nodes[0],nodes[nodes.length-1], "black");

	thing.arm1 = arm1;
	let start  = nodes.length/4;
	let end    = start+22;
	thing.arm2 = nodes.slice(start,end);
  arm2 = thing.arm2;
  thing.lineWidth = .5;
	drawLines(thing, stitcher(arm1,arm2));

	thing.arm1 = arm2;
	start      = 3*nodes.length/4-2;
	end        = start+22;
	thing.arm2 = nodes.slice(start,end);
  arm2       = thing.arm2.reverse();
	drawLines(thing, stitcher(arm1,arm2));
}
