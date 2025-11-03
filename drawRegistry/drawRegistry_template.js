/*
  Template for new drawRegistry entries
  -------------------------------------
  Each entry defines how an object is constructed, drawn, and exposed to the UI.
  It is self-contained and discoverable by category and tags.
*/

window.drawRegistry_TEMPLATE = {
  // --- Identity and classification ---
  name:        "Template Figure",      // Display name
  id:          "templateFigure",       // Unique identifier (optional but useful)
  version:     0.1,                    // Increment when params or logic change
  category:    "prototype",            // Used by Draw tab to group categories
  tags:        ["template", "demo"],   // For search and filtering
  firstOrder:  true,                   // Whether it’s a base figure
  source:      "internal",             // Reference or author/source
  description: "Demonstration of the registry entry pattern.",

  // --- Visual styling ---
  background:  null,                   // Optional background style or color
  overlays:    [],                     // Overlay drawings (none by default)
  transforms:  [],                     // Geometric or visual transforms
  style: {
    fill:       false,                 // Whether fill is applied
    fillColor:  "none",                // Fill color
    blendMode:  "source-over",         // Canvas composite mode
    palette:    ["#0044cc"],           // Optional color sequence
  },

  // --- Parameter defaults (for create/reset) ---
  params: {
    midpoint:  { x: 300, y: 300 },
    radius:    120,
    numNodes:  6,
    rotate:    0,
    color:     "#0044cc",
    lineWidth: 2,
  },

  // --- UI metadata for control generation ---
  controls: {
    midpoint:  { widget: "pointPicker", label: "Center Point" },
    radius:    { widget: "range", min: 10,  max: 400, step: 5,  label: "Radius" },
    numNodes:  { widget: "range", min: 3,   max: 20,  step: 1,  label: "Number of Nodes" },
    rotate:    { widget: "range", min: 0,   max: 360, step: 5,  label: "Rotation (°)" },
    color:     { widget: "colorPicker", label: "Line Color" },
    lineWidth: { widget: "range", min: 1,   max: 10,  step: 1,  label: "Line Width" }
  },

  // Optional explicit ordering of control appearance
  uiOrder: ["radius", "numNodes", "rotate", "color", "lineWidth"],

  // --- Factory: instantiate a StringThing or related object ---
  create(overrides = {}) {
    const merged = Object.assign({}, this.params, overrides);

    // Normalize midpoint into a Point instance
    if (!(merged.midpoint instanceof Point)) {
      merged.midpoint = new Point(merged.midpoint.x, merged.midpoint.y);
    }

    // Return a StringThing (or subclass) with these parameters
    return new StringThing(merged);
  },

  // --- Draw routine (delegate to draw function) ---
  draw(thing) {
    // Replace with the actual drawing implementation
    // e.g., drawRegularPolygon(thing);
    console.warn(`Draw method not implemented for ${this.name}`);
  },

  // --- Optional dependency listing (future use) ---
  dependencies: [],

  // --- Optional variants (for UI selection) ---
  variants: ["default"],

  // --- Optional helper ---
  notes: "This is a template registry definition for new draw types."
};
