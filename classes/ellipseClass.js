/* classes/ellipse.js
   ------------------------------------------------------------
   Ellipse

   PURPOSE
   - A data container for ellipse-related drawing parameters.
   - Designed to be consumed by drawing code that:
       a) builds nodes around an ellipse (or circle-like perimeter),
       b) optionally “skips” nodes to form chords/strings,
       c) optionally applies “withinCirc” taper/full behaviors,
       d) optionally scales/rotates.

   CLASS MEMBERS (ALL INSTANCE MEMBERS)
   - color : String
       Stroke color used by the draw routine.

   - lineWidth : Number
       Stroke width used by the draw routine.

   - ellipse : Object
       ellipse.a : Number
           Semi-major axis length (radius in x direction before scaling).
       ellipse.b : Number
           Semi-minor axis length (radius in y direction before scaling).

   - midpoint : Point
       Center point of the ellipse.

   - numNodes : Number
       Number of nodes sampled around the ellipse perimeter.
       (Higher = smoother perimeter / more chord options.)

   - startSkip : Number
       Node skip count applied near the start region
       (used with taper modes and/or partial drawing logic).

   - endSkip : Number
       Node skip count applied near the end region
       (used with taper modes and/or partial drawing logic).

   - radius : Number
       Legacy / convenience radius value. In this implementation it is
       also used as the default for ellipse.a and ellipse.b when opts
       provides radius. (So radius drives a circle-like ellipse.)

   - rotate : Number
       Rotation value for the ellipse (units depend on caller: typically radians).

   - chordLength : Number
       A chord-length control (interpretation depends on the draw routine).
       Often used as a constraint for how long connecting lines should be.

   - withinCirc : Number
       One of the constants below that controls “how much” of the circle/ellipse
       is drawn or how the endpoints behave (full, taper, start/end taper, etc.).

   - xScale : Number
       Additional x scale multiplier applied by draw code.

   - yScale : Number
       Additional y scale multiplier applied by draw code.

   NOTE ON “skip” (GENERAL CONCEPT USED BY DRAW ROUTINES)
   - Some routines connect perimeter nodes by stepping ahead by N nodes.
   - Example: skip = 4 means connect node[i] -> node[i+4] (wrapping around).
     So node[0] -> node[4], node[20] -> node[24], etc.
   ------------------------------------------------------------ */


/* ------------------------------------------------------------
   withinCirc meanings (used by the draw logic)

   These numeric constants are intentionally small and explicit.
   The drawing code can switch on these values without string compares.

   - START_END  (-1)
       “End at starting point” mode (special closure behavior).
       This is typically used when you want to start and stop at a defined
       boundary rather than cover the full perimeter.

   - FULL        (0)
       Full perimeter (no tapering at either end).

   - TAPER       (1)
       Start and end taper (both ends taper in/out).

   - START_TAPER (2)
       Only the start side tapers.

   - END_TAPER   (3)
       Only the end side tapers.
   ------------------------------------------------------------ */

import { Point } from "./classes.js";

export const START_END   = -1;
export const FULL        = 0;
export const TAPER       = 1;
export const START_TAPER = 2;
export const END_TAPER   = 3;

/* ------------------------------------------------------------
   class Ellipse

   DESIGN
   - This class is deliberately a simple “parameter bag”.
   - It does not validate much yet; your drawing code historically
     was permissive here.
   - It merges defaults + user-provided overrides in a predictable way.

   IMPORTANT MERGE DETAIL (POTENTIAL GOTCHA)
   - defaults.ellipse is built using s.radius at construction time:
         ellipse.a = s.radius || 200
         ellipse.b = s.radius || 200
     That means:
       * if caller passes { radius: 150 } you get ellipse.a=150, ellipse.b=150
       * if caller passes { ellipse: { a: 250, b: 120 } } but NO radius,
         the default ellipse becomes a=200,b=200 and then merged ellipse
         may override it if provided in s.
   - Because Object.assign is shallow, supplying s.ellipse replaces the
     entire defaults.ellipse object (which is what you want, but it’s worth
     being explicit about).
   ------------------------------------------------------------ */
export class Ellipse {
  /* ----------------------------------------------------------
     constructor(s = {})

     INPUT
     - s is an optional “settings” object.
     - Any members in s overwrite defaults.

     OUTPUT
     - The instance ends up with all members listed in the block
       comment above.

     FAIL-FAST?
     - This current version does NOT enforce ranges.
     - That matches the existing pattern of treating these values
       as inputs that the drawing code may adjust and test.
     ---------------------------------------------------------- */
  constructor(s = {}) {
    // --------------------------------------------------------
    // Defaults
    // --------------------------------------------------------
    // These are used when caller does not supply overrides.
    // Note: midpoint default is a NEW Point instance.
    // --------------------------------------------------------
    const defaults = {
      // Stroke / appearance
      color: "black",
      lineWidth: 1,

      // Ellipse geometry (semi-axes)
      // By default, we treat s.radius as a convenient way to set both
      // semi-axes equally (i.e., a circle-like ellipse).
      ellipse: {
        a: s.radius || 200,
        b: s.radius || 200,
      },

      // Center point
      midpoint: new Point(200, 200),

      // Sampling density: number of nodes around the perimeter
      numNodes: 150,

      // “Skip windows” used by certain drawing modes
      // (Often used when tapering or drawing partial arcs.)
      startSkip: 0,
      endSkip: 0,

      // Legacy / convenience radius value
      radius: 200,

      // Rotation (units depend on draw code; typically radians)
      rotate: 0,

      // Constraint or tuning parameter for chord-based drawing
      chordLength: 10,

      // withinCirc mode constant (FULL by default)
      withinCirc: FULL,

      // Additional scaling multipliers
      xScale: 1,
      yScale: 1,
    };

    // --------------------------------------------------------
    // Merge defaults with overrides (shallow merge)
    // --------------------------------------------------------
    // Object.assign({}, defaults, s) produces:
    //   - a NEW object that starts with defaults
    //   - then overwrites with any properties in s
    //
    // Because this is shallow:
    //   - if s.ellipse is provided, it replaces defaults.ellipse entirely
    //   - same for any other nested object member
    // --------------------------------------------------------
    const merged = Object.assign({}, defaults, s);

    // --------------------------------------------------------
    // Assign merged values onto this instance
    // --------------------------------------------------------
    // After this call, the instance has members:
    //   this.color, this.lineWidth, this.ellipse, this.midpoint, ...
    //
    // Again: shallow assignment. If merged.ellipse is an object, it becomes
    // the instance ellipse object directly.
    // --------------------------------------------------------
    Object.assign(this, merged);
  } // end constructor
} // end Ellipse
