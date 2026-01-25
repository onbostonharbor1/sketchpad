import { Ellipse, START_END, FULL, TAPER, START_TAPER, END_TAPER }
                         from "../../classes/ellipseClass.js";
import { drawInEllipse } from "../../draw/drawEllipse.js";
import { Point }         from "../../classes/classes.js";
//import { printTitle }   from "../../draw/drawUtilities";

export function runPattern() {
    let s = {
        midpoint:    new Point(300,150),
        color:       "blue",
        chordLength: 30,
	ellipse:     {a: 500, b: 250},
        numNodes:    120,
	endSkip:     20,
	startSkip:   10,
        withinCirc:  TAPER,
        rotate:      0
    };

    let thing = new Ellipse(s);
    drawInEllipse(thing);
} // end runPattern

