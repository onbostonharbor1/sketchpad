  import { LinkedCircles }     from "/classes/linkedCircles.js";
  import { drawLinkedCircles } from "/draw/drawLinkedCircles.js";

  export function runPattern () {
     // Create the draw-side object ("thing")
    const thing = new LinkedCircles({
      numCircles: 2,        // range: 2..7
      linkMode: "pairwise",     // "pairwise" | "ring" | "allToAll"
      radius: 100,
      numPoints: 80,
      numSteps: 10,
      color: "blue",
      lineWidth: 1
      // midpoints intentionally omitted
      // predefined midpoint set is selected automatically
    });

    // Draw once
    drawLinkedCircles(thing);
  }



    // Uncomment to test other modes:
    // thing.setLinkMode("ring"); drawLinkedCircles(thing);
    // thing.setLinkMode("pairwise"); drawLinkedCircles(thing);
    // thing.setLinkMode("allToAll"); drawLinkedCircles(thing);
