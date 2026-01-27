// drawParametrics.js
// ------------------------------------------------------------
// Parametric and Polar curve drawing support (function-based)
// rendered as straight line segments between sampled points.
// ------------------------------------------------------------

import { Point } from "/classes/classes.js";
import { Parametric } from "/classes/parametric.js";
import { drawLine, printText, displayPoint } from "/draw/drawUtilities.js";

/* ============================================================
   drawPolar(s)
   ------------------------------------------------------------
   Adapts polar (r, theta) into parametric (x, y) and draws.
============================================================ */
export function drawPolar(s) {
    if (!s) throw new Error("drawPolar requires a config object");
    if (!s.rad) throw new Error("drawPolar requires rad(t)");

    const angleFn = s.angle ? s.angle : function(t) { return t; };

    const p = Object.assign({}, s, {
        funcX: function(t) { return s.rad(t) * Math.cos(angleFn(t)); },
        funcY: function(t) { return s.rad(t) * Math.sin(angleFn(t)); }
    });

    const thing = new Parametric(p);
    drawParametric(thing);
} // end drawPolar

/* ============================================================
   drawParametric(thing)
   ------------------------------------------------------------
   Main rendering loop. Uses Recursive Bisection for intersections.
============================================================ */
export function drawParametric(thing) {
    const { pts, funcX, funcY, color, lineWidth, showIntersections } = thing;

    autoFitParametricToCanvas(thing);

    const canvasPoints = [];
    for (let i = 0; i < pts.length; i++) {
        const t = pts[i];
        const px = thing.scale * funcX(t) + thing.mid.x;
        const py = thing.scale * funcY(t) + thing.mid.y;
        const p = new Point(px, py);
        canvasPoints.push(p);
        if (i > 0) drawLine(canvasPoints[i - 1], p, color, lineWidth);
    }

    if (showIntersections) {
        const numZones = 32;
        const tMin = pts[0];
        const tMax = pts[pts.length - 1];
        const step = (tMax - tMin) / numZones;

        for (let i = 0; i < numZones; i++) {
            for (let j = i + 1; j < numZones; j++) {
                const tA1 = tMin + i * step;
                const tA2 = tA1 + step;
                const tB1 = tMin + j * step;
                const tB2 = tB1 + step;

                // Skip immediate neighbors in parameter space
                if (Math.abs(tA1 - tB1) < step * 1.1) continue;

                solveRecursive(thing, tA1, tA2, tB1, tB2, 0);
            }
        }
    }
} // end drawParametric

/* ============================================================
   Internal Helpers for Recursive Bisection
============================================================ */
function solveRecursive(thing, tA1, tA2, tB1, tB2, depth) {
    const boxA = getRangeBounds(thing, tA1, tA2);
    const boxB = getRangeBounds(thing, tB1, tB2);

    if (!boxesOverlap(boxA, boxB)) return;

    if (depth > 10) {
        const hitX = thing.scale * thing.funcX(tA1) + thing.mid.x;
        const hitY = thing.scale * thing.funcY(tA1) + thing.mid.y;
        displayPoint({ x: hitX, y: hitY }, "red");
        return;
    }

    const midA = (tA1 + tA2) / 2;
    const midB = (tB1 + tB2) / 2;

    solveRecursive(thing, tA1, midA, tB1, midB, depth + 1);
    solveRecursive(thing, tA1, midA, midB, tB2, depth + 1);
    solveRecursive(thing, midA, tA2, tB1, midB, depth + 1);
    solveRecursive(thing, midA, tA2, midB, tB2, depth + 1);
}

function getRangeBounds(thing, tStart, tEnd) {
    const mid = (tStart + tEnd) / 2;
    const xs = [thing.funcX(tStart), thing.funcX(mid), thing.funcX(tEnd)];
    const ys = [thing.funcY(tStart), thing.funcY(mid), thing.funcY(tEnd)];

    return {
        minX: Math.min(...xs), maxX: Math.max(...xs),
        minY: Math.min(...ys), maxY: Math.max(...ys)
    };
}

function boxesOverlap(a, b) {
    const padding = 0.01;
    return !(a.maxX < b.minX - padding || a.minX > b.maxX + padding ||
             a.maxY < b.minY - padding || a.minY > b.maxY + padding);
}

/* ============================================================
   Canvas Fitting Logic
============================================================ */
export function autoFitParametricToCanvas(thing) {
    const canvas = document.getElementById("sharedCanvas");
    if (!canvas) throw new Error("autoFit: #sharedCanvas not found");

    const b = measureParametricBounds(thing);
    const width = b.maxX - b.minX;
    const height = b.maxY - b.minY;

    if (width <= 0 || height <= 0) throw new Error("autoFit: invalid bounds");

    const usableW = canvas.width - 2 * thing.margin;
    const usableH = canvas.height - 2 * thing.margin;

    const sX = usableW / width;
    const sY = usableH / height;
    thing.scale = (sX < sY) ? sX : sY;

    thing.mid = new Point(
        canvas.width / 2 - thing.scale * ((b.minX + b.maxX) / 2),
        canvas.height / 2 - thing.scale * ((b.minY + b.maxY) / 2)
    );

    return b;
}

function measureParametricBounds(thing) {
    const { pts, funcX, funcY } = thing;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (let i = 0; i < pts.length; i++) {
        const x = funcX(pts[i]), y = funcY(pts[i]);
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return { minX, maxX, minY, maxY };
}
