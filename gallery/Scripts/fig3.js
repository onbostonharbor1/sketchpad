import { Line, Point, StringThing } from "../../classes/classes.js";
import { printTitle } from "../../draw/draw_utilities.js";
import { drawRegularPolygon } from "../../draw/drawRegular.js";

export function runPattern() {
    printTitle("Draw Regular Polygon");
    let s={numSteps:     20,
	   midpoint:     new Point(200,200),
	   //	     lineWidth:    .5,
	   //	     rotate:       45,
	   radius:       100,
	   //	     yIncrement:   .8,
	   //	     xScale:     1.2,
	   //	     yScale:     .5,
	   color:        "green",
	   numNodes:     4 };
    let thing = new StringThing(s);
    drawRegularPolygon(thing);
}

