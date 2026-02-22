  import { Point }          from '/classes/classes.js';
  import { Radiate }        from '/classes/radiate.js';
  import { drawRadiate }    from '/draw/drawUnicorns.js';
import { createNodes }            from '/draw/createNodes.js';

  export function runPattern() {
	let radialPt = new Point(300,20);
	let start    = new Point(20, 150);
    let end      = new Point(500,450);
	let numSteps = 20;
	let r = {
				radialPt:  radialPt,
                start:     	start,
                end:       	end,
				numSteps: 	numSteps
			}
	let thing    = new Radiate(r);

	drawRadiate(thing);
}

