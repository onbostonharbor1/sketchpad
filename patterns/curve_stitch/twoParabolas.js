import { Line, Point }     from "../../classes/classes.js";
import { CurveStitch }     from "../../classes/curveStitchClass.js";
import { drawParab } from "../../draw/drawRegular.js";
import { printTitle }      from "../../draw/draw_utilities.js";

export function runPattern() {
    printTitle("Two Separate Parabolas");
    let s = { numSteps: 10,
	      color:    "blue"};
    let thing = new CurveStitch(s);   

    const coord1 = new Point(5,5);
    const coord2 = new Point(200,200);
    const coord1a= new Point(5,200);
    const coord3 = new Point(150,50);
    const coord4 = new Point(350,250);
    const coord3a= new Point(150,250);

    let pts = [coord1,coord1a,coord2];
    drawParab(thing,pts);

    thing.color = "green";
    pts = [coord3,coord3a,coord3a,coord4];
    drawParab(thing,pts);
}
