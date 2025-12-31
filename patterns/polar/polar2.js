// patterns/polar/polar2.js
// ------------------------------------------------------------
// Polar pattern using drawPolar(s)
// ------------------------------------------------------------
import { drawPolar } from "/draw/drawParametrics.js";

export function runPattern() {

	const s = {
		printEquations: true,
		margin:         30,

		// Domain is part of "s" (as you wanted).
		domain: {
			tMin:      -30,
			tMax:       30,
			numPoints:  600,

			// Optional (ignored when numPoints is non-zero)
			maxFreq:         0,
			samplesPerCycle: 30
		},

		rad:   function(t) { return Math.cos((1/6)*t);},

		// Optional stroke style
		color:     "blue",
		lineWidth: 1
	};

	drawPolar(s);

} // end runPattern
