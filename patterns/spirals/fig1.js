                   ///////////////////////////////////
                   // test 2:  DRAW REGULAR POLYGON TOUCH
                   ///////////////////////////////////

(
    function figures1() {
	printTitle("Draw Regular Polygon Touch");
	//	gl.dot = true;
	s={numSteps:     20,
	   midpoint:     new Point(150,150),
	   //	     lineWidth:    .5,
	   //	     rotate:       45,
	   radius:       100,
	   //	     yIncrement:   .8,
	   //	     xScale:     1.2,
	   //	     yScale:     .5,
	   color:        "green",
	   numNodes:     4 };
	thing = new StringThing(s);
	drawRegularPolygonTouch(thing);

	thing.color = "blue";
	thing.midpoint = new Point(400,150);
	thing.numNodes = 5;
	drawRegularPolygonTouch(thing);

    	thing.color = "red";
	thing.midpoint = new Point(150,400);
	thing.numNodes = 6;
	drawRegularPolygonTouch(thing);

    	thing.color = "violet";
	thing.midpoint = new Point(400,400);
	thing.numNodes = 8;
	drawRegularPolygonTouch(thing);
    }
)();
