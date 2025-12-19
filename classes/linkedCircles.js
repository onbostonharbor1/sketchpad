/* classes/linkedCircles.js
   ------------------------------------------------------------
   LinkedCircles
   - Holds ALL attributes needed to draw linked circles.
   - Supports three link modes:
       "pairwise" | "ring" | "allToAll"
   - Includes predefined midpoint sets for 2..7 circles.
   - Uses Point from your existing classes.js.
   ------------------------------------------------------------ */

import { Point } from "./classes.js";

/* ------------------------------------------------------------
   Predefined midpoint sets (real values)
   Notes:
   - These are "nice" defaults for a 1000x800-ish canvas.
   - Each set is a fixed array of Points.
   ------------------------------------------------------------ */

const TWO_CIRCLES = [
  new Point(260, 320),
  new Point(740, 320)
];

const THREE_CIRCLES = [
  new Point(220, 420),
  new Point(500, 220),
  new Point(780, 420)
];

const FOUR_CIRCLES = [
  new Point(180, 420),
  new Point(380, 260),
  new Point(620, 260),
  new Point(820, 420)
];

const FIVE_CIRCLES = [
  new Point(160, 470),
  new Point(320, 330),
  new Point(500, 260),
  new Point(680, 330),
  new Point(840, 470)
];

const SIX_CIRCLES = [
  new Point(150, 500),
  new Point(280, 380),
  new Point(410, 300),
  new Point(590, 300),
  new Point(720, 380),
  new Point(850, 500)
];

const SEVEN_CIRCLES = [
  new Point(140, 520),
  new Point(255, 420),
  new Point(370, 340),
  new Point(500, 300),
  new Point(630, 340),
  new Point(745, 420),
  new Point(860, 520)
];

function getMidpointSet(numCircles) {
  if (numCircles === 2) return TWO_CIRCLES;
  if (numCircles === 3) return THREE_CIRCLES;
  if (numCircles === 4) return FOUR_CIRCLES;
  if (numCircles === 5) return FIVE_CIRCLES;
  if (numCircles === 6) return SIX_CIRCLES;
  if (numCircles === 7) return SEVEN_CIRCLES;

  throw new Error("LinkedCircles: numCircles must be in range 2..7");
} // end getMidpointSet

function clonePoints(points) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    out.push(new Point(p.x, p.y));
  }
  return out;
} // end clonePoints

function validateLinkMode(mode) {
  if (mode === "pairwise") return;
  if (mode === "ring") return;
  if (mode === "allToAll") return;
  throw new Error('LinkedCircles: linkMode must be "pairwise", "ring", or "allToAll"');
} // end validateLinkMode

export class LinkedCircles {
  constructor(opts) {
    const o = opts || {};

    // Required member: number of circles (2..7), default 2
    this.numCircles = (o.numCircles === undefined) ? 2 : Number(o.numCircles);
    if (this.numCircles < 2 || this.numCircles > 7) {
      throw new Error("LinkedCircles: numCircles must be in range 2..7");
    }

    // Link mode: default "pairwise"
    this.linkMode = (o.linkMode === undefined) ? "pairwise" : o.linkMode;
    validateLinkMode(this.linkMode);

    // Style / geometry defaults
    this.radius = (o.radius === undefined) ? 100 : Number(o.radius);
    this.numPoints = (o.numPoints === undefined) ? 120 : Number(o.numPoints);
    this.numSteps = (o.numSteps === undefined) ? 6 : Number(o.numSteps);
    this.color = (o.color === undefined) ? "#0044cc" : o.color;
    this.lineWidth = (o.lineWidth === undefined) ? 2 : Number(o.lineWidth);

    // Midpoints: either supplied explicitly, or chosen from predefined sets
    if (o.midpoints !== undefined) {
      if (!Array.isArray(o.midpoints)) throw new Error("LinkedCircles: midpoints must be an array");
      if (o.midpoints.length !== this.numCircles) throw new Error("LinkedCircles: midpoints length must match numCircles");
      this.midpoints = clonePoints(o.midpoints);
    } else {
      this.midpoints = clonePoints(getMidpointSet(this.numCircles));
    }

    // Fail-fast sanity
    if (this.radius <= 0) throw new Error("LinkedCircles: radius must be > 0");
    if (this.numPoints < 3) throw new Error("LinkedCircles: numPoints must be >= 3");
    if (this.numSteps < 0) throw new Error("LinkedCircles: numSteps must be >= 0");
    if (this.lineWidth <= 0) throw new Error("LinkedCircles: lineWidth must be > 0");
  } // end constructor

  setNumCircles(n) {
    const v = Number(n);
    if (v < 2 || v > 7) throw new Error("LinkedCircles.setNumCircles: value must be in range 2..7");
    this.numCircles = v;

    // Deterministic reset to predefined set for the new count
    this.midpoints = clonePoints(getMidpointSet(this.numCircles));
  } // end setNumCircles

  setLinkMode(mode) {
    validateLinkMode(mode);
    this.linkMode = mode;
  } // end setLinkMode

  setMidpoint(index, pt) {
    if (index < 0 || index >= this.numCircles) throw new Error("LinkedCircles.setMidpoint: index out of range");
    if (!pt) throw new Error("LinkedCircles.setMidpoint: pt is required");
    this.midpoints[index] = new Point(pt.x, pt.y);
  } // end setMidpoint
} // end LinkedCircles
