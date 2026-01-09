import { getLineEquation, printText } from "/draw/draw_utilities.js";
import { Point } from "/classes/classes.js";

export function runPattern(){
	  // Example usage:
	const point1  = new Point(1,6);
	const point2  = new Point(3,2);
    const printPt = new Point(20, 40);

	const equation = getLineEquation(point1, point2);
	printText("Get equation of a line: " + equation, printPt);
}
