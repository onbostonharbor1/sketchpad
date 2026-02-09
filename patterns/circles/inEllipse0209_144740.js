/* ===========================================================
   GENERATED PATTERN (from Draw / drawRegistry)
   -----------------------------------------------------------
   Category: circles
   drawRegistry id: inEllipse
   Notes:
     - This file is generated from the CURRENT Draw parameters.
     - It rehydrates by importing the drawRegistry module and
       then applying the saved params.
=========================================================== */

import "../../drawRegistry/inEllipse.js";

export function runPattern() {
  const entry = window.drawRegistry["inEllipse"];
  if (!entry) throw new Error("runPattern: window.drawRegistry['inEllipse'] missing");

  // Saved parameters from the Draw tab (current state)
  const s = {
    "midpoint": {
      "x": 311.4666748046875,
      "y": 262.06666564941406
    },
    "color": "hsl(137, 100%, 43%)",
    "lineWidth": 1,
    "ellipse": {
      "a": 500,
      "b": 390
    },
    "numNodes": 120,
    "chordLength": 20,
    "startSkip": 0,
    "endSkip": 0,
    "withinCirc": -1,
    "rotate": 0,
    "points": [
      {
        "x": 311.4666748046875,
        "y": 262.06666564941406
      }
    ],
    "ellipse_b": 390
  };

  // Apply params + redraw deterministically
  entry.params = s;
  entry.init();
  entry.update(entry.params);
  entry.draw();

} // end runPattern
