import { Point, StringThing, Line } from "/classes/classes.js";
import { createNodes, ptsOnLine, stitcher, drawLine, drawLines }
                                  from "/draw/drawUtilities.js";

    // Circle in square

export function runPattern() {
	let mid = new Point(275,300);
	let numNodes = 232;
	let s = {
                radius:   150,
	            color:    "green",
	            midpoint: mid,
	            rotate:   90,
	            numNodes: numNodes
	    };
	let step = numNodes/4;
	let thing = new StringThing(s);
	let nodes = createNodes(thing);   // ?
	s = {
            radius:   300,
	        color:    "green",
	        midpoint: mid,
	        numSteps: (numNodes/4) - 1,
	        rotate:   45,
            lineWidth: .8,
	        numNodes: 4
	    };
	thing = new StringThing(s);

	let nodesSquare = createNodes(thing);
	let k = 0;
	for (let i=0; i<nodesSquare.length; i++) {
	    let j = i+1;
	    if (j==4) j = 0;
        let line = new Line(nodesSquare[i],nodesSquare[j]);
	    let arm1 = ptsOnLine(thing,line);
	    let arm2 = nodes.slice(k,k+step);
	    k+=step;
	    drawLines(thing,stitcher(arm1, arm2));
	    drawLine(nodesSquare[i],nodesSquare[j],thing.color);
	}
	mid = new Point(200,350);
	for (let i=0;i<nodes.length;i+=2) {
	    drawLine(mid,nodes[i],"#6bb56b");
	}
}
