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

	let s = {
		pts:  buildParametricDomain(domain),
		funcX: function(t) { return 6*Math.sin(13.58*t*Math.round(Math.sqrt(Math.cos(Math.cos(7.4*t))))) },
	    funcY: function(t) { return 6*Math.pow(Math.cos(13.58*t),4) * Math.sin(Math.sin(7.4*t)) }
	};


	let thing = new Parametric(s);

	autoFitParametricToCanvas(thing, 600, 600, 20);
	thing.printEquations();
	drawParametric(thing);

} // end test
