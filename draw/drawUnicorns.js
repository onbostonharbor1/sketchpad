import { getEllipsePoints }                  from "./drawEllipse.js";
import { createNodes, drawLine, ptsOnLine, drawNodes }  from "./drawUtilities.js";
import { Line, Point }                               from "/classes/classes.js";

//////////////////////////////////////////////////////////////////
// crossHair
//////////////////////////////////////////////////////////////////
export function crossHair(points, color="gray") {
	for (let i=0; i < points.length; i++) {
	    drawLine(new Point(points[i].x-20, points[i].y),
		     new Point(points[i].x+20, points[i].y),
		     color,3);
	    drawLine(new Point(points[i].x,    points[i].y-20),
		     new Point(points[i].x,    points[i].y+20),
		     color,3);
	}
} // end crossHair

/////////////////////////////////////////////////////////////////
// drawCycloid
/////////////////////////////////////////////////////////////////

export function drawCycloid(thing) {
    const nodes = createNodes(thing);
    const { numNodes, numCycloids, color, lineWidth } = thing;

    // 1. Draw the perimeter frame first (optional, but usually desired for context)
    drawNodes(thing, nodes);

    // 2. Draw the Cycloid Chords
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = lineWidth;
    ctx.lineCap     = 'round';

    for (let i = 0; i < numNodes; i++) {
        // The core cycloid/cardioid math: node i connects to (i * multiplier)
        let j = (i * numCycloids) % numNodes;

        // Use drawLine or direct canvas calls, but keep them as distinct segments
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
    }

    ctx.stroke();
    ctx.restore();
}


/////////////////////////////////////////////////////////////////
// drawMysticRose
/////////////////////////////////////////////////////////////////
export function drawMysticRose(thing){
    let nodes = getEllipsePoints(thing);
	ctx.save();
	ctx.strokeStyle = thing.color;
	ctx.lineWidth   = thing.lineWidth;
   	ctx.beginPath();
    for (let i=0; i < nodes.length; i++) {
        for (let j=0; j < nodes.length -1; j++) {
	        if (j != i) {
	            ctx.moveTo(nodes[i].x,nodes[i].y);
	            ctx.lineTo(nodes[j].x,nodes[j].y);
	        }
	    }
	}
	ctx.stroke();
    ctx.closePath();
	ctx.restore();
} // end drawMysticRose

export function drawRadiate(thing){
	ctx.save();
	ctx.strokeStyle = thing.color;
	ctx.lineWidth   = thing.lineWidth;
	let line = new Line(thing.start, thing.end);
	thing.nodes  = ptsOnLine(thing,line);
	for (let i=0; i < thing.nodes.length-1; i++) {
	      ctx.moveTo(thing.radialPt.x, thing.radialPt.y);
	      ctx.lineTo(thing.nodes[i].x, thing.nodes[i].y);
	  }
	ctx.stroke();
	ctx.restore();
} // end drawRadiate
