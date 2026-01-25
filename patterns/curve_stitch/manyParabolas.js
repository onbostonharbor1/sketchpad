import { StringThing, Point } from "/classes/classes.js";
import { drawInverseStar, drawRegularPolygon } from "/draw/drawRegular.js";
import { drawManyParabs } from "/draw/drawUtilities.js";

export function runPattern(){
  //	printTitle("Figure23: Drawing many parabolas");
	let s = { color: "cornflowerblue",
	      midpoint: new Point(300,350),
	      xScale: 1.3,
	      yScale: 1.5,
	      radius: 300,
	      rotate: 45,
	      numSteps: 30
	    }
	let thing = new StringThing(s);
	drawRegularPolygon(thing);

	s = { color: "burlywood",
	      midpoint: new Point(300,350),
 	      xScale: 1,
	      yScale: 1.158,
	      radius: 275
	    };
	thing = new StringThing(s);
	drawInverseStar(thing);

  let coord1 = new Point(24,32);
	let coord2 = new Point(24,200);
	let coord3 = new Point(24,470);
	let coord4 = new Point(24,668);
	let coord5 = new Point(576,668);
	let coord6 = new Point(576,470);
	let coord7 = new Point(576,200);
	let coord8 = new Point(576,32);
	let mid    = thing.midpoint;
	s          = { color: "lightgreen" };
	thing      = new StringThing(s);
	let parabs = [[coord1,mid,coord3],
		  [coord3,mid,coord5],
		  [coord5,mid,coord7],
		  [coord7,mid,coord1]
    ];
	drawManyParabs(thing,parabs);

	s = { color: "palevioletred" };
	thing = new StringThing(s);
	parabs = [[coord2,mid,coord4],
		  [coord4,mid,coord6],
		  [coord6,mid,coord8],
		  [coord8,mid,coord2]];
	drawManyParabs(thing,parabs);
}
