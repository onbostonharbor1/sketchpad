
import { Point } from "/classes/classes.js";
import { arcCurvature } from "/draw/drawEllipse.js";
import { drawLine } from "/draw/drawUtilities.js";

export function runPattern() {

    // printTitle("Figure 255d");
    let colors = ["#0000a3",
		  "#0000e0",
		  "#3838ff",
		  "#8585ff",
		  "#b8b8ff",
		  "#8585ff",
		  "#3838ff",
		  "#0000e0",
		  "#0000a3"];
    let pt1 = new Point(100,100);
    let pt2 = new Point(500,100);
    let curvature = 3;
    let numPoints = 8;
    let pts1 = arcCurvature(pt1, pt2, curvature, numPoints);

    pt1 = new Point(25, 500);
    pt2 = new Point(575,500);
    curvature = -2.8;
    numPoints = 17;
    let pts2 = arcCurvature(pt1, pt2, curvature, numPoints);

    let start = 0;
    for (let i=0; i < pts1.length; i++) {
	    for (let j=start; j < start+10; j++) {
	        drawLine(pts1[i],pts2[j],colors[i]);
    	}
	    start++;
    }
    for (let i=0;i<pts2.length -1; i++) {
    	drawLine(pts2[i],pts2[i+1]);
    }
}

