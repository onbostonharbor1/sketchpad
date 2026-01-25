import { StringThing, Point } from "/classes/classes.js";
import { drawCircle, applyCutoffToParabSegments } from "/draw/drawUtilities.js";
import { drawInnerStar, drawCircularParabola } from "/draw/drawRegular.js";

export function runPattern() {
	// printTitle("Figure 60: Parabolas within a circle");
	let s = { color: "blue",
	      lineWidth: .5,
		  cutoffFrac: .05,
	      midpoint: new Point(300,300),
	      numNodes: 4,
	      numSteps: 15
	    };
	let thing = new StringThing(s);
	drawInnerStar(thing);
	// drawCircle(new Point(300,300),200,"red");
	thing.color = "green";
	drawCircularParabola(thing);
}
