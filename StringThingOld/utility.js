// Helper Functions:
//    background(color,gridBoolean)
//    calculateIntersection(p1,p2,p3,p4)
//    calculateTintAndShade(hexColor,percentage)
//    createEllipseNodes(s)         
//    findCircleLineIntersections(r, h, k, m, n)
//    getLineEquation(pt1,pt2)
//    getPerpendicular(p1,p2,length)
//    lineIntersection(p1,p2,p3,p4)
//    numbersToPoints(coords)
//    ptsFromArray(coordArray)
//    rotatePoint(start,end, angle)
//    stretchNodes(nodes, StringThing)
//    toDegrees(radians)
//    toRadians(degrees)
// ARC
//    arcPoints(start,end,curvature_frac,numSteps)
//    dist(ptA,ptB)
//    getCenter(ptA,ptB,frac)
//    getP3(start,end,curvature_frac)   // get point 3
//    inverseSlope(ptA,ptB);
//    midpoint(ptA,ptB)
//    range(start,end,step)
//    slope(ptA,ptB)
//    yIntercept(ptA,ptB)

      var theCanvas = document.getElementById("StringThing");
      var context   = theCanvas.getContext("2d"); 




class Point {
    constructor (x,y) {
	if (typeof(x)=="number") {
	    this.x = x;
	    this.y = y;
	} else {
	    this.x = gl.pts[x].x;
	    this.y = gl.pts[x].y;
	}
    }
}


function printTitle(text,pt={x: 150, y: 20},col="blue") {
	x = pt.x; y=pt.y;
 	let color         = context.fillStyle;
	let font          = context.font;
	context.font      = "12px Verdana";
	context.fillStyle = col;
//	let x = 150; let y = 20;
        context.fillText(text,x,y);
	context.fillStyle = color;
	context.font      = font;
    }

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


function inchesToPixels() {
    let inches = prompt("What is the widest dimension in inches");
    alert (inches*300);
}

function alertPoint(pt) {
    alert(`x = ${pt.x}, y = ${pt.y}`);
}

function comparePoints(pt1,pt2) {
    if (pt1.x.toFixed(2) == pt2.x.toFixed(2)) {
	if (pt1.y.toFixed(2) == pt2.y.toFixed(2)) {
	    return true;
	}
    }
    return false;
}

// NOT TESTED
// https://cscheng.info/2016/06/09/calculate-circle-line-intersection-with-javascript-and-p5js.html
function findCircleLineIntersections(r, h, k, m, n) {
    // circle: (x - h)^2 + (y - k)^2 = r^2
    // line: y = m * x + n
    // r: circle radius
    // h: x value of circle centre
    // k: y value of circle centre
    // m: slope
    // n: y-intercept

    // get a, b, c values
    var a = 1 + m*m;
    var b = -h * 2 + (m * (n - k)) * 2;
    var c = h*h   + (n-k)*(n-k) - r*r;
    //      sq(h) + sq(n - k)   - sq(r);

    // get discriminant
    var d = b*b - 4 * a * c;
    if (d >= 0) {
        // insert into quadratic formula
        var intersections = [
            (-b + Math.sqrt(b*b - 4 * a * c)) / (2 * a),
            (-b - Math.sqrt(b*b - 4 * a * c)) / (2 * a)
        ];
        if (d == 0) {
            // only 1 intersection
            return [intersections[0]];
        }
        return intersections;
    }
    // no intersection
    return [];
}



const calculateTintAndShade = (
    hexColor, // using #663399 as an example
    percentage // using 10% as an example
) => {
    const r = parseInt(hexColor.slice(1, 3), 16); // r = 102
    const g = parseInt(hexColor.slice(3, 5), 16); // g = 51
    const b = parseInt(hexColor.slice(5, 7), 16); // b = 153

    /* 
       From this part, we are using our two formulas
       in this case, here is the formula for tint,
       please be aware that we are performing two validations
       we are using Math.min to set the max level of tint to 255,
       so we don't get values like 280 ;)
       also, we have the Math.round so we don't have values like 243.2
       both validations apply for both tint and shade as you can see */
    const tintR = Math.round(Math.min(255, r + (255 - r) * percentage)); // 117
    const tintG = Math.round(Math.min(255, g + (255 - g) * percentage)); // 71
    const tintB = Math.round(Math.min(255, b + (255 - b) * percentage)); // 163

   
    const shadeR = Math.round(Math.max(0, r - r * percentage)); // 92
    const shadeG = Math.round(Math.max(0, g - g * percentage)); // 46
    const shadeB = Math.round(Math.max(0, b - b * percentage)); // 138


    /* 
       Now with all the values calculated, the only missing stuff is 
       getting our color back to hexadecimal, to achieve that, we are going
       to perform a toString(16) on each value, so we get the hex value
       for each color, and then we just append each value together and voilÃ !*/
    return {
        tint: {
            r: tintR,
            g: tintG,
            b: tintB,
            hex:
                '#' +
                [tintR, tintG, tintB]
                    .map(x => x.toString(16).padStart(2, '0'))
                    .join(''), // #7547a3 
        },
        shade: {
            r: shadeR,
            g: shadeG,
            b: shadeB,
            hex:
                '#' +
                [shadeR, shadeG, shadeB]
                    .map(x => x.toString(16).padStart(2, '0'))
                    .join(''), // #5c2e8a 
        },
    };
};

