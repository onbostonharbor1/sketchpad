/* ============================================================
   Parab Envelope + Recipe Variants — 8 Draggable Vertices
   ============================================================
   DEVELOPMENT NOTES:

   Point layout (always seeded from circle, original mapping):
     v[0], v[3] — left anchors  (paired with lMid v[6])
     v[1], v[2] — right anchors (paired with rMid v[7])
     v[4]       — top junction
     v[5]       — bottom junction
     v[6]       — lMid (midpoint of v[0] and v[5])
     v[7]       — rMid (midpoint of v[1] and v[5])

   Variants remap the wiring table — they never reseed.
   Dragged positions are always preserved across variant changes.
   Only geometry changes (radius, rotate, numSteps) reseed.

   Mirror: swaps left↔right roles in the wiring
     v[0]↔v[1], v[3]↔v[2], v[6]↔v[7]

   Rotate: cycles the 6 envelope anchors (v[0]-v[5]) by offset
     within the wiring, leaving lMid/rMid fixed.
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
    points: []  // 0-5: envelope anchors, 6: lMid, 7: rMid
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
    offset:    { widget: "range", label: "Offset", min: 0,    max: 5,   step: 1 },
    radius:    { widget: "range", label: "Radius", min: 50,   max: 380, step: 1 },
    rotate:    { widget: "range", label: "Rotate", min: 0,    max: 360, step: 1 },
    numSteps:  { widget: "range", label: "Steps",  min: 7,    max: 80,  step: 1 },
    lineWidth: { widget: "range", label: "Line",   min: 0.25, max: 6,   step: 0.25 },
    color:     { widget: "color", label: "Color" }
  },

  _seededFor: null,  // tracks geometry key to detect changes needing reseed

  init() {
    this.elements = {
      thing: new StringThing({
        ...this.params,
        midpoint: new Point(this.params.midpointX, this.params.midpointY)
      }),
      parabs: []
    };
    this.update(this.params);
  },

  update(params) {
    const t = this.elements.thing;
    Object.assign(t, params);
    t.midpoint.x = params.midpointX;
    t.midpoint.y = params.midpointY;
    t.ellipse.a  = params.radius * 2;
    t.ellipse.b  = params.radius * 2;

    drawState.pts.length = 0;
    createPrintNodes(t);
    const pts = drawState.pts;

    // Reseed only when circle geometry changes.
    // Variant and offset just change the wiring — points stay put.
    const geoKey = params.radius + ":" + params.rotate + ":" + params.numSteps;
    if (geoKey !== this._seededFor) {
      this._seededFor = geoKey;
      this.reseed(params, pts);
    }

    // Rebuild wiring on every update — variant/offset may have changed.
    // This is cheap: just rewires references, no geometry computation.
    this.elements.parabs = this.buildParabs(params);
  },

  reseed(params, pts) {
    // Always seed from original circle mapping.
    // Variant/offset are handled entirely in buildParabs wiring.
    const n = pts.length;
    const wrap = (i) => ((i % n) + n) % n;

    const p0 = pts[wrap(0)], p1 = pts[wrap(1)], p2 = pts[wrap(2)],
          p3 = pts[wrap(3)], p4 = pts[wrap(4)], p5 = pts[wrap(6)];
    const fresh = [p0, p1, p2, p3, p4, p5, _m(p0, p5), _m(p1, p5)];

    if (params.points.length === 0) {
      params.points = fresh.map(p => ({ x: p.x, y: p.y }));
    } else {
      fresh.forEach((src, i) => {
        params.points[i].x = src.x;
        params.points[i].y = src.y;
      });
    }
  },

  buildParabs(params) {
    const v = params.points;
    const mode = params.patternVariant;
    const off  = params.offset;

    // Rotate: cycle the 6 envelope anchors (indices 0-5) by offset.
    // lMid (6) and rMid (7) are structural — they don't rotate.
    const e = (i) => v[(i + (mode.includes("rotated") ? off : 0)) % 6];

    // Mirror: swap left↔right roles — v[0]↔v[1], v[3]↔v[2], lMid↔rMid
    const mirrored = mode.includes("mirrored");
    const lMid = mirrored ? v[7] : v[6];
    const rMid = mirrored ? v[6] : v[7];
    const aL   = mirrored ? e(1) : e(0);  // left outer anchor
    const aR   = mirrored ? e(0) : e(1);  // right outer anchor
    const bL   = mirrored ? e(2) : e(3);  // left inner anchor
    const bR   = mirrored ? e(3) : e(2);  // right inner anchor
    const top  = e(4);
    const bot  = e(5);

    return [
      [aL,   lMid, top],
      [lMid, top,  rMid],
      [aR,   rMid, top],
      [aR,   rMid, bR],
      [bR,   rMid, bot],
      [rMid, bot,  lMid],
      [bL,   lMid, bot],
      [bL,   lMid, aL]
    ];
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
    ctx.lineWidth   = this.params.lineWidth;
    drawManyParabs(this.elements.thing, this.elements.parabs);
    ctx.restore();
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
