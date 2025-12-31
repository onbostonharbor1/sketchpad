import { drawLogarithmicSpiral } from "/draw/drawSpirals.js";
import { Point }      from "/classes/classes";

export function runPattern() {

   	let s = { midpoint:  new Point(300,300),
			a: 			15,
			b:			.08,
			startAngle: 0,
			endAngle:	Math.PI*10,
			step:		.1,
			lineWidth:   1,
		  	color:     "blue"
		}
	drawLogarithmicSpiral(s);
}
