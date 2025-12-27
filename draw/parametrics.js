// parametrics.js
// ------------------------------------------------------------
// Parametric curve support (function-based, line-segment rendering)
// ------------------------------------------------------------
import { Point }               from "/classes/classes.js";
import { Parametric }          from "/classes/parametric.js";
import { drawLine, printText } from "/draw/draw_utilities.js";

// Kept only for historical reference (DO NOT USE).
function drawOldPolar(angle, rad, pts) {
	let funcX = function(t) {
		return rad(t) * Math.cos(angle(t));
	};
	let funcY = function(t) {
		return rad(t) * Math.sin(angle(t));
	};
	drawParametric(funcX, funcY, pts);
} // end drawOldPolar


export function drawPolar(s) {

	// Fail-fast: polar definition must exist.
	if (!s.angle || !s.rad) {
		throw new Error("drawPolar requires angle(t) and rad(t)");
	}

	// Build the raw parametric structure FIRST (adapter step),
	// then create the Parametric object ONCE.
	const p = Object.assign({}, s, {

		// Convert polar → parametric in-place (no extra Parametric object reshaping).
		funcX: function(t) { return s.rad(t) * Math.cos(s.angle(t)); },
		funcY: function(t) { return s.rad(t) * Math.sin(s.angle(t)); }

	});

	// The Parametric constructor now owns “building pts from domain” (and defaults).
	const thing = new Parametric(p);

	// Delegate to the unified pipeline (autoFit + optional equation printing + draw).
	drawParametric(thing);

} // end drawPolar


export function drawParametric(thing) {

	const {
		pts,
		funcX,
		funcY,
		color,
		lineWidth,
		printEquations
	} = thing;

	// ------------------------------------------------------------
	// Auto-fit is part of the draw pipeline
	// ------------------------------------------------------------
	autoFitParametricToCanvas(thing);

	function toCanvasX(coord) {
		return thing.scale * coord + thing.mid.x;
	} // end toCanvasX

	function toCanvasY(coord) {
		return thing.scale * coord + thing.mid.y;
	} // end toCanvasY

	function printParametricEquations(funcX, funcY) {

		function getFuncBody(fn) {
			const src = fn.toString();
			const m = src.match(/return\s+([\s\S]*?);?\s*\}/);
			return (m && m[1]) ? m[1].trim() : src;
		} // end getFuncBody

		printText("funcX: " + getFuncBody(funcX), new Point(10, 10));
		printText("funcY: " + getFuncBody(funcY), new Point(10, 25));

	} // end printParametricEquations

	if (printEquations) {
		printParametricEquations(funcX, funcY);
	}

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


function measureParametricBounds(thing) {

	const { pts, funcX, funcY } = thing;

	let minX =  Infinity;
	let maxX = -Infinity;
	let minY =  Infinity;
	let maxY = -Infinity;

	for (let i = 0; i < pts.length; i++) {

		const t = pts[i];
		const x = funcX(t);
		const y = funcY(t);

		if (x < minX) minX = x;
		if (x > maxX) maxX = x;
		if (y < minY) minY = y;
		if (y > maxY) maxY = y;

	}

	return { minX, maxX, minY, maxY };

} // end measureParametricBounds


export function autoFitParametricToCanvas(thing) {

	const canvas = document.getElementById("sharedCanvas");
	if (!canvas) {
		throw new Error("autoFitParametricToCanvas: #sharedCanvas not found");
	}

	const canvasW = canvas.width;
	const canvasH = canvas.height;

	// margin is always available now (class default is 30)
	const margin = thing.margin;

	const b = measureParametricBounds(thing);

	const width  = b.maxX - b.minX;
	const height = b.maxY - b.minY;

	if (width <= 0 || height <= 0) {
		throw new Error("autoFitParametricToCanvas: invalid bounds (width/height <= 0)");
	}

	const usableW = canvasW - 2 * margin;
	const usableH = canvasH - 2 * margin;

	if (usableW <= 0 || usableH <= 0) {
		throw new Error("autoFitParametricToCanvas: canvas too small for given margin");
	}

	// uniform scale: fit both dimensions
	const sX = usableW / width;
	const sY = usableH / height;
	const scale = (sX < sY) ? sX : sY;

	// center in canvas: map the curve’s center to canvas center
	const centerX = (b.minX + b.maxX) / 2;
	const centerY = (b.minY + b.maxY) / 2;

	thing.scale = scale;

	const midX = canvasW / 2 - scale * centerX;
	const midY = canvasH / 2 - scale * centerY;

	thing.mid = new Point(midX, midY);

	return b;

} // end autoFitParametricToCanvas
