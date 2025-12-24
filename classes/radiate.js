// classes/radiate.js
// Class Radiate

import {Point, Line } from "/classes/classes.js";

export class Radiate {
  constructor (r = {}) {
    const defaults = {
      numSteps:   20,
      color:      "blue",
      nodes:      null,
      start:      new Point(30,200),
      end:        new Point(320,300),
      radialPt:   new Point(250,20),
      lineWidth:  1
    };

    const merged = Object.assign({}, defaults, r);

    // Assign all merged properties to this instance
    Object.assign(this, merged);
  }
}  // end Radiate
