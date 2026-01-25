import { Ellipse, START_END, FULL, TAPER, START_TAPER, END_TAPER }
                       from "/classes/ellipseClass.js";
import { Point }       from "/classes/classes.js";
import { createNodes, drawLines, drawLine, drawNodes }
                       from "/draw/drawUtilities.js";

export function runPattern() {
	// printTitle("Figure 209a");
	let radius = 200;
	let center = new Point(200,227);
	let s = { midpoint:     center,
	      numNodes:     200,
	      skip:         20,
	      startSkip:    0,
	      endSkip:      0,
	      withinCirc:   FULL,
	      color:        "black",
        lineWidth:    .5,
	      radius:       radius };
	let thing = new Ellipse(s);
	let nodes = createNodes(thing);
  drawNodes(thing,nodes);
  thing.lineWidth = 1;
  // true means CLOsE
	drawLines(nodes,0,nodes.length,"blue", true);

	let skip = 16;
	let ctr  = 0;
	for (let i=0; i < 2*nodes.length; i++) {
	    let j = i % nodes.length;
	    let k = i+skip;
	    k = k % nodes.length;
	    drawLine(nodes[j], nodes[k], "blue");
	    ctr++;
	    if (ctr==10){
			skip+=2;
			ctr = 0;
	    }
	}
}
