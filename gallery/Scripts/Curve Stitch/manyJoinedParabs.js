/* ============================================================
   Parab Envelope + Recipe Variants — 8 Draggable Vertices
   ============================================================ */
import { Point, StringThing } from "/classes/classes.js";
import { drawState } from "/draw/drawState.js";
import { createPrintNodes, _m, drawManyParabs } from "/draw/drawUtilities.js";

export const scriptInfo = {
  title: "Parab Recipe Variants (8 Draggable Vertices)",
  interactive: true,

  params: {
    mid: true,
    radius: 250,
    rotate: 45,
    xScale: 1,
    numSteps: 19,
    color: "blue",
    midpointX: 250,
    midpointY: 300,
    lineWidth: 1,
    alpha: 1.0,
    background: "",
    patternVariant: "original",

    // Index 0-5 are envelope anchors, 6-7 are interior midpoints
    points: []
  },

  controls: {
    patternVariant: {
      widget: "select",
      label: "Variant",
      options: [
        { value: "original",         label: "Original" },
        { value: "rotated",          label: "Rotated" },
        { value: "mirrored",         label: "Mirrored" },
        { value: "rotatedMirrored", label: "Rotated + Mirrored" }
      ]
    },
    radius:    { widget: "range", label: "Radius", min: 50, max: 380, step: 1 },
    rotate:    { widget: "range", label: "Rotate", min: 0, max: 360, step: 1 },
    numSteps:  { widget: "range", label: "Steps",  min: 7,  max: 80,  step: 1 },
    lineWidth: { widget: "range", label: "Line",   min: 0.25, max: 6, step: 0.25 },
    color:     { widget: "colorPicker", label: "Color" }
  },

  _state: { lastVariant: null, seeded: false },

  init() {
    this.elements = {
      thing: new StringThing({
        ...this.params,
        midpoint: new Point(this.params.midpointX, this.params.midpointY)
      }),
      parabs: []
    };
    if (this.params.points.length === 0) this.update(this.params);
  },

update(params) {
    const t = this.elements.thing;
    Object.assign(t, params);
    t.midpoint.x = params.midpointX;
    t.midpoint.y = params.midpointY;

    drawState.pts.length = 0;
    createPrintNodes(t);
    const pts = drawState.pts;

    // 1. Check if the Variant changed
    const variantChanged = (params.patternVariant !== this._state.lastVariant);

    // 2. ALWAYS sync the points to the new Rotate/Radius geometry
    // This ensures the dots move with the lines
    this.reseed(params, pts);

    this._state.seeded = true;
    this._state.lastVariant = params.patternVariant;

    this.elements.parabs = this.buildParabs(params);
  },

  draw() {
    ctx.save();
    if (this.params.background) {
      ctx.fillStyle = this.params.background;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    } else {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    ctx.strokeStyle = this.params.color;
    ctx.lineWidth = this.params.lineWidth;
    drawManyParabs(this.elements.thing, this.elements.parabs);
    ctx.restore();
  },

  /**
   * RESEED: The Bridge between Parametric Math and User Interaction.
   * * PURPOSE:
   * This function takes the raw, calculated nodes from the 'StringThing' generator
   * and "seeds" them into the 'params.points' array that the Interactor tracks.
   *
   * THE MEMORY REFERENCE RULE:
   * The Interactor holds a permanent pointer to the objects inside 'params.points'.
   * We MUST NOT reassign the array (e.g., params.points = [...]) because that
   * snaps the connection, making the red dots vanish. Instead, we mutate the
   * .x and .y properties of the existing objects (In-Place Update).
   *
   * GEOMETRIC MAPPING:
   * 1. Mapper: Uses getMapper to determine which physical nodes in the envelope
   * become our primary anchors (p0, p1, etc.) based on the selected Variant.
   * 2. Anchors: Extracts 6 specific vertices from the generated envelope.
   * 3. Derived Points: Calculates 2 interior midpoints (lMid, rMid) using
   * the anchor positions to complete the 8-point interactive set.
   */
  reseed(params, pts) {
    const map = this.getMapper(params, pts.length);

    // Grab the 6 primary anchor nodes from the calculated envelope
    const p0 = pts[map(0)], p1 = pts[map(1)], p2 = pts[map(2)],
          p3 = pts[map(3)], p4 = pts[map(4)], p6 = pts[map(6)];

    // Derive the 2 interior midpoints for the inner parabola logic
    const lMid = _m(p0, p6);
    const rMid = _m(p1, p6);

    // This is the ordered set of 8 coordinates we want the handles to follow
    const sourcePoints = [p0, p1, p2, p3, p4, p6, lMid, rMid];

    if (params.points.length === 0) {
      // INITIALIZATION: Only happens once to establish the object references
      params.points = sourcePoints.map(p => ({ x: p.x, y: p.y }));
    } else {
      // IN-PLACE MUTATION: Update existing objects to keep the Interactor 'live'
      sourcePoints.forEach((src, i) => {
        if (params.points[i]) {
          params.points[i].x = src.x;
          params.points[i].y = src.y;
        }
      });
    }
  },

  reseed(params, pts) {
    const map = this.getMapper(params, pts.length);
    const p0 = pts[map(0)], p1 = pts[map(1)], p2 = pts[map(2)],
          p3 = pts[map(3)], p4 = pts[map(4)], p6 = pts[map(6)];

    const lMid = _m(p0, p6);
    const rMid = _m(p1, p6);

    const sourcePoints = [p0, p1, p2, p3, p4, p6, lMid, rMid];

    if (params.points.length === 0) {
      params.points = sourcePoints.map(p => ({ x: p.x, y: p.y }));
    } else {
      // In-place update keeps the Interactor's reference alive
      sourcePoints.forEach((src, i) => {
        params.points[i].x = src.x;
        params.points[i].y = src.y;
      });
    }
  },

  buildParabs(params) {
    const v = params.points;
    return [
        [v[0], v[6], v[4]],
        [v[6], v[4], v[7]],
        [v[1], v[7], v[4]],
        [v[1], v[7], v[2]],
        [v[2], v[7], v[5]],
        [v[7], v[5], v[6]],
        [v[3], v[6], v[5]],
        [v[3], v[6], v[0]]
    ];
  },

  getMapper(params, n) {
    const { patternVariant: mode } = params;
    return (k) => {
      let i = k;
      if (mode.includes("rotated")) i += 0; // Offset logic removed
      if (mode.includes("mirrored")) {
        if (i === 0) i = 1;
        else if (i === 1) i = 0;
        else if (i === 2) i = 3;
        else if (i === 3) i = 2;
      }
      return ((i % n) + n) % n;
    };
  }
};

export function runPattern() {
    scriptInfo.init();
    scriptInfo.redrawHandler();
}

scriptInfo.redrawHandler = () => {
    scriptInfo.update(scriptInfo.params);
    scriptInfo.draw();
};
