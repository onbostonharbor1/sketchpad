/* drawRegistry/linkedCircles.js
   ============================================================
   Linked Circles — Draw Registry Entry (TEACHING VERSION)
   ============================================================

   IMPORTANT UPDATE (DRAGGABLE MIDPOINTS)
   ------------------------------------------------------------
   You discovered the key distinction:

   - "hidden" means: no UI control row in the action div.
   - It does NOT mean: still create draggable red dots.

   The red dots are created ONLY by point-picker controls.
   Therefore, midpoints must be a point-picker control, not hidden.

   WHAT WE DO NOW
   ------------------------------------------------------------
   1) params.midpoints is kept (JSON-safe)
      - array of plain objects: [{x,y}, {x,y}, ...]
      - this is what the UI edits when dots are dragged

   2) controls.midpoints becomes widget: "pointPickerArray"
      - this is what creates N dots on the interaction canvas layer

   3) Suppress clutter in the action div
      - controls.midpoints uses: noReadout: true
      - parameterControls.js must honor def.noReadout (dots only)

   4) Reverse midpoint synchronization direction
      - Previously: thing.midpoints -> params.midpoints
      - Now (because user drags dots): params.midpoints -> thing.midpoints

   ============================================================

   WHAT THIS FILE IS
   - A single drawRegistry object placed on window.
   - It follows your standard lifecycle:
       1) init()   : build persistent draw-side objects ONCE
       2) update() : apply UI parameters into those objects
       3) draw()   : render using draw-side functions

   WHAT THIS FILE IS NOT
   - It is NOT the drawing algorithm (that lives in draw/drawLinkedCircles.js).
   - It is NOT the LinkedCircles class (that lives in classes/linkedCircles.js).
   - It is NOT parameterControls.js (UI rendering of controls).

   WHY THIS EXISTS
   - To connect:
       UI parameters (JSON-safe numbers/strings)
         -> draw-side object (LinkedCircles instance)
           -> renderer (drawLinkedCircles)

   FILE NAMING
   - drawRegistry/linkedCircles.js
   - The registry object name is window.drawRegistry_linkedCircles
   - The id used by your UI is "drawLinkedCircles"

   ============================================================
*/

import { LinkedCircles }     from "../classes/linkedCircles.js";
import { drawLinkedCircles } from "../draw/drawLinkedCircles.js";

/* ============================================================
   Registry object

   NOTE ON NAMING
   - You have been using "window.drawRegistry_<name>" so each
     registry entry can be loaded as a module, but still
     register itself globally for the rest of the UI.
   ============================================================ */

