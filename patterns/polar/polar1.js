// patterns/polar1.js
// ------------------------------------------------------------
// Polar pattern using drawPolar(s)
// ------------------------------------------------------------
import { drawPolar } from "/draw/drawParametrics.js";

export function runPattern() {

    const s = {
        showIntersections: true,

        // Domain: Only overriding the specific bounds and density.
        // maxFreq and samplesPerCycle are handled by class defaults.
        domain: {
            tMin: -30,
            tMax: 30,
            numPoints: 600
        },

        // Polar definitions
        angle: function(t) { return t; },
        rad:   function(t) { return 0.4 * Math.sin(t / 1.2); }
    };

    drawPolar(s);

} // end runPattern
