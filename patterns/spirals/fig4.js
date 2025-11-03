///////////////////////////////////
// test 2:  DRAW INVERSE STAR
///////////////////////////////////
(
    function fig4() {
	printTitle("Draw Inverse Star");
	//	gl.dot = true;
	s={numSteps:     20,
	   midpoint:     new Point(150,150),
	   //	     lineWidth:    .5,
	   //	     rotate:       45,
	   radius:       100,
	   //	     yIncrement:   .8,
	   //	     xScale:     1.2,
	   //	     yScale:     .5,
	   color:        "blue",
	   numNodes:     4 };
	
	let thing = new StringThing(s);
	drawInverseStar(thing);
	
	thing.midpoint = new Point(400,150);
	thing.numNodes = 6;
	thing.color    = "green";
	drawInverseStar(thing);
	
	thing.midpoint = new Point(150,400);
	thing.numNodes = 8;
	thing.color    = "violet";
	drawInverseStar(thing);
	
	thing.midpoint = new Point(400,400);
	thing.numNodes = 10;
	thing.color    = "red";
	drawInverseStar(thing);
    }
)();
