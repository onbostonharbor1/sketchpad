import { drawPureSpiralA } from "/draw/drawSpirals.js";
import { Point }          from "/classes/classes";


export function runPattern() {
   	let s = { radius:   5,                    // this is a start radius
	      midpoint:     new Point(200,300),
		  gap:		    6,
		  numRotations: 8,
		  lineWidth:    1,
	      color:        "blue"
	    }
	drawPureSpiralA(s);
}
