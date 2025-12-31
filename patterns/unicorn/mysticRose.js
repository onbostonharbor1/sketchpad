  import { Point, StringThing }     from '/classes/classes.js';
  import { drawMysticRose }         from '/draw/drawUnicorns.js';

  export function runPattern () {
	    let s = { numNodes: 20,
		          color:    "blue",
		          midpoint: new Point(300,300),
		          radius:   300};
	    let thing = new StringThing(s);
      drawMysticRose(thing);
  }
