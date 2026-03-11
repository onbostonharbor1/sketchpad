//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
// CLASSES
//////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////

/* ============================================================
 * CLASS StringThing
 * Central parameter object passed to all drawing functions.
 * Merges caller-supplied properties over sensible defaults.
 * ============================================================ */
class StringThing {
    constructor(s = {}) {
        const defaults = {
            color:       "black",
            lineWidth:   1,
            midBetween:  false,

            // USED BY MANY
            midpoint:    new Point(250, 250),
            numSteps:    20,

            // OBJECTS WITH LITTLE NEED
            numCycloids: 1,
            radiatePt:   new Point(150, 50),

            // CURVE_STITCH
            lineTransform: 0,
            numNodes:    4,
            radius:      200,
            rotate:      0,
            xScale:      1,
            yScale:      1,
            shorten:     0,
            truncate:    0,
            ellipse: {
                a: null,
                b: null
            },

            // MEANING NEEDS TO BE FIRMER
            both:        false,

            // --------------------------------------------------------
            // NEW EXPERIMENTAL PARAMETERS
            // --------------------------------------------------------
            spacingBias: 0.0,     // -1 → +1 (non-uniform spacing)
            jitter:      0.0,     // pixel jitter amount
            jitterMode:  "xy"     // "radial", "tangent", "xy"
        };

        const merged = Object.assign({}, defaults, s);
        Object.assign(this, merged);

        if (this.ellipse.a === null) {
            this.ellipse.a = this.radius * 2;
            this.ellipse.b = this.radius * 2;
        }

        this.numCycloids += 1; // intentional offset
    }
}


/*---------------------------------------------------------
 * CLASS POINT
 *  distanceTo       — Euclidean distance to another point
 *  isNear           — fuzzy equality within a tolerance
 *  isSame           — strict equality (===)
 *  midpointBetween  — returns a new Point halfway between this and other
 *  offset           — returns a new Point shifted by (dx, dy)
 *  rotateAround     — returns a new Point rotated around a center
 *  toArray          — returns [x, y]
 *--------------------------------------------------------*/
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    /* Returns the Euclidean distance from this point to another. */
    distanceTo(other) {
        return Math.hypot(this.x - other.x, this.y - other.y);
    }

    /* Returns true if this point is within tolerance of another. */
    isNear(other, tolerance = 0.001) {
        return this.distanceTo(other) <= tolerance;
    }

    /* Returns true if this point has exactly the same coordinates. */
    isSame(otherPoint) {
        return this.x === otherPoint.x && this.y === otherPoint.y;
    }

    /* Returns a new Point halfway between this point and other. */
    midpointBetween(other) {
        return new Point(
            (this.x + other.x) / 2,
            (this.y + other.y) / 2
        );
    }

    /* Returns a new Point shifted by (dx, dy). Does not mutate. */
    offset(dx, dy) {
        return new Point(this.x + dx, this.y + dy);
    }

    /* Returns a new Point rotated around a center point by angle (radians). */
    rotateAround(center, angle) {
        const dx  = this.x - center.x;
        const dy  = this.y - center.y;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Point(
            center.x + dx * cos - dy * sin,
            center.y + dx * sin + dy * cos
        );
    }

    /* Returns the point as a plain [x, y] array. */
    toArray() {
        return [this.x, this.y];
    }
}


/*---------------------------------------------------------
 * CLASS LINE
 *  angle                — direction angle in radians
 *  bendAtMidpoint       — splits at midpoint, bends second half by angle
 *  endPt                — returns a copy of the end point
 *  intersects           — returns intersection Point with another line (or null)
 *  isParallelTo         — true if direction vectors are scalar multiples
 *  isPerpendicularTo    — true if dot product of directions is zero
 *  length               — Euclidean length
 *  midpoint             — returns the midpoint as a new Point
 *  moveMidpointTo       — translates line so its midpoint lands on newMidpoint
 *  perpendicular        — returns a unit-length perpendicular line from start
 *  perpendicularAtMidpoint — returns a line of given length centered on midpoint
 *  pointAt              — returns a Point at parameter t (0=start, 1=end)
 *  remainingSteps       — calculates step count after shorten/truncate
 *  reverse              — returns a new reversed Line
 *  reverseInPlace       — reverses start/end in place, returns this
 *  rotateAround         — rotates both endpoints around a pivot (mutates)
 *  rotateAt             — rotates around start, end, midpoint, or a Point
 *  rotateAtEnd          — returns new Line with start rotated around end
 *  rotateAtStart        — returns new Line with end rotated around start
 *  setEnd               — mutates end point coordinates
 *  setStart             — mutates start point coordinates
 *  shortenEnd           — returns new Line with end moved toward start
 *  shortenStart         — returns new Line with start moved toward end
 *  slope                — rise/run (throws on vertical line)
 *  startPt              — returns a copy of the start point
 *  translate            — shifts both endpoints by (dx, dy) in place
 *  trim                 — returns a sub-segment between two t ratios
 *  trimForStitch        — trim using shorten ratio and truncate steps
 *--------------------------------------------------------*/
