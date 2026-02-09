import { drawPureSpiral } from "/draw/drawSpirals.js";
import { Point }          from "/classes/classes";

export function runPattern(){
	let s = { 	radius:    	  5,          // this is a start radius
			    angle: 		  0,					// how fast spiral expands
			    spread:		  6,
			    maxAngle:	  Math.PI*10,  // 5 full turns
	      	    midpoint:  	  new Point(200,300),
				lineWidth:	  1,
	      	    color:        "blue"
	    }
	drawPureSpiral(s);
}