window.drawRegistry_linkedCircles = {
  /* ----------------------------------------------------------
     Metadata (pure description; the UI can show these)
     ---------------------------------------------------------- */

  name:        "Linked Circles",          // display name in UI
  id:          "drawLinkedCircles",       // unique stable id
  version:     0.3,                      // bumped: midpoint dragging enabled
  category:    "unicorns",               // category grouping in Draw (your current value)
  firstOrder:  true,                     // your own taxonomy flag
  source:      "internal",               // internal vs external
  tags:        ["Geometry", "String Art", "Circles"],
  description: "Draws linked-circle string art in pairwise, ring, or all-to-all mode.",
  hover:       "",

  /* ----------------------------------------------------------
     Rendering environment hooks (placeholders for now)
     ----------------------------------------------------------
     background : optional background behavior
     overlays   : overlay layers to use (for point-picker)
     transforms : transforms to apply before draw (future)
     elements   : persistent non-JSON objects created by init()
   ---------------------------------------------------------- */

  background: null,

  // Not required by overlayManager, but documents our intent:
  // we expect the interaction canvas overlay to exist.
  overlays:   ["interaction"],

  transforms: [],
  elements:   null,

  /* ----------------------------------------------------------
     params (JSON-safe defaults)
     ----------------------------------------------------------
     IMPORTANT RULE
     - params MUST be JSON-safe because uiState can store it,
       and because parameterControls expects plain data.

     IMPORTANT UPDATE
     - midpoints IS included.
     - It is stored as JSON-safe objects, not Points.
     - It begins as null and is filled in init().
   ---------------------------------------------------------- */

  params: {
    linkMode:   "pairwise",  // "pairwise" | "ring" | "allToAll"
    numCircles: 2,           // valid range: 2..7
    numPoints:  80,          // must be >= 3; controls density
    radius:     100,         // pixels; must be > 0
    numSteps:   10,          // phase shift; must be >= 0
    color:      "#0000ff",   // hex string is compatible with <input type="color">
    lineWidth:  1,           // must be > 0

    // --------------------------------------------------------
    // midpoints
    // --------------------------------------------------------
    // Stored as: [ {x:..., y:...}, {x:..., y:...}, ... ]
    // This keeps it JSON-safe for uiState.
    //
    // It is now USER-EDITABLE via pointPickerArray dots.
    // --------------------------------------------------------
    midpoints: null
  },

  /* ----------------------------------------------------------
     controls (UI schema)
     ----------------------------------------------------------
     These tell parameterControls.js how to build each input.

     IMPORTANT UPDATE
     - controls.midpoints is now pointPickerArray.
     - This is what creates draggable red dots on interaction-layer.
     - noReadout: true means: do not clutter action div with
       midpoint readout fields (dots only).
   ---------------------------------------------------------- */

  controls: {
    linkMode: {
      widget: "select",
      label:  "Link Mode:",
      default: "pairwise",
      options: [
        { value: "pairwise", label: "pairwise" },
        { value: "ring",     label: "ring"     },
        { value: "allToAll", label: "allToAll" }
      ]
    },

    numCircles: {
      widget: "range",
      label:  "Circles:",
      min: 2,
      max: 7,
      step: 1,
      default: 2,
      rebuildControls: true
    },

    numPoints: {
      widget: "range",
      label:  "Points:",
      min: 10,
      max: 400,
      step: 1,
      default: 80
    },

    radius: {
      widget: "range",
      label:  "Radius:",
      min: 10,
      max: 400,
      step: 1,
      default: 100
    },

    numSteps: {
      widget: "range",
      label:  "Steps:",
      min: 0,
      max: 200,
      step: 1,
      default: 10
    },

    color: {
      widget: "color",
      label:  "Color:",
      default: "#0000ff"
    },

    lineWidth: {
      widget: "range",
      label:  "Line Width:",
      min: 0.5,
      max: 3.5,
      step: 0.5,
      default: 1
    },

    // --------------------------------------------------------
    // midpoints (pointPickerArray)
    // --------------------------------------------------------
    // This creates N draggable dots, one per circle midpoint.
    //
    // noReadout: true
    // - ParameterControls should still create dots,
    //   but should not add label/readout inputs in the action div.
    // --------------------------------------------------------
    midpoints: {
      widget: "pointPickerArray",
      label:  "Midpoints:",
      default: null,
      noReadout: true
    }
  },

  /* ==========================================================
     1) init()
     ==========================================================
     PURPOSE
     - Create persistent draw-side objects ONCE.
     - These objects are NOT JSON-safe (they are class instances).
     - They must live in this.elements so draw() can use them.

     WHAT IT CREATES
     - thing : a LinkedCircles instance

     IMPORTANT
     - After creating thing, we mirror thing.midpoints (Point[])
       into this.params.midpoints as JSON-safe objects.
     - This ensures pointPickerArray has real data immediately.
  ========================================================== */

  init() {
    const p = this.params;

    /* --------------------------------------------------------
       Create the draw-side “thing”
       --------------------------------------------------------
       LinkedCircles generates deterministic midpoints based on
       numCircles because we omit midpoints here.
    -------------------------------------------------------- */

    const thing = new LinkedCircles({
      numCircles: p.numCircles,
      linkMode:   p.linkMode,
      radius:     p.radius,
      numPoints:  p.numPoints,
      numSteps:   p.numSteps,
      color:      p.color,
      lineWidth:  p.lineWidth
      // midpoints intentionally omitted (defaults)
    });

    /* --------------------------------------------------------
       Mirror midpoints into JSON-safe params
       --------------------------------------------------------
       - thing.midpoints is an array of Point instances
       - uiState must not store Point instances
       - so we store plain objects: {x, y}
    -------------------------------------------------------- */

    p.midpoints = [];
    for (let i = 0; i < thing.midpoints.length; i++) {
      const m = thing.midpoints[i];
      p.midpoints.push({ x: m.x, y: m.y });
    }

    /* --------------------------------------------------------
       Store persistent elements
    -------------------------------------------------------- */

    this.elements = { thing };
  }, // end init

  /* ==========================================================
     2) update(params)
     ==========================================================
     PURPOSE
     - Apply incoming UI params to the draw-side thing.
     - Keep three copies synchronized:
         a) thing   (draw-side object)
         b) this.params (registry’s internal stored params)
         c) params  (incoming mutable object used by the UI)

     IMPORTANT UPDATE (NEW)
     - midpoints now flows from params -> thing
       because the user edits params.midpoints by dragging dots.
  ========================================================== */

  update(params) {
    if (!params) throw new Error("linkedCircles.update: params is required");
    if (!this.elements) throw new Error("linkedCircles.update: elements missing (init not run?)");

    const p = this.params;
    const thing = this.elements.thing;
    if (!thing) throw new Error("linkedCircles.update: thing missing");

    /* --------------------------------------------------------
       numCircles (special case)
       --------------------------------------------------------
       If numCircles changes, LinkedCircles resets midpoints to a
       deterministic layout with matching length.

       IMPORTANT DETAIL
       - If we changed numCircles, we must also reset params.midpoints
         immediately to match the new deterministic set.
       - Otherwise the UI will still hold the old-length array and
         pointPickerArray will not match the new circle count.
    -------------------------------------------------------- */

    const prevCircles = thing.numCircles;

    const n = Number(params.numCircles);
    if (n < 2 || n > 7) throw new Error("linkedCircles.update: numCircles must be 2..7");

    if (n !== prevCircles) {
      thing.setNumCircles(n); // resets thing.midpoints deterministically

      // Reset params.midpoints to match the new midpoint array length/content
      params.midpoints = [];
      for (let i = 0; i < thing.midpoints.length; i++) {
        const m = thing.midpoints[i];
        params.midpoints.push({ x: m.x, y: m.y });
      }
    }

    p.numCircles = thing.numCircles;
    params.numCircles = thing.numCircles;

    /* --------------------------------------------------------
       linkMode
    -------------------------------------------------------- */

    thing.setLinkMode(params.linkMode);

    p.linkMode = thing.linkMode;
    params.linkMode = thing.linkMode;

    /* --------------------------------------------------------
       radius
    -------------------------------------------------------- */

    const r = Number(params.radius);
    if (r <= 0) throw new Error("linkedCircles.update: radius must be > 0");

    thing.radius = r;

    p.radius = thing.radius;
    params.radius = thing.radius;

    /* --------------------------------------------------------
       numPoints
    -------------------------------------------------------- */

    const pts = Number(params.numPoints);
    if (pts < 3) throw new Error("linkedCircles.update: numPoints must be >= 3");

    thing.numPoints = pts;

    p.numPoints = thing.numPoints;
    params.numPoints = thing.numPoints;

    /* --------------------------------------------------------
       numSteps
    -------------------------------------------------------- */

    const steps = Number(params.numSteps);
    if (steps < 0) throw new Error("linkedCircles.update: numSteps must be >= 0");

    thing.numSteps = steps;

    p.numSteps = thing.numSteps;
    params.numSteps = thing.numSteps;

    /* --------------------------------------------------------
       color
    -------------------------------------------------------- */

    thing.color = params.color;

    p.color = thing.color;
    params.color = thing.color;

    /* --------------------------------------------------------
       lineWidth
    -------------------------------------------------------- */

    const lw = Number(params.lineWidth);
    if (lw <= 0) throw new Error("linkedCircles.update: lineWidth must be > 0");

    thing.lineWidth = lw;

    p.lineWidth = thing.lineWidth;
    params.lineWidth = thing.lineWidth;

    /* --------------------------------------------------------
       midpoints (NOW USER-EDITED)
       --------------------------------------------------------
       pointPickerArray updates:
         params.midpoints[i].x / params.midpoints[i].y

       This update() must apply those changes into the draw-side object:
         thing.setMidpoint(i, params.midpoints[i])

       FAIL-FAST:
       - params.midpoints must exist
       - must be an array
       - must match numCircles
    -------------------------------------------------------- */

    if (!Array.isArray(params.midpoints)) {
      throw new Error("linkedCircles.update: params.midpoints must be an array");
    }

    if (params.midpoints.length !== thing.numCircles) {
      throw new Error("linkedCircles.update: midpoints length must match numCircles");
    }

    for (let i = 0; i < thing.numCircles; i++) {
      const mp = params.midpoints[i];
      thing.setMidpoint(i, mp); // LinkedCircles clones into a new Point internally
    }

    // Keep registry params aligned with the live params object
    p.midpoints = params.midpoints;
  }, // end update

  /* ==========================================================
     3) draw()
     ==========================================================
     PURPOSE
     - Render the current thing.
     - drawLinkedCircles() is the renderer (draw-side function).
     - It reads thing.midpoints, thing.radius, etc.
  ========================================================== */

  draw() {
    if (!this.elements) throw new Error("linkedCircles.draw: elements missing (init not run?)");

    const thing = this.elements.thing;
    if (!thing) throw new Error("linkedCircles.draw: thing missing");

    drawLinkedCircles(thing);
  } // end draw
}; // end window.drawRegistry_linkedCircles
