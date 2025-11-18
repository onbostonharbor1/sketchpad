//  skip         pattern skipping, like when drawing
//               around a circle. For example, skip 4
//               means go from node[0] to node[4] or
//               from node[20] to node[24]
//  withinCirc   -1 (START_END    )=end a starting point
//                0 (FULL)        =full circle
//                1 (TAPER)       =start and end taper
//                2 (START_TAPER)
//                3 (END_TAPER)

import { Point } from "./classes.js";

export const START_END = -1;
export const FULL = 0;
export const TAPER = 1;
export const START_TAPER = 2;
export const END_TAPER = 3;

export class Ellipse {
  constructor(s = {}) {
    const defaults = {
      color: "black",
      lineWidth: 1,

      ellipse: {
        a: s.radius || 200,
        b: s.radius || 200,
      },
      midpoint: new Point(200, 200),
      numNodes: 150,
      startSkip: 0,
      endSkip: 0,
      radius: 200,
      rotate: 0,
      chordLength: 10,
      withinCirc: FULL,
      xScale: 1,
      yScale: 1,
    };

    const merged = Object.assign({}, defaults, s);

    // Assign all merged properties to this instance
    Object.assign(this, merged);
  }
}
