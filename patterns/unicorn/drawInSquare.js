import { Point, StringThing, Line } from "/classes/classes.js";
import { createNodes, ptsOnLine, drawLine }
                                  from "/draw/drawUtilities.js";

// drawing in square

export function runPattern() {
	let s = { color:    "blue",
	          midpoint: new Point(250,250),
	          radius:   300,
	          numNodes: 4,
	          rotate:   45,
	          numSteps: 36
	        }
	let thing = new StringThing(s);
	let nodes = createNodes(thing);
	for (let i=0; i < nodes.length; i++) {
	    let j = (i+1) % nodes.length;
	    drawLine(nodes[i],nodes[j], "blue");
	}

	let arms = [];
	for (let i=0;i<nodes.length;i++) {
	    let j = (i+1) % nodes.length;
        let line = new Line(nodes[i],nodes[j]);
	    arms.push(ptsOnLine(thing,line));
	}
	let arm = arms[0];
	for (let i=1;i<arms.length;i++) {
	    arm = arm.concat(arms[i]);
	}
	arm = arm.concat(arm);
	for (let i=0; i<6*arms[0].length; i++) {
        drawLine(arm[i],
                 arm[i+arms[0].length+18],
               " blue");
	}
}

