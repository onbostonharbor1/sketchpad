import { Point } from "./classes.js";

export class CurveStitch {
    constructor (s= {}) {
	const defaults = {
            both:        false,                    // check this one out
	                                 // fallback if numSteps missing
            cutoff:      s.numSteps ? s.numSteps / 2 : 10,
            midpoint:    new Point(200, 200),
            numNodes:    4,
            numSteps:    20,
            radius:      200,
			ellipse: {
                a: s.radius*2,
                b: s.radius*2
          },
            rotate:      0,
            shorten:     0,                     // check usage, part of Line?
            trunc:       false,                 // confirm use
//            yIncrement:  1,
            xScale:      1,
            yScale:      1,
            // --------------------------------------------------------
            // NEW EXPERIMENTAL PARAMETERS
            // --------------------------------------------------------
            spacingBias: 0.0,     // -1 → +1 (non-uniform spacing)
            jitter:      0.0,     // pixel jitter amount
            jitterMode:  "xy" // "radial", "tangent", "xy"

	};
        const merged = Object.assign({}, defaults, s);

        // Assign all merged properties to this instance
        Object.assign(this, merged);

        // Normalize ellipse axes — mirrors the same logic in StringThing.
        // Ensures thing.ellipse.a and thing.ellipse.b are always valid numbers
        // so that createNodes() (unified createNodes) can rely on them
        // unconditionally, regardless of which class constructed the thing.
        if (!this.ellipse || this.ellipse.a === null || this.ellipse.a === undefined) {
            this.ellipse = { a: this.radius, b: this.radius };
        }
    }
}

