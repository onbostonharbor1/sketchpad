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

    let a = 40;  let b=99;  let c=100; let d=40;  let j=4;  let k=4;

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
