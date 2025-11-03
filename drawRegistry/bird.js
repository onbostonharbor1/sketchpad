// drawRegistry/bird.js
window.drawRegistry_bird = {
  name: "Bird",
  version: 0.1,
    category:   "imported",
    firstOrder: true,
    source:     null,
    background: null,
    overlays:   [],

  // --- Core defaults for drawing ---
  params: {
    midpoint: { x: 300, y: 300 },
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
    midpoint: { widget: "pointPicker", label: "Center Point" },
    radius:   { widget: "range", min: 10, max: 400, step: 5, label: "Radius" },
    numNodes: { widget: "range", min: 3,  max: 20, step: 1, label: "Number of Nodes" },
    numSteps: { widget: "range", min: 10, max: 64, step: 1, label: "Number of Steps" },
    rotate:   { widget: "range", min: 0,  max: 360, step: 5, label: "Rotation (°)" },
    xScale:   { widget: "range", min: 0.5, max: 2, step: 0.1, label: "X Scale" },
    yScale:   { widget: "range", min: 0.5, max: 2, step: 0.1, label: "Y Scale" },
    color:    { widget: "colorPicker", label: "Line Color" },
    lineWidth:{ widget: "range", min: 1, max: 10, step: 1, label: "Line Width" }
  },

  // --- Factory method ---
  create(overrides = {}) {
    const merged = Object.assign({}, this.params, overrides);

    // Normalize midpoint into a Point
    if (!(merged.midpoint instanceof Point)) {
      merged.midpoint = new Point(merged.midpoint.x, merged.midpoint.y);
    }

    return new StringThing(merged);
  },

  // --- Draw method ---
  draw(thing) {
    drawRegularPolygon(thing);
  }
};