function colourNameToHex(color)
{
    color = color.toLowerCase();

    var colours = {"aliceblue":"#f0f8ff","antiquewhite":"#faebd7",
		   "aqua":"#00ffff","aquamarine":"#7fffd4","azure":"#f0ffff",
		   "beige":"#f5f5dc","bisque":"#ffe4c4","black":"#000000",
		   "blanchedalmond":"#ffebcd","blue":"#0000ff","blueviolet":"#8a2be2",
		   "brown":"#a52a2a","burlywood":"#deb887","cadetblue":"#5f9ea0",
		   "chartreuse":"#7fff00","chocolate":"#d2691e","coral":"#ff7f50",
		   "cornflowerblue":"#6495ed","cornsilk":"#fff8dc","crimson":"#dc143c",
		   "cyan":"#00ffff","darkblue":"#00008b","darkcyan":"#008b8b",
		   "darkgoldenrod":"#b8860b","darkgray":"#a9a9a9","darkgreen":"#006400",
		   "darkkhaki":"#bdb76b","darkmagenta":"#8b008b",
		   "darkolivegreen":"#556b2f","darkorange":"#ff8c00",
		   "darkorchid":"#9932cc","darkred":"#8b0000","darksalmon":"#e9967a",
		   "darkseagreen":"#8fbc8f","darkslateblue":"#483d8b",
		   "darkslategray":"#2f4f4f","darkturquoise":"#00ced1",
		   "darkviolet":"#9400d3","deeppink":"#ff1493","deepskyblue":"#00bfff",
		   "dimgray":"#696969","dodgerblue":"#1e90ff","firebrick":"#b22222",
		   "floralwhite":"#fffaf0","forestgreen":"#228b22","fuchsia":"#ff00ff",
		   "gainsboro":"#dcdcdc","ghostwhite":"#f8f8ff","gold":"#ffd700",
		   "goldenrod":"#daa520","gray":"#808080","green":"#008000",
		   "greenyellow":"#adff2f","honeydew":"#f0fff0","hotpink":"#ff69b4",
		   "indianred ":"#cd5c5c","indigo":"#4b0082","ivory":"#fffff0",
		   "khaki":"#f0e68c","lavender":"#e6e6fa","lavenderblush":"#fff0f5"
		   ,"lawngreen":"#7cfc00","lemonchiffon":"#fffacd","lightblue":"#add8e6",
		   "lightcoral":"#f08080","lightcyan":"#e0ffff"
		   ,"lightgoldenrodyellow":"#fafad2","lightgrey":"#d3d3d3",
		   "lightgreen":"#90ee90","lightpink":"#ffb6c1","lightsalmon":"#ffa07a"
		   ,"lightseagreen":"#20b2aa","lightskyblue":"#87cefa"
		   ,"lightslategray":"#778899","lightsteelblue":"#b0c4de",
		   "lightyellow":"#ffffe0","lime":"#00ff00","limegreen":"#32cd32",
		   "linen":"#faf0e6","magenta":"#ff00ff","maroon":"#800000"
		   ,"mediumaquamarine":"#66cdaa","mediumblue":"#0000cd"
		   ,"mediumorchid":"#ba55d3","mediumpurple":"#9370d8",
		   "mediumseagreen":"#3cb371","mediumslateblue":"#7b68ee"
		   ,"mediumspringgreen":"#00fa9a","mediumturquoise":"#48d1cc"
		   ,"mediumvioletred":"#c71585","midnightblue":"#191970"
		   ,"mintcream":"#f5fffa","mistyrose":"#ffe4e1","moccasin":"#ffe4b5"
		   ,"navajowhite":"#ffdead","navy":"#000080","oldlace":"#fdf5e6",
		   "olive":"#808000","olivedrab":"#6b8e23","orange":"#ffa500"
		   ,"orangered":"#ff4500","orchid":"#da70d6","palegoldenrod":"#eee8aa",
		   "palegreen":"#98fb98","paleturquoise":"#afeeee",
		   "palevioletred":"#d87093","papayawhip":"#ffefd5",
		   "peachpuff":"#ffdab9","peru":"#cd853f","pink":"#ffc0cb"
		   ,"plum":"#dda0dd","powderblue":"#b0e0e6","purple":"#800080",
		   "rebeccapurple":"#663399","red":"#ff0000","rosybrown":"#bc8f8f",
		   "royalblue":"#4169e1","saddlebrown":"#8b4513","salmon":"#fa8072",
		   "sandybrown":"#f4a460","seagreen":"#2e8b57","seashell":"#fff5ee",
		   "sienna":"#a0522d","silver":"#c0c0c0","skyblue":"#87ceeb",
		   "slateblue":"#6a5acd","slategray":"#708090","snow":"#fffafa"
		   ,"springgreen":"#00ff7f","steelblue":"#4682b4","tan":"#d2b48c",
		   "teal":"#008080","thistle":"#d8bfd8","tomato":"#ff6347",
		   "turquoise":"#40e0d0","violet":"#ee82ee","wheat":"#f5deb3",
		   "white":"#ffffff","whitesmoke":"#f5f5f5","yellow":"#ffff00",
		   "yellowgreen":"#9acd32"};

    if (typeof colours[color] != 'undefined')
        return colours[color];
    return false;
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
// pts from array
/////////////////////////////////////////////////////////////////
function ptsFromArray(coords){
    let pts = [];
    for (let i=0; i < coords.length; i++){
	pts.push(new Point(coords[i][0],coords[i][1]));
    }
    return pts;
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

/////////////////////////////////////////////////////////////////
// getPerpendicular
/////////////////////////////////////////////////////////////////
function getPerpendicular(p1, p2, length) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const normalizedDX = dy  / Math.sqrt(dx * dx + dy * dy);
    const normalizedDY = -dx / Math.sqrt(dx * dx + dy * dy);
    
    const endX = p2.x + normalizedDX * length;
    const endY = p2.y + normalizedDY * length;
    return [p2, new Point(endX,endY)];
}


//////////////////////////////////////////////////////////////////
// numbersToPoints
//////////////////////////////////////////////////////////////////
    function numbersToPoints(coords) {
	if (Array.isArray(coords)) {
	    let nodes = [];
	    for (let i=0;i<coords.length;i++){
		if (typeof(coords[i]) == "number") {
		    nodes.push(gl.pts[coords[i]]);
		} else {
		    nodes.push(coords[i]);
		}
	    } 
	    return nodes;
	}
	if (typeof(coords) == "number")
	    return gl.pts[coords];
	else return coords;
    }

function rotatePoint(start, end, angle){
    let cos = Math.cos(angle);
    let sin = Math.sin(angle);
    let x = (cos*(end.x - start.x)) + (sin*(end.y - start.y)) + start.x;
    let y = (cos*(end.y - start.y)) - (sin*(end.x - start.x)) + start.y;
    return new Point(x,y);
}
/////////////////////////////////////////////////////////////////
// Rotate a point around a pivot
/////////////////////////////////////////////////////////////////
//     function rotatePoint(start, end, angle) {
//	  // Translate to origin
//	  translated_x = end.x - start.x;
//	  translated_y = end.y - start.y;
//
//	  // Rotate
//	  rotated_x = translated_x * Math.cos(angle)
//	            - translated_y * Math.sin(angle);
//	  rotated_y = translated_x * Math.sin(angle)
//	            + translated_y * Math.cos(angle);
//
//	  // Translate back
//	  rotated_p = new Point(rotated_x + start.x, rotated_y + start.y);
//
//	  return rotated_p;
//      }


/////////////////////////////////////////////////////////////////
// toDegrees
/////////////////////////////////////////////////////////////////
function toDegrees(radians){
    return radians*(180/Math.PI);
}

/////////////////////////////////////////////////////////////////
// toRadians
/////////////////////////////////////////////////////////////////
function toRadians(degrees) {
    return degrees*(Math.PI/180);
}					 


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
function dist(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}
      
/////////////////////////////////////////////////////////////////
// getCenter
/////////////////////////////////////////////////////////////////
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
function inverseSlope(a, b) {
    // returns the inverse of the slope of the line from point A to B
    // which is the slope of the perpendicular bisector
    return -1 * (1 / slope(a, b));
}

/////////////////////////////////////////////////////////////////
// midpoint
/////////////////////////////////////////////////////////////////
function midpoint(a, b) {
    return new Point((a.x + b.x)/2, (a.y + b.y)/2);
}
function _m(a, b) {
    return new Point((a.x + b.x)/2, (a.y + b.y)/2);
}

/////////////////////////////////////////////////////////////////
// range
/////////////////////////////////////////////////////////////////
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
function slope(a, b) {
    // returns the slope of the line from point A to B
    return (b.y - a.y) / (b.x - a.x);
}

/////////////////////////////////////////////////////////////////
// yIntercept
/////////////////////////////////////////////////////////////////
function yIntercept(a, b) {
    // returns the y intercept of the perpendicular bisector of
    // the line from point A to B
    let m = inverseSlope(a, b);
    let p = midpoint(a, b);
    let x = p.x;
    let y = p.y;
    return y - m * x;
}


