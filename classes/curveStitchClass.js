import { Point } from "./classes.js";

export class CurveStitch {
    constructor (s= {}) {
	const defaults = {
        color:       "black",
        lineWidth:   1,
        midBetween:  false,
        midpoint:    new Point(200, 200),

        numSteps:    20,
        numNodes:    4,
        ellipse:     { a: null, b: null },
        radius:      200,
        rotate:      0,

            truncate:    0,
            xScale:      1,
            yScale:      1,
            shorten:     0,
            truncate:    0,
            ellipse: {
                a: null,
                b: null,
          },

            both:        false,      // check this one out
            //            yIncrement:  1,
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

    // Normalize ellipse axes
    // Ensures thing.ellipse.a and thing.ellipse.b are always valid numbers
    // so that createNodes() (unified createNodes) can rely on them
    // unconditionally, regardless of which class constructed the thing.
    if (this.ellipse.a === null)
        this.ellipse = { a: this.radius*2,
                         b: this.radius*2 };
    }
}

