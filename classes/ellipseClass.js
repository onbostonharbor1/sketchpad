//  skip         pattern skipping, like when drawing 
//               around a circle. For example, skip 4
//               means go from node[0] to node[4] or
//               from node[20] to node[24]
//  withinCirc   -1 (START_END    )=end a starting point 
//                0 (FULL)        =full circle 
//                1 (TAPER)       =start and end taper 
//                2 (START_TAPER)
//                1 (END_TAPER)   


const FULL        = 0;
const TAPER       = 1;
const START_TAPER = 2;
const END_TAPER   = 3;


class Ellipse {
    constructor(s = {}) {
        const defaults = {
            ellipse:     { a: s.radius || 200, b: s.radius || 200 },
            midpoint:    new Point(200, 200),
            numSteps:    20,
            startSkip:   0,
            endSkip:     0,
            radius:      200,
            skip:        10,                    // perhaps rename to chordLength
            withinCirc:  FULL,
	};

	const merged = Object.assign({}, defaults, s);

        // Assign all merged properties to this instance
        Object.assign(this, merged);
    }
}
    

