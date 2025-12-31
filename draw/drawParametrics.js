// drawParametrics.js
// ------------------------------------------------------------
// Parametric and Polar curve drawing support (function-based)
// rendered as straight line segments between sampled points.
//
// Key design choices:
// - We represent curves as functions of a single parameter t.
// - We sample t values into a "pts" array (owned by Parametric).
// - We draw by connecting consecutive samples with drawLine().
// - We support polar curves by adapting (angle, radius) into (x(t), y(t)).
// - We auto-fit the resulting curve bounds to the canvas before drawing.
//
// IMPORTANT CONSTRAINTS (your project style):
// - Fail-fast: missing required functions should throw immediately.
// - Deterministic: no silent fallbacks except explicit defaults like angle(t)=t.
// - Clear structure: each function has a single job; helpers do mechanics.
// ------------------------------------------------------------

import { Point }               from "/classes/classes.js";
import { Parametric }          from "/classes/parametric.js";
import { drawLine, printText } from "/draw/draw_utilities.js";

/* ============================================================
   drawOldPolar(angle, rad, pts)
   ------------------------------------------------------------
   Historical reference only. Kept so you can compare old vs new
   approaches while migrating code.

   Old approach:
   - Accepts angle(t) and rad(t) plus a pts array directly.
   - Builds funcX/funcY and calls drawParametric(funcX, funcY, pts).

   Why this is "DO NOT USE":
   - It bypasses the Parametric object, which now owns:
       * domain defaults
       * building pts from domain
       * shared properties like color/lineWidth/margin/etc.
   - It does not match the current unified pipeline.
============================================================ */
function drawOldPolar(angle, rad, pts) {
	let funcX = function(t) {
		return rad(t) * Math.cos(angle(t));
	};
	let funcY = function(t) {
		return rad(t) * Math.sin(angle(t));
	};
	drawParametric(funcX, funcY, pts);
} // end drawOldPolar


/* ============================================================
   drawPolar(s)
   ------------------------------------------------------------
   Public API: draw a polar curve using a single configuration object.

   Expected "s" fields (typical):
   - rad(t)      : REQUIRED. Returns radius at parameter t.
   - angle(t)    : OPTIONAL. Returns angle at parameter t.
                  If omitted, defaults to identity: angle(t) = t.
   - domain      : OPTIONAL. Handled by Parametric defaults; may include:
       * tMin, tMax
       * numPoints (0 means "auto-choose" in your Parametric logic)
       * maxFreq, samplesPerCycle, etc.
   - color, lineWidth, margin, printEquations, etc.

   What this function does:
   1) Enforces required fields (rad).
   2) Supplies a default angle function if missing.
   3) Adapts polar => parametric by building funcX/funcY.
   4) Constructs a Parametric object (which builds the sampled pts array).
   5) Delegates to drawParametric() for auto-fit + draw.

   Notes:
   - This function intentionally does NOT mutate the caller's object "s".
     (Fail-fast and deterministic are easier if call sites don't get
      silently modified by helper functions.)
============================================================ */
export function drawPolar(s) {

	// Fail-fast on missing config object (optional but consistent with style).
	if (!s) {
		throw new Error("drawPolar requires a config object");
	}

	// Required: radius function.
	if (!s.rad) {
		throw new Error("drawPolar requires rad(t)");
	}

	// Default: if angle is omitted, treat angle(t) as identity.
	// This is the most common polar usage: r = f(t), theta = t.
	const angleFn = s.angle ? s.angle : function(t) { return t; };

	// Build a parametric config object p from s.
	// Object.assign({}, s, ...) ensures we do not mutate "s".
	const p = Object.assign({}, s, {

		// Convert polar -> parametric:
		// x(t) = r(t) * cos(theta(t))
		// y(t) = r(t) * sin(theta(t))
		funcX: function(t) { return s.rad(t) * Math.cos(angleFn(t)); },
		funcY: function(t) { return s.rad(t) * Math.sin(angleFn(t)); }

	});

	// Parametric now owns sampling t values and providing defaults.
	const thing = new Parametric(p);

	// Unified pipeline:
	// - autoFit to canvas
	// - optionally print equations
	// - render line segments
	drawParametric(thing);

} // end drawPolar



