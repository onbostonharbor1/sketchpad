import { drawState } from "/draw/drawState.js";
import { drawLine, printCircNum, _m }  from "/draw/draw_utilities.js";
import { StringThing, Point } from "/classes/classes.js";
import { drawParab } from "/draw/drawRegular.js";


export function runPattern() {
	// printTitle("Figure 84: Overlapping Stars");
	drawState.pts = [];
	let xDist = 80;
	let yDist = 100;
	let xLength = 100;
	let yLength = 100;
    let x1 = 50;
	let x2 = x1+xLength;
	let x3 = x2 + xDist/2;
	let x4 = x3 + xDist/2;
	let x5 = x4+xLength;
	let y1 = 50;
	let y2 = y1 + yLength;
	let y3 = y2 + yDist/2;
	let y4 = y3 + yDist/2;
	let y5 = y4 + yLength;
	let y6 = y5 + yDist/2;
	let y7 = y6 + yDist/2;
	let y8 = y7 + yLength;
	let y9 = y8 + yDist/2;
	let y10 = y9 + yDist/2;
	let y11 = y10 + yLength;
	drawState.pts[1] = new Point(x1,y3);
	drawState.pts[2] = new Point(x1,y6);
	drawState.pts[3] = new Point(x1,y9);
	drawState.pts[4] = new Point(x2,y3);
	drawState.pts[5] = new Point(x2,y6);
	drawState.pts[6] = new Point(x2,y9);
	drawState.pts[7] = new Point(x3,y1);
	drawState.pts[8] = new Point(x3,y2);
	drawState.pts[9] = new Point(x3,y4);
	drawState.pts[10] = new Point(x3,y5);
	drawState.pts[11] = new Point(x3,y7);
	drawState.pts[12] = new Point(x3,y8);
	drawState.pts[13] = new Point(x3,y10);
	drawState.pts[14] = new Point(x3,y11);
	drawState.pts[15] = new Point(x4,y3);
	drawState.pts[16] = new Point(x4,y6);
	drawState.pts[17] = new Point(x4,y9);
	drawState.pts[18] = new Point(x5,y3);
	drawState.pts[19] = new Point(x5,y6);
	drawState.pts[20] = new Point(x5,y9);
	drawState.ctr++;
	drawLine(drawState.pts[1],drawState.pts[4],"blue");
	drawLine(drawState.pts[2],drawState.pts[5],"blue");
	drawLine(drawState.pts[3],drawState.pts[6],"blue");
	drawLine(drawState.pts[7],drawState.pts[8],"blue");
	drawLine(drawState.pts[9],drawState.pts[10],"blue");
	drawLine(drawState.pts[11],drawState.pts[12],"blue");
	drawLine(drawState.pts[13],drawState.pts[14],"blue");
	drawLine(drawState.pts[15],drawState.pts[18],"blue");
	drawLine(drawState.pts[16],drawState.pts[19],"blue");
	drawLine(drawState.pts[17],drawState.pts[20],"blue");
	ctx.fillStyle = "blue";
	for (let i=1;i<drawState.pts.length;i++) {
	    printCircNum(drawState.pts[i]);
	}
	let s = { color: "blue",
//	      color: "cornflowerblue",
	      numSteps: 18,
	      lineWidth: .8,
//	      shorten:   80,
	      midpoint: _m(drawState.pts[4],drawState.pts[15])
//	      yIncrement: .8
	    };
	let thing = new StringThing(s);
//	drawRegularStar(thing);
	let parab = [drawState.pts[1], drawState.pts[4], drawState.pts[8], drawState.pts[7]];
	drawParab(thing,parab);
	parab = [drawState.pts[1], drawState.pts[4], drawState.pts[9], drawState.pts[10]];
	drawParab(thing,parab);
	parab = [drawState.pts[18], drawState.pts[15], drawState.pts[9], drawState.pts[10]];
	drawParab(thing,parab);
	parab = [drawState.pts[15], drawState.pts[18], drawState.pts[7], drawState.pts[8]];
	drawParab(thing,parab);
	parab = [drawState.pts[9], drawState.pts[10], drawState.pts[5], drawState.pts[2]];
	drawParab(thing,parab);
	parab = [drawState.pts[2], drawState.pts[5], drawState.pts[11], drawState.pts[12]];
	drawParab(thing,parab);
	parab = [drawState.pts[6], drawState.pts[3], drawState.pts[11], drawState.pts[12]];
	drawParab(thing,parab);
	parab = [drawState.pts[3], drawState.pts[6], drawState.pts[13], drawState.pts[14]];
	drawParab(thing,parab);
	parab = [drawState.pts[14], drawState.pts[13], drawState.pts[17], drawState.pts[20]];
	drawParab(thing,parab);
	parab = [drawState.pts[20], drawState.pts[17], drawState.pts[12], drawState.pts[11]];
	drawParab(thing,parab);
	parab = [drawState.pts[12], drawState.pts[11], drawState.pts[16], drawState.pts[19]];
	drawParab(thing,parab);
	parab = [drawState.pts[19], drawState.pts[16], drawState.pts[10], drawState.pts[9]];
	drawParab(thing,parab);
	parab = [drawState.pts[7], drawState.pts[8], drawState.pts[5], drawState.pts[2]];
	drawParab(thing,parab);
	parab = [drawState.pts[7], drawState.pts[8], drawState.pts[16], drawState.pts[19]];
	drawParab(thing,parab);
	parab = [drawState.pts[2], drawState.pts[5], drawState.pts[13], drawState.pts[14]];
	drawParab(thing,parab);
	parab = [drawState.pts[14], drawState.pts[13], drawState.pts[16], drawState.pts[19]];
	drawParab(thing,parab);
 }

