test4();

function test4() {
    printTitle("Regular Polygon Corner");
    let s = {midpoint: new Point(125,125),
	     radius:   100,
	     numNodes: 4,
	     color:    "blue"};
    let thing = new StringThing(s);
    drawRegularPolygonCorner(thing);
}
