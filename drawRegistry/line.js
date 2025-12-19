/* drawRegistry/line.js
   ------------------------------------------------------------
   Line — registry entry (init / update / draw)

   GOAL OF THIS FILE
   ------------------------------------------------------------
   This registry entry is the “bridge” between UI and draw code.

   - UI side:
       * parameterControls edits this.params (the object with pt1/pt2/midpoint/etc.)
       * draw.js calls registry.update(params) and then registry.draw()

   - Draw side:
       * Real geometry is held as a persistent Line instance (this.elements.line)
       * Real style is held as a persistent StringThing (this.elements.thing)
       * drawALine() renders the Line using the current style

   DESIGN RULES USED HERE
   ------------------------------------------------------------
   1) params stays JSON-safe:
        pt1 / pt2 / midpoint are always plain objects: { x: number, y: number }
      This is important for persistence later and avoids type drift.

   2) Definitive geometry lives in the Line object:
        this.elements.line is the authoritative state for the line’s endpoints.

      So:
        - update() applies the UI changes into the Line object
        - then update() re-reads the definitive geometry from the Line object
        - then update() writes back to params in JSON-safe form

   3) “Midpoint-first” behavior is preserved:
        - If the user moved the midpoint control, we call line.moveMidpointTo()
        - Otherwise we assume endpoints changed, and we call setStart/setEnd()

      This matches your stated intent:
        “Midpoint work is done first; endpoints updated only if needed.”

   4) No redundant mirroring:
        In your system, update(params) receives the SAME object as this.params.
        Therefore, assigning both p.* and params.* is redundant.
        We write to p (alias for this.params) only.

   ------------------------------------------------------------ */

import { Line, Point, StringThing } from "../classes/classes.js";
import { drawALine }                from "../draw/draw_utilities.js";

