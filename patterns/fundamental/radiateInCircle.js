import { createNodes, drawNodes, drawLine } from "/draw/drawUtilities.js";
import { Point, StringThing } from "/classes/classes.js";

export function runPattern(){
//	printTitle("Figure 255k");
    let s = { color: "blue",
	      numNodes: 200,
	      radius:   250,
	      rotate:   212,
	      midpoint: new Point(300,330)
	    };
    let thing = new StringThing(s);
    let nodes = createNodes(thing);
    drawNodes(thing, nodes);
    let numBundles     = 13;
    let linesInBundle  = 20;
    let startTop       = 160;
    let startBot = nodes.length - 20;
    for (let i=0; i< numBundles; i++) {
		for (let j = startTop; j < startTop+linesInBundle; j++) {
	    	let k = j % nodes.length;
	    	let l = (j+startBot) % nodes.length;
	   	 drawLine(nodes[k],nodes[l]);
		}
		startTop += linesInBundle/2;
		startBot = startBot - linesInBundle + 7;
    }
}