class Line {
    constructor(start, end, label = null) {
        this.start = start;
        this.end   = end;
    }

    /* Returns a copy of the start point. Callers should not mutate internals directly. */
    startPt() {
        return new Point(this.start.x, this.start.y);
    }

    /* Returns a copy of the end point. Callers should not mutate internals directly. */
    endPt() {
        return new Point(this.end.x, this.end.y);
    }

    /* Mutates the start point to match pt. */
    setStart(pt) {
        this.start.x = pt.x;
        this.start.y = pt.y;
    }

    /* Mutates the end point to match pt. */
    setEnd(pt) {
        this.end.x = pt.x;
        this.end.y = pt.y;
    }

    /* Splits the line at its midpoint and bends the second half by angleRadians.
       Returns [half1, half2]. */
    bendAtMidpoint(angleRadians) {
        const mid   = this.midpoint();
        const half1 = new Line(this.start, mid);
        const half2 = new Line(mid, this.end).rotateAtStart(angleRadians / 2);
        return [half1, half2];
    }

    /* Returns the midpoint as a new Point. */
    midpoint() {
        return new Point(
            (this.start.x + this.end.x) / 2,
            (this.start.y + this.end.y) / 2
        );
    }

    /* Returns a new Point at parameter t along the line (0=start, 1=end). */
    pointAt(t) {
        return new Point(
            this.start.x + t * (this.end.x - this.start.x),
            this.start.y + t * (this.end.y - this.start.y)
        );
    }

    /* Shifts both endpoints by (dx, dy) in place. Returns this for chaining. */
    translate(dx, dy) {
        this.start.x += dx;
        this.start.y += dy;
        this.end.x   += dx;
        this.end.y   += dy;
        return this;
    }

    /* Translates the line so its midpoint lands on newMidpoint. Mutates in place. */
    moveMidpointTo(newMidpoint) {
        const currentMid = this.midpoint();
        const dx = newMidpoint.x - currentMid.x;
        const dy = newMidpoint.y - currentMid.y;
        this.start.x += dx;
        this.start.y += dy;
        this.end.x   += dx;
        this.end.y   += dy;
    }

    /* Returns a new reversed Line (end becomes start). */
    reverse() {
        return new Line(this.end, this.start);
    }

    /* Swaps start and end in place. Returns this for chaining. */
    reverseInPlace() {
        const temp = this.start;
        this.start = this.end;
        this.end   = temp;
        return this;
    }

    /* Rotates the line around anchor ('start', 'end', 'midpoint', or a Point).
       Returns a new Line. */
    rotateAt(anchor = "start", angle = 0) {
        let pivot;
        if      (anchor === "start")      pivot = this.start;
        else if (anchor === "end")        pivot = this.end;
        else if (anchor === "midpoint")   pivot = this.midpoint();
        else if (anchor instanceof Point) pivot = anchor;
        else throw new Error("Invalid anchor: must be 'start', 'end', or a Point");
        return this.rotateAround(pivot, angle);
    }

    /* Rotates both endpoints around pivot by angle (radians). Mutates in place.
       Returns this for chaining. */
    rotateAround(pivot, angle) {
        const rotatePoint = (pt) => {
            const dx  = pt.x - pivot.x;
            const dy  = pt.y - pivot.y;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            return new Point(
                pivot.x + dx * cos - dy * sin,
                pivot.y + dx * sin + dy * cos
            );
        };
        this.start = rotatePoint(this.start);
        this.end   = rotatePoint(this.end);
        return this;
    }

    /* Returns a new Line with end rotated around start by angleRadians. */
    rotateAtStart(angleRadians) {
        const newEnd = this.end.rotateAround(this.start, angleRadians);
        return new Line(this.start, newEnd);
    }

    /* Returns a new Line with start rotated around end by angleRadians. */
    rotateAtEnd(angleRadians) {
        const newStart = this.start.rotateAround(this.end, angleRadians);
        return new Line(newStart, this.end);
    }

    /* Returns a new Line with end moved toward start by amount (pixels). */
    shortenEnd(amount) {
        const dx    = this.start.x - this.end.x;
        const dy    = this.start.y - this.end.y;
        const ratio = amount / Math.hypot(dx, dy);
        return new Line(this.start, new Point(
            this.end.x + dx * ratio,
            this.end.y + dy * ratio
        ));
    }

