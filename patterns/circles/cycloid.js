// cycloid.js
import { Point, StringThing } from "/classes/classes.js";
import { drawCycloid } from "/draw/drawUnicorns.js";

export function runPattern() {
	let s = { numNodes:   240,
	          midpoint:   new Point(250, 250),
		      color:      "blue",
		      numCycloids: 1,
//		      xScale:    1.3,
//		      yScale:    .8,
		      radius:      200
	      }

	  let thing = new StringThing(s);
	  drawCycloid(thing);
}
