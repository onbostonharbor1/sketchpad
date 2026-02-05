/* ============================================================
   Parab Envelope — 8 Draggable Vertices
   ============================================================ */
import { Point, Line, StringThing } from "/classes/classes.js";
import { drawState } from "/draw/drawState.js";
import { createPrintNodes, drawManyParabs } from "/draw/drawUtilities.js";

export const scriptInfo = {
  title: "Parab Envelope (Reference-Linked)",
  interactive: true,

  params: {
    radius: 250,
    rotate: 45,
    numSteps: 19,
    color: "blue",
    midpointX: 250,
    midpointY: 300,
    lineWidth: 1,
    points: []
  },

  controls: {
    radius:    { widget: "range", label: "Radius", min: 50, max: 380, step: 1 },
    rotate:    { widget: "range", label: "Rotate", min: 0, max: 360, step: 1 },
    numSteps:  { widget: "range", label: "Steps",  min: 7,  max: 80,  step: 1 },
    lineWidth: { widget: "range", label: "Line",   min: 0.25, max: 6, step: 0.25 },
    color:     { widget: "color", label: "Color" }
  },

  /**
   * INIT: Establishes the "Live Link"
   */
  init() {
    this.elements = {
      thing: new StringThing({
        ...this.params,
        midpoint: new Point(this.params.midpointX, this.params.midpointY)
      }),
      parabs: []
    };

    drawState.pts.length = 0;
    createPrintNodes(this.elements.thing);
    const pts = drawState.pts;

    if (pts.length < 7) return;

    // Create the Lines for midpoints
    this.elements.lLine = new Line(pts[0], pts[6]);
    this.elements.rLine = new Line(pts[1], pts[6]);

    // REFERENCE BINDING
    // We bind handles 0-5 to the math nodes, 6-7 to the midpoints.
    this.params.points = [
      pts[0], pts[1], pts[2], pts[3], pts[4], pts[6],
      this.elements.lLine.midpoint(),
      this.elements.rLine.midpoint()
    ];

    // Build the recipe immediately so the first draw() has data
    this.elements.parabs = this.buildParabs(this.params);
  },

  /**
   * UPDATE: Updates coordinates and the recipe
   */
  update(params) {
    const t = this.elements.thing;
    Object.assign(t, params);

    drawState.pts.length = 0;
    createPrintNodes(t);
    const pts = drawState.pts;

    if (pts.length >= 7) {
      // Refresh line anchors
      this.elements.lLine.setStart(pts[0]);
      this.elements.lLine.setEnd(pts[6]);
      this.elements.rLine.setStart(pts[1]);
      this.elements.rLine.setEnd(pts[6]);

      // Refresh midpoint coordinates in-place
      const m1 = this.elements.lLine.midpoint();
      const m2 = this.elements.rLine.midpoint();

      this.params.points[6].x = m1.x;
      this.params.points[6].y = m1.y;
      this.params.points[7].x = m2.x;
      this.params.points[7].y = m2.y;
    }

    // Always rebuild the parabs recipe after points update
    this.elements.parabs = this.buildParabs(params);
  },

  draw() {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.strokeStyle = this.params.color;
    ctx.lineWidth = this.params.lineWidth;

    // drawManyParabs iterates through the triplets in this.elements.parabs
    drawManyParabs(this.elements.thing, this.elements.parabs);

    ctx.restore();
  },

  /**
   * BUILD PARABS: The Recipe
   * Maps the handles (v) into the triplets drawManyParabs requires.
   */
  buildParabs(params) {
    const v = params.points;
    if (!v || v.length < 8) return [];

    return [
        [v[0], v[6], v[4]], [v[6], v[4], v[7]],
        [v[1], v[7], v[4]], [v[1], v[7], v[2]],
        [v[2], v[7], v[5]], [v[7], v[5], v[6]],
        [v[3], v[6], v[5]], [v[3], v[6], v[0]]
    ];
  }
};

export function runPattern() {
    scriptInfo.init();
}
