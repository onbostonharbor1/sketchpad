import { Ellipse, START_END, FULL, TAPER, START_TAPER, END_TAPER }
    from "../../classes/ellipseClass.js";
import { drawInCircle } from "../../draw/drawEllipse.js";
import { Point } from "../../classes/classes.js";
//import { printTitle }   from "../../draw/drawUtilities";

export function runPattern() {
    let s = {
        midpoint: new Point(300,150),
        color: "blue",
        chordLength: 30,
        radius: 300,
        numNodes: 100,
        withinCirc: FULL,
        rotate: 0
    };

    let thing = new Ellipse(s);
    drawInCircle(thing);
} // end runPattern



