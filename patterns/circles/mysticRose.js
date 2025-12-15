import { drawMysticRose } from "../../draw/unicorns";
import { StringThing }   from "../classes/StringThing.js";
import { Point }         from "../classes/classes.js";

export function runPattern () {
    let s = {
                numNodes: 20,
		        color:    "blue",
		        midpoint: new Point(300,300),
		        radius:   200
        };
    let thing = new StringThing(s);
    drawMysticRose(thing);
}
