test8();
function test8(){
    printTitle("Two Parabolas in one call");
    let s = { numSteps: 20,
	      color:    "blue"};
    let thing = new StringThing(s);
    
    const coord1 = new Point(50,50);
    const coord2 = new Point(50,450);
    const coord3 = new Point(150,232.5);
    const coord20 = new Point(235, 40);
    const coord21 = new Point(475, 110);
    const coord22 = new Point(225, 230);
    const coord23 = new Point(300, 530);
    let pts = [ [coord1, coord2, coord3],
		[coord21, coord20, coord22, coord23]
	      ];
    drawManyParabs(thing,pts);
}
