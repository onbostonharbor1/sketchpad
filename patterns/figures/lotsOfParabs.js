// figure 72 lot of parabs
import { background, drawSpeckledRadialGradient } from "/draw/background.js";
import { Point, StringThing } from "/classes/classes.js";
import { setPt } from "/draw/draw_utilities";
import { drawParab, drawInverseStar }   from "/draw/drawRegular.js";

export function runPattern(){
    background("lightskyblue");
//	showColors("lightskyblue",300);
	drawSpeckledRadialGradient(600, 600, {
           dotRadius: 1,
           totalDots: 30000,
           noiseOpacity: 0.4,
           falloffPower: 2
	});

	function buildParab(s,thing) {
	    thing.color = s.color;
	    let x = s.center.x;
	    let y = s.center.y;
		let pt1, pt2;
	    if (s.direction == DL) {
			pt1 = new Point(x-s.length,y);
			pt2 = new Point(x,         y+s.length);
	    } else if (s.direction == UL) {
			pt2 = new Point(x-s.length,y);
			pt1 = new Point(x,         y-s.length);
	    } else if (s.direction == UR) {
			pt1 = new Point(x+s.length,y);
			pt2 = new Point(x,         y-s.length);
	    } else {             // DR
			pt1 = new Point(x+s.length,y);
			pt2 = new Point(x,         y+s.length);
	    }
	    drawParab(thing,[pt1, s.center, pt2]);

	}

	const UL = 0;
	const DL = 1;
	const UR = 2;
	const DR = 3;
	//	const colorBrown = "#f2e9d3";
	const colorBrown = "#f8f8e8";
	//	const colorBlue  = "#8585c7";
	const colorBlue = "#71add2";

	let length = 160;
	let xCenter = 280;
	let yCenter = 300;
	let s = { numSteps:  18 };
	let thing = new StringThing(s);
	// 0
	let pt = new Point(xCenter - 1.6*length, yCenter - 1.45*length);
	setPt(pt,false);
	s = {center: pt, direction: DR, length: length, color: colorBlue };
	buildParab(s,thing);

	// 1
	pt = new Point(xCenter - 1.4*length,yCenter);
	setPt(pt,false);
	s = {center: pt, direction: UR, length: length, color: colorBlue };
	buildParab(s,thing);

	// 2
	pt = new Point(xCenter - 1.15*length, yCenter - 1.7*length);
	setPt(pt,false);
	s = {center: pt, direction: DR, length: length, color: colorBrown };
	buildParab(s,thing);

	// 3
	pt = new Point(xCenter - 1.0*length, yCenter -.25*length);
	setPt(pt,false);
	s = {center: pt, direction: UR, length: length, color: colorBrown };
	buildParab(s,thing);

	// 4
	pt = new Point(xCenter -  .6*length, yCenter - 1.3*length);
	setPt(pt,false);
	s = {center: pt, direction: DL, length: length, color: colorBlue };
	buildParab(s,thing);

	// 5
	pt = new Point(xCenter - .25*length, yCenter);
	setPt(pt,false);
	s = {center: pt, direction: UL, length: length, color: colorBlue };
	buildParab(s,thing);

	// 6
	pt = new Point(xCenter -  .15*length, yCenter -  1.55*length);
	setPt(pt,false);
	s = {center: pt, direction: DL, length: length, color: colorBrown };
	buildParab(s,thing);

	// 7
	pt = new Point(xCenter + 1.6*length, yCenter - 1.45*length);
	setPt(pt,false);
	s = {center: pt, direction: DL, length: length, color: colorBlue };
	buildParab(s,thing);

	// 8
	pt = new Point(xCenter + 1.4*length,yCenter);
	setPt(pt,false);
	s = {center: pt, direction: UL, length: length, color: colorBlue };
	buildParab(s,thing);

	// 9
	pt = new Point(xCenter + 1.15*length, yCenter - 1.7*length);
	setPt(pt,false);
	s = {center: pt, direction: DL, length: length, color: colorBrown };
	buildParab(s,thing);

	// 10
	pt = new Point(xCenter + 1.0*length, yCenter -.25*length);
	setPt(pt,false);
	s = {center: pt, direction: UL, length: length, color: colorBrown };
	buildParab(s,thing);

	// 11
	pt = new Point(xCenter +  .6*length, yCenter - 1.3*length);
	setPt(pt,false);
	s = {center: pt, direction: DR, length: length, color: colorBlue };
	buildParab(s,thing);

	// 12
	pt = new Point(xCenter + .25*length, yCenter);
	setPt(pt,false);
	s = {center: pt, direction: UR, length: length, color: colorBlue };
	buildParab(s,thing);

	// 13
	pt = new Point(xCenter +  .15*length, yCenter -  1.55*length);
	setPt(pt,false);
	s = {center: pt, direction: DR, length: length, color: colorBrown };
	buildParab(s,thing);

	// 14
	pt = new Point(xCenter + 1.6*length, yCenter + 1.45*length);
	setPt(pt,false);
	s = {center: pt, direction: UL, length: length, color: colorBlue };
	buildParab(s,thing);

	// 15
	pt = new Point(xCenter + 1.4*length,yCenter);
	setPt(pt,false);
	s = {center: pt, direction: DL, length: length, color: colorBlue };
	buildParab(s,thing);

	// 16
	pt = new Point(xCenter + 1.15*length, yCenter + 1.7*length);
	setPt(pt,false);
	s = {center: pt, direction: UL, length: length, color: colorBrown };
	buildParab(s,thing);

	// 17
	pt = new Point(xCenter + 1.0*length, yCenter +.25*length);
	setPt(pt,false);
	s = {center: pt, direction: DL, length: length, color: colorBrown };
	buildParab(s,thing);

	// 18
	pt = new Point(xCenter +  .6*length, yCenter + 1.3*length);
	setPt(pt,false);
	s = {center: pt, direction: UR, length: length, color: colorBlue };
	buildParab(s,thing);

	// 19
	pt = new Point(xCenter + .25*length, yCenter);
	setPt(pt,false);
	s = {center: pt, direction: DR, length: length, color: colorBlue };
	buildParab(s,thing);

	// 20
	pt = new Point(xCenter +  .15*length, yCenter +  1.55*length);
	setPt(pt,false);
	s = {center: pt, direction: UR, length: length, color: colorBrown };
	buildParab(s,thing);

	// 21
	pt = new Point(xCenter - 1.6*length, yCenter + 1.45*length);
	setPt(pt,false);
	s = {center: pt, direction: UR, length: length, color: colorBlue };
	buildParab(s,thing);

	// 22
	pt = new Point(xCenter - 1.4*length,yCenter);
	setPt(pt,false);
	s = {center: pt, direction: DR, length: length, color: colorBlue };
	buildParab(s,thing);

	// 23
	pt = new Point(xCenter - 1.15*length, yCenter + 1.7*length);
	setPt(pt,false);
	s = {center: pt, direction: UR, length: length, color: colorBrown };
	buildParab(s,thing);

	// 24
	pt = new Point(xCenter - 1.0*length, yCenter + .25*length);
	setPt(pt,false);
	s = {center: pt, direction: DR, length: length, color: colorBrown };
	buildParab(s,thing);

	// 25
	pt = new Point(xCenter -  .6*length, yCenter + 1.3*length);
	setPt(pt,false);
	s = {center: pt, direction: UL, length: length, color: colorBlue };
	buildParab(s,thing);

	// 26
	pt = new Point(xCenter - .25*length, yCenter);
	setPt(pt,false);
	s = {center: pt, direction: DL, length: length, color: colorBlue };
	buildParab(s,thing);

	// 27
	pt = new Point(xCenter -  .15*length, yCenter +  1.55*length);
	setPt(pt,false);
	s = {center: pt, direction: UL, length: length, color: colorBrown };
	buildParab(s,thing);

	s = {color: "#f2e9d3",
		 radius:    length,
		 midpoint:  new Point(xCenter,yCenter),
		 numNodes:  4,
		 numSteps:  18
		};
	thing = new StringThing(s);
	drawInverseStar(thing);
//	parabs = [ [ new Point(xlevel3,ylevel1),
//		     new Point(
//		   ]
//		 ];
//	parabs = [];
//	parabs = buildParab(direct,length);
//	thing.color = "blue";
//	drawParabs(thing,parabs);

    }
