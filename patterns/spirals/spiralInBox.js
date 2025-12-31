import { drawSpiral } from "/draw/drawSpirals.js";
import { Point }      from "/classes/classes";

export function runPattern(){
	let coord110 = new Point(100,100);
	let coord111 = new Point(500,100);
	let coord112 = new Point(500,500);
	let coord113 = new Point(100,500);
    let container = [coord110,coord111,coord112,coord113];
	let s = { 	color:     "blue",
				interval:  20,
				container: container,
//	      		interval: [25,18,21,24],
				numSteps:  30
        };
	  drawSpiral(s);
}
