// patterns/<yourPolarTest>.js
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

		// OLD: funcX(t)=t, funcY(t)=0.4*sin(t/1.2)
		// NEW: angle(t)=t, rad(t)=0.4*sin(t/1.2)
		angle: function(t) { return t; },
		rad:   function(t) { return 0.4 * Math.sin(t / 1.2); },

		// Optional stroke style
		color:     "blue",
		lineWidth: 1
	};

	drawPolar(s);

} // end runPattern
