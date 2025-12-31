import { Point } from "/classes/classes.js";

// classes/parametric.js
// ------------------------------------------------------------
// Parametric curve definition and sampling support.
//
// This class is responsible for:
//   • owning the mathematical definition of a parametric curve
//   • sampling the parameter domain into a pts[] array
//   • holding rendering metadata (color, lineWidth, margin, etc.)
//
// This class does NOT:
//   • draw anything
//   • touch the canvas
//   • decide scaling or positioning
//
// Those responsibilities belong to drawParametric() and
// autoFitParametricToCanvas().
//
// Design philosophy (important for Sketchpad):
//   - Parametric is a *pure model* object.
//   - It prepares data deterministically.
//   - Rendering and UI decisions are delegated elsewhere.
// ------------------------------------------------------------

export class Parametric {

	/* ============================================================
	   constructor(s = {})
	   ------------------------------------------------------------
	   Creates a Parametric curve definition.

	   Input:
	   - s: configuration object describing the curve.
	     Typical fields include:
	       * funcX(t), funcY(t)   REQUIRED
	       * domain              OPTIONAL (sampling info)
	       * pts                 OPTIONAL (explicit t samples)
	       * color, lineWidth
	       * printEquations
	       * margin

	   Responsibilities:
	   1) Apply defaults.
	   2) Enforce required fields (fail-fast).
	   3) Build the pts[] array if not provided explicitly.

	   Important invariant:
	   - After construction, this.pts MUST exist and contain
	     sampled parameter values.
	============================================================ */
	constructor(s = {}) {

		// ------------------------------------------------------------
		// Default configuration.
		// These defaults guarantee that a Parametric object is
		// immediately drawable if funcX/funcY are provided.
		// ------------------------------------------------------------
		const defaults = {

			// --- Rendering placement ---
			// These are updated later by autoFitParametricToCanvas().
			scale: 60,
			mid:   new Point(300, 300),

			// --- Parametric definition (REQUIRED) ---
			funcX: null,
			funcY: null,

			// --- Parameter samples ---
			// pts will be built from domain unless explicitly provided.
			pts: [],

			// --- Stroke style ---
			color:     "blue",
			lineWidth: 1,

			// --- Optional debug display ---
			// drawParametric() decides whether/how to use this.
			printEquations: true,

			// --- Auto-fit margin ---
			// Space to leave around the curve when fitting to canvas.
			margin: 30,

			// --- Domain / sampling defaults ---
			// These control how pts[] is generated.
			domain: {
				tMin:            -2 * Math.PI,
				tMax:             2 * Math.PI,

				// Safe, always-works default.
				// If numPoints === 0, maxFreq MUST be provided.
				numPoints:       200,

				// Optional helpers for auto-choosing numPoints.
				maxFreq:         0,
				samplesPerCycle: 30
			}
		};

		// Merge caller-supplied config over defaults.
		// Caller values override defaults.
		Object.assign(this, defaults, s);

		// ------------------------------------------------------------
		// Fail-fast validation.
		// A Parametric without funcX/funcY is meaningless.
		// ------------------------------------------------------------
		if (!this.funcX || !this.funcY) {
			throw new Error("Parametric requires funcX and funcY");
		}

		// ------------------------------------------------------------
		// Build pts[] if caller did not supply explicit samples.
		// ------------------------------------------------------------
		if (!this.pts || this.pts.length === 0) {
			this.pts = this.buildPtsFromDomain(this.domain);
		}

	} // end constructor


	/* ============================================================
	   buildPtsFromDomain(domain)
	   ------------------------------------------------------------
	   Builds the array of parameter values (t samples) from
	   a domain specification.

	   Input:
	   - domain:
	       * tMin, tMax           REQUIRED
	       * numPoints            REQUIRED (>0) OR 0 for auto-choice
	       * maxFreq              REQUIRED if numPoints === 0
	       * samplesPerCycle      OPTIONAL

	   Output:
	   - Array of t values, length = numPoints + 1
	     (inclusive of both endpoints)

	   Notes:
	   - This function does NOT evaluate funcX/funcY.
	   - It only determines *where* the curve will be sampled.
	   - The +1 ensures both tMin and tMax are included.
	============================================================ */
	buildPtsFromDomain(domain) {

		if (!domain) {
			throw new Error("Parametric: domain is required to build pts");
		}

		const tMin = domain.tMin;
		const tMax = domain.tMax;

		let numPoints = domain.numPoints;

		// ------------------------------------------------------------
		// Auto-choose numPoints if requested.
		// ------------------------------------------------------------
		if (numPoints === 0) {
			numPoints = this.chooseNumPointsFromDomain(domain);
		}

		if (numPoints <= 0) {
			throw new Error(
				"Parametric: domain.numPoints must be > 0 " +
				"(or 0 with domain.maxFreq > 0)"
			);
		}

		const delta = tMax - tMin;
		const step  = delta / numPoints;

		const pts = [];
		for (let i = 0; i <= numPoints; i++) {
			pts.push(tMin + i * step);
		}

		return pts;

	} // end buildPtsFromDomain


