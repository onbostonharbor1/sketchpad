import { drawParametric }    from "/draw/parametrics.js";
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


		funcX: function(t) { return 6*Math.sin(13.58*t*Math.round(Math.sqrt(Math.cos(Math.cos(7.4*t))))) },
	    funcY: function(t) { return 6*Math.pow(Math.cos(13.58*t),4) * Math.sin(Math.sin(7.4*t)) }
	};


	let thing = new Parametric(s);

	drawParametric(thing);

} // end test
