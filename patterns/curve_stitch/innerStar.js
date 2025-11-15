import { Line, Point }     from "../../classes/classes.js";
import { CurveStitch }     from "../../classes/curveStitchClass.js";
import { drawInnerStar } from "../../draw/drawRegular.js";
import { printTitle }      from "../../draw/draw_utilities.js";

export function runPattern() {
    printTitle("Inner Star");
    let s = {midpoint: new Point(125,125),
	     radius:   100,
	     numNodes: 6,
	     color:    "blue"};
    let thing = new CurveStitch(s);
    drawInnerStar(thing);
}
