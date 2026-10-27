/* drawRegistry/regularPolygon.js

   Regular polygon with curve stitching.

   A regular polygon of numNodes sides on a circle of the given radius,
   with curve stitching from each node (numSteps stitches). rotate turns
   the polygon, Shorten trims the stitches, and Width and Height scale
   it. The one handle moves the center.
   Break apart (Figures): decompose() gives one Parabola per side pair.
*/
import { Point }                from "../classes/classes.js";
import { CurveStitch }           from "../classes/curveStitchClass.js";
import { createNodes }          from "../draw/createNodes.js";
import { drawRegularPolygon, regularPolygonParabolas,
         createLinesFromNodesOuter, trimmedRange } from "../draw/drawRegular.js";

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
    shorten:   0,
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
    shorten:   { widget: "range", min: 0,   max: 15,  step: 1,   label: "Shorten:" },
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

    // Establish default midpoint — read from params if present, else use canvas centre
    const initialMid = p.midpoint || { x: 300, y: 300 };
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
     decompose()  (Figures, Break apart)
     ----------------------------------------------------------
     The polygon as separate registry objects: one Parabola for each
     pair of neighboring sides, with the same stitches, color and line
     width. Returns [{ key, params }], key being the registry key.
     Shorten and Trim are already built into the points and the step
     count, so the pieces start with none.
     ========================================================== */
  decompose() {
    const e = this.elements.element;
    return regularPolygonParabolas(e).map((part) => ({
      key: "parabola",
      params: {
        line1_pt1: { x: part.line1[0].x, y: part.line1[0].y },
        line1_pt2: { x: part.line1[1].x, y: part.line1[1].y },
        line2_pt1: { x: part.line2[0].x, y: part.line2[0].y },
        line2_pt2: { x: part.line2[1].x, y: part.line2[1].y },
        numSteps:  part.numSteps,
        truncate:  0,
        shorten:   0,
        color:     e.color,
        lineWidth: e.lineWidth
      }
    }));
  },

  /* ==========================================================
     infrastructure()  (Figures points mode, Phase 7d)
     ----------------------------------------------------------
     One arm per side of the polygon, matching the outer edges
     regularPolygonParabolas() pairs up for Break apart. Shorten trims
     the start of every side the same way changeLine() does in
     draw/drawRegular.js; there is no separate truncate control here,
     but trimmedRange() reads it as 0 if it's ever added.
     ========================================================== */
  infrastructure() {
    const e = this.elements.element;
    const nodes = createNodes(e);
    const lines = createLinesFromNodesOuter(nodes);
    const steps = Number(e.numSteps);
    const { from, to } = trimmedRange(steps, e.truncate, e.shorten);

    return lines.map((line, i) => ({
      id: "side" + i, a: line.start, b: line.end, steps, from, to
    }));
  },

  /* ==========================================================
     center()  (Phase 7d)
     ----------------------------------------------------------
     The polygon's true center is the handle the user drags, not an
     average of its drawn points. For an odd-sided polygon (a pentagon,
     say) those aren't the same point as the bounding box's center,
     which is what the 7b centroid still uses.
     ========================================================== */
  center() {
    const m = this.elements.element.midpoint;
    return { x: m.x, y: m.y };
  },

  /* ==========================================================
     3. draw()
     ========================================================== */
  draw() {
    drawRegularPolygon(this.elements.element);
  }
};
