// drawRegistry/inverseStar.js
window.drawRegistry_inverseStar = {
    name:       "Inverse Star",
    version:    0.1,
    category:   "curve_stitch",
    firstOrder: true,                 // Not derived from
    source:     null,                 // doc to say if copied from somewhere
    background: null,                 // For future use
    overlays:   [],                   // For future use

  // --- Core defaults for drawing ---
  params: {
    midpoint: { x: 300, y:300 },
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
      radius:   { widget: "range", min: 10,  max: 400, step: 5,   label: "Radius:" },
      lineWidth:{ widget: "range", min: 1,   max: 5,   step: 1,   label: "Width:" },
      numNodes: { widget: "range", min: 3,   max: 16,  step: 1,   label: "Nodes:" },
      numSteps: { widget: "range", min: 10,  max: 64,  step: 1,   label: "Steps:" },
      rotate:   { widget: "range", min: 0,   max: 360, step: 5,   label: "Rotation:" },
      xScale:   { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "X Scale:" },
      yScale:   { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "Y Scale:" },
      color:    { widget: "colorPicker",                          label: "Color:" },
      midpoint: { widget: "pointPicker",                          label: "Midpoint:" }
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
    drawInverseStar(thing);
  }
};
