class CurveStitch {
    constructor (s= {}) {
	const defaults = {
            both:        false,                    // check this one out
	                                 // fallback if numSteps missing
            cutoff:      s.numSteps ? s.numSteps / 2 : 10, 
            midpoint:    new Point(200, 200),
            numNodes:    4,
            numSteps:    20,
            radius:      200,
            rotate:      0,
            shorten:     0,                     // check usage, part of Line?
            trunc:       false,                 // confirm use
//            yIncrement:  1,
            xScale:      1,
            yScale:      1

	};
        const merged = Object.assign({}, defaults, s);

        // Assign all merged properties to this instance
        Object.assign(this, merged);
    }
}

