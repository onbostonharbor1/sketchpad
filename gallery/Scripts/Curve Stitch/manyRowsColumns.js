/* ============================================================
   Joined Parabolas — M parabolas per row, N rows
   ============================================================
   Points are seeded from a rectangular grid derived from
   radius and the canvas centroid. Radius and rotate apply
   incremental centroid-based transforms to the live points.

   POINT LAYOUT (M parabolas, N rows):
   - Top row:            M+1 points  (indices 0 .. M)
   - Interior bands:     N-1 bands × 2 points each
                         band b: left = M+1 + b*2, right = M+1 + b*2 + 1
   - Bottom row:         M+1 points  (indices M+1 + (N-1)*2 .. end)

   PARABOLA RECIPE:
   For each row r (0..N-1), build a sequence by interleaving
   that row's M+1 exterior points with the interior band points,
   then slide a window of 3 across the sequence.

   Top row sequence:    top[0], band[0].left, top[1], band[0].right, top[2], ...
   Bottom row sequence: bot[0], band[N-2].left, bot[1], band[N-2].right, bot[2], ...
   Middle rows (N>2):   band[r-1].left, band[r].left, band[r-1].right ...
                        (uses two adjacent bands)
   ============================================================ */
import { Point, StringThing } from "/classes/classes.js";
import { drawManyParabs } from "/draw/drawUtilities.js";

export const scriptInfo = {
  title: "Joined Parabolas (M×N)",
  interactive: true,

  params: {
    numParabs: 3,
    numRows:   2,
    numSteps:  19,
    color:     "blue",
    lineWidth: 1,
    alpha:     1.0,
    background: "",
    compositeOperation: "source-over",
    points: []
  },

  controls: {
    numParabs: { widget: "range", label: "Parabolas/Row", min: 2, max: 8, step: 1 },
    numRows:   { widget: "range", label: "Rows",          min: 1, max: 6, step: 1 },
    numSteps:  { widget: "range", label: "Steps",         min: 7, max: 80, step: 1 },
    lineWidth: { widget: "range", label: "Line",          min: 0.25, max: 6, step: 0.25 },
    color:     { widget: "color", label: "Color" },
    reset: {
      widget: "button",
      label: "Reset",
      fullRow: true,
      action() {
        this._state.seeded = false;
        this._state.lastM  = null;
        this._state.lastN  = null;
        this.update(this.params);
        this.draw();
        armInteractor(this);
      }
    }
  },

  _state: {
    seeded: false,
    lastM:  null,
    lastN:  null
  },

  init() {
    this.elements = {
      thing: new StringThing({ ...this.params }),
      parabs: []
    };
    if (this.params.points.length === 0) this.update(this.params);
  },

  update(params) {
    const t = this.elements.thing;
    Object.assign(t, params);

    const M = params.numParabs;
    const N = params.numRows;

    const mustReseed =
      (!this._state.seeded) ||
      (M !== this._state.lastM) ||
      (N !== this._state.lastN);

    if (mustReseed) {
      this._seed(params);
      this._state.seeded = true;
      this._state.lastM  = M;
      this._state.lastN  = N;
      armInteractor(this);
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

  /* ============================================================
   POINT LAYOUT
   Alternating exterior rows (M points) and band rows (M-1 points).
   Exterior row i: x = x0, x0+dx, x0+2*dx, ...        (M values)
   Band row:       x = x0+dx/2, x0+3*dx/2, ...         (M-1 values)

   Flat array order: all rows top to bottom, left to right within each row.
   Row start index:
     exterior row r: r*(M + M-1) ... but simpler to just track offset.
   ============================================================ */

  _seed(params) {
    const M  = params.numParabs;
    const N  = params.numRows;
    const dx = 100, dy = 100;
    const x0 = 100, y0 = 50;

    const extX  = [];
    const bandX = [];
    for (let x = x0;        extX.length  < M;     x += dx) extX.push(x);
    for (let x = x0 + dx/2; bandX.length < M - 1; x += dx) bandX.push(x);

    params.points.length = 0;
    for (let i = 0, y = y0; i < 2 * N - 1; i++, y += dy) {
      const xs = (i % 2 === 0) ? extX : bandX;
      xs.forEach(x => params.points.push({ x, y }));
    }
  },

  _buildParabs(params) {
    const M  = params.numParabs;
    const N  = params.numRows;
    const v  = params.points;

    // Compute the start index of each grid row in the flat array
    const rowStart = [];
    let offset = 0;
    for (let i = 0; i < 2 * N - 1; i++) {
      rowStart.push(offset);
      offset += (i % 2 === 0) ? M : M - 1;
    }

    // pt(gridRow, col) → point object
    const pt = (row, col) => v[rowStart[row] + col];

    const triplets = [];

    // Each adjacent pair of grid rows produces a set of parabolas
    for (let i = 0; i < 2 * N - 2; i++) {
      const extRow  = (i % 2 === 0) ? i     : i + 1;
      const bandRow = (i % 2 === 0) ? i + 1 : i;

      // Sequence: ext[0], band[0], ext[1], band[1], ..., ext[M-1]
      const seq = [];
      for (let j = 0; j < M; j++) {
        seq.push(pt(extRow, j));
        if (j < M - 1)
          seq.push(pt(bandRow, j));
      }

      // Slide window of 3
      for (let k = 0; k < seq.length - 2; k++)
        triplets.push([seq[k], seq[k + 1], seq[k + 2]]);

      // Outer envelope: one parabola per side per row-slot
      if (i % 2 === 0) {
        const nextExt = i + 2;
        triplets.push([pt(i, 0),     pt(bandRow, 0),     pt(nextExt, 0)]);
        triplets.push([pt(i, M - 1), pt(bandRow, M - 2), pt(nextExt, M - 1)]);
      }
    }

    return triplets;
  },

};

export function runPattern() {
  scriptInfo.init();
  scriptInfo.redrawHandler();
}

scriptInfo.redrawHandler = () => {
  scriptInfo.update(scriptInfo.params);
  scriptInfo.draw();
};
