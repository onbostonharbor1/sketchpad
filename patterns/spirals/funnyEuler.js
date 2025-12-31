import { drawEulerSpiral } from "/draw/drawSpirals.js";
import { Point }           from "/classes/classes";

export function runPattern() {
   	let s = { midpoint:  	new Point(350,150),
			  totalLength: 	3000,
			  numSegments:  10000,
			  scaleFactor:  15,
			  lineWidth:    1,
		  	  color:     	"blue"
		}

	drawEulerSpiral(s);
}