/* ============================================================
   drawParametric(thing)
   ------------------------------------------------------------
   Core rendering pipeline for any Parametric curve.

   Input:
   - "thing" is a Parametric instance with:
       * pts        : array of sampled t values
       * funcX(t)   : returns x-coordinate in "math space"
       * funcY(t)   : returns y-coordinate in "math space"
       * color, lineWidth
       * printEquations (optional)
       * scale, mid, margin (mid/scale are set by autoFit)

   What this function does:
   1) Auto-fit the curve bounds to the canvas (updates thing.scale and thing.mid).
   2) Optionally print readable function bodies.
   3) Convert each point from math space -> canvas space.
   4) Draw consecutive line segments.

   Important:
   - We draw "segments" rather than a polyline object so you can visually
     inspect individual stitches (matches your debugging preference).
============================================================ */
export function drawParametric(thing) {

	// Destructure for readability.
	const {
		pts,
		funcX,
		funcY,
		color,
		lineWidth,
		printEquations
	} = thing;

	// ------------------------------------------------------------
	// 1) Auto-fit: part of the draw pipeline
	//    This computes bounds, chooses scale, and sets thing.mid.
	// ------------------------------------------------------------
	autoFitParametricToCanvas(thing);

	// Convert a math-space x coordinate into canvas-space x.
	function toCanvasX(coord) {
		return thing.scale * coord + thing.mid.x;
	} // end toCanvasX

	// Convert a math-space y coordinate into canvas-space y.
	function toCanvasY(coord) {
		return thing.scale * coord + thing.mid.y;
	} // end toCanvasY

	/* ------------------------------------------------------------
	   printParametricEquations(funcX, funcY)
	   ------------------------------------------------------------
	   Debug/teaching helper: prints the bodies of funcX and funcY
	   in the top-left corner.

	   This is intended for quick verification of what you are drawing,
	   not for full pretty-printing or symbolic formatting.

	   The getFuncBody() logic tries to extract the "return ..." portion
	   from a normal function body. If it can't, it returns the raw source.
	------------------------------------------------------------ */
	function printParametricEquations(funcX, funcY) {

		function getFuncBody(fn) {
			const src = fn.toString();

			// Attempt to extract the expression after "return".
			// This supports classic: function(t) { return ...; }
			const m = src.match(/return\s+([\s\S]*?);?\s*\}/);

			// If found, return the expression; otherwise fallback to full source.
			return (m && m[1]) ? m[1].trim() : src;
		} // end getFuncBody

		printText("funcX: " + getFuncBody(funcX), new Point(10, 10));
		printText("funcY: " + getFuncBody(funcY), new Point(10, 25));

	} // end printParametricEquations

	// ------------------------------------------------------------
	// 2) Optional equation printing (debug/teaching)
	// ------------------------------------------------------------
	if (printEquations) {
		printParametricEquations(funcX, funcY);
	}

	// ------------------------------------------------------------
	// 3) Render: connect consecutive sample points with segments
	// ------------------------------------------------------------
	for (let i = 0; i < pts.length - 1; i++) {

		const x1 = toCanvasX(funcX(pts[i]));
		const y1 = toCanvasY(funcY(pts[i]));

		const x2 = toCanvasX(funcX(pts[i + 1]));
		const y2 = toCanvasY(funcY(pts[i + 1]));

		drawLine(
			new Point(x1, y1),
			new Point(x2, y2),
			color,
			lineWidth
		);
	}

} // end drawParametric


/* ============================================================
   measureParametricBounds(thing)
   ------------------------------------------------------------
   Measures the bounding box of a curve in math space.

   Input:
   - thing.pts  : sampled t values
   - thing.funcX, thing.funcY : coordinate evaluators

   Output:
   - { minX, maxX, minY, maxY } in math-space units

   Notes:
   - This function does NOT touch the canvas.
   - It is used by autoFitParametricToCanvas() to compute scaling.
============================================================ */
function measureParametricBounds(thing) {

	const { pts, funcX, funcY } = thing;

	let minX =  Infinity;
	let maxX = -Infinity;
	let minY =  Infinity;
	let maxY = -Infinity;

	for (let i = 0; i < pts.length; i++) {

		const t = pts[i];

		// Evaluate curve in math space.
		const x = funcX(t);
		const y = funcY(t);

		// Expand bounds.
		if (x < minX) minX = x;
		if (x > maxX) maxX = x;
		if (y < minY) minY = y;
		if (y > maxY) maxY = y;

	}

	return { minX, maxX, minY, maxY };

} // end measureParametricBounds


/* ============================================================
   autoFitParametricToCanvas(thing)
   ------------------------------------------------------------
   Computes a uniform scale and translation so the entire curve
   fits within the canvas with a margin.

   What it updates on "thing":
   - thing.scale : math-space to pixel scale factor
   - thing.mid   : Point(xOffset, yOffset) used by drawParametric

   What it returns:
   - The measured bounds {minX,maxX,minY,maxY} (math space)

   Behavior:
   1) Get canvas size.
   2) Measure curve bounds in math space.
   3) Compute usable canvas area (minus margins).
   4) Choose uniform scale to fit both width and height.
   5) Center curve by aligning curve center to canvas center.

   Fail-fast:
   - Throws if canvas missing.
   - Throws if bounds are invalid or canvas too small.
============================================================ */
export function autoFitParametricToCanvas(thing) {

	const canvas = document.getElementById("sharedCanvas");
	if (!canvas) {
		throw new Error("autoFitParametricToCanvas: #sharedCanvas not found");
	}

	const canvasW = canvas.width;
	const canvasH = canvas.height;

	// Margin must exist (Parametric default is 30 in your current design).
	const margin = thing.margin;

	// Measure bounds in math space.
	const b = measureParametricBounds(thing);

	const width  = b.maxX - b.minX;
	const height = b.maxY - b.minY;

	// If width or height is 0 or negative, curve is degenerate or bounds failed.
	if (width <= 0 || height <= 0) {
		throw new Error("autoFitParametricToCanvas: invalid bounds (width/height <= 0)");
	}

	// Canvas area actually available after margin.
	const usableW = canvasW - 2 * margin;
	const usableH = canvasH - 2 * margin;

	if (usableW <= 0 || usableH <= 0) {
		throw new Error("autoFitParametricToCanvas: canvas too small for given margin");
	}

	// Uniform scale: choose the smaller scale so we fit BOTH dimensions.
	const sX = usableW / width;
	const sY = usableH / height;
	const scale = (sX < sY) ? sX : sY;

	// Curve center in math space.
	const centerX = (b.minX + b.maxX) / 2;
	const centerY = (b.minY + b.maxY) / 2;

	// Store scale on the object (used by drawParametric).
	thing.scale = scale;

	// Compute translation so the curve center maps to canvas center.
	// xCanvas = scale * xMath + midX
	// midX chosen so that xMath=centerX maps to canvasW/2.
	const midX = canvasW / 2 - scale * centerX;
	const midY = canvasH / 2 - scale * centerY;

	thing.mid = new Point(midX, midY);

	return b;

} // end autoFitParametricToCanvas
