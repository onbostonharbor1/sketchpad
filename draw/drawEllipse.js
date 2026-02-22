import { Ellipse, START_END, FULL, TAPER, START_TAPER, END_TAPER }
                               from "/classes/ellipseClass.js";
import { Line, Point }         from "/classes/classes.js";
import { drawLine, drawNodes, toRadians } from "./drawUtilities.js";
import { createNodes }         from "./createNodes.js";
const CLOSE     = true;
const DONT_DRAW = true;

/**
 * ====================================================================
 * renderPattern(thing, nodes)
 * --------------------------------------------------------------------
 * INTERNAL EXECUTION ENGINE
 * Consolidated logic for drawing patterns within a set of nodes.
 * Maintains the specific tapering math and "arm" extension logic
 * originally defined in drawInEllipse and drawInVariedEllipse.
 * ====================================================================
 */
function renderPattern(thing, nodes) {
    const DISTANCE = 4;
    let chordLength = thing.chordLength;
    let start = 0;
    let end = nodes.length;
    // length = total of nodes to be done
    // it will be greater than nodes.length if startSkip or endSkip is negative
    let length = end;

    /* ------------------------------------------------------------
       Internal Pattern Helpers (Original Logic & Comments)
       ------------------------------------------------------------ */

    function drawStart(nodes, chordLength, thing, start, dist = 4) {
        // dist: initial chord length
        // chordLength: target (full) chord length
        // returns: index of first unused node after taper
        const len = nodes.length;
        const numLines = chordLength - dist; // taper length directly tied to dist
        let inc = dist;
        let j = start;
        let color = thing.color;
        let lineWidth = thing.lineWidth;

        for (let i = 0; i < numLines; i++) {
            j = (start + i) % len;
            const k = (j + inc) % len;
            drawLine(nodes[j], nodes[k], color, lineWidth);
            inc++;
        }
        return (j + 1) % len;
    }

    function drawWithin(nodes, chordLength, thing, start, length, { wrap = false } = {}) {
        // length = how many nodes to cover starting at `start` (not an index).
        // wrap=false (default) means: stop at length - chordLength so End can finish.
        // wrap=true means: draw the full length, allowing wraparound (used for FULL).
        const len = nodes.length;
        const numLines = wrap ? length : Math.max(0, length - chordLength);
        let j = start;
        let color = thing.color;
        let lineWidth = thing.lineWidth;

        for (let i = 0; i < numLines; i++) {
            j = (start + i) % len;
            const k = (j + chordLength) % len;
            drawLine(nodes[j], nodes[k], color, lineWidth);
        }
        return (j + 1) % len; // First unused node after the last chord start
    }

    function drawEnd(nodes, chordLength, thing, start, length, dist = 4) {
        // Draws the taper-down phase at the end of the pattern.
        // Restores the original behavior: index increments by 2
        // so the lines thin and taper smoothly rather than abruptly.
        const len = nodes.length;
        let color = thing.color;
        let lineWidth = thing.lineWidth;
        let currentSkip = chordLength;
        const numLines = Math.max(0, currentSkip - dist);
        let j, k;

        for (let i = start, lineCount = 0; lineCount < numLines; i += 2, lineCount++) {
            currentSkip--; // shorten chord
            j = i % len;
            k = (i + currentSkip + 1) % len;
            drawLine(nodes[j], nodes[k], color, lineWidth);
        }
        return (j + 1) % len;
    }

    function extendWithArms(nodes, arm1, arm2) {
        // Helper: optionally extend ellipse with attached arms
        // If arm1 shares first circle point, remove overlap before concat
        if (Array.isArray(arm1)) {
            const sharesStart = arm1.length &&
                arm1[arm1.length - 1].x === nodes[0].x &&
                arm1[arm1.length - 1].y === nodes[0].y;
            if (sharesStart) nodes.shift();
            nodes = arm1.concat(nodes);
        }
        if (Array.isArray(arm2)) {
            nodes = nodes.concat(arm2);
        }
        return nodes;
    }

    function adjustStartEnd(nodes, thing, start, end, length) {
        if (thing.startSkip > 0) {
            start = thing.startSkip;
            length -= thing.startSkip;
        } else if (thing.startSkip < 0) {
            start = nodes.length + thing.startSkip;
            length -= thing.startSkip;
        }
        if (thing.endSkip > 0) {
            end = nodes.length - thing.endSkip;
            length -= thing.endSkip;
        } else if (thing.endSkip < 0) {
            end = -thing.endSkip;
            length -= thing.endSkip;
        }
        return { start, end, length };
    }

    /* ------------------------------------------------------------
       Execution Flow
       ------------------------------------------------------------ */

    // COMPLETE CIRCLE
    if (thing.withinCirc === FULL) {
        drawWithin(nodes, chordLength, thing, start, length, { wrap: true });
        drawNodes(thing, nodes);
        return;
    }

    // ADD ARMS (START_END mode)
    if (Array.isArray(thing.arm1) || Array.isArray(thing.arm2)) {
        thing.withinCirc = START_END; // enforce mode
        nodes = extendWithArms(nodes, thing.arm1, thing.arm2);
        drawWithin(nodes, chordLength, thing, start, length);
        return;
    }

    ({ start, end, length } = adjustStartEnd(nodes, thing, start, end, length));

    // DRAW OUTLINE OF ELLIPSE SEGMENT
    // This draws the visible outer arc based on startSkip/endSkip.
    for (let i = start; i < start + length - 1; i++) {
        const j = i % nodes.length;
        const k = (i + 1) % nodes.length;
        drawLine(nodes[j], nodes[k], thing);
    }

    const sSkip = thing.startSkip || 0;

    if (thing.withinCirc == START_END) {
        drawWithin(nodes, chordLength, thing, start, length);
    } else if (thing.withinCirc == START_TAPER) {
        start = drawStart(nodes, chordLength, thing, start, DISTANCE);
        drawWithin(nodes, chordLength, thing, start, length - start + sSkip);
    } else if (thing.withinCirc == END_TAPER) {
        let endIdx = length - chordLength + DISTANCE;
        start = drawWithin(nodes, chordLength, thing, start, endIdx);
        drawEnd(nodes, chordLength, thing, start, length - sSkip);
    } else {
        // TAPER: both ramp-in and ramp-out
        start = drawStart(nodes, chordLength, thing, start, DISTANCE); // fade in
        let endIdx = length - chordLength + DISTANCE - start + sSkip; // middle section
        start = drawWithin(nodes, chordLength, thing, start, endIdx); // steady section
        drawEnd(nodes, chordLength, thing, start, length); // fade out
    }
}

