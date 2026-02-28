/* drawRegistry/regularPolygon.js */
import { Point }                from "../classes/classes.js";
import { CurveStitch }           from "../classes/curveStitchClass.js";
import { drawRegularPolygon }    from "../draw/drawRegular.js";

window.drawRegistry_regularPolygon = {
  name:         "Regular Polygon",
  id:           "regularPolygon",
  version:      1.0, // Phase 3 Canvas Interactor Version
  category:     "curve_stitch",
  firstOrder:   true,
  source:       "internal",
  tags:         ["Curve Stitch"],
  description:  "Draws a regular polygon with curve stitching from each node.",
  status:       "",
  hover:        "",

  background: null,
  overlays:   [],
  transforms: [],
  elements:   null,

  interactive: true,
  params: {
    radius:    300,
    numNodes:  5,
    numSteps:  20,
    rotate:    0,
    truncate:  0,
    shorten:    0.2,
    xScale:    1,
    yScale:    1,
    color:     "blue",
    lineWidth: 1,
    // [0]: midpoint handle
    points:    []
  },

  controls: {
    radius:    { widget: "range", min: 10,  max: 400, step: 5,   label: "Radius:" },
    numNodes:  { widget: "range", min: 3,   max: 16,  step: 1,   label: "Nodes:" },
    numSteps:  { widget: "range", min: 10,  max: 64,  step: 1,   label: "Steps:" },
    rotate:    { widget: "range", min: 0,   max: 360, step: 5,   label: "Rotation:" },
    xScale:    { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "Width:" },
    yScale:    { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "Height:" },
    truncate:  { widget: "range", min: 0,   max: 20,  step: 1,   label: "Truncate:" },
    shorten:   { widget: "range", min: 0,   max: 1,  step: .05,  label: "Shorten:" },
    color:     { widget: "colorPicker",                          label: "Color:" },
    lineWidth: { widget: "range", min: 1,   max: 5,   step: 1,   label: "Line Wid.:" }
  },

  /* ==========================================================
     1. init()
     ========================================================== */
  init() {
    const p = this.params;

    // Hard-reset handles to prevent ghosting from previous drawings
    p.points.length = 0;

    // Establish default midpoint if none exists
    const initialMid = { x: 300, y: 300 };
    p.points.push({ x: initialMid.x, y: initialMid.y });

    // The CurveStitch class expects a Point object for its midpoint
    const stitchParams = {
      ...p,
      midpoint: new Point(p.points[0].x, p.points[0].y)
    };

    this.elements = { element: new CurveStitch(stitchParams) };
  },

  /* ==========================================================
     2. update(incoming)
     ========================================================== */
  update(incoming) {
    const p = this.params;
    const e = this.elements.element;

    // Handle center-point drag from canvas
    if (incoming.points && incoming.points[0]) {
      const pt = incoming.points[0];
      e.midpoint = new Point(pt.x, pt.y);
    }

    // Handle standard UI control updates
    for (const key in incoming) {
      if (key === "points" || incoming[key] === undefined) continue;
      if (key === "radius") {
        e.ellipse.a = incoming[key]*2;
        e.ellipse.b = incoming[key]*2;
      }
      // Sync style/geometry to the CurveStitch instance
      if (Object.hasOwn(e, key)) {
        e[key] = (key === "color") ? incoming[key] : Number(incoming[key]);
        // Keep registry params in sync
        p[key] = e[key];
      }
    }
  },

  /* ==========================================================
     3. draw()
     ========================================================== */
  draw() {
    drawRegularPolygon(this.elements.element);
  }
};
