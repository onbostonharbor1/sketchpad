import { Line, Point }     from "../../classes/classes.js";
import { CurveStitch }     from "../../classes/curveStitchClass.js";
import { drawRegularPolygonTouch } from "../../draw/drawRegular.js";
import { printTitle }      from "../../draw/drawUtilities.js";

export function runPattern() {
    printTitle("Regular Polygon Touch");
    let s = {midpoint: new Point(125,125),
	     radius:   100,
	     numNodes: 6,
	     color:    "blue"};
    let thing = new CurveStitch(s);
    drawRegularPolygonTouch(thing);
}
