/* drawRegistry/inverseStar.js 
   ------------------------------------------------------------
   New lifecycle form (init, update, draw)
   Using Point objects created at runtime.
   ------------------------------------------------------------ */

window.drawRegistry_inverseStar = {
    name:         "Inverse Star",
    id:           "inverseStar",
    version:      0.4,
    category:     "curve_stitch",
    firstOrder:   true,
    source:       "internal",
    tags:         ["Curve Stitch"],
    description:  "An inverse star goes from the center outward",

    // -- visual styling ---
    background: null,
    overlays:   [],
    transforms: [],

    // Placeholder for all elements drawn
    elements:   null,
    // --- Core defaults for drawing (JSON-safe) ---
    params: {
	midpoint: { x: 300, y: 300 },   // converted to Point in init()
	radius:   150,
	numNodes: 5,
	numSteps: 20,
	rotate:   0,
	xScale:   1,
	yScale:   1,
	color:    "blue",
	lineWidth: 1
    },

  // --- UI metadata (controls) ---
  controls: {
    radius:    { widget: "range", min: 10,  max: 400, step: 5,   label: "Radius:" },
    lineWidth: { widget: "range", min: 1,   max: 5,   step: 1,   label: "Width:" },
    numNodes:  { widget: "range", min: 3,   max: 16,  step: 1,   label: "Nodes:" },
    numSteps:  { widget: "range", min: 10,  max: 64,  step: 1,   label: "Steps:" },
    rotate:    { widget: "range", min: 0,   max: 360, step: 5,   label: "Rotation:" },
    xScale:    { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "X Scale:" },
    yScale:    { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "Y Scale:" },
    color:     { widget: "colorPicker",                          label: "Color:" },
    midpoint:  { widget: "pointPicker",                          label: "Midpoint:" }
  },

  // ==========================================================
  // 1. init() – build the persistent StringThing
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
        if (value instanceof Point) e.midpoint = value;
        else e.midpoint = new Point(value.x, value.y);
      } else {
        e[key] = value;
      }
    }
  }, // end update

  // ==========================================================
  // 3. draw() – render using existing StringThing
  // ==========================================================
  draw() {
    const e = this.elements.element;
    drawInverseStar(e);
  } // end draw
};
