/* ===========================================================
   GENERATED PATTERN (from Draw / drawRegistry)
   -----------------------------------------------------------
   Category: circles
   drawRegistry id: cycloid
   Notes:
     - This file is generated from the CURRENT Draw parameters.
     - It rehydrates by importing the drawRegistry module and
       then applying the saved params.
=========================================================== */

import "../../drawRegistry/cycloid.js";

export function runPattern() {
  const entry = window.drawRegistry["cycloid"];
  if (!entry) throw new Error("runPattern: window.drawRegistry['cycloid'] missing");

  // Saved parameters from the Draw tab (current state)
  const s = {
    "midpoint": {
      "x": 300,
      "y": 300
    },
    "radius": 250,
    "numNodes": 240,
    "numCycloids": 11,
    "xScale": 1,
    "yScale": 1,
    "color": "blue",
    "lineWidth": 1
  };

  // Apply params + redraw deterministically
  entry.params = s;
  entry.init();
  entry.update(entry.params);
  entry.draw();

} // end runPattern