window.drawRegistry_line = {
  // ----------------------------------------------------------
  // Metadata (used by UI, manifests, lists, etc.)
  // ----------------------------------------------------------
  name:        "Line",
  id:          "drawLine",
  version:     2.6,
  category:    "fundamental",
  firstOrder:  true,
  source:      "internal",
  tags:        ["Geometry", "Primitive"],
  description: "Draws a line with draggable endpoints and midpoint.",
  hover:       "",

  // ----------------------------------------------------------
  // Hooks / layers (present but unused here)
  // ----------------------------------------------------------
  background: null,
  overlays:   [],
  transforms: [],

  // ----------------------------------------------------------
  // elements holds persistent draw-side objects:
  //   elements.line  -> Line instance (definitive geometry)
  //   elements.thing -> StringThing instance (definitive style)
  // ----------------------------------------------------------
  elements:   null,

  // ----------------------------------------------------------
  // params is the JSON-safe state edited by the UI controls.
  //
  // IMPORTANT:
  //   These are plain objects, not Point instances.
  //   We will keep them that way permanently.
  // ----------------------------------------------------------
  params: {
    pt1:       { x: 200, y: 200 },
    pt2:       { x: 400, y: 400 },
    midpoint:  { x: 300, y: 300 },   // will be recomputed in init() and after edits
    color:     "#0044cc",
    lineWidth: 2
  },

  // ----------------------------------------------------------
  // controls tells parameterControls how to build the UI.
  // The keys here must match keys in params.
  // ----------------------------------------------------------
  controls: {
    pt1:       { widget: "pointPicker", label: "Start Point:" },
    pt2:       { widget: "pointPicker", label: "End Point:" },
    midpoint:  { widget: "pointPicker", label: "Midpoint:" },
    color:     { widget: "colorPicker", label: "Color:" },
    lineWidth: { widget: "range", min: 0.5, max: 4, step: 0.5, label: "Width:" }
  },

  // ==========================================================
  // 1. init() — create persistent elements
  // ==========================================================
  init() {
    // p is a shorthand for the registry params object
    const p = this.params;

    // --------------------------------------------------------
    // Create the persistent Line object that will hold
    // authoritative geometry for the rest of this session.
    //
    // We convert JSON-safe {x,y} into Point instances only
    // when constructing/setting geometry on the draw side.
    // --------------------------------------------------------
    const line = new Line(
      new Point(p.pt1.x, p.pt1.y),
      new Point(p.pt2.x, p.pt2.y)
    );

    // --------------------------------------------------------
    // Compute midpoint from definitive geometry and store it
    // back into params as JSON-safe {x,y}.
    //
    // This keeps the midpoint control correct on first display.
    // --------------------------------------------------------
    const mid = line.midpoint();
    p.midpoint = { x: mid.x, y: mid.y };

    // --------------------------------------------------------
    // Create the persistent style object.
    // StringThing is the draw-side holder of things like:
    //   - stroke color
    //   - line width
    //
    // It is not JSON-safe and is not intended to be saved directly.
    // Instead, params holds the JSON-safe style values.
    // --------------------------------------------------------
    const thing = new StringThing({
      color: p.color,
      lineWidth: p.lineWidth
    });

    // Store both persistent objects
    this.elements = { line, thing };
  }, // end init

  // ==========================================================
  // 2. update(params) — apply new values from controls
  // ==========================================================
  update(params) {
    // --------------------------------------------------------
    // In your system, params is the SAME object as this.params.
    // We keep p as the single “source” reference to avoid
    // redundant double assignments.
    // --------------------------------------------------------
    const p = this.params;

    // Pull persistent draw-side objects
    const line  = this.elements.line;
    const thing = this.elements.thing;

    // --------------------------------------------------------
    // MIDPOINT-FIRST DECISION
    //
    // The UI provides three draggable controls:
    //   - pt1
    //   - pt2
    //   - midpoint
    //
    // We infer which control was edited by comparing the
    // incoming midpoint (from params) with the current
    // midpoint derived from the Line object.
    //
    // If they differ, we treat it as a midpoint-drag event.
    // Otherwise, we treat it as an endpoint-drag event.
    //
    // NOTE:
    //   This inference works well with your current UI pattern:
    //     one control change triggers one update call.
    // --------------------------------------------------------
    const incomingMid = new Point(p.midpoint.x, p.midpoint.y);
    const prevMid     = line.midpoint();   // Point from definitive geometry

    if (!incomingMid.isSame(prevMid)) {
      // ------------------------------------------------------
      // Midpoint control was moved.
      //
      // moveMidpointTo() is responsible for repositioning the
      // whole line while preserving its length and direction
      // according to how you implemented Line.
      //
      // This operation necessarily changes pt1 and pt2 internally.
      // ------------------------------------------------------
      line.moveMidpointTo(incomingMid);
    } else {
      // ------------------------------------------------------
      // Midpoint control did NOT move (relative to geometry),
      // so we assume an endpoint control changed.
      //
      // setStart / setEnd update the definitive geometry.
      // The midpoint will be recomputed below.
      // ------------------------------------------------------
      line.setStart(new Point(p.pt1.x, p.pt1.y));
      line.setEnd(new Point(p.pt2.x, p.pt2.y));
    }

    // --------------------------------------------------------
    // RESYNC PARAMS FROM DEFINITIVE GEOMETRY
    //
    // After changing geometry, we immediately read back from
    // the Line object and store the values in JSON-safe form.
    //
    // This guarantees that:
    //   - params always matches what will actually be drawn
    //   - the UI controls remain consistent and accurate
    //   - params remains serializable later
    // --------------------------------------------------------
    const start = line.startPt();    // likely returns a Point
    const end   = line.endPt();      // likely returns a Point
    const mid   = line.midpoint();   // returns a Point

    // Store JSON-safe objects (NOT Points) in params
    p.pt1      = { x: start.x, y: start.y };
    p.pt2      = { x: end.x,   y: end.y   };
    p.midpoint = { x: mid.x,   y: mid.y   };

    // --------------------------------------------------------
    // STYLE SYNC
    //
    // We want style values to be consistent across:
    //   - p.color, p.lineWidth   (JSON-safe, UI-editable)
    //   - thing.color, thing.lineWidth (draw-side definitive)
    //
    // Here we treat params as the user-edited source:
    //   - copy color/width from params into thing
    //   - normalize lineWidth to Number
    //   - write back normalized lineWidth into params
    // --------------------------------------------------------
    thing.color = p.color;

    thing.lineWidth = Number(p.lineWidth);
    p.lineWidth = thing.lineWidth;
  }, // end update

  // ==========================================================
  // 3. draw() — render the current geometry
  // ==========================================================
  draw() {
    // --------------------------------------------------------
    // draw() uses only definitive draw-side objects.
    // params is not used directly for rendering.
    // --------------------------------------------------------
    const line  = this.elements.line;
    const thing = this.elements.thing;

    // drawALine(color, width, line)
    drawALine(thing.color, thing.lineWidth, line);
  } // end draw
};
