import { drawSpiral } from "/draw/drawSpirals.js";
import { Point }      from "/classes/classes";

export function runPattern(){
	let coord120 = new Point(250,50);
	let coord121 = new Point(500,275);
	let coord122 = new Point(250,500);
	let coord123 = new Point(0,275);
	let container = [coord120,coord121,coord122,coord123];
	let s = { color:     "blue",
		container:	container,
		interval:  20,
		numSteps:  30
		};

	drawSpiral(s);
}
