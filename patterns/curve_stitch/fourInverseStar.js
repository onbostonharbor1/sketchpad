import { Line, Point }     from "../../classes/classes.js";
import { CurveStitch }     from "../../classes/curveStitchClass.js";
import { drawInverseStar } from "../../draw/drawRegular.js";
import { printTitle }      from "../../draw/draw_utilities.js";

export function runPattern() {

    printTitle("Four Inverse Stars");
    let s = {midpoint: new Point(125,125),
	     radius:   100,
	     color:    "blue"};
    let thing = new CurveStitch(s);
    drawInverseStar(thing);

    // add rotation
    s = {midpoint: new Point(350,125),
	 radius:   100,
	 rotate:   45,
	 color:    "green"};
    thing = new CurveStitch(s);
    drawInverseStar(thing);

    // change nodes
    s = {midpoint: new Point(450,450),
	 radius:   100,
	 rotate:   45,
	 numNodes: 8,
	 color:    "orange"};
    thing = new CurveStitch(s);
    drawInverseStar(thing);

    // add scale
    s = {midpoint: new Point(175,450),
	 radius:   100,
	 xScale:   1.5,
	 yScale:   1.2,
	 color:    "red"};
    thing = new CurveStitch(s);
    drawInverseStar(thing);
}

