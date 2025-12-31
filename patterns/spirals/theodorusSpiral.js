import { drawTheodorusSpiral } from "/draw/drawSpirals.js";
import { Point }      from "/classes/classes";

export function runPattern() {
       let s = { midpoint:      new Point(300,260),
                 numTriangles:  23,
                 lineWidth:     1,
		         color:         "blue"
	       }
       drawTheodorusSpiral(s);
}
