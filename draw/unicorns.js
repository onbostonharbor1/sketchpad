import{ beginPath, closePath, lineTo, moveTo, stroke}
                            from "./drawRedefines";
import { getEllipsePoints } from "./ellipse.js";

export function drawMysticRose(thing){
    let nodes = getEllipsePoints(thing);
	ctx.strokeStyle = thing.color;
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
} // end drawMysticRose

