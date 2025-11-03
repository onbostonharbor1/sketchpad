//NOT USED
    function arcCurvature(pt1, pt2, curve, numPoints = 32) {
	// Lets me specify using a real looking number
	curvature = curve/1000;
	pts = [];
	// Use the same math to find center, radius, and sweep
	const dx = pt2.x - pt1.x;
	const dy = pt2.y - pt1.y;
	const d  = Math.hypot(dx, dy);
	if (d === 0) return;
	
	if (curvature === 0) {
	    pts.push(pt1);
	    pts.push(pt2);
	    return pts;
	}

	const sign = Math.sign(curvature);
	let   R    = Math.abs(1 / curvature);
	const Rmin = d / 2;
	if (R < Rmin) R = Rmin;

	const mx = (pt1.x + pt2.x) / 2;
	const my = (pt1.y + pt2.y) / 2;
	const ux = dx / d;
	const uy = dy / d;
	const nx = -uy;
	const ny = ux;
	const h  = Math.sqrt(Math.max(0, R * R - (d / 2) * (d / 2)));
	const Cx = mx + sign * h * nx;
	const Cy = my + sign * h * ny;
	
	let a0 = Math.atan2(pt1.y - Cy, pt1.x - Cx);
	let a1 = Math.atan2(pt2.y - Cy, pt2.x - Cx);
	const twoPi = Math.PI * 2;
                    // CCW sweep in [0, 2π)
	let delta  = ((a1 - a0) % twoPi + twoPi) % twoPi; 
                    // choose minor sweep in (-π, π]
	if (delta > Math.PI) delta -= twoPi; 
	
	for (let i = 0; i <= numPoints; i++) {
	    const t = i / numPoints;
	    const a = a0 + t * delta;
	    const x = Cx + R * Math.cos(a);
	    const y = Cy + R * Math.sin(a);
	    pts.push(new Point(x,y));
	}
	return pts;
    }


//NOT USED
function ptsOnArc(pt1, pt2, radius, segments = 50) {
    x1 = pt1.x;
    y1 = pt1.y;
    x2 = pt2.x;
    y2 = pt2.y;
  // Distance between points
  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = Math.sqrt(dx*dx + dy*dy);

  if (d > 2 * radius) {
    console.error('Radius too small for the given points!');
    return;
  }

  // Midpoint between P1 and P2
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  // Distance from midpoint to center along the perpendicular bisector
  const h = Math.sqrt(radius*radius - (d/2)*(d/2));

  // Perpendicular vector to pt1->pt2
  const perpX = -dy / d;
  const perpY = dx / d;

  // Two possible circle centers:
  const cx1 = mx + perpX * h;
  const cy1 = my + perpY * h;

  const cx2 = mx - perpX * h;
  const cy2 = my - perpY * h;

  // Choose one center, for example cx1, cy1
  const cx = cx1;
  const cy = cy1;

  // Calculate start and end angles
  function angleBetween(x, y) {
    return Math.atan2(y - cy, x - cx);
  }

  let startAngle = angleBetween(x1, y1);
  let endAngle   = angleBetween(x2, y2);

  // Adjust angles to ensure we draw the smaller arc (counterclockwise)
  if (endAngle < startAngle) {
    endAngle += 2 * Math.PI;
  }

  // Draw straight lines approximating the arc
    let pts = [];
    for (let i = 0; i <= segments; i++) {
	const t = i / segments;
	const angle = startAngle + t * (endAngle - startAngle);
	const x = cx + radius * Math.cos(angle);
	const y = cy + radius * Math.sin(angle);
	pts.push(new Point(x,y));
    }
    return pts;
}


