/* ============================================================
   Parab Envelope — 8 Draggable Vertices
   ============================================================
   Radius and rotate apply incremental transforms to the live
   points, using their centroid as the pivot/origin. This means
   dragged configurations scale and rotate naturally around
   their own center of mass. Points are seeded once at init
   from fixed circle indices — never reset afterward.
   ============================================================ */
import { Point, StringThing } from "/classes/classes.js";
import { drawState } from "/draw/drawState.js";
import { createPrintNodes, _m, drawManyParabs } from "/draw/drawUtilities.js";

export const scriptInfo = {
  title: "Many Joined Parabs (8 Draggable Vertices)",
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

    // Index 0-5 are envelope anchors, 6-7 are interior midpoints
    points: []
  },

  controls: {
    radius:    { widget: "range",  label: "Radius",  min: 50,   max: 380, step: 1 },
    rotate:    { widget: "range",  label: "Rotate",  min: 0,    max: 360, step: 1 },
    numSteps:  { widget: "range",  label: "Steps",   min: 7,    max: 80,  step: 1 },
    lineWidth: { widget: "range",  label: "Line",    min: 0.25, max: 6,   step: 0.25 },
    color:     { widget: "color",  label: "Color" },
    reset: {
      widget: "button",
      label: "Reset",
      fullRow: true,
      action() {
        this._state.seeded = false;
        this.update(this.params);
        this.draw();
        armInteractor(this);
      }
    }
  },

  _state: {
    seeded:     false,
    lastRadius: null,
    lastRotate: null
  },

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

    t.ellipse.a = params.radius * 2;
    t.ellipse.b = params.radius * 2;

    if (!this._state.seeded) {
      // First run — generate circle nodes and seed the 8 points.
      drawState.pts.length = 0;
      createPrintNodes(t);
      this._seed(params, drawState.pts);
      this._state.seeded     = true;
      this._state.lastRadius = params.radius;
      this._state.lastRotate = params.rotate;
    } else {
      // Subsequent runs — apply incremental transforms to live points.
      if (params.radius !== this._state.lastRadius) {
        const ratio = params.radius / this._state.lastRadius;
        this._scalePoints(params.points, ratio);
        this._state.lastRadius = params.radius;
      }
      if (params.rotate !== this._state.lastRotate) {
        let delta = params.rotate - this._state.lastRotate;
        if (delta >  180) delta -= 360;
        if (delta < -180) delta += 360;
        this._rotatePoints(params.points, delta * Math.PI / 180);
        this._state.lastRotate = params.rotate;
      }
    }

    this.elements.parabs = this._buildParabs(params);
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

  _seed(params, pts) {
    const p0 = pts[0], p1 = pts[1], p2 = pts[2],
          p3 = pts[3], p4 = pts[4], p6 = pts[6];

    const lMid = _m(p0, p6);
    const rMid = _m(p1, p6);

    const sourcePoints = [p0, p1, p2, p3, p4, p6, lMid, rMid];

    if (params.points.length === 0) {
      // First init — create the objects the interactor will bind to.
      sourcePoints.forEach(p => params.points.push({ x: p.x, y: p.y }));
    } else {
      // Reset — mutate existing objects in-place, interactor references stay valid.
      sourcePoints.forEach((src, i) => {
        params.points[i].x = src.x;
        params.points[i].y = src.y;
      });
    }
  },

  _centroid(points) {
    const n = points.length;
    let cx = 0, cy = 0;
    for (const p of points) { cx += p.x; cy += p.y; }
    return { x: cx / n, y: cy / n };
  },

  _scalePoints(points, ratio) {
    const c = this._centroid(points);
    for (const p of points) {
      p.x = c.x + (p.x - c.x) * ratio;
      p.y = c.y + (p.y - c.y) * ratio;
    }
  },

  _rotatePoints(points, deltaRad) {
    const c = this._centroid(points);
    const cos = Math.cos(deltaRad);
    const sin = Math.sin(deltaRad);
    for (const p of points) {
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      p.x = c.x + dx * cos - dy * sin;
      p.y = c.y + dx * sin + dy * cos;
    }
  },

  _buildParabs(params) {
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
