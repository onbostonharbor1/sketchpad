// getLineEquation
// lineIntersect
// rotatePoint
// shortenArms



/////////////////////////////////////////////////////////////////
// shortenArms
/////////////////////////////////////////////////////////////////
function shortenArms(thing) {
    // thing.shorten is the percent to shorten.
    // I want the amount left
    let shorten = (100 - thing.shorten)/100;
    let deltaX = Math.abs(thing.arm1[thing.arm1.length-1].x - thing.arm1[0].x);
    let length = shorten*deltaX;
    let j = 0;
    for (let i=0; i < thing.arm1.length -1; i++) {
	deltaX = Math.abs((thing.arm1[i].x - thing.arm1[0].x));
	if (deltaX > length ) {
	    j = i;
	    break;
	}
    }
    if (j==0) j=thing.arm1.length -1;;
    thing.arm1.length=j;
    thing.arm2.splice(j,thing.arm2.length-1);
    if (thing.arm2.length < thing.arm1.length)
	thing.arm2.splice(0,j-1);
}

function getLineEquation(pt1,pt2) {
    if (pt2.x - pt1.x === 0) {  // handle vertical line
	return {slope:0, b: 0} ;
//	return `x = ${pt1.x}`; // Equation for a vertical line
    }
    
    const m = (pt2.y - pt1.y) / (pt2.x - pt1.x);
    const b = pt1.y - m * pt1.x; // Calculate the y-intercept

    return `y = ${m}x + ${b}`;
}

/////////////////////////////////////////////////////////////////
// lineIntersection
/////////////////////////////////////////////////////////////////
function lineIntersect(p1, p2, p3, p4) {
    var c2x = p3.x - p4.x; // (x3 - x4)
    var c3x = p1.x - p2.x; // (x1 - x2)
    var c2y = p3.y - p4.y; // (y3 - y4)
    var c3y = p1.y - p2.y; // (y1 - y2)
  
    // down part of intersection point formula
    var d  = c3x * c2y - c3y * c2x;
  
    if (d == 0) {
    	throw new Error('Number of intersection points is zero or infinity.');
    }
  
    // upper part of intersection point formula
    var u1 = p1.x * p2.y - p1.y * p2.x; // (x1 * y2 - y1 * x2)
    var u4 = p3.x * p4.y - p3.y * p4.x; // (x3 * y4 - y3 * x4)
  
    // intersection point formula
    var px = (u1 * c2x - c3x * u4) / d;
    var py = (u1 * c2y - c3y * u4) / d;
    var p = { x: px, y: py };
  
    return p;
}

function rotatePoint(start, end, angle){
    let cos = Math.cos(angle);
    let sin = Math.sin(angle);
    let x = (cos*(end.x - start.x)) + (sin*(end.y - start.y)) + start.x;
    let y = (cos*(end.y - start.y)) - (sin*(end.x - start.x)) + start.y;
    return new Point(x,y);
}
