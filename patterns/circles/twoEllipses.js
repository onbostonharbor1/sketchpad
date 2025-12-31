import { Point } from "/classes/classes";
import { drawInEllipse } from "/draw/drawEllipse.js";
import { Ellipse, START_END, FULL, TAPER, START_TAPER, END_TAPER }
                               from "/classes/ellipseClass.js";

export function runPattern() {
	// printTitle("Figure 282");
		let s = { midpoint:    new Point(370,250),
	      		color:       "lightblue",
	      		chordLength: 55,
	    //   startSkip:   10,
	      startSkip:   -50,
	    //   endSkip:     10,
	      endSkip:     -50,
	      withinCirc:  TAPER,
	      ellipse:     {a: 225, b: 350},
	      numNodes:    200,
	    };
		let thing = new Ellipse(s);
        drawInEllipse(thing);

		s = { midpoint:    new Point(370,250),
	      color:       "blue",
	      chordLength:        25,
	    //   startSkip:   10,
	      startSkip:   -10,
	    //   endSkip:     10,
	      endSkip:     -10,
	      withinCirc:  TAPER,
	      ellipse:     {a: 225, b: 350},
	      numNodes:    200,
	    };
		thing = new Ellipse(s);
        drawInEllipse(thing);
}


