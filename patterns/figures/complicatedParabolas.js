    import { Point, StringThing, Line } from "/classes/classes.js";
    import { Radiate }                  from "/classes/radiate.js";
    import { createPrintNodes, ptsOnLine, stitcher, drawLine,
              drawLines, _m}
                                  from "/draw/drawUtilities.js";
    import { drawParab} from "/draw/drawRegular.js";
    import { drawRadiate }          from "/draw/drawUnicorns.js";
    import { drawState } from "/draw/drawState.js";

///////////////////////////////////////////////////
// Figure 82: COMPLICATED PARABOLAS USING MIDPOINTS
///////////////////////////////////////////////////
export function runPattern() {
	let s = { mid: 		true,
	      radius: 	250,
	      rotate: 	45,
	      midpoint: new Point(300,300)
	    };
	let thing = new StringThing(s);

	ctx.fillStyle = "blue";
	ctx.lineWidth = 2;
	createPrintNodes(thing);

	s = { mid:    	true,
	      color:  	"blue",
	      radius: 	125,
	      rotate: 	45,
	      xScale: 	.7,
	      numSteps: 12,
	      midpoint: new Point(300,300)
	    };
	thing = new StringThing(s);
	ctx.fillStyle = "green";
	createPrintNodes(thing);

	let parabs = [];
	let parab = [ _m(drawState.pts[4], drawState.pts[9]),
					drawState.pts[0],
					_m(drawState.pts[7],drawState.pts[9])];  				// 0
	parabs.push(parab);

	parab = [ drawState.pts[8], drawState.pts[4], drawState.pts[9]];        // 4
	parabs.push(parab);

	parab = [ _m(drawState.pts[4],drawState.pts[8]),
				drawState.pts[1],
				_m(drawState.pts[5],drawState.pts[8])];   					// 1
	parabs.push(parab);

	thing.xScale=1;
	parab = [ drawState.pts[8], drawState.pts[5], drawState.pts[11]];        // 5
	parabs.push(parab);

	parab = [ _m(drawState.pts[5],drawState.pts[11]),
				drawState.pts[2],
				_m(drawState.pts[6],drawState.pts[11])]; 					  // 2
	parabs.push(parab);

	parab = [ drawState.pts[10], drawState.pts[6], drawState.pts[11]];        // 6
	parabs.push(parab);

	parab = [ _m(drawState.pts[6],drawState.pts[10]),
				drawState.pts[3],
				_m(drawState.pts[7],drawState.pts[10])]; 					// 3
	parabs.push(parab);

	parab = [ drawState.pts[10], drawState.pts[7], drawState.pts[9]];        // 7
	parabs.push(parab);

	let pt =  _m(drawState.pts[4], drawState.pts[9]);
  parab = [drawState.pts[4], pt, _m(drawState.pts[0],pt)];                 // 0-4
	parabs.push(parab);

	thing.xScale=1;
	thing.color = "sandybrown";

  for (let i = 0; i < parabs.length; i++) {
    drawParab(thing,parabs[i]);
  }


	let r = {
				radialPt: new Point(300,300),
				start:	  _m(drawState.pts[4],drawState.pts[9]),
				end:	    drawState.pts[9],
	    	color:    "sandybrown",
	     	numSteps: 8
	  		};
	thing = new Radiate(r);
	drawRadiate(thing);
}
