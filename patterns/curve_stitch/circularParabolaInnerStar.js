import { StringThing, Point } from "/classes/classes.js";
import { drawCircle } from "/draw/draw_utilities.js";
import { drawInnerStar, drawCircularParabola } from "/draw/drawRegular.js";

export function runPattern() {
	// printTitle("Figure 60: Parabolas within a circle");
	let s = { color: "red",
	      both: true,
	      lineWidth: .5,
	      midpoint: new Point(300,300),
	      numNodes: 4,
	      numSteps: 20
	    };
	let thing = new StringThing(s);
	drawInnerStar(thing);
	drawCircle(new Point(300,300),200,"red");
	drawCircularParabola(thing);
}