    /* Returns a new Line with start moved toward end by amount (pixels). */
    shortenStart(amount) {
        const dx    = this.end.x - this.start.x;
        const dy    = this.end.y - this.start.y;
        const ratio = amount / Math.hypot(dx, dy);
        return new Line(new Point(
            this.start.x + dx * ratio,
            this.start.y + dy * ratio
        ), this.end);
    }

    /* Returns a unit-length perpendicular line starting at this line's start. */
    perpendicular() {
        const dx  = this.end.x - this.start.x;
        const dy  = this.end.y - this.start.y;
        const mag = Math.hypot(dx, dy);
        const nx  = -dy / mag;
        const ny  =  dx / mag;
        return new Line(this.start, new Point(this.start.x + nx, this.start.y + ny));
    }

    /* Returns true if the dot product of the two direction vectors is zero. */
    isPerpendicularTo(otherLine) {
        const dx1 = this.end.x - this.start.x;
        const dy1 = this.end.y - this.start.y;
        const dx2 = otherLine.end.x - otherLine.start.x;
        const dy2 = otherLine.end.y - otherLine.start.y;
        return (dx1 * dx2 + dy1 * dy2) === 0;
    }

    /* Returns a Line of given length centered on this line's midpoint,
       oriented perpendicular to this line. */
    perpendicularAtMidpoint(length = 100) {
        const mid  = this.midpoint();
        const perp = this.perpendicular();
        const dx   = perp.end.x - perp.start.x;
        const dy   = perp.end.y - perp.start.y;
        const half = length / 2;
        return new Line(
            new Point(mid.x + dx * half, mid.y + dy * half),
            new Point(mid.x - dx * half, mid.y - dy * half)
        );
    }

    /* Returns the Euclidean length of the line. */
    length() {
        const dx = this.end.x - this.start.x;
        const dy = this.end.y - this.start.y;
        return Math.hypot(dx, dy);
    }

    /* Returns the direction angle in radians (atan2). */
    angle() {
        const dx = this.end.x - this.start.x;
        const dy = this.end.y - this.start.y;
        return Math.atan2(dy, dx);
    }

    /* Returns the slope (dy/dx). Throws if the line is vertical. */
    slope() {
        const dx = this.end.x - this.start.x;
        if (dx === 0)
            throw new Error("Line.slope(): vertical line has undefined slope");
        return (this.end.y - this.start.y) / dx;
    }

    /* Returns true if the cross product of the two direction vectors is zero. */
    isParallelTo(otherLine) {
        const dx1 = this.end.x - this.start.x;
        const dy1 = this.end.y - this.start.y;
        const dx2 = otherLine.end.x - otherLine.start.x;
        const dy2 = otherLine.end.y - otherLine.start.y;
        return (dx1 * dy2 - dy1 * dx2) === 0;
    }

    /* Returns the intersection Point of this line and otherLine,
       or null if the lines are parallel or coincident. */
    intersects(otherLine) {
        const { start: A, end: B } = this;
        const { start: C, end: D } = otherLine;
        const denom = (A.x - B.x) * (C.y - D.y) - (A.y - B.y) * (C.x - D.x);
        if (denom === 0) return null;
        const x = ((A.x * B.y - A.y * B.x) * (C.x - D.x) -
                   (A.x - B.x) * (C.x * D.y - C.y * D.x)) / denom;
        const y = ((A.x * B.y - A.y * B.x) * (C.y - D.y) -
                   (A.y - B.y) * (C.x * D.y - C.y * D.x)) / denom;
        return new Point(x, y);
    }

    /* Returns a new Line that is a sub-segment between t1 and t2 (0.0–1.0). */
    trim(t1 = 0, t2 = 1) {
        return new Line(this.pointAt(t1), this.pointAt(t2));
    }

    /* Calculates how many steps remain after shorten/truncate to maintain
       constant density. shortenRatio removes from start, truncateSteps from end. */
    remainingSteps(totalSteps, shortenRatio, truncateSteps) {
        const usedRatio = (1 - shortenRatio) - (truncateSteps / totalSteps);
        return Math.max(1, Math.floor(totalSteps * usedRatio));
    }

    /* Trim variant for curve stitching. shortenRatio removes from start (0–1),
       truncateSteps removes from end, totalSteps is numSteps from StringThing. */
    trimForStitch(shortenRatio, truncateSteps, totalSteps) {
        const tStart = shortenRatio;
        const tEnd   = 1 - (truncateSteps / totalSteps);
        return this.trim(tStart, tEnd);
    }
}

export { Point, Line, StringThing };
