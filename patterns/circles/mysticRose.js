import { drawMysticRose } from "/draw/unicorns";
import { Point, StringThing}          from "/classes/classes.js";

export function runPattern () {
    let s = {
                numNodes: 12,
		        color:    "blue",
                lineWidth: .5,
		        midpoint: new Point(300,300),
		        radius:   200
        };
    let thing = new StringThing(s);
    drawMysticRose(thing);
}
