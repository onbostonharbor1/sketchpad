import { drawParametric }    from "/draw/drawParametrics.js";
import { Parametric }                    from "/classes/parametric.js";

export function runPattern() {

let s = {
		// Domain now lives in the object, not in runPattern helper calls.
		// numPoints can be 0 to mean “auto-choose from maxFreq”.
		domain: {
			tMin: 0,
			tMax: 2 * Math.PI,

			// Either supply numPoints explicitly, OR let it be computed.
			numPoints:       0,
			maxFreq:         201,
			samplesPerCycle: 30
		},


        funcX: function(t) { return Math.cos(t) + (1/1.4)*Math.cos(110*t) ; },
	    funcY: function(t) { return Math.sin(t) + (1/1.4)*Math.pow(Math.sin(112*t),4) ; }
	};

	let thing = new Parametric(s);

	drawParametric(thing);

} // end test
