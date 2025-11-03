test1();

function test1() {

    printTitle("Inverse Star");
    let s = {midpoint: new Point(125,125),
	     radius:   100,
	     color:    "blue"};
    let thing = new StringThing(s);
    drawInverseStar(thing);

    // add rotation
    s = {midpoint: new Point(350,125),
	 radius:   100,
	 rotate:   45,
	 color:    "green"};
    thing = new StringThing(s);
    drawInverseStar(thing);

    // change nodes
    s = {midpoint: new Point(450,450),
	 radius:   100,
	 rotate:   45,
	 numNodes: 8,
	 color:    "orange"};
    thing = new StringThing(s);
    drawInverseStar(thing);

    // add scale
    s = {midpoint: new Point(175,450),
	 radius:   100,
	 xScale:   1.5,
	 yScale:   1.2,
	 color:    "red"};
    thing = new StringThing(s);
    drawInverseStar(thing);
}