	/* ============================================================
	   chooseNumPointsFromDomain(domain)
	   ------------------------------------------------------------
	   Automatically selects a reasonable number of sample points
	   based on expected frequency content.

	   Intended use:
	   - When caller sets domain.numPoints = 0
	   - Caller MUST provide domain.maxFreq

	   Logic:
	   1) Estimate number of cycles over the domain.
	   2) Multiply by samplesPerCycle.
	   3) Enforce a minimum to avoid under-sampling artifacts.

	   This is a *heuristic*, not a proof.
	   It trades correctness for robustness and simplicity.
	============================================================ */
	chooseNumPointsFromDomain(domain) {

		const maxFreq = domain.maxFreq;
		const samplesPerCycle = domain.samplesPerCycle;

		if (maxFreq <= 0) {
			throw new Error(
				"Parametric: domain.numPoints is 0, " +
				"but domain.maxFreq is not set (> 0 required)"
			);
		}

		// Estimate number of oscillatory cycles across the domain.
		const cycles =
			maxFreq * (domain.tMax - domain.tMin) / (2 * Math.PI);

		let n = Math.ceil(cycles * samplesPerCycle);

		// Enforce a conservative minimum.
		// This avoids degenerate-looking curves.
		if (n < 200) n = 200;

		return n;

	} // end chooseNumPointsFromDomain

} // end class Parametric

/* ============================================================
   DOMAIN SPECIFICATION (Parametric.domain)
   ------------------------------------------------------------
   The "domain" object defines how the parameter t is sampled.
   It does NOT define the curve itself — only *where* and *how
   densely* the curve is evaluated.

   A domain has the following structure:

     domain: {
       tMin:            <number>,
       tMax:            <number>,
       numPoints:       <number>,
       maxFreq:         <number>,
       samplesPerCycle: <number>
     }

   ------------------------------------------------------------
   REQUIRED FIELDS
   ------------------------------------------------------------

   tMin, tMax
     - Define the inclusive parameter interval [tMin, tMax].
     - Units are whatever your parametric functions expect.
     - Example:
         tMin: -Math.PI,
         tMax:  Math.PI

   ------------------------------------------------------------
   SAMPLING MODES (IMPORTANT)
   ------------------------------------------------------------

   There are TWO mutually exclusive ways to specify sampling
   density:

   ------------------------------------------------------------
   MODE A — Explicit sampling (most common, simplest)
   ------------------------------------------------------------

     numPoints > 0

   Meaning:
     - Sample the interval [tMin, tMax] uniformly
       using (numPoints + 1) values.
     - Both endpoints ARE included.

   Example:
     domain: {
       tMin: -2 * Math.PI,
       tMax:  2 * Math.PI,
       numPoints: 400
     }

   Use this when:
     - You know how smooth you want the curve.
     - The curve is not highly oscillatory.
     - You want deterministic, predictable sampling.

   ------------------------------------------------------------
   MODE B — Frequency-based auto sampling
   ------------------------------------------------------------

     numPoints === 0
     AND
     maxFreq > 0

   Meaning:
     - The system estimates how many samples are needed
       based on expected oscillation frequency.
     - The formula is roughly:
         samples ≈ cycles * samplesPerCycle
     - A minimum of 200 samples is always enforced.

   Required fields for this mode:
     - maxFreq         (maximum expected angular frequency)
     - samplesPerCycle (how many samples per oscillation)

   Example:
     domain: {
       tMin:            0,
       tMax:            2 * Math.PI,
       numPoints:       0,
       maxFreq:         12,
       samplesPerCycle: 30
     }

   Use this when:
     - The curve contains high-frequency terms.
     - You want automatic smoothing without hand-tuning.
     - You are working with parametric or polar equations
       whose complexity changes with parameters.

   ------------------------------------------------------------
   FAIL-FAST RULES (ENFORCED)
   ------------------------------------------------------------

   - If numPoints > 0:
       maxFreq is ignored.
   - If numPoints === 0:
       maxFreq MUST be > 0, or an error is thrown.
   - If numPoints <= 0 and maxFreq <= 0:
       construction FAILS immediately.

   ------------------------------------------------------------
   DESIGN NOTES
   ------------------------------------------------------------

   • domain controls *sampling*, not geometry.
   • The Parametric class never inspects funcX/funcY
     when choosing sampling density — that responsibility
     belongs to the caller.
   • Sampling always produces a monotonic, ordered array
     of t values.
   • The domain object is JSON-safe and suitable for
     persistence and regeneration.

   In short:
     domain answers the question:
       “Where do we look, and how closely do we look?”

============================================================ */
