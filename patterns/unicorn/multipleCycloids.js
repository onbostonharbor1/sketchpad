import { StringThing, Point } from "/classes/classes.js";
import { drawCycloid } from "/draw/drawUnicorns.js";

export function runPattern() {
//	printTitle("Figure 242");
	let s = { numNodes:   150,
		midpoint:   new Point(350, 400),
		color:      "blue",
		numCycloids: 4,
		radius:      300
	      }

	let thing = new StringThing(s);
	drawCycloid(thing);
	thing.rotate = 30;
	drawCycloid(thing);
	thing.rotate = 60;
	drawCycloid(thing);
	thing.rotate = 90;
	drawCycloid(thing);
}

