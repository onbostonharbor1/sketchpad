                   ///////////////////////////////////
                   // test 2:  DRAW REGULAR POLYGON
                   ///////////////////////////////////
(
    function fig3() {
	printTitle("Draw Regular Polygon");
	//	gl.dot = true;
	s={numSteps:     20,
	   midpoint:     new Point(200,200),
	   //	     lineWidth:    .5,
	   //	     rotate:       45,
	   radius:       100,
	   //	     yIncrement:   .8,
	   //	     xScale:     1.2,
	   //	     yScale:     .5,
	   color:        "green",
	   numNodes:     4 };
	thing = new StringThing(s);
	drawRegularPolygon(thing);
    }
)();

