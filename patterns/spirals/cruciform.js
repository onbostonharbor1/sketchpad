import { drawSpiral } from "/draw/drawSpirals.js";
import { Point }      from "/classes/classes";

export function runPattern(){
	let coord1  = new Point(200,100);
	let coord2  = new Point(300,100);
	let coord3  = new Point(300,200);
	let coord4  = new Point(400,200);
	let coord5  = new Point(400,300);
	let coord6  = new Point(300,300);
	let coord7  = new Point(300,400);
	let coord8  = new Point(200,400);
	let coord9  = new Point(200,300);
	let coord10 = new Point(100,300);
	let coord11 = new Point(100,200);
	let coord12 = new Point(200,200);
	let container = [coord1,coord2,coord3,coord4,coord5,coord6,
		    coord7,coord8,coord9,coord10,coord11,coord12];
//	  nodes.pop();
	let s = { color:     "blue",
			interval:  20,
			container: container,
//	      interval: [25,18,21,24],
			numSteps:  30
  };  // funny triangle
	drawSpiral(s);
}
