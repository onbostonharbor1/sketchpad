/*
====================================================================
createNodes(thing)
--------------------------------------------------------------------
PURPOSE:
- The universal generator for Ellipse and Circle nodes.
- Uses arc-length sampling to ensure perfectly even spacing.
- Optionally applies Spacing Bias (remapping) and Jitter (noise).
- If jitter and bias are 0 (class defaults), output is standard.

PIPELINE:
1. Sample: Create a high-resolution map of the ellipse geometry.
2. Remap: Apply spacingBias to the 't' index if non-zero.
3. Interpolate: Find the exact x/y at that arc-length.
4. Jitter: Displace the point based on jitterMode if jitter > 0.
====================================================================
*/
import { toRadians } from "/draw/drawUtilities.js";
import { pointAtArcLength } from "/draw/drawEllipse.js";

export function createNodes(thing) {
    const {
        numNodes, rotate, xScale, yScale,
        spacingBias, jitter, jitterMode, midpoint
    } = thing;
    const width  = thing.ellipse.a * xScale;
    const height = thing.ellipse.b * yScale;
    const radiusX = width / 2;
    const radiusY = height / 2;
    const rotationRad = toRadians(rotate);
    const cosR = Math.cos(rotationRad);
    const sinR = Math.sin(rotationRad);

    // Internal helper for raw parametric points
    const pointAtAngle = (theta) => {
        const rawX = radiusX * Math.cos(theta);
        const rawY = radiusY * Math.sin(theta);

        return {
            x: midpoint.x + rawX * cosR - rawY * sinR,
            y: midpoint.y + rawX * sinR + rawY * cosR
        };
    };

    // --- STEP 1: Arc-Length Sampling ---
    // Create a high-resolution map to solve the "equal spacing" problem
    const samples = Math.max(2048, numNodes * 16);
    const samplePoints = new Array(samples + 1);
    const cumulativeLengths = new Float64Array(samples + 1);
    let cumulativeDistance = 0;
    let previousPoint = null;

    for (let i = 0; i <= samples; i++) {
        const theta = (i * 2 * Math.PI) / samples;
        const currentPoint = pointAtAngle(theta);
        samplePoints[i] = currentPoint;
        if (previousPoint) {
            cumulativeDistance += Math.hypot(
                currentPoint.x - previousPoint.x,
                currentPoint.y - previousPoint.y
            );
        }
        cumulativeLengths[i] = cumulativeDistance;
        previousPoint = currentPoint;
    }

    const totalArcLength = cumulativeLengths[samples];
    const segmentLength = totalArcLength / numNodes;
    const points = new Array(numNodes);

    // --- STEP 2: Distribution & Modification ---
    const remap = (t) => (spacingBias === 0) ? t : Math.pow(t, 1 + 4 * spacingBias);

    for (let i = 0; i < numNodes; i++) {
        // Apply bias to the index 't'
        const t = remap(i / numNodes);
        const targetLength = t * totalArcLength;

        // Get the "perfect" point from the arc-length map
        let pt = pointAtArcLength(targetLength, samples, cumulativeLengths, samplePoints);

        // --- STEP 3: Apply Jitter ---
        if (jitter > 0) {
            const theta = t * Math.PI * 2; // Approximate angle for directional jitter
            const noise = (Math.random() * 2 - 1) * jitter;

            if (jitterMode === "xy") {
                pt.x += noise;
                pt.y += (Math.random() * 2 - 1) * jitter;
            } else if (jitterMode === "tangent") {
                // Perpendicular to normal
                pt.x += noise * -Math.sin(theta);
                pt.y += noise * Math.cos(theta);
            } else {
                // Radial (default)
                pt.x += noise * Math.cos(theta);
                pt.y += noise * Math.sin(theta);
            }
        }
        points[i] = pt;
    }

    return points;
}
