// drawParametrics.js
// ------------------------------------------------------------
// Parametric and Polar Curve Drawing Engine
// ------------------------------------------------------------
// This module provides the logic for rendering mathematical curves
// onto the HTML5 Canvas. It bridges the gap between the "pure model"
// Parametric class and the visual display.
//
// Key Features:
//   1.  Auto-Fitting: Automatically scales and centers any curve
//       to fit within the canvas boundaries using a configurable margin.
//   2.  Circuit Breaker: Prevents infinite drawing or overlapping loops
//       by detecting when a curve has returned to its starting point
//       and moving in its original direction.
//   3.  Intersection Detection: An incremental, O(n^2) check that
//       identifies where a curve crosses itself. It uses a sensitive
//       epsilon buffer to avoid "beading" at segment joints.
//   4.  Polar Support: A wrapper that converts polar coordinates
//       (radius and angle) into Cartesian parametric functions.
// ------------------------------------------------------------

import { Point } from "/classes/classes.js";
import { Parametric } from "/classes/parametric.js";
import { drawLine, printText, displayPoint } from "/draw/drawUtilities.js";

/**
 * drawPolar(s)
 * Converts polar function definitions into Cartesian parametric functions
 * and then hands them off to the main drawing engine.
 */
export function drawPolar(s) {
    if (!s) throw new Error("drawPolar requires a config object");
    if (!s.rad) throw new Error("drawPolar requires rad(t)");

    // Default angle is just 't' (radians) if not provided
    const angleFn = s.angle ? s.angle : function(t) { return t; };

    // Map radius and angle to X and Y
    const p = Object.assign({}, s, {
        funcX: function(t) { return s.rad(t) * Math.cos(angleFn(t)); },
        funcY: function(t) { return s.rad(t) * Math.sin(angleFn(t)); }
    });

    const thing = new Parametric(p);
    drawParametric(thing);
} // end drawPolar

/**
 * drawParametric(thing)
 * The primary loop for evaluating, auto-fitting, and drawing the curve segments.
 */
export function drawParametric(thing) {
    const { pts, funcX, funcY, color, lineWidth, showIntersections } = thing;

    // 1. Calculate scaling and centering before we draw a single pixel
    autoFitParametricToCanvas(thing);

    const segments = [];

    // 2. Establish "The Start" for the Circuit Breaker logic
    const pStart = new Point(
        thing.scale * funcX(pts[0]) + thing.mid.x,
        thing.scale * funcY(pts[0]) + thing.mid.y
    );

    // Capture the initial vector to ensure we only break when moving the same way
    const firstStepX = (thing.scale * funcX(pts[1]) + thing.mid.x) - pStart.x;
    const firstStepY = (thing.scale * funcY(pts[1]) + thing.mid.y) - pStart.y;

    // 3. Main Sampling Loop
    for (let i = 0; i < pts.length; i++) {
        const t = pts[i];
        const px = thing.scale * funcX(t) + thing.mid.x;
        const py = thing.scale * funcY(t) + thing.mid.y;
        const pCurrent = new Point(px, py);

        if (i > 0) {
            const pPrev = segments[segments.length - 1].p2;
            const newSeg = { p1: pPrev, p2: pCurrent };

            // --- THE CIRCUIT BREAKER ---
            // Don't check for closure until we've moved at least 50 steps away.
            if (i > 50) {
                const distToStart = Math.hypot(pCurrent.x - pStart.x, pCurrent.y - pStart.y);
                const currentStepX = pCurrent.x - pPrev.x;
                const currentStepY = pCurrent.y - pPrev.y;

                // Dot product > 0 means vectors are generally in the same direction.
                const dotProduct = (currentStepX * firstStepX) + (currentStepY * firstStepY);

                // If within 2 pixels and heading 'home', close the circuit.
                if (distToStart < 2.0 && dotProduct > 0) {
                    // BRIDGE: Draw the last closing segment to pStart to eliminate gaps
                    drawLine(pPrev, pStart, color, lineWidth);

                    // Final intersection check for the bridge segment
                    if (showIntersections) {
                        for (let j = 0; j < segments.length - 2; j++) {
                            const old = segments[j];
                            const hit = getLineIntersection(pPrev, pStart, old.p1, old.p2);
                            if (hit) displayPoint(hit, "red");
                        }
                    }
                    break; // Terminate drawing early
                }
            }

            // Normal Segment Drawing
            drawLine(newSeg.p1, newSeg.p2, color, lineWidth);

            // 4. INTERSECTION DETECTION
            // Compare the brand new segment against all previous non-adjacent segments.
            if (showIntersections && segments.length > 2) {
                for (let j = 0; j < segments.length - 2; j++) {
                    const old = segments[j];
                    const hit = getLineIntersection(newSeg.p1, newSeg.p2, old.p1, old.p2);
                    if (hit) displayPoint(hit, "red");
                }
            }
            segments.push(newSeg);
        } else {
            // First point initialization
            segments.push({ p1: pCurrent, p2: pCurrent });
        }
    }
} // end drawParametric

/**
 * getLineIntersection(p1, p2, p3, p4)
 * Traditional line segment intersection using the Determinant/Cramer's Rule approach.
 * Returns {x, y} or null.
 */
function getLineIntersection(p1, p2, p3, p4) {
    const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (denom === 0) return null; // Parallel

    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
    const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

    // SENSITIVITY TWEAK:
    // epsilon (0.01) represents a 1% buffer at the ends of segments.
    // This stops joints from flagging as intersections (beading).
    const epsilon = 0.01;

    if (ua > epsilon && ua < (1 - epsilon) && ub > epsilon && ub < (1 - epsilon)) {
        return {
            x: p1.x + ua * (p2.x - p1.x),
            y: p1.y + ua * (p2.y - p1.y)
        };
    }
    return null;
}

/**
 * autoFitParametricToCanvas(thing)
 * Measures the raw mathematical bounds of the curve and updates the
 * 'scale' and 'mid' properties of the Parametric object to fit the canvas.
 */
export function autoFitParametricToCanvas(thing) {
    const canvas = document.getElementById("sharedCanvas");
    if (!canvas) throw new Error("autoFit: #sharedCanvas not found");

    const b = measureParametricBounds(thing);
    const width = b.maxX - b.minX;
    const height = b.maxY - b.minY;

    if (width <= 0 || height <= 0) throw new Error("autoFit: invalid bounds");

    const margin = thing.margin || 30;
    const usableW = canvas.width - 2 * margin;
    const usableH = canvas.height - 2 * margin;

    // Maintain aspect ratio: use the smaller of the two possible scales
    const sX = usableW / width;
    const sY = usableH / height;
    thing.scale = (sX < sY) ? sX : sY;

    // Calculate centering offset
    thing.mid = new Point(
        canvas.width / 2 - thing.scale * ((b.minX + b.maxX) / 2),
        canvas.height / 2 - thing.scale * ((b.minY + b.maxY) / 2)
    );

    return b;
} // end autoFitParametricToCanvas

/**
 * measureParametricBounds(thing)
 * Evaluates the curve functions across all sample points to find
 * the mathematical min/max bounding box.
 */
function measureParametricBounds(thing) {
    const { pts, funcX, funcY } = thing;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (let i = 0; i < pts.length; i++) {
        const x = funcX(pts[i]), y = funcY(pts[i]);
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return { minX, maxX, minY, maxY };
} // end measureParametricBounds
