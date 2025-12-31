import { drawPureSpiralB } from "/draw/drawSpirals.js";
import { Point }           from "/classes/classes";

export function runPattern() {
   	let s = { radius:    5,                    // this is a start radius
			  gap:		 6,
			  ptsToDraw: 200,
	      	  midpoint:  new Point(200,300),
			  color:     "blue"
	    }
	drawPureSpiralB(s);
}
