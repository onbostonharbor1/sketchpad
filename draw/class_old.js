//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
// CLASSES
//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
// both         CircularParabola: do clockwise and
//              counterclockwise at same time
// cutoff       pointsOnParabola: at some point, 
//              want to stop drawing from the 
//              parabola to the arm
// factor       InverseStar: shrinks the arms. 
//              Differs from shorten in that
//              this starts from the end of the arm
// lineTransform
//              How to transform the array points within
//              ptsOnLine: straight, bendWithin, bendFromMid, and
//                         bendMiddle
//              lineTransform:
//                  {type: type, angle: angle, anchorT: distance } 
// mid          midpoints are added between nodes 
// midpoint     actual midpoint of drawn object
// numCycloids  sets the number of points. Code 
//              wants the number to be one greater
// shorten      the percent to shorten
//              stitcher:   start and end positions for going through
//                          steps
//              drawChords:  where in the list of steps to begin and
//                           end drawing
//  skip         pattern skipping, like when drawing 
//               around a circle. For example, skip 4
//               means go from node[0] to node[4] or
//               from node[20] to node[24]
//  strt         The radiate point
//  withinCirc   -1 (START_END    )=end a starting point 
//                0 (FULL)        =full circle 
//                1 (TAPER)       =start and end taper 
//                2 (START_TAPER)
//                1 (END_TAPER)   
   
class StringThing {
    constructor(s = {}) {
        const defaults = {
            both:        false,                    // check this one out
            color:       "black",
            cutoff:      s.numSteps ? s.numSteps / 2 : 10, // fallback if numSteps missing
            factor:      0,
            lineWidth:   1,
	    lineTransform: 0,
            mid:         false,
            midpoint:    new Point(200, 200),
            numCycloids: 1,
            numNodes:    4,
            numSteps:    20,
            radius:      200,
            rotate:      0,
            shorten:     0,                     // check usage, part of Line?
            startSkip:   0,
            endSkip:     0,
            skip:        10,                    // perhaps rename to chordLength
            withinCirc:  FULL,
            start:       new Point(150, 50),
            trunc:       false,                 // confirm use
//            yIncrement:  1,
            xScale:      1,
            yScale:      1,
            ellipse:     { a: s.radius || 200, b: s.radius || 200 }
        };

        const merged = Object.assign({}, defaults, s);

        // Assign all merged properties to this instance
        Object.assign(this, merged);

        // Internal state
        this.type       = undefined;
        this._bendSteps = false;

        // Adjustments
        this.numCycloids += 1; // intentional offset

    }
} 
/*---------------------------------------------------------
 * CLASS POINT
 *  distanceTo
 *  isNear
 *  isSame
 *  midpointBetween
 *  rotateAround
 *  toArray
 *--------------------------------------------------------*/
class Point {
    constructor (x,y) {
//	if (typeof(x)=="number") {
	    this.x = x;
	    this.y = y;
//	} else {
//	    this.x = gl.pts[x].x;
//	    this.y = gl.pts[x].y;
//	}
    }
    
    distanceTo(other) {
	return Math.hypot(this.x - other.x, this.y - other.y);
    }

    // Fuzzy equality using distance
    isNear(other, tolerance = 0.001) {
	return this.distanceTo(other) <= tolerance;
    }

    // Strict equality
    isSame(otherPoint) {
	return this.x === otherPoint.x && this.y === otherPoint.y;
    }

    midpointBetween(other) {
	return new Point(
	    (this.x + other.x) / 2,
	    (this.y + other.y) / 2
	)
    }

    rotateAround(center, angle) {
	const dx = this.x - center.x;
	const dy = this.y - center.y;
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return new Point(
	    center.x + dx * cos - dy * sin,
	    center.y + dx * sin + dy * cos
	)
    }

    toArray() {
	return [this.x, this.y];
    }
}

/*---------------------------------------------------------
 * CLASS LINE
 *  bendAtMidpoint
 *  intersects
 *  midpoint
 *  moveMidpointTo
 *  perpendicular
 *  perpendicularAtMidpoint
 *  reverse
 *  reverseInPlace
 *  rotateAround
 *  rotateAt
 *  rotateAtEnd
 *  rotateAtStart
 *  shortenEnd
 *  shortenStart
 *--------------------------------------------------------*/
class Line {
    constructor(start, end, label = null) {
	this.start = start;
	this.end = end;
	this.label = label;
    }
    bendAtMidpoint(angleRadians) {
	const mid = this.midpoint();
//	const half1 = new Line(this.start, mid).rotateAtStart(-angleRadians / 2);
	const half1 = new Line(this.start, mid);
	const half2 = new Line(mid, this.end).rotateAtStart(angleRadians / 2);
	return [half1, half2];
    }

