import { Point, StringThing } from "/classes/classes.js";
import { drawRegularPolygonTouch, drawInverseStar } from "/draw/drawRegular.js";
import { createNodes, createPrintNodes } from "/draw/drawUtilities.js";

export function runPattern() {
	// printTitle("Test 26");
	let s = { color: "green",
		  midpoint: new Point(110,110),
		  radius:   100,
		  numSteps: 40,
		  shorten: 15
		};
	let thing = new StringThing(s);
	drawRegularPolygonTouch(thing);

	let nodes = createNodes(thing);
	s = { color: "green",
	      midpoint: new Point(100,110),
	      rotate: 90,
	      numSteps: 40,
	      radius:   100,
	      shorten: 15
	    };
	thing = new StringThing(s);
	drawRegularPolygonTouch(thing);

	s = { color: "blue",
	      midpoint: new Point(325,240),
//	      rotate: .001,
		  radius:   180,
		  numSteps: 40,
		  shorten: 15
		};
	thing = new StringThing(s);
	drawInverseStar(thing);

	ctx.fillStyle = "blue";
	createPrintNodes(thing);
}
