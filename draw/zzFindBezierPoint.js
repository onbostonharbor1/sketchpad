<script>
//
//  To find a point on a Bézier curve in JavaScript, one needs to use
//  the mathematical formula for the specific type of Bézier curve
//  (quadratic or cubic) and a parameter t which ranges from 0 to 1.
//    
//1. Quadratic Bézier Curve:
//
//A quadratic Bézier curve is defined by a start point (P0), a control
//point (P1), and an end point (P2). The formula to find a point P on
//the curve at a given t is: Code
//
//P = (1 - t)² * P0 + 2 * (1 - t) * t * P1 + t² * P2
//
//In JavaScript, this can be implemented as:


function getQuadraticBezierPoint(t, p0, p1, p2) {
  const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x +
             t * t * p2.x;
  const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y +
            t * t * p2.y;
  return { x, y };
}

//2. Cubic Bézier Curve:
//
//A cubic Bézier curve is defined by a start point (P0), two control
//points (P1, P2), and an end point (P3). The formula to find a point P
//on the curve at a given t is: Code
//
//P = (1 - t)³ * P0 + 3 * (1 - t)² * t * P1 + 3 * (1 - t) * t² * P2 + t³ * P3
//
//In JavaScript, this can be implemented as:
//JavaScript

function getCubicBezierPoint(t, p0, p1, p2, p3) {
  const x = (1 - t)**3 * p0.x +
             3 * (1 - t)**2 * t * p1.x +
	     3 * (1 - t) * t**2 * p2.x + t**3 * p3.x;
  const y = (1 - t)**3 * p0.y +
            3 * (1 - t)**2 * t * p1.y +
	    3 * (1 - t) * t**2 * p2.y + t**3 * p3.y;
  return { x, y };
}

//Usage:

//To use these functions, provide the coordinates of the start, end, and
//control points as objects with x and y properties, and a t value
//between 0 and 1. A t value of 0 will return the start point, and a t
//value of 1 will return the end point. Intermediate t values will
//return points along the curve.
</script>
