import { Point }       from "/classes/classes.js";
import { Ellipse, START_END, FULL, TAPER, START_TAPER, END_TAPER }
                       from "/classes/ellipseClass.js";
import { drawInCircle} from "/draw/drawEllipse.js";

export function runPattern() {
	// printTitle("Figure 205");
	let radius = 200;
	let center = new Point(200,227);
	let s = { midpoint:     center,
	      numNodes:     200,
	      rotate:       0,
	      chordLength:  30,
	      startSkip:    16,
	      endSkip:      25,
	      withinCirc:   START_END,
	      color:        "black",
	      radius:       radius };
	let thing = new Ellipse(s);
	drawInCircle(thing);

	s = { midpoint:     center,
	      numNodes:     200,
	      rotate:       -45,
	      chordLength:  64,
	      startSkip:    0,
	      endSkip:      0,
	      withinCirc:   START_END,
	      color:        "#5a6673",
	      radius:       radius };
	thing = new Ellipse(s);
	drawInCircle(thing);

	s = { midpoint:     center,
	      numNodes:     200,
	      rotate:       180,
	      chordLength:  50,
	      startSkip:    0,
	      endSkip:      0,
	      withinCirc:   START_END,
	      color:        "#bac2ca",
	      radius:       radius };
	thing = new Ellipse(s);
	drawInCircle(thing);
}
