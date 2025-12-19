test2();

function test2() {
    printTitle("Regular Polygon");
    let s = {midpoint: new Point(125,125),
	     radius:   100,
	     numNodes: 4,
	     color:    "blue"};
    let thing = new StringThing(s);
    drawRegularPolygon(thing);
}
