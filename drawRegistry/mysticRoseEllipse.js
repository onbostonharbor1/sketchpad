/* drawRegistry/mysticRoseEllipse.js */
import { Point, StringThing }       from '../classes/classes.js';
import { drawMysticRose }           from '../draw/drawUnicorns.js';

window.drawRegistry_mysticRoseEllipse = {
    name:         "Mystic Rose (ellipse)",
    id:           "mysticRose",
    version:      0.1,
    category:     "unicorns",
    firstOrder:   true,
    source:       "internal",
    tags:         ["circular"],
    description:  "Lines drawn to all nodes from each node in an ellipse",
    hover:        "",

    // -- visual styling ---
    background: null,
    overlays:   [],
    transforms: [],

    // Placeholder for all elements drawn
    elements:   null,
    // --- Core defaults for drawing (JSON-safe) ---
    params: {
	    midpoint: { x: 300, y: 200 },   // converted to Point in init()
	    numNodes: 20,
        ellipse:  {a: 400, b: 300},
	    xScale:   1,
	    yScale:   1,
	    color:    "blue",
	    lineWidth: 1
    },

  // --- UI metadata (controls) ---
  controls: {
    ellipseHeight:  { widget: "range", min: 80,  max: 400, step: 5,   label: "Height:" },
    ellipseLength:  { widget: "range", min: 80,  max: 500, step: 5,   label: "Length:" },

    numNodes:       { widget: "range", min: 12,  max: 30,  step: 1,   label: "Nodes:" },
    xScale:    { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "X Scale:" },
    yScale:    { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "Y Scale:" },
    color:     { widget: "colorPicker",                          label: "Color:" },
    lineWidth: { widget: "range", min: .5,  max: 2.5, step: .5,  label: "Width:" },
    midpoint:  { widget: "pointPicker",                          label: "Midpoint:" }
  },

  // ==========================================================
  // 1. init() – build the persistent mysticRose
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
      } else if (key == "ellipseHeight") {
            e.ellipse.b = value;
      } else if (key === "ellipseLength") {
            e.ellipse.a = value;
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
    drawMysticRose(thing);
  } // end draw
};
