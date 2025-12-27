import { Point } from "/classes/classes.js";

// classes/parametric.js
// ------------------------------------------------------------
// Parametric curve support (function-based, line-segment rendering)
// ------------------------------------------------------------

export class Parametric {

	constructor(s = {}) {

		const defaults = {
			// --- Rendering placement (these are what autoFit updates) ---
			scale: 60,
			mid:   new Point(300, 300),

			// --- Parametric definition ---
			funcX: null,
			funcY: null,

			// pts will be built from domain unless caller provides pts explicitly
			pts: [],

			// --- Stroke style ---
			color:     "blue",
			lineWidth: 1,

			// --- Optional debug display (drawParametric decides what to do) ---
			printEquations: true,

			// --- Auto-fit margin (used by autoFit when called) ---
			margin: 30,

			// --- Domain / sampling defaults (caller may override) ---
			domain: {
				tMin:            -2 * Math.PI,
				tMax:             2 * Math.PI,

				// Default is a safe, always-works value.
				// If caller sets numPoints = 0, then maxFreq MUST be provided.
				numPoints:       200,

				// Optional helper inputs for auto-choosing numPoints
				maxFreq:         0,
				samplesPerCycle: 30
			}
		};

		Object.assign(this, defaults, s);

		// Fail-fast: these must exist for a usable parametric.
		if (!this.funcX || !this.funcY) {
			throw new Error("Parametric requires funcX and funcY");
		}

		// Build pts from domain unless caller provided explicit pts.
		if (!this.pts || this.pts.length === 0) {
			this.pts = this.buildPtsFromDomain(this.domain);
		}

	} // end constructor


	buildPtsFromDomain(domain) {

		if (!domain) {
			throw new Error("Parametric: domain is required to build pts");
		}

		const tMin = domain.tMin;
		const tMax = domain.tMax;

		let numPoints = domain.numPoints;

		if (numPoints === 0) {
			numPoints = this.chooseNumPointsFromDomain(domain);
		}

		if (numPoints <= 0) {
			throw new Error("Parametric: domain.numPoints must be > 0 (or 0 with domain.maxFreq > 0)");
		}

		const delta = tMax - tMin;
		const step  = delta / numPoints;

		const pts = [];
		for (let i = 0; i <= numPoints; i++) {
			pts.push(tMin + i * step);
		}

		return pts;

	} // end buildPtsFromDomain


	chooseNumPointsFromDomain(domain) {

		const maxFreq = domain.maxFreq;
		const samplesPerCycle = domain.samplesPerCycle;

		if (maxFreq <= 0) {
			throw new Error("Parametric: domain.numPoints is 0, but domain.maxFreq is not set (> 0 required)");
		}

		const cycles = maxFreq * (domain.tMax - domain.tMin) / (2 * Math.PI);

		let n = Math.ceil(cycles * samplesPerCycle);

		// enforce a reasonable minimum
		if (n < 200) n = 200;

		return n;

	} // end chooseNumPointsFromDomain

} // end class Parametric
