/////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
// SPIRALS
//    drawEulerSpiral
//    drawFermatSpiral
//    drawLogarithmicSpiral
//    drawPureSpiral
//    drawPureSpiralA
//    drawPureSpiralB
//    drawSpiral (probably misnamed)
//    drawTheodorusSpiral
/////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
import { toRadians, drawLine } from "/draw/drawUtilities";
import { Point }               from "/classes/classes.js";


//////////////////////////////////////////////////////////////////
// drawEulerSpiral
//////////////////////////////////////////////////////////////////
// Example usage:
// const myCanvas = document.getElementById("myCanvas");
// drawEulerSpiral(myCanvas, 10, 10000, 50);
//////////////////////////////////////////////////////////////////
export function drawEulerSpiral(thing) {
	let x           = 0;
	let y           = 0;
	let t           = 0;
	let totalLength = thing.totalLength;
	let numSegments = thing.numSegments;
	let scaleFactor = thing.scaleFactor
	const dt        = totalLength / numSegments;

	ctx.beginPath();
	ctx.lineWidth = 1;
	ctx.moveTo(x+thing.midpoint.x, y+thing.midpoint.y); // Start at the origin

	for (let i = 0; i < numSegments; i++) {
	    // Approximate the Fresnel integral steps
	    const dx = Math.cos(t * t / 2) * dt;
	    const dy = Math.sin(t * t / 2) * dt;

	    x += dx * scaleFactor;
	    y += dy * scaleFactor;
	    t += dt;

	    ctx.lineTo(x+thing.midpoint.x, y+thing.midpoint.y);
	}
	ctx.stroke();
    }

//////////////////////////////////////////////////////////////////
// drawFermatSpiral
//////////////////////////////////////////////////////////////////
export function drawFermatSpiral(thing) {
	let scaleFactor = thing.scaleFactor;
	let numTurns    = thing.numTurns;
	let gap         = thing.gap;
	ctx.strokeStyle = thing.color;
	ctx.lineWidth   = thing.lineWidth;
	const a = scaleFactor; // The 'a' constant in the Fermat spiral equation
	const maxTheta = numTurns * 2 * Math.PI; // Total angle to draw

	ctx.beginPath();
	let firstPoint = true;
								// Increment theta in small steps
	for (let theta = 0; theta <= maxTheta; theta += 0.01) {
	    const r = a * Math.sqrt(theta); // Calculate radius

	    const x = thing.midpoint.x + r * Math.cos(theta)*gap;
	    const y = thing.midpoint.y + r * Math.sin(theta)*gap;

	    if (firstPoint) {
		    ctx.moveTo(x, y);
		    firstPoint = false;
	    } else {
		    ctx.lineTo(x, y);
	    }
	}
	ctx.stroke();
}

//////////////////////////////////////////////////////////////////
//  drawLogarithmicSpiral
//////////////////////////////////////////////////////////////////
//    r is the radius from the origin.
//    a is a scaling factor that determines the initial radius
//    when theta is 0.
//    b controls the tightness or "pitch" of the spiral.
//        a larger b results in a faster-expanding spiral.
//    theta is the angle in radians, representing the rotation
//        around the origin.
//    a, b: a and b parameters from the logarithmic spiral equation.
//    startAngle, endAngle: The range of angles (in radians)
//               over which to draw the spiral.
//    step: The increment for theta in each iteration,
//        determining the smoothness of the drawn spiral.
//
//    By adjusting the a, b, startAngle, endAngle, and step
//    parameters, you can control the size, tightness, and extent
//    of the generated logarithmic spiral.
//////////////////////////////////////////////////////////////////
export function drawLogarithmicSpiral(thing) {
	let a = thing.a;
	let b = thing.b;
	let startAngle = thing.startAngle;
	let endAngle   = thing.endAngle;
	let step       = thing.step;

    ctx.strokeStyle = thing.color;
    ctx.lineWidth   = thing.lineWidth;
    ctx.beginPath();
    let firstPoint = true;

    for (let theta = startAngle; theta <= endAngle; theta += step) {
         const r = a * Math.exp(b * theta);
         const x = thing.midpoint.x + r * Math.cos(theta);
         const y = thing.midpoint.y + r * Math.sin(theta);

         if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
         } else {
            ctx.lineTo(x, y);
         }
    }
    ctx.stroke();
}

//////////////////////////////////////////////////////////////////
// drawPureSpiral
//////////////////////////////////////////////////////////////////
export function drawPureSpiral(thing) {
	let spread      = thing.spread;
	let maxAngle    = thing.maxAngle;
	ctx.strokeStyle = thing.color;
	ctx.lineWidth   = thing.lineWidth;

//	let counter = 0;
										// Increment angle in small steps
	for (let angle = thing.angle; angle <= maxAngle; angle += 0.01) {
        const radius = thing.radius + spread * angle;
        const x      = thing.midpoint.x + radius * Math.cos(angle);
        const y      = thing.midpoint.y + radius * Math.sin(angle);

        if (angle === 0) {
		    ctx.moveTo(x, y); // Start the path
        } else {
		    ctx.lineTo(x, y); // Draw line segments
        }
//	    if ((counter % 100) == 0)
//            printCircNum(new Point(x,y));
//	    counter++;
	}
	ctx.stroke();
}