/////////////////////////////////////////////////////////////////
// drawInCircle
/////////////////////////////////////////////////////////////////
export function drawInCircle(thing) {
    thing.ellipse = { a: thing.radius*2, b: thing.radius*2 };
    drawInEllipse(thing);
}

/////////////////////////////////////////////////////////////////
// drawInEllipse
/////////////////////////////////////////////////////////////////
export function drawInEllipse(thing) {
    let nodes = createNodes(thing);
    renderPattern(thing, nodes);
}

/* ------------------------------------------------------------
   pointAtArcLength()
   Given cumulative arc-lengths (S) and corresponding points (X),
   returns the interpolated point at the specified arc length.
   ------------------------------------------------------------ */
export function pointAtArcLength(targetLength, maxSamples, cumulativeLengths, pointArray) {
    let lowIndex = 1;
    let highIndex = maxSamples;
    while (lowIndex < highIndex) {
        const midIndex = (lowIndex + highIndex) >>> 1;
        if (cumulativeLengths[midIndex] < targetLength) lowIndex = midIndex + 1;
        else highIndex = midIndex;
    }
    const k = lowIndex;
    const prevLength = cumulativeLengths[k - 1];
    const nextLength = cumulativeLengths[k];
    const prevPoint  = pointArray[k - 1];
    const nextPoint  = pointArray[k];
    const t = (targetLength - prevLength) / Math.max(1e-9, nextLength - prevLength);

    return {
        x: prevPoint.x + t * (nextPoint.x - prevPoint.x),
        y: prevPoint.y + t * (nextPoint.y - prevPoint.y)
    };
}



