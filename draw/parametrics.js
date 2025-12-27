// parametric.js
// ------------------------------------------------------------
// Parametric curve support (function-based, line-segment rendering)
// ------------------------------------------------------------
import { Point }    from "/classes/classes.js";
import { drawLine } from "/draw/draw_utilities";

export function drawPolar(thing) {

	if (!thing.angle || !thing.rad) {
		throw new Error("drawPolar requires angle(t) and rad(t)");
	}

	const param = new Parametric({
		pts:   thing.pts,
		scale: thing.scale,
		midX:  thing.midX,
		midY:  thing.midY,

		funcX(t) {
			return thing.rad(t) * Math.cos(thing.angle(t));
		},

		funcY(t) {
			return thing.rad(t) * Math.sin(thing.angle(t));
		}
	});

	drawParametric(param);

} // end drawPolar


export function drawParametric(thing) {

	const { pts, scale, midX, midY, funcX, funcY, color, lineWidth } = thing;

	function toCanvasX(coord) {
		return scale * coord + midX;
	} // end toCanvasX

	function toCanvasY(coord) {
		return scale * coord + midY;
	} // end toCanvasY

	for (let i = 0; i < pts.length - 1; i++) {

		let x1 = toCanvasX(funcX(pts[i]));
		let y1 = toCanvasY(funcY(pts[i]));

		let x2 = toCanvasX(funcX(pts[i + 1]));
		let y2 = toCanvasY(funcY(pts[i + 1]));

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


export function autoFitParametricToCanvas(thing, canvasW = 600, canvasH = 600, margin = 20) {

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
	thing.midX  = canvasW / 2 - scale * centerX;
	thing.midY  = canvasH / 2 - scale * centerY;

	return b;

} // end autoFitParametricToCanvas

/***********************************************************************
* Range (tMin → tMax) is NOT something that can be auto-fit like scale.
*
* Scale is geometric: once a curve is sampled, its bounds can be
*                     measured and mapped to the canvas.
*
* Range is semantic:  it defines *which curve* is being sampled.
*
* Examples:
*   - Fourier-style curves are usually meaningful over [0, 2π].
*   - Lissajous curves may require a larger range for full closure,
*     depending on frequency ratios.
*   - Polar curves often need [0, n·2π] to complete their structure.
*   - Some parametric curves are intentionally open and only defined
*     over a specific interval [a, b].
*
* Because of this, range must be chosen intentionally by the caller.
* The system treats it as part of the curve’s definition, not as a
* derived rendering parameter.
**********************************************************************/

export function buildParametricDomain(domain) {

	const { tMin, tMax, numPoints } = domain;

	if (numPoints <= 0) {
		throw new Error("buildParametricDomain: numPoints must be > 0");
	}

	const delta = tMax - tMin;
	const step  = delta / numPoints;
	const pts   = [];

	for (let i = 0; i <= numPoints; i++) {
		pts.push(tMin + i * step);
	}

	return pts;

} // end buildParametricDomain

/*
numPoints controls sampling resolution, not the identity of the curve.

Unlike range (tMin → tMax), which determines *which* curve is being
sampled, numPoints determines *how well* that curve is approximated.

Key points:
- Higher-frequency terms (e.g. sin(198*t)) require more samples.
- Too few points cause aliasing, jaggedness, and missed features.
- More points improve accuracy but cost performance.

A practical rule:
Choose a target number of samples per fastest oscillation cycle.

Example:
If the largest frequency used is ~201 and the range is [0, 2π],
then there are ~201 oscillations across the domain.

Using 20–50 samples per cycle:
  201 * 30 ≈ 6000 points (good quality)
  201 * 50 ≈ 10000 points (very smooth)

numPoints is therefore a resolution knob, not a semantic one.
It should be chosen intentionally, often based on the known
highest frequency in the parametric functions.
*/


export function chooseNumPointsForFreq(domain, maxFreq, samplesPerCycle = 30) {

	const cycles =
		maxFreq * (domain.tMax - domain.tMin) / (2 * Math.PI);

	let n = Math.ceil(cycles * samplesPerCycle);

	// enforce a reasonable minimum
	if (n < 200) n = 200;

	return n;

} // end chooseNumPointsForFreq


////////////////////////////////////////////////////////////
// range
////////////////////////////////////////////////////////////
function range(low, high, numPoints) {

	let delta = high - low;
	let step  = delta / numPoints;
	const arr = [];

	for (let i = 0; i <= numPoints; i++) {
		arr.push(low + i * step);
	}

	return arr;

} // end range



