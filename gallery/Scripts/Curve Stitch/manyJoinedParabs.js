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
    compositeOperation: "source-over",
    patternVariant: "original",
    offset: 0,

    // Index 0-5 are envelope anchors, 6-7 are interior midpoints
    points: []
  },

  controls: {
    patternVariant: {
      widget: "select",
      label: "Variant",
      options: [
        { value: "original",        label: "Original" },
        { value: "rotated",         label: "Rotated" },
        { value: "mirrored",        label: "Mirrored" },
        { value: "rotatedMirrored", label: "Rotated + Mirrored" }
      ]
    },
    offset:    { widget: "range", label: "Offset", min: 0, max: 60, step: 1 },
    radius:    { widget: "range", label: "Radius", min: 50, max: 380, step: 1 },
    rotate:    { widget: "range", label: "Rotate", min: 0, max: 360, step: 1 },
    numSteps:  { widget: "range", label: "Steps",  min: 7,  max: 80,  step: 1 },
    lineWidth: { widget: "range", label: "Line",   min: 0.25, max: 6, step: 0.25 },
    color:     { widget: "color", label: "Color" }
  },

  _state: { lastVariant: null, lastOffset: null, seeded: false },

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

    const mustReseed =
        (!this._state.seeded) ||
        (params.patternVariant !== this._state.lastVariant) ||
        (params.offset !== this._state.lastOffset);

    if (mustReseed) {
      this.reseed(params, pts);
      this._state.seeded = true;
      this._state.lastVariant = params.patternVariant;
      this._state.lastOffset = params.offset;
    }

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
    ctx.globalCompositeOperation = this.params.compositeOperation;
    ctx.globalAlpha = this.params.alpha;
    ctx.strokeStyle = this.params.color;
    ctx.lineWidth = this.params.lineWidth;
    drawManyParabs(this.elements.thing, this.elements.parabs);
    ctx.restore();
  },

  reseed(params, pts) {
    const map = this.getMapper(params, pts.length);
    // Gather the 6 original base points from the envelope
    const p0 = pts[map(0)], p1 = pts[map(1)], p2 = pts[map(2)],
          p3 = pts[map(3)], p4 = pts[map(4)], p6 = pts[map(6)];

    // Derive the 2 original interior midpoints
    const lMid = _m(p0, p6);
    const rMid = _m(p1, p6);

    // Seed the points array with all 8 vertices
    params.points = [
      { x: p0.x, y: p0.y }, { x: p1.x, y: p1.y }, // 0, 1
      { x: p2.x, y: p2.y }, { x: p3.x, y: p3.y }, // 2, 3
      { x: p4.x, y: p4.y }, { x: p6.x, y: p6.y }, // 4, 5 (exterior)
      { x: lMid.x, y: lMid.y }, { x: rMid.x, y: rMid.y } // 6, 7 (interior)
    ];
  },

  buildParabs(params) {
    const v = params.points;
    // Map the draggable points to the parabolas based on your original recipe
    // Original: [p0, lPt, p4], [lPt, p4, rPt], [p1, rPt, p4]...
    return [
        [v[0], v[6], v[4]], // p0, lMid, p4
        [v[6], v[4], v[7]], // lMid, p4, rMid
        [v[1], v[7], v[4]], // p1, rMid, p4
        [v[1], v[7], v[2]], // p1, rMid, p2
        [v[2], v[7], v[5]], // p2, rMid, p6
        [v[7], v[5], v[6]], // rMid, p6, lMid
        [v[3], v[6], v[5]], // p3, lMid, p6
        [v[3], v[6], v[0]]  // p3, lMid, p0
    ];
  },

  getMapper(params, n) {
    const { patternVariant: mode, offset } = params;
    return (k) => {
      let i = k;
      if (mode.includes("rotated")) i += offset;
      if (mode.includes("mirrored")) {
        const off = mode.includes("rotated") ? offset : 0;
        if (i === off) i = 1 + off;
        else if (i === 1 + off) i = off;
        else if (i === 2 + off) i = 3 + off;
        else if (i === 3 + off) i = 2 + off;
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