/**
 * ====================================================================
 * arcPoints(a, b, r_frac, n)
 * --------------------------------------------------------------------
 * PURPOSE:
 * - Replaces the complex, multi-function legacy arc logic.
 * - Generates n unique nodes for a circular arc between A and B.
 * - Uses the determinant-based circumcenter to avoid vertical line errors.
 * ====================================================================
 */

export function arcPoints(a, b, r_frac, n) {
    // --- Legacy Helper Clones (Scoped locally for a clean export) ---
    const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    const slope = (p1, p2) => (p2.y - p1.y) / (p2.x - p1.x);
    const invSlope = (p1, p2) => -1 * (1 / slope(p1, p2));
    const midPoint = (p1, p2) => new Point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    const intercept = (p1, p2) => {
        let m = invSlope(p1, p2);
        let p = midPoint(p1, p2);
        return p.y - m * p.x;
    };

    // 1. Calculate the Bulge Point (P3) exactly as legacy getP3 did
    const mid = midPoint(a, b);
    const m = invSlope(a, b);
    const bLower = b.y < a.y ? -1 : 1;
    const d = 0.5 * dist(a, b) * r_frac;

    const xOff = d / Math.sqrt(1 + Math.pow(m, 2));
    const yOff = m * xOff;
    const p3 = new Point(bLower * xOff + mid.x, bLower * yOff + mid.y);

    // 2. Find the Center exactly as legacy getCenter did
    // Intersection of perpendicular bisectors of AB and AC
    const b1 = intercept(a, b);
    const b2 = intercept(a, p3);
    const m1 = invSlope(a, b);
    const m2 = invSlope(a, p3);

    const centerX = (b2 - b1) / (m1 - m2);
    const centerY = m1 * centerX + b1;
    const c = new Point(centerX, centerY);
    const radius = dist(c, a);

    // 3. Calculate angles and sweep
    let aAngle = Math.atan2(a.y - c.y, a.x - c.x);
    let bAngle = Math.atan2(b.y - c.y, b.x - c.x);

    if (aAngle > bAngle) {
        bAngle += 2 * Math.PI;
    }

    // 4. Sample nodes using i < n
    // This maintains the same density as the legacy range() call.
    const sampledPoints = [];
    for (let i = 0; i < n; i++) {
        const theta = aAngle + (i * (bAngle - aAngle) / n);
        sampledPoints.push(new Point(
            Math.cos(theta) * radius + c.x,
            Math.sin(theta) * radius + c.y
        ));
    }

    return sampledPoints;
}

export function arcCurvature(pt1, pt2, curve, numPoints = 32) {
    // Lets me specify using a real looking number
    let curvature = curve/1000;
    let pts = [];
    // Use the same math to find center, radius, and sweep
    const dx = pt2.x - pt1.x;
    const dy = pt2.y - pt1.y;
    const d  = Math.hypot(dx, dy);
    if (d === 0) return;

    if (curvature === 0) {
	pts.push(pt1);
	pts.push(pt2);
	return pts;
    }

    const sign = Math.sign(curvature);
    let   R    = Math.abs(1 / curvature);
    const Rmin = d / 2;
    if (R < Rmin)
	R = Rmin;

    const mx = (pt1.x + pt2.x) / 2;
    const my = (pt1.y + pt2.y) / 2;
    const ux = dx / d;
    const uy = dy / d;
    const nx = -uy;
    const ny = ux;
    const h  = Math.sqrt(Math.max(0, R * R - (d / 2) * (d / 2)));
    const Cx = mx + sign * h * nx;
    const Cy = my + sign * h * ny;

    let a0 = Math.atan2(pt1.y - Cy, pt1.x - Cx);
    let a1 = Math.atan2(pt2.y - Cy, pt2.x - Cx);
    const twoPi = Math.PI * 2;
    // CCW sweep in [0, 2π)
    let delta  = ((a1 - a0) % twoPi + twoPi) % twoPi;
    // choose minor sweep in (-π, π]
    if (delta > Math.PI) delta -= twoPi;

    for (let i = 0; i <= numPoints; i++) {
	const t = i / numPoints;
	const a = a0 + t * delta;
	const x = Cx + R * Math.cos(a);
	const y = Cy + R * Math.sin(a);
	pts.push(new Point(x,y));
    }
    return pts;
}

