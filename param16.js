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
        funcX: function(t) { return 150*(Math.cos(a*t) - Math.cos(b*t)**j) ; },
	    funcY: function(t) { return 150*(Math.sin(c*t) - Math.sin(d*t)**k) ; }
	};

	let thing = new Parametric(s);

	autoFitParametricToCanvas(thing, 600, 600, 20);
	thing.printEquations();
	drawParametric(thing);

} // end test