/////////////////////////////////////////////////////////////////
///////////////////////// ARC STUFF
/////////////////////////////////////////////////////////////////
// arcPoints
/////////////////////////////////////////////////////////////////
//NOT USED
      function arcPoints(a, b, r_frac, n) {
	  // a:      origin point
	  // b:      destination point
	  // r_frac: arc radius as a fraction of half the distance
	  //         between a and b
	  //         -- 1 results in a semicircle arc, the arc flattens out the 
	  //            closer to 0 the number is set, 0 is invalid
	  // n:      number of points to sample from arc
	  let c = getCenter(a, b, r_frac);
	  let r = dist(c, a);
	  
	  let aAngle = Math.atan2(a.y - c.y, a.x - c.x),
	      bAngle = Math.atan2(b.y - c.y, b.x - c.x);
	  
	  if (aAngle > bAngle) {
	      bAngle += 2 * Math.PI;
	  }

          let points = range(aAngle, bAngle, (bAngle-aAngle)/n);
	  let sampledPoints = points.map(
	      (d) => new Point(Math.cos(d) * r + c.x,
			       Math.sin(d) * r + c.y));
	  return sampledPoints;
      }

/////////////////////////////////////////////////////////////////
// dist
/////////////////////////////////////////////////////////////////
//NOT USED
function dist(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}
      
/////////////////////////////////////////////////////////////////
// getCenter
/////////////////////////////////////////////////////////////////
//NOT USED
function getCenter(a, b, frac) {
    let c  = getP3(a, b, frac);
    let b1 = yIntercept(a, b);
    let b2 = yIntercept(a, c);
    let m1 = inverseSlope(a, b);
    let m2 = inverseSlope(a, c);

    // find the intersection of the two perpendicular bisectors
    // i.e. solve m1 * x + b2 = m2 * x + b2 for x
    let x = (b2 - b1) / (m1 - m2);
    // sub x back into one of the linear equations to get y
    let y = m1 * x + b1;
    return new Point(x,y);	  
}

/////////////////////////////////////////////////////////////////
// getP3
/////////////////////////////////////////////////////////////////
//NOT USED
function getP3(a, b, frac) {
    let mid = midpoint(a, b);
    
    let m = inverseSlope(a, b);
    // check if B is below A
    let bLower = b.y < a.y ? -1 : 1;

    // distance from midpoint along slope: between 0 and half
    // the distance between the two points
    let d = 0.5 * dist(a, b) * frac;

    let x = d / Math.sqrt(1 + Math.pow(m, 2));
    let y = m * x;
    return new Point(bLower * x + mid.x, bLower * y + mid.y);
    // return [mid[0] + d, mid[1] - (d * (b[0] - a[0])) / (b[1] - a[1])];
}

/////////////////////////////////////////////////////////////////
// inverseSlope
/////////////////////////////////////////////////////////////////
//NOT USED
function inverseSlope(a, b) {
    // returns the inverse of the slope of the line from point A to B
    // which is the slope of the perpendicular bisector
    return -1 * (1 / slope(a, b));
}

/////////////////////////////////////////////////////////////////
// midpoint
/////////////////////////////////////////////////////////////////
//NOT USED
function midpoint(a, b) {
    return new Point((a.x + b.x)/2, (a.y + b.y)/2);
}
//NOT USED
function _m(a, b) {
    return new Point((a.x + b.x)/2, (a.y + b.y)/2);
}

/////////////////////////////////////////////////////////////////
// range
/////////////////////////////////////////////////////////////////
//NOT USED
function range(start, end,step=1){
    const result = [];
    for (let i=start; i<end; i += step){
	result.push(i);
    }
    return result;
}
      
/////////////////////////////////////////////////////////////////
// slope
/////////////////////////////////////////////////////////////////
//NOT USED
function slope(a, b) {
    // returns the slope of the line from point A to B
    return (b.y - a.y) / (b.x - a.x);
}

/////////////////////////////////////////////////////////////////
// yIntercept
/////////////////////////////////////////////////////////////////
//NOT USED
function yIntercept(a, b) {
    // returns the y intercept of the perpendicular bisector of
    // the line from point A to B
    let m = inverseSlope(a, b);
    let p = midpoint(a, b);
    let x = p.x;
    let y = p.y;
    return y - m * x;
}