//////////////////////////////////////////////////////////////////
// drawPureSpiralA
//////////////////////////////////////////////////////////////////
export function drawPureSpiralA(thing) {
	ctx.strokeStyle  = thing.color;
	ctx.lineWidth    = thing.lineWidth;
	let gap          = thing.gap;
	let numRotations = thing.numRotations;
    ctx.moveTo(thing.midpoint.x, thing.midpoint.y);

//  gap = 1.8;                // increase this for spacing between spiral lines
    let STEPS_PER_ROTATION = 60;  // increasing this makes the curve smoother

    let increment = 2*Math.PI/STEPS_PER_ROTATION;
    let theta = increment;
    while( theta < numRotations*Math.PI) {
        let newX = thing.midpoint.x + theta * Math.cos(theta) * gap;
        let newY = thing.midpoint.y + theta * Math.sin(theta) * gap;
        ctx.lineTo(newX, newY);
        theta = theta + increment;
    }
	ctx.fillStyle = "green";
	ctx.fill();
    ctx.stroke(); // draw the spiral
}

//////////////////////////////////////////////////////////////////
// drawPureSpiralB
//////////////////////////////////////////////////////////////////
export function drawPureSpiralB(thing) {
	ctx.strokeStyle = thing.color;
	ctx.lineWidth   = thing.lineWidth;
	let ptsToDraw   = thing.ptsToDraw;
	ctx.fillStyle   = thing.color;
	let angleInc    = toRadians(10);                // increase revolutions
	let outer_rad   = 150;                          // size of spiral
	for (let i=1; i < ptsToDraw; ++i) {
        let ratio     = i/ptsToDraw;
	    let angle     = i*angleInc;
	    let spiralRad = ratio*outer_rad;
	    let x         = thing.midpoint.x + Math.cos(angle) * spiralRad;
	    let y         = thing.midpoint.y + Math.sin(angle) * spiralRad;
	    ctx.beginPath();
	    ctx.arc(x,y,1,0,2*Math.PI,false);
	    ctx.fill();
	}
}

//////////////////////////////////////////////////////////////////
// drawSpiral
//////////////////////////////////////////////////////////////////
export function drawSpiral(s) {
	let interval, j, k;
    let intrvalStep = [];
	let points = [];
	if (!Array.isArray(s.interval)) {
	    interval = Array(s.container.length).fill(s.interval);
	} else {
	    interval = s.interval;
	}
	let intervalStep = [];
	for (let i=0; i<interval.length; i++){
	    intervalStep[i] = interval[i]/s.numSteps;
	}
	// draw outer shape
	for (let i=0;i < s.container.length;i++){
	    if (i == (s.container.length-1))
            j=0;
	    else
            j=i+1;
        drawLine(s.container[i],s.container[j],s.color);
	    points[i] = [];
	    points[i].push(s.container[i]);
	}

	// NOW WE REALLY BEGIN
	for (let i=0; i < s.numSteps; i++) {
	    for (let j=0;j < s.container.length;j++) {
		    if (j == (s.container.length-1))
		        k = 0;
		    else
		        k = j+1;
		    let deltaX    = points[k][i].x - points[j][i].x;
		    let deltaY    = points[k][i].y - points[j][i].y;
		    let hypot     = Math.hypot(deltaX,deltaY);
		    let distanceX = interval[j]*deltaX/hypot;
		    let distanceY = interval[j]*deltaY/hypot;
		    points[j].push(new Point(points[j][i].x + distanceX,
					        points[j][i].y + distanceY));
	    }
	    for (j=0;j < s.container.length; j++) {
		    if (j == (s.container.length-1))
		        k = 0;
		    else
		        k = j+1;
		    drawLine(points[j][i+1], points[k][i+1], s.color);
		    interval[j] -= intervalStep[j];
	    }
	}
}  // End drawSpiral

//////////////////////////////////////////////////////////////////
// drawTheodorusSpiral
//////////////////////////////////////////////////////////////////
export function drawTheodorusSpiral(thing) {


	// FUNCTION TO DRAW A SINGLE TRIANGLE SEGMENT
	function drawTriangle(hypotenuseLength, angle) {
	    ctx.beginPath();
	    ctx.moveTo(thing.midpoint.x, thing.midpoint.y); // Start at the origin

	                        // Calculate new vertex coordinates
	    const x = thing.midpoint.x + hypotenuseLength * scale * Math.cos(angle);
	    const y = thing.midpoint.y + hypotenuseLength * scale * Math.sin(angle);

	    ctx.lineTo(x, y); // Draw hypotenuse
                            // Draw perpendicular leg (length 1)
	    ctx.lineTo(x - scale * Math.sin(angle), y + scale * Math.cos(angle));
	    ctx.closePath();
	    ctx.stroke();       // Draw the triangle outline
	}

    ctx.strokeStyle  = thing.color;
	ctx.lineWidth    = thing.lineWidth;
	let numTriangles = thing.numTriangles;
	                    // Scaling factor for visual size
	const scale = 50;

	// Initial values
	let currentHypotenuse = 1; // Start with a leg of length 1
	let currentAngle      = 0; // Initial angle

	                    // Loop to draw the spiral
	for (let i = 1; i <= numTriangles; i++) {
	    // Calculate the angle of the new triangle based on the previous hypotenuse
	    const angleIncrement = Math.atan(1 / currentHypotenuse);
	    currentAngle = currentAngle + angleIncrement;

	                    // Draw the current triangle
	    drawTriangle(Math.sqrt(i + 1), currentAngle);

	                    // Update hypotenuse for the next iteration
	    currentHypotenuse = Math.sqrt(currentHypotenuse * currentHypotenuse + 1);
	}
}
