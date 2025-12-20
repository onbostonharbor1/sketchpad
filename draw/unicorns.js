import{ beginPath, closePath, lineTo, moveTo, stroke}
                                             from "./drawRedefines";
import { getEllipsePoints }                  from "./ellipse.js";
import { createNodes, drawLine, ptsOnLine }  from "./draw_utilities.js";
import { Line, Point }                               from "/classes/classes.js";

//////////////////////////////////////////////////////////////////
// crossHair
//////////////////////////////////////////////////////////////////
export function crossHair(points, color) {
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
	let nodes = createNodes(thing);
	ctx.save();
    beginPath();
 	ctx.strokeStyle = thing.color;
	ctx.lineWidth   = thing.lineWidth;
	ctx.lineCap     = 'round';
	for (let i=0; i< thing.numNodes -1; i++) {
	    let j = thing.numCycloids*i % thing.numNodes;
	    moveTo(nodes[i].x,nodes[i].y);
	    lineTo(nodes[j].x,nodes[j].y);
	}
	moveTo(nodes[0].x,nodes[0].y);
	for (let i=1; i < thing.numNodes; i++) {
	    lineTo(nodes[i].x,nodes[i].y);
	}
	stroke();
	closePath();
	ctx.restore();
} // end drawCycloid


/////////////////////////////////////////////////////////////////
// drawMysticRose
/////////////////////////////////////////////////////////////////
export function drawMysticRose(thing){
    let nodes = getEllipsePoints(thing);
	ctx.save();
	ctx.strokeStyle = thing.color;
	ctx.lineWidth   = thing.lineWidth;
   	beginPath();
    for (let i=0; i < nodes.length; i++) {
        for (let j=0; j < nodes.length -1; j++) {
	        if (j != i) {
	            moveTo(nodes[i].x,nodes[i].y);
	            lineTo(nodes[j].x,nodes[j].y);
	        }
	    }
	}
	stroke();
    closePath();
	ctx.restore();
} // end drawMysticRose

export function drawRadiate(thing){
	ctx.save();
	ctx.strokeStyle = thing.color;
	ctx.lineWidth   = thing.lineWidth;
	let line = new Line(thing.start, thing.end);
	thing.nodes  = ptsOnLine(thing,line);
	for (let i=0; i < thing.nodes.length; i++) {
	      ctx.moveTo(thing.radialPt.x, thing.radialPt.y);
	      ctx.lineTo(thing.nodes[i].x, thing.nodes[i].y);
	  }
	ctx.stroke();
	ctx.restore();
} // end drawRadiate
