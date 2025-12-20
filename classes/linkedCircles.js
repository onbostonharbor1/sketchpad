/* classes/linkedCircles.js
   ------------------------------------------------------------
   LinkedCircles

   PURPOSE
   - A single container object holding ALL attributes needed by
     drawLinkedCircles() to render a linked-circle “string art”
     pattern.

   LINK MODES
   - "pairwise"  : link 0->1, 1->2, 2->3, ...
   - "ring"      : pairwise plus last->first
   - "allToAll"  : every circle links to every other circle

   CLASS MEMBERS (ALL INSTANCE MEMBERS)
   - numCircles : Number
       Count of circles to draw (valid range: 2..7)

   - linkMode : String
       One of: "pairwise" | "ring" | "allToAll"

   - radius : Number
       Circle radius in pixels (must be > 0)

   - numPoints : Number
       Number of sample points around each circle used to draw
       linking stitches (must be >= 3). Higher = denser.

   - numSteps : Number
       Step offset (phase shift) used to connect circle A angle i
       to circle B angle (i + stepAngle * numSteps). Must be >= 0.

   - color : String
       Stroke color used by drawLinkedCircles()

   - lineWidth : Number
       Stroke width used by drawLinkedCircles() (must be > 0)

   - midpoints : Point[]
       Array of Point objects (length must equal numCircles).
       Each Point is the center of one circle.
   ------------------------------------------------------------ */

import { Point } from "./classes.js";

/* ------------------------------------------------------------
   Predefined midpoint sets (real values)

   WHY THESE EXIST
   - LinkedCircles needs a reasonable default layout that looks
     good immediately without the user supplying midpoints.

   NOTES
   - These values are tuned for a roughly 1000x800 canvas.
   - Each constant is an array of Point instances.
   - These arrays are NOT intended to be mutated directly.
     We always clone them into the instance (fail-safe + predictable).
   ------------------------------------------------------------ */

const TWO_CIRCLES = [
  new Point(120, 120),
  new Point(200, 400)
];

const THREE_CIRCLES = [
  new Point(120, 220),
  new Point(320, 340),
  new Point(435, 100)
];

const FOUR_CIRCLES = [
  new Point(150, 320),
  new Point(350, 160),
  new Point(590, 160),
  new Point(790, 320)
];

const FIVE_CIRCLES = [
  new Point(380, 570),
  new Point(290, 330),
  new Point(500, 160),
  new Point(710, 330),
  new Point(620, 570)
];

const SIX_CIRCLES = [
  new Point(380, 620),
  new Point(250, 380),
  new Point(380, 100),
  new Point(620, 100),
  new Point(750, 380),
  new Point(620, 620)
];

const SEVEN_CIRCLES = [
  new Point(380, 620),
  new Point(250, 380),
  new Point(380, 100),
  new Point(620, 100),
  new Point(750, 380),
  new Point(620, 620),
  new Point(500, 380),
];

/* ------------------------------------------------------------
   getMidpointSet(numCircles)

   Returns the predefined midpoint array for a given circle count.

   IMPORTANT BEHAVIOR
   - Returns ONE OF THE CONSTANT ARRAYS above.
   - The caller MUST clone the points before storing them in
     an instance, so the constants remain immutable.

   FAIL-FAST
   - Any unsupported value throws immediately.
   ------------------------------------------------------------ */
function getMidpointSet(numCircles) {
  if (numCircles === 2) return TWO_CIRCLES;
  if (numCircles === 3) return THREE_CIRCLES;
  if (numCircles === 4) return FOUR_CIRCLES;
  if (numCircles === 5) return FIVE_CIRCLES;
  if (numCircles === 6) return SIX_CIRCLES;
  if (numCircles === 7) return SEVEN_CIRCLES;

  throw new Error("LinkedCircles: numCircles must be in range 2..7");
} // end getMidpointSet

