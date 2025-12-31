import { drawParametric }    from "/draw/drawParametrics.js";
import { Parametric }                    from "/classes/parametric.js";

export function runPattern() {
	let s = {

		domain: {
			tMin: 0,
			tMax: 2 * Math.PI,

			// Either supply numPoints explicitly, OR let it be computed.
			numPoints:       0,
			maxFreq:         201,
			samplesPerCycle: 30
		},

		funcX: function(t) { return Math.cos(t)+(1/3)*(Math.cos(123*t)+Math.sin(250*t)) ; },
		funcY: function(t) { return Math.sin(t)+(1/3)*(Math.sin(123*t)+Math.cos(245*t)) ; }
	};

	let thing = new Parametric(s);
	drawParametric(thing);

} // end test