    midpoint() {
	return new Point(
	    (this.start.x + this.end.x) / 2,
	    (this.start.y + this.end.y) / 2
	);
    }
    
    moveMidpointTo(newMidpoint) {
	const currentMid = this.midpoint();
	const dx = newMidpoint.x - currentMid.x;
	const dy = newMidpoint.y - currentMid.y;
	
	// mutate existing points instead of reassigning
	this.start.x += dx;
	this.start.y += dy;
	this.end.x += dx;
	this.end.y += dy;
    } // end moveMidpointTo

    reverse() {
	return new Line(this.end, this.start);
    }

    reverseInPlace() {
	const temp = this.start;
	this.start = this.end;
	this.end = temp;
	return this;
    };
    
    rotateAt(anchor = "start", angle = 0) {
	let pivot;

	if (anchor === "start") {
	    pivot = this.start;
	} else if (anchor === "end") {
	    pivot = this.end;
	} else if (anchor === "midpoint") {
	    pivot = this.midpoint(); // assuming you’ve defined this
	} else if (anchor instanceof Point) {
	    pivot = anchor;
	} else {
	    throw new Error("Invalid anchor: must be 'start', 'end', or a Point");
	}
    
	return this.rotateAround(pivot, angle);
    }

    rotateAround(pivot, angle) {
	const rotatePoint = (pt) => {
	    const dx = pt.x - pivot.x;
	    const dy = pt.y - pivot.y;
	    const cos = Math.cos(angle);
	    const sin = Math.sin(angle);
	    return new Point(
		pivot.x + dx * cos - dy * sin,
		pivot.y + dx * sin + dy * cos
	    );
	}

	this.start = rotatePoint(this.start);
	this.end = rotatePoint(this.end);
	return this;
    }

//    rotateAround(center, angle) {
//	return new Line(
//	    this.start.rotatedAround(center, angle),
//	    this.end.rotatedAround(center, angle)
//	);

    rotateAtStart(angleRadians) {
	const newEnd = this.end.rotateAround(this.start, angleRadians);
	return new Line(this.start, newEnd);
    }

    rotateAtEnd(angleRadians) {
	const newStart = this.start.rotateAround(this.end, angleRadians);
	return new Line(newStart, this.end);
    }
    
    shortenEnd(amount) {
	const dx = this.start.x - this.end.x;
	const dy = this.start.y - this.end.y;
	const mag = Math.hypot(dx, dy);
	const ratio = amount / mag;
	const newEnd = new Point(
	    this.end.x + dx * ratio,
	    this.end.y + dy * ratio
	);
	return new Line(this.start, newEnd);
    }

    shortenStart(amount) {
	const dx = this.end.x - this.start.x;
	const dy = this.end.y - this.start.y;
	const mag = Math.hypot(dx, dy);
	const ratio = amount / mag;
	const newStart = new Point(
	    this.start.x + dx * ratio,
	    this.start.y + dy * ratio
	);
	return new Line(newStart, this.end);
    }

    perpendicular() {
	const dx = this.end.x - this.start.x;
	const dy = this.end.y - this.start.y;
	const mag = Math.hypot(dx, dy);
	const nx = -dy / mag;
	const ny = dx / mag;
	const p1 = this.start;
	const p2 = new Point(p1.x + nx, p1.y + ny);
	return new Line(p1, p2);
    }

    perpendicularAtMidpoint(length = 100) {
	const mid = this.midpoint();
	const perp = this.perpendicular(); // unit-length perpendicular from start
	const dx = perp.end.x - perp.start.x;
	const dy = perp.end.y - perp.start.y;
	const half = length / 2;
	const p1 = new Point(mid.x + dx * half, mid.y + dy * half);
	const p2 = new Point(mid.x - dx * half, mid.y - dy * half);
	return new Line(p1, p2);
    }

    intersects(otherLine) {
	const { start: A, end: B } = this;
	const { start: C, end: D } = otherLine;
	
	const denom = (A.x - B.x) * (C.y - D.y) -
	      (A.y - B.y) * (C.x - D.x);
	if (denom === 0) return null; // Parallel or coincident
	
	const x = ((A.x * B.y - A.y * B.x) * (C.x - D.x) -
		   (A.x - B.x) * (C.x * D.y - C.y * D.x)) / denom;
	const y = ((A.x * B.y - A.y * B.x) * (C.y - D.y) -
		   (A.y - B.y) * (C.x * D.y - C.y * D.x)) / denom;

	return new Point(x, y);
    }

}