/* ------------------------------------------------------------
   clonePoints(points)

   Creates a deep-ish clone of an array of Points.

   WHY THIS EXISTS
   - We never want an instance to share Point objects with:
       a) the predefined constant arrays, or
       b) an external caller-provided array.
   - Otherwise, one accidental mutation would “leak” into
     other objects (or into the constants) and create
     spooky action at a distance.

   NOTE
   - This clones ONLY x/y into new Point instances.
   - If Point later acquires extra members, this would need to
     be extended. For now it matches your Point usage.
   ------------------------------------------------------------ */
function clonePoints(points) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    out.push(new Point(p.x, p.y));
  }
  return out;
} // end clonePoints

/* ------------------------------------------------------------
   validateLinkMode(mode)

   Ensures mode is one of the three supported strings.

   FAIL-FAST
   - Any other value throws immediately.
   ------------------------------------------------------------ */
function validateLinkMode(mode) {
  if (mode === "pairwise") return;
  if (mode === "ring")     return;
  if (mode === "allToAll") return;

  throw new Error('LinkedCircles: linkMode must be "pairwise", "ring", or "allToAll"');
} // end validateLinkMode

/* ------------------------------------------------------------
   class LinkedCircles

   DESIGN NOTES (WHY THIS CLASS LOOKS LIKE THIS)
   - This is intentionally a “data object” with light validation.
   - It does not draw anything itself; it is drawn by
     drawLinkedCircles(thing).
   - It provides small setters for controlled mutation, so UI
     controls can safely adjust a subset of members.

   FAIL-FAST PHILOSOPHY
   - If something is wrong, throw immediately.
   - Do not silently clamp values.
   - Do not create empty defaults that mask errors.
   ------------------------------------------------------------ */
export class LinkedCircles {
  /* ----------------------------------------------------------
     constructor(opts)

     Accepts an options object. Any member not provided uses
     a deterministic default.

     opts supports:
       - numCircles, linkMode, radius, numPoints, numSteps,
         color, lineWidth, midpoints

     IMPORTANT
     - opts.midpoints, if provided, MUST match numCircles in length.
     - midpoints are always cloned into new Points.

     FAIL-FAST
     - Throws on invalid ranges and missing/incorrect structures.
     ---------------------------------------------------------- */
  constructor(opts) {
    // opts may be omitted; treat as empty object.
    const s = opts || {};

    // --------------------------------------------------------
    // numCircles
    // - Default: 2
    // - Always stored as a Number.
    // - Enforced range: 2..7
    // --------------------------------------------------------
    this.numCircles = (s.numCircles === undefined) ? 2 : Number(s.numCircles);
    if (this.numCircles < 2 || this.numCircles > 7) {
      throw new Error("LinkedCircles: numCircles must be in range 2..7");
    }

    // --------------------------------------------------------
    // linkMode
    // - Default: "pairwise"
    // - Validated strictly.
    // --------------------------------------------------------
    this.linkMode = (s.linkMode === undefined) ? "pairwise" : s.linkMode;
    validateLinkMode(this.linkMode);

    // --------------------------------------------------------
    // Geometry + sampling controls
    // --------------------------------------------------------
    // radius
    // - Default: 100
    // - Used to compute points on each circle perimeter.
    this.radius = (s.radius === undefined) ? 100 : Number(s.radius);

    // numPoints
    // - Default: 120
    // - Controls sampling density. Higher = more stitches.
    this.numPoints = (s.numPoints === undefined) ? 120 : Number(s.numPoints);

    // numSteps
    // - Default: 6
    // - Controls the “phase shift” between paired circles.
    // - The second circle angle is offset by stepAngle * numSteps.
    this.numSteps = (s.numSteps === undefined) ? 6 : Number(s.numSteps);

    // --------------------------------------------------------
    // Style
    // --------------------------------------------------------
    // color
    // - Default: "#0044cc"
    // - Used as ctx.strokeStyle by drawLinkedCircles().
    this.color = (s.color === undefined) ? "#0044cc" : s.color;

    // lineWidth
    // - Default: 2
    // - Used as ctx.lineWidth by drawLinkedCircles().
    this.lineWidth = (s.lineWidth === undefined) ? 2 : Number(s.lineWidth);

    // --------------------------------------------------------
    // midpoints
    // --------------------------------------------------------
    // If supplied explicitly:
    // - must be an array
    // - must have length == numCircles
    // - points are cloned into new Point objects
    //
    // If NOT supplied:
    // - choose the predefined layout matching numCircles
    // - clone it for instance ownership
    // --------------------------------------------------------
    if (s.midpoints !== undefined) {
      if (!Array.isArray(s.midpoints)) {
        throw new Error("LinkedCircles: midpoints must be an array");
      }

      if (s.midpoints.length !== this.numCircles) {
        throw new Error("LinkedCircles: midpoints length must match numCircles");
      }

      this.midpoints = clonePoints(s.midpoints);
    } else {
      this.midpoints = clonePoints(getMidpointSet(this.numCircles));
    }

    // --------------------------------------------------------
    // Final sanity checks (fail-fast)
    // --------------------------------------------------------
    // These checks ensure that the object is always in a state
    // that drawLinkedCircles() can use without defensive code.
    // --------------------------------------------------------
    if (this.radius <= 0) {
      throw new Error("LinkedCircles: radius must be > 0");
    }

    if (this.numPoints < 3) {
      throw new Error("LinkedCircles: numPoints must be >= 3");
    }

    if (this.numSteps < 0) {
      throw new Error("LinkedCircles: numSteps must be >= 0");
    }

    if (this.lineWidth <= 0) {
      throw new Error("LinkedCircles: lineWidth must be > 0");
    }
  } // end constructor

