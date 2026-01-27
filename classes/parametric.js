import { Point } from "/classes/classes.js";

// classes/parametric.js
// ------------------------------------------------------------
// Parametric curve definition and sampling support.
//
// This class is responsible for:
//   • Owning the mathematical definition of a parametric curve.
//   • Sampling the parameter domain into a pts[] array.
//   • Holding rendering metadata (color, lineWidth, margin, etc.).
//
// This class does NOT:
//   • Draw anything or touch the canvas.
//   • Decide scaling or positioning (delegated to drawParametric).
//
// Design philosophy (important for Sketchpad):
//   - Parametric is a *pure model* object.
//   - It prepares data deterministically.
//   - Interaction preferences: emphasizes simplicity and directness.
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
            * domain               OPTIONAL (sampling info)
            * pts                  OPTIONAL (explicit t samples)
            * color, lineWidth, showIntersections
            * margin

       Responsibilities:
       1) Apply flat defaults (color, scale, etc.).
       2) Perform a "Deep Merge" on the domain object to prevent
          losing default sampling values when only one is provided.
       3) Enforce required fields (fail-fast).
       4) Build the pts[] array if not provided explicitly.
    ============================================================ */
    constructor(s = {}) {

        // --- Flat Defaults ---
        const defaults = {
            scale: 60,
            mid: new Point(300, 300),
            showIntersections: false,
            funcX: null,
            funcY: null,
            pts: [],
            color: "blue",
            lineWidth: 1,
            printEquations: true,
            margin: 30
        };

        // --- Nested Domain Defaults ---
        // Defines "Where we look, and how closely we look."
        const defaultDomain = {
            tMin: 0,                // Start of the parameter interval
            tMax: 2 * Math.PI,      // End of the interval (default: one full circle)
            numPoints: 400,         // Sampling density (Higher = better intersections)
            maxFreq: 0,             // Used for frequency-based auto-sampling
            samplesPerCycle: 60     // Heuristic for auto-sampling smoothness
        };

        // 1. Merge top-level properties
        Object.assign(this, defaults, s);

        // 2. DEEP MERGE for Domain:
        // This ensures if the user passes {domain: {tMax: 10}},
        // they don't accidentally wipe out tMin or numPoints.
        this.domain = Object.assign({}, defaultDomain, s.domain || {});

        // 3. Fail-fast validation
        if (!this.funcX || !this.funcY) {
            throw new Error("Parametric requires funcX and funcY");
        }

        // 4. Invariant: After construction, this.pts MUST exist.
        if (!this.pts || this.pts.length === 0) {
            this.pts = this.buildPtsFromDomain(this.domain);
        }

    } // end constructor


    /* ============================================================
       buildPtsFromDomain(domain)
       ------------------------------------------------------------
       Determines the exact 't' values where the curve is sampled.
       Output: Array of t values, length = numPoints + 1 (inclusive).
    ============================================================ */
    buildPtsFromDomain(domain) {
        if (!domain) {
            throw new Error("Parametric: domain is required to build pts");
        }

        const { tMin, tMax } = domain;
        let numPoints = domain.numPoints;

        // Auto-choose numPoints if Mode B (Frequency-based) is requested.
        if (numPoints === 0) {
            numPoints = this.chooseNumPointsFromDomain(domain);
        }

        if (numPoints <= 0) {
            throw new Error("Parametric: numPoints must be > 0 (or 0 with maxFreq > 0)");
        }

        const delta = tMax - tMin;
        const step = delta / numPoints;

        const pts = [];
        for (let i = 0; i <= numPoints; i++) {
            pts.push(tMin + i * step);
        }

        return pts;
    }


    /* ============================================================
       chooseNumPointsFromDomain(domain)
       ------------------------------------------------------------
       Heuristic to select sampling density based on oscillations.
       Logic: samples ≈ (cycles * samplesPerCycle)
    ============================================================ */
    chooseNumPointsFromDomain(domain) {
        const { maxFreq, samplesPerCycle, tMin, tMax } = domain;

        if (maxFreq <= 0) {
            throw new Error("Parametric: numPoints is 0, but maxFreq is not set");
        }

        // Estimate cycles across the domain interval
        const cycles = maxFreq * (tMax - tMin) / (2 * Math.PI);
        let n = Math.ceil(cycles * samplesPerCycle);

        // Lowered minimum (10) allows for "low-poly" or sharp geometric shapes.
        if (n < 10) n = 10;

        return n;
    }

} // end class Parametric

/* ============================================================
   DOMAIN SPECIFICATION (The "How-To" for callers)
   ------------------------------------------------------------
   MODE A — Explicit sampling (Uniform)
     Set numPoints > 0. maxFreq is ignored.

   MODE B — Frequency-based (Automatic)
     Set numPoints = 0 and provide maxFreq > 0.
     The system handles smoothing based on samplesPerCycle.
============================================================ */
