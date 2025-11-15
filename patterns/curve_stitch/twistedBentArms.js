import { Line, Point }     from "../../classes/classes.js";
import { CurveStitch }     from "../../classes/curveStitchClass.js";
import { drawParab }       from  "../../draw/drawRegular.js";
import { printTitle }      from "../../draw/draw_utilities.js";

export function runPattern() {
    printTitle("Twisted bent arm");

    const coord20 = new Point(150, 50);
    const coord21 = new Point(500, 120);
    const coord22 = new Point(175, 290);
    const coord23 = new Point(300, 540);

    let pts = [coord21, coord20, coord22, coord23];

    let s = { numSteps: 40,
     	      lineTransform:  {type: "bendAtMid", angle: 20 },
	      color:    "green"};
    let thing = new CurveStitch(s);
    drawParab(thing,pts);
}
