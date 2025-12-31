import { Point, StringThing }     from "/classes/classes.js";
import { drawState }              from "/draw/drawState.js";
import { drawLine, drawManyParabs, printCircNum }
                                  from "/draw/draw_utilities.js";

export function runPattern() {
  let x = 50;
	let y = 100;
	let yOffset = 100;
	let xRight = x+500;
	let yLeft  = y+500;
	ctx.fillStyle="black";
	drawState.pts[0] = new Point(x,y);
	drawState.pts[1] = new Point(x,yLeft);
	drawState.pts[2] = new Point(xRight+100, y+yOffset);
	drawState.pts[3] = new Point(xRight, yLeft-yOffset);
	for (let i=0; i < drawState.pts.length; i++) {
		printCircNum(i);
	}
	drawLine(0,2,"red",4);
	drawLine(2,1,"red",4);
	drawLine(1,3,"red",4);
	drawLine(3,0,"red",4);
	let s = { color: "blue",
	          numSteps: 25
          };
	let thing = new StringThing(s);
	drawManyParabs(thing,[
	    	[2,0,3],
	   		[3,1,2],
		    [0,2,1],
	   		[1,3,0]
		]);
}
