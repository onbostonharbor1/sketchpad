import { drawParametric }    from "/draw/drawParametrics.js";
import { Parametric }                    from "/classes/parametric.js";

export function runPattern() {

    let a = 40;  let b=99;  let c=100; let d=40;  let j=3;  let k=4;
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


        funcX: function(t) { return 150*(Math.cos(a*t) - Math.cos(b*t)**j) ; },
	    funcY: function(t) { return 150*(Math.sin(c*t) - Math.sin(d*t)**k) ; }
	};

	let thing = new Parametric(s);

	drawParametric(thing);

} // end test
