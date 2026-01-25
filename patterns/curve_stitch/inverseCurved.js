import { Line, Point }     from "../../classes/classes.js";
import { CurveStitch }     from "../../classes/curveStitchClass.js";
import { drawCircularParabola } from "../../draw/drawRegular.js";
import { printTitle }      from "../../draw/drawUtilities.js";

export function runPattern() {
    printTitle("Regular Circular Parabola");
    let s = {midpoint: new Point(250,250),
	     radius:   200,
	     numNodes: 6,
	     color:    "blue"};
    let thing = new CurveStitch(s);
    drawCircularParabola(thing);
}
