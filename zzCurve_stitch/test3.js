test3();

function test3() {
    printTitle("Inner Star");
    let s = {midpoint: new Point(125,125),
	     radius:   100,
	     numNodes: 6,
	     color:    "blue"};
    let thing = new StringThing(s);
    drawInnerStar(thing);
}