  /* ----------------------------------------------------------
     setNumCircles(n)

     Changes the number of circles, and resets midpoints to the
     corresponding predefined set.

     WHY IT RESETS MIDPOINTS
     - The old midpoint array has the wrong length after changing
       numCircles.
     - Resetting to a known deterministic layout avoids partial
       reuse / mismatch bugs and gives a predictable result.

     FAIL-FAST
     - Throws on any value outside 2..7.
     ---------------------------------------------------------- */
  setNumCircles(n) {
    const v = Number(n);

    if (v < 2 || v > 7) {
      throw new Error("LinkedCircles.setNumCircles: value must be in range 2..7");
    }

    this.numCircles = v;

    // Deterministic reset: always use the standard layout
    // for this circle count.
    this.midpoints = clonePoints(getMidpointSet(this.numCircles));
  } // end setNumCircles

  /* ----------------------------------------------------------
     setLinkMode(mode)

     Sets the linking mode used by drawLinkedCircles().

     FAIL-FAST
     - validateLinkMode throws if mode is not one of the three.
     ---------------------------------------------------------- */
  setLinkMode(mode) {
    validateLinkMode(mode);
    this.linkMode = mode;
  } // end setLinkMode

  /* ----------------------------------------------------------
     setMidpoint(index, pt)

     Replaces one midpoint with a new Point created from pt.x/pt.y.

     WHY A NEW Point IS CREATED
     - This prevents callers from sharing a mutable Point object
       reference with the instance (same rationale as clonePoints()).

     FAIL-FAST
     - Throws if index is out of range.
     - Throws if pt is missing.
     ---------------------------------------------------------- */
  setMidpoint(index, pt) {
    if (index < 0 || index >= this.numCircles) {
      throw new Error("LinkedCircles.setMidpoint: index out of range");
    }

    if (!pt) {
      throw new Error("LinkedCircles.setMidpoint: pt is required");
    }

    this.midpoints[index] = new Point(pt.x, pt.y);
  } // end setMidpoint
} // end LinkedCircles
