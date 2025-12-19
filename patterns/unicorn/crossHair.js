import { Point, StringThing }          from '/classes/classes.js';
import { crossHair }                   from '/draw/unicorns.js'

export function runPattern() {
    let pt1 = new Point(60, 60);
    let pt2 = new Point(200, 200);
    let coords = [ pt1, pt2];
	crossHair(coords, "green");
}
