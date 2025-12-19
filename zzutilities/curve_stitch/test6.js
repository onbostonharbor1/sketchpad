test6();

function test6() {
    printTitle("Regular Circular Parabola");
    let s = {midpoint: new Point(250,250),
	     radius:   200,
	     numNodes: 6,
	     color:    "blue"};
    let thing = new StringThing(s);
    drawCircularParabola(thing);
}
