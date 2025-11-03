
/* ============================================================
   Ellipse Points — Angle vs Arc-Length
   Integrated for Sketchpad Scripts subsystem.
   ------------------------------------------------------------
   Defines window.scriptInfo containing parameters, controls,
   and the drawEllipsePoints() function.
   ============================================================ */
function drawEllipsePoints(p) {

    const { width, height, rotate, cx, cy, numPoints, mode, showDots, lineWidth } = p;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const canvasWidth = 600 / dpr;
    const canvasHeight = 600 / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const pts = getEllipsePoints(width, height, cx, cy, rotate, numPoints, mode);

    // ellipse outline
    ctx.save();
    ctx.translate(cx + canvasWidth / 2, cy + canvasHeight / 2);
    ctx.rotate(rotate * Math.PI / 180);
    ctx.beginPath();
    ctx.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.lineWidth = lineWidth + 0.6;
    ctx.strokeStyle = "rgba(96,165,250,0.35)";
    ctx.stroke();
    ctx.restore();

    // connect points
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = "#60a5fa";
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
	const pnt = pts[i];
	if (i === 0) ctx.moveTo(pnt.x + canvasWidth / 2, pnt.y + canvasHeight / 2);
	else ctx.lineTo(pnt.x + canvasWidth / 2, pnt.y + canvasHeight / 2);
    }
    ctx.closePath();
    ctx.stroke();

    // draw points
    if (showDots) {
	ctx.fillStyle = "#f59e0b";
	for (const pnt of pts) {
	    ctx.beginPath();
	    ctx.arc(pnt.x + canvasWidth / 2, pnt.y + canvasHeight / 2, 2.3, 0, Math.PI * 2);
	    ctx.fill();
	}
    }

    window.__lastPoints = pts;
} // end drawEllipsePoints

/* ------------------------------------------------------------
   pointAtArcLength()
   Given cumulative arc-lengths (S) and corresponding points (X),
   returns the interpolated point at the specified arc length.
   ------------------------------------------------------------ */
function pointAtArcLength(targetLength, maxSamples, cumulativeLengths, pointArray) {
  // Binary search for the smallest index whose cumulative length >= targetLength
  let lowIndex = 1;
  let highIndex = maxSamples;

  while (lowIndex < highIndex) {
    const midIndex = (lowIndex + highIndex) >>> 1;
    if (cumulativeLengths[midIndex] < targetLength)
      lowIndex = midIndex + 1;
    else
      highIndex = midIndex;
  }

  const k = lowIndex;

  // Bracketing samples
  const prevLength = cumulativeLengths[k - 1];
  const nextLength = cumulativeLengths[k];
  const prevPoint  = pointArray[k - 1];
  const nextPoint  = pointArray[k];

  // Fraction of the way between those samples
  const t = (targetLength - prevLength) /
            Math.max(1e-9, nextLength - prevLength);

  // Linear interpolation between bracketing points
  const x = prevPoint.x + t * (nextPoint.x - prevPoint.x);
  const y = prevPoint.y + t * (nextPoint.y - prevPoint.y);

  return { x, y };
} // end pointAtArcLength

/* ------------------------------------------------------------
   getEllipsePoints()
   Returns evenly spaced points along an ellipse.
   Spacing can be by equal angle or equal arc length.
   ------------------------------------------------------------ */
function getEllipsePoints(width, height, centerX, centerY, rotationDeg, numPoints, spacingMode = "arc") {

  // --- Step 1: Local geometry setup ---
  const radiusX = width / 2;
  const radiusY = height / 2;
  const rotationRad = rotationDeg * Math.PI / 180;
  const cosR = Math.cos(rotationRad);
  const sinR = Math.sin(rotationRad);

  // --- Step 2: Function to compute a rotated point on ellipse ---
  function pointAtAngle(theta) {
    const rawX = radiusX * Math.cos(theta);
    const rawY = radiusY * Math.sin(theta);
    return {
      x: centerX + rawX * cosR - rawY * sinR,
      y: centerY + rawX * sinR + rawY * cosR
    };
  }

  // --- Step 3: If spacing by equal angle, trivial loop ---
  if (spacingMode === "angle") {
    const points = new Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
      const theta = (i * 2 * Math.PI) / numPoints;
      points[i] = pointAtAngle(theta);
    }
    return points;
  }

  // --- Step 4: Otherwise, approximate equal arc-length spacing ---
  const samples = Math.max(2048, numPoints * 16);
  const samplePoints = new Array(samples + 1);
  const cumulativeLengths = new Float64Array(samples + 1);

  let cumulativeDistance = 0;
  let previousPoint = null;

  for (let i = 0; i <= samples; i++) {
    const theta = (i * 2 * Math.PI) / samples;
    const currentPoint = pointAtAngle(theta);
    samplePoints[i] = currentPoint;

    if (previousPoint) {
      const dx = currentPoint.x - previousPoint.x;
      const dy = currentPoint.y - previousPoint.y;
      cumulativeDistance += Math.hypot(dx, dy);
    }
    cumulativeLengths[i] = cumulativeDistance;
    previousPoint = currentPoint;
  }

  const totalArcLength = cumulativeLengths[samples];
  const segmentLength = totalArcLength / numPoints;

  // --- Step 5: Compute target points along the curve ---
  const points = new Array(numPoints);
  for (let i = 0; i < numPoints; i++) {
    const targetLength = i * segmentLength;
      points[i] = pointAtArcLength(targetLength, samples,
				   cumulativeLengths, samplePoints);
  }

  return points;
} // end getEllipsePoints

/* ============================================================
   scriptInfo registration
   ============================================================ */

window.scriptInfo = {
    name: "Ellipse Points",
    version: 0.2,
    parameters: {
	width: 600, height: 360, rotate: 30, cx: 0, cy: 0,
	numPoints: 120, mode: "arc", showDots: true, lineWidth: 1.2
    },
    controls: {
	width: {
	    widget: "range", min: 60, max: 1000, step: 2,
	    label: "Width", default: 600
	},
	height: {
	    widget: "range", min: 60, max: 1000, step: 2,
	    label: "Height", default: 360
	},
	rotate: {
	    widget: "range", min: -180, max: 180, step: 1,
	    label: "Rotation", default: 0
	},
	cx: {
	    widget: "range", min: -300, max: 300, step: 1,
	    label: "Center X", default: 0
	},
	cy: {
	    widget: "range", min: -300, max: 300, step: 1,
	    label: "Center Y", default: 0
	},
	numPoints: {
	    widget: "range", min: 3, max: 600, step: 1,
	    label: "Count", default: 120
	},
	mode: {
	    widget: "select", options: ["angle", "arc"],
	    label: "Spacing", default: "arc"
	},
	showDots: {
	    widget: "checkbox",
	    label: "Show Dots", default: false
	},
	lineWidth: {
	    widget: "range", min: 0.3, max: 4, step: 0.1,
	    label: "Line Width", default: 1.2
	}
    },
    draw: drawEllipsePoints
};

