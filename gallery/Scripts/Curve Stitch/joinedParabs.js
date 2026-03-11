/* ============================================================
   Joined Parabolas — M parabolas per row, N rows

   POINT LAYOUT
   Alternating exterior rows (M points) and band rows (M-1 points),
   seeded from a fixed top-left origin with constant dx/dy spacing.

   Exterior row x values: x0, x0+dx, x0+2*dx, ...        (M values)
   Band row x values:     x0+dx/2, x0+3*dx/2, ...         (M-1 values)

   All points are draggable. The flat params.points array is stored
   row by row, exterior and band rows alternating.

   PARABOLA TYPES (per row-slot, i.e. each adjacent ext/band pair)
   Type A  [ext[j],  band[j],   ext[j+1]]  — apex touches band row   (M-1 per slot)
   Type B  [band[j], ext[j+1],  band[j+1]] — apex touches ext row    (M-2 per slot)
   Outer   [ext[0],  band[0],   nextExt[0]] and right equivalent      (1 per side per full slot)
   ============================================================ */
import { Point, StringThing } from "/classes/classes.js";
import { drawManyParabs } from "/draw/drawUtilities.js";

export const scriptInfo = {
  title: "Joined Parabolas (M×N)",
  interactive: true,

  params: {
    numParabs: 3,
    numRows:   2,
    width:     100,
    height:    100,
    scale:     1,
    numSteps:  19,
    color:     "blue",
    lineWidth: 1,
    alpha:     1.0,
    background: "",
    compositeOperation: "source-over",
    points: []
  },

  controls: {
    numParabs: { widget: "range", label: "Parabolas/Row", min: 2,   max: 8,   step: 1 },
    numRows:   { widget: "range", label: "Rows",          min: 1,   max: 6,   step: 1 },
    width:     { widget: "range", label: "Width",         min: 20,  max: 300, step: 1 },
    height:    { widget: "range", label: "Height",        min: 20,  max: 300, step: 1 },
    scale:     { widget: "range", label: "Scale",         min: 0.5, max: 2,   step: 0.05 },
    numSteps:  { widget: "range", label: "Steps",         min: 7,   max: 80,  step: 1 },
    lineWidth: { widget: "range", label: "Line",          min: 0.25, max: 6,  step: 0.25 },
    color:     { widget: "color", label: "Color" },
    reset: {
      widget: "button",
      label: "Reset",
      fullRow: true,
      action() {
        /* Reset all drag state and reseed points from scratch. */
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
    seeded:     false,
    lastM:      null,
    lastN:      null,
    lastWidth:  null,
    lastHeight: null,
    lastScale:  null
  },

  /* ------------------------------------------------------------
   * init
   * Standard drawRegistry lifecycle entry point. Creates the
   * StringThing rendering object and triggers the first update.
   * ------------------------------------------------------------ */
  init() {
    this.elements = {
      thing: new StringThing({ ...this.params }),
      parabs: []
    };
    if (this.params.points.length === 0) this.update(this.params);
  },

  /* ------------------------------------------------------------
   * update
   * Called on every control change. Reseeds points when M or N
   * changes (which also re-arms the interactor), then rebuilds
   * the parabola triplet list.
   * ------------------------------------------------------------ */
  update(params) {
    const t = this.elements.thing;
    Object.assign(t, params);

    const M = params.numParabs;
    const N = params.numRows;

    const mustReseed =
      (!this._state.seeded) ||
      (M !== this._state.lastM)           ||
      (N !== this._state.lastN)           ||
      (params.width  !== this._state.lastWidth)  ||
      (params.height !== this._state.lastHeight) ||
      (params.scale  !== this._state.lastScale);

    if (mustReseed) {
      this._seed(params);
      this._state.seeded     = true;
      this._state.lastM      = M;
      this._state.lastN      = N;
      this._state.lastWidth  = params.width;
      this._state.lastHeight = params.height;
      this._state.lastScale  = params.scale;
      armInteractor(this);
    }

    this.elements.parabs = this._buildParabs(params);
  },

  /* ------------------------------------------------------------
   * draw
   * Clears the canvas and renders all parabola triplets.
   * ------------------------------------------------------------ */
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
  },

  /* ------------------------------------------------------------
   * _seed
   * Builds the flat point array from two x sequences, each grown
   * by incrementing from a fixed starting x:
   *   extX:  x0, x0+dx, x0+2*dx, ...     (M values)
   *   bandX: x0+dx/2, x0+3*dx/2, ...     (M-1 values, midpoints of extX)
   * Rows are pushed top to bottom, alternating ext and band rows,
   * each row incrementing y by dy.
   * Always mutates params.points in place (never replaces the array)
   * so the interactor's closure reference remains valid after reset.
   * ------------------------------------------------------------ */
  _seed(params) {
    const M  = params.numParabs;
    const N  = params.numRows;
    const dx = params.width  * params.scale;
    const dy = params.height * params.scale;
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

  /* ------------------------------------------------------------
   * _buildParabs
   * Constructs all parabola triplets directly by type, with no
   * intermediate sequence arrays. Two geometric shapes appear
   * in every row-slot (one adjacent exterior/band pair):
   *
   *   Type A  [ext[j],  band[j],   ext[j+1]]
   *           Apex touches the band row. M-1 per slot.
   *
   *   Type B  [band[j], ext[j+1],  band[j+1]]
   *           Apex touches the exterior row. M-2 per slot.
   *
   *   Outer   [ext[0], band[0], nextExt[0]]  (and mirror on right)
   *           Outer envelope curve bridging across a full slot.
   *           Added once per side when a nextExt row exists.
   * ------------------------------------------------------------ */
  _buildParabs(params) {
    const M = params.numParabs;
    const N = params.numRows;
    const v = params.points;

    /* Build row start offsets. Exterior rows have M points, band rows M-1. */
    const rowStart = [];
    let offset = 0;
    for (let i = 0; i < 2 * N - 1; i++) {
      rowStart.push(offset);
      offset += (i % 2 === 0) ? M : M - 1;
    }

    const pt = (row, col) => v[rowStart[row] + col];

    const triplets = [];

    for (let i = 0; i < 2 * N - 2; i++) {
      const extRow  = (i % 2 === 0) ? i     : i + 1;
      const bandRow = (i % 2 === 0) ? i + 1 : i;

      /* Type A: apex on band row, base on exterior row */
      for (let j = 0; j < M - 1; j++)
        triplets.push([pt(extRow, j), pt(bandRow, j), pt(extRow, j + 1)]);

      /* Type B: apex on exterior row, base on band row */
      for (let j = 0; j < M - 2; j++)
        triplets.push([pt(bandRow, j), pt(extRow, j + 1), pt(bandRow, j + 1)]);

      /* Outer envelope: spans full slot (ext → band → nextExt).
         Only when even i and a nextExt row exists. */
      if (i % 2 === 0 && i + 2 <= 2 * N - 2) {
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
