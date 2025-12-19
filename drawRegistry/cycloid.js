/* drawRegistry/cycloid.js */
import { Point, StringThing }       from '../classes/classes.js';
import { drawCycloid }           from '../draw/unicorns.js';

window.drawRegistry_cycloid = {
    name:         "Cycloid",
    id:           "cycloid",
    version:      0.1,
    category:     "circles",
    firstOrder:   true,
    source:       "internal",
    tags:         ["cycloid "],
    description:  "Cycloid",
    hover:        "",

    // -- visual styling ---
    background: null,
    overlays:   [],
    transforms: [],

    // Placeholder for all elements drawn
    elements:   null,
    // --- Core defaults for drawing (JSON-safe) ---
    params: {
	    midpoint:       { x: 300, y: 300 },   // converted to Point in init()
	    radius:         250,
	    numNodes:       240,
        numCycloids:    2,
	    xScale:         1,
	    yScale:         1,
	    color:          "blue",
	    lineWidth:      1
    },

  // --- UI metadata (controls) ---
  controls: {
    numCycloids:    { widget: "range", min: 1,   max: 12,  step: 1,   label: "Loops:" },
    radius:         { widget: "range", min: 80,  max: 350, step: 5,   label: "Radius:" },
    numNodes:       { widget: "range", min: 64,  max: 400, step: 10,  label: "Nodes:" },
    xScale:         { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "X Scale:" },
    yScale:         { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "Y Scale:" },
    color:          { widget: "colorPicker",                          label: "Color:" },
    midpoint:       { widget: "pointPicker",                          label: "Midpoint:" },
    lineWidth:      { widget: "range", min: .5,  max: 3,   step: .5,  label: "Width:" }
  },

  // ==========================================================
  // 1. init() – build the persistent cycloid
  // ==========================================================
  init() {
    // Ensure midpoint is a Point object
    const p = this.params.midpoint;
    if (!(p instanceof Point)) this.params.midpoint = new Point(p.x, p.y);

    this.elements = { element: new StringThing(this.params) };
  }, // end init

  // ==========================================================
  // 2. update(params) – apply new values from controls
  // ==========================================================
  update(params) {
    const e = this.elements.element;
    for (const key in this.params) {
      const value = params[key];
      if (value === undefined) continue;

      if (key === "midpoint") {
        if (value instanceof Point)
            e.midpoint = value;
        else
            e.midpoint = new Point(value.x, value.y);
      } else {
        e[key] = value;
      }
    }
  }, // end update

  // ==========================================================
  // 3. draw() – render
  // ==========================================================
  draw() {
    const thing = this.elements.element;
    drawCycloid(thing);
  } // end draw
};
