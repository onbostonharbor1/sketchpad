test9();

function test9() {
    printTitle("Twisted bent arm");

    const coord20 = new Point(150, 50);
    const coord21 = new Point(500, 120);
    const coord22 = new Point(175, 290);
    const coord23 = new Point(300, 540);

    let pts = [coord21, coord20, coord22, coord23];

    let s = { numSteps: 40,
	  lineTransform:  {type: "bendFromMid", angle: 20 },
	  color:    "green"};
    let thing = new StringThing(s);
    drawParab(thing,pts);
}
