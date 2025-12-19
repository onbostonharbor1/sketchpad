test5();

function test5() {
    printTitle("Regular Polygon Touch");
    let s = {midpoint: new Point(125,125),
	     radius:   100,
	     numNodes: 6,
	     color:    "blue"};
    let thing = new StringThing(s);
    drawRegularPolygonTouch(thing);
}
