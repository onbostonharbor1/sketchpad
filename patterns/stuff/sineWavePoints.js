import { Point }     from "/classes/classes.js";
import { toRadians, drawCircle, printCircNum } from "/draw/drawUtilities.js";

export function runPattern(){
    //	printTitle("Test 28");
    ctx.lineWidth=1;
    ctx.strokeStyle = "black";
    ctx.fillStyle   = "black";
    for (let x = 0; x < 1000; x++) {
	let X = toRadians(x);
	let y = 200 + 30 * Math.cos(toRadians(x));
	drawCircle(new Point(X*40,y), 1, "blue");
	    //	    if ((x % 10) == 0) testCircle(new Point(X*40,y));
	let p90  = toRadians(90);
	let p180 = toRadians(180);
	let p270 = toRadians(270);
	let p360 = toRadians(360);
	if ((x % 90) == 0) printCircNum(new Point(X*40,y),90);
    }
}

