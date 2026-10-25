import { drawLine, ptsOnLine, drawNodes }  from "./drawUtilities.js";
import { createNodes } from "/draw/createNodes.js";
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

    // 2. Draw the Cycloid Chords, one drawLine per chord so that
    //    final mode (points only) applies to every line.
    //    drawLine saves and restores ctx, so the round cap set here holds.
    ctx.save();
    ctx.lineCap = 'round';

    for (let i = 0; i < numNodes; i++) {
        // The core cycloid/cardioid math: node i connects to (i * multiplier)
        let j = (i * numCycloids) % numNodes;
        drawLine(nodes[i], nodes[j], color, lineWidth);
    }

    ctx.restore();
}


/////////////////////////////////////////////////////////////////
// drawMysticRose
/////////////////////////////////////////////////////////////////
export function drawMysticRose(thing){
    let nodes = createNodes(thing);
    // Every pair of nodes is joined once. (The earlier nested loop drew
    // each chord twice into one path, which looked the same when stroked
    // once but would darken antialiased edges if stroked per chord.)
    for (let i=0; i < nodes.length; i++) {
        for (let j=i+1; j < nodes.length; j++) {
            drawLine(nodes[i], nodes[j], thing.color, thing.lineWidth);
        }
    }
} // end drawMysticRose

export function drawRadiate(thing){
	let line = new Line(thing.start, thing.end);
	thing.nodes  = ptsOnLine(thing,line);
	for (let i=0; i < thing.nodes.length-1; i++) {
	      drawLine(thing.radialPt, thing.nodes[i], thing.color, thing.lineWidth);
	  }
	drawLine(thing.radialPt, thing.end, thing.color, thing.lineWidth);
} // end drawRadiate
