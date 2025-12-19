// cycloid.js
import { Point, StringThing } from "../../classes/classes";
import { drawCycloid } from "../../draw/unicorns";

export function runPattern() {
	let s = { numNodes:   240,
	          midpoint:   new Point(400, 320),
		      color:      "blue",
		      numCycloids: 1,
//		      xScale:    1.3,
//		      yScale:    .8,
		      radius:      250
	      }

	  let thing = new StringThing(s);
	  drawCycloid(thing);
}
