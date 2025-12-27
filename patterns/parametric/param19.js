import { drawParametric, buildParametricDomain, chooseNumPointsForFreq,
          autoFitParametricToCanvas }    from "/draw/parametrics.js";
import { Parametric }                    from "/classes/parametric.js";

export function runPattern() {

	// Define the semantic range first (what curve interval you want)
	const domain = {
		tMin: 0,
		tMax: 2 * Math.PI,
		numPoints: 0
	};

	// Choose sampling density based on the fastest frequency used
	// (here: max of 198 and 201 => 201)
	domain.numPoints = chooseNumPointsForFreq(domain, 201, 30);

    let a = 80;  let b=1;  let c=1; let d=80;  let j=3;  let k=3;

	let s = {
		pts:  buildParametricDomain(domain),
        funcY: function(t) { return 1.5*Math.sin(t)+.5*Math.cos(201*t) ;},
	    funcX: function(t) { return 1.5*Math.cos(t)+.5*Math.sin(196*t) ;}
	};

	let thing = new Parametric(s);

	autoFitParametricToCanvas(thing, 600, 600, 20);
	thing.printEquations();
	drawParametric(thing);

} // end test
