/* ============================================================
   Spiralize Voronoi — Gallery Script (Interactive)

   GOAL
   ----
   - Build a Voronoi diagram from random points.
   - For each Voronoi cell polygon, draw nested “spiralized”
     polygons (rotate + shrink around centroid).

   Lifecycle shape (drawRegistry-style):
     params / controls / elements / init / update / draw

   ParameterControls compatibility:
     parameters alias
     redrawHandler
     button control uses def.action as an in-memory function

   FAIL-FAST assumptions:
     - window.ctx exists
     - buildParameterControls exists
     - d3-delaunay is available as an ES module import
     - Gallery scripts panel id = "tab-scripts"
   ============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";
import { Delaunay } from "https://cdn.jsdelivr.net/npm/d3-delaunay@6/+esm";


/* ============================================================
   scriptInfo  (drawRegistry-shaped top object)
============================================================ */

export const scriptInfo = {

  // --- identity / metadata (drawRegistry-like) ---
  name:        "Spiralize Voronoi",
  id:          "spiralizeVoronoi",
  version:     0.1,
  category:    "Voronoi",
  source:      "gallery",
  tags:        ["voronoi", "spiralize", "polygons", "delaunay"],
  description: "Voronoi cells spiralized by repeated rotate+shrink around centroid.",

  // --- visual styling placeholders (drawRegistry-like) ---
  background: null,
  overlays:   [],
  transforms: [],

  // --------------------------------------------------------
  // controls (as provided)
  // --------------------------------------------------------
  controls: {

    numSites: {
      label: "Sites (points)",
      widget: "range",
      min: 5,
      max: 200,
      step: 1,
      default: 50
    }, // end numSites

    seed: {
      label: "Seed",
      widget: "range",
      min: 1,
      max: 9999,
      step: 1,
      default: 1
    }, // end seed

    regenerate: {
      label: "Regenerate",
      widget: "button",
      action(info) {
        info.elements.element.seed += 1;
        info.params.seed = info.elements.element.seed;
        rebuildVoronoi(info);
        info.draw();
      } // end action
    }, // end regenerate

    depth: {
      label: "Depth",
      widget: "range",
      min: 0,
      max: 120,
      step: 1,
      default: 40
    }, // end depth

    r: {
      label: "Rotate start (deg)",
      widget: "range",
      min: -30,
      max: 30,
      step: 0.5,
      default: 5
    }, // end r

    s: {
      label: "Rotate step (deg)",
      widget: "range",
      min: -5,
      max: 5,
      step: 0.1,
      default: 1
    }, // end s

    f: {
      label: "Scale factor",
      widget: "range",
      min: 0.70,
      max: 0.99,
      step: 0.005,
      default: 0.85
    }, // end f

    t: {
      label: "Stroke width",
      widget: "range",
      min: 0.1,
      max: 3,
      step: 0.1,
      default: 0.3
    }, // end t

    stroke: {
      label: "Stroke",
      widget: "colorPicker",
      default: "#000000"
    }, // end stroke

    alpha: {
      label: "Alpha",
      widget: "range",
      min: 0.05,
      max: 1,
      step: 0.05,
      default: 0.9
    }, // end alpha

    showCellOutlines: {
      label: "Show cell outlines",
      widget: "checkbox",
      default: false
    }, // end showCellOutlines

    outlineStroke: {
      label: "Outline stroke",
      widget: "colorPicker",
      default: "#999999"
    }, // end outlineStroke

    outlineWidth: {
      label: "Outline width",
      widget: "range",
      min: 0.1,
      max: 2,
      step: 0.1,
      default: 0.5
    } // end outlineWidth

  }, // end controls


  // --------------------------------------------------------
  // params (authoritative live object)
  // --------------------------------------------------------
  params: {
    numSites: 50,
    seed: 1,
    depth: 40,
    r: 5,
    s: 1,
    f: 0.85,
    t: 0.3,
    stroke: "#000000",
    alpha: 0.9,
    showCellOutlines: false,
    outlineStroke: "#999999",
    outlineWidth: 0.5
  }, // end params


  // --------------------------------------------------------
  // persistent runtime state (drawRegistry-like)
  // --------------------------------------------------------
  elements: null,


  // --------------------------------------------------------
  // lifecycle wrappers (thin; defer to workers)
  // --------------------------------------------------------
  init() {
    doInit(this);
  }, // end init

  update(params) {
    doUpdate(this, params);
  }, // end update

  draw() {
    doDraw(this);
  }, // end draw


  // --------------------------------------------------------
  // parameterControls compatibility
  // --------------------------------------------------------
  parameters: null,

  redrawHandler() {
    this.update(this.params);
    this.draw();
  } // end redrawHandler

}; // end scriptInfo


/* ============================================================
   runPattern()
============================================================ */
export function runPattern() {

  cons

  scriptInfo.parameters = scriptInfo.params;

  // Store ctx in elements so helpers never rely on globals.
  // (This keeps the converted scripts consistent and deterministic.)
  scriptInfo._ctx = ctx2;

  scriptInfo.init();

  buildParameterControls(
    scriptInfo,
    "tab-scripts",
    true
  );

  scriptInfo.redrawHandler();

} // end runPattern


/* ============================================================
   Worker: doInit(info)
============================================================ */
function doInit(info) {

  if (!info) throw new Error("doInit: info missing");
  if (!info.params) throw new Error("doInit: info.params missing");
  if (!info._ctx) throw new Error("doInit: info._ctx missing (runPattern did not provide ctx)");

  const p = info.params;

  info.elements = {
    ctx: info._ctx,
    element: {

      // generation
      numSites: p.numSites,
      seed:     p.seed,
      pts:      [],
      vor:      null,
      bounds:   [0, 0, info._ctx.canvas.width, info._ctx.canvas.height],

      // spiralize params
      depth:  p.depth,
      r:      p.r,
      f:      p.f,
      s:      p.s,
      t:      p.t,
      stroke: p.stroke,
      alpha:  p.alpha,

      // view
      showCellOutlines: p.showCellOutlines,
      outlineStroke:    p.outlineStroke,
      outlineWidth:     p.outlineWidth
    }
  };

  rebuildVoronoi(info);

} // end doInit


/* ============================================================
   Worker: doUpdate(info, params)
============================================================ */
function doUpdate(info, params) {

  if (!info) throw new Error("doUpdate: info missing");
  if (!info.elements) throw new Error("doUpdate: info.elements missing");
  if (!info.elements.element) throw new Error("doUpdate: info.elements.element missing");
  if (!params) throw new Error("doUpdate: params missing");

  const e = info.elements.element;

  const prevNumSites = e.numSites;
  const prevSeed     = e.seed;

  e.numSites = parseInt(params.numSites, 10);
  e.seed     = parseInt(params.seed, 10);

  e.depth = parseInt(params.depth, 10);
  e.r     = parseFloat(params.r);
  e.f     = parseFloat(params.f);
  e.s     = parseFloat(params.s);
  e.t     = parseFloat(params.t);

  e.stroke = params.stroke;
  e.alpha  = parseFloat(params.alpha);

  e.showCellOutlines = !!params.showCellOutlines;
  e.outlineStroke    = params.outlineStroke;
  e.outlineWidth     = parseFloat(params.outlineWidth);

  if (e.numSites < 2) e.numSites = 2;
  if (e.depth < 0) e.depth = 0;

  // Rebuild only when generation controls change.
  if (e.numSites !== prevNumSites || e.seed !== prevSeed) {
    rebuildVoronoi(info);
  }

} // end doUpdate


/* ============================================================
   Worker: doDraw(info)
============================================================ */
function doDraw(info) {

  if (!info) throw new Error("doDraw: info missing");
  if (!info.elements) throw new Error("doDraw: info.elements missing");
  if (!info.elements.ctx) throw new Error("doDraw: info.elements.ctx missing");
  if (!info.elements.element) throw new Error("doDraw: info.elements.element missing");

  const ctx = info.elements.ctx;
  const e   = info.elements.element;

  clearCanvasFull(ctx);

  // background
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();

  if (!e.vor) {
    throw new Error("doDraw: voronoi missing (did init run?)");
  }

  // Spiralize each cell polygon
  for (let i = 0; i < e.pts.length; i++) {
    const cell = e.vor.cellPolygon(i);
    if (!cell) continue;
    spiralizePolygon(ctx, cell, e);
  }

  // Optional outlines (on top)
  if (e.showCellOutlines) {

    ctx.save();
    ctx.lineWidth = e.outlineWidth;
    ctx.strokeStyle = e.outlineStroke;
    ctx.globalAlpha = 1;

    for (let i = 0; i < e.pts.length; i++) {

      const cell = e.vor.cellPolygon(i);
      if (!cell) continue;

      ctx.beginPath();
      drawPolygon(ctx, cell);
      ctx.stroke();
    }

    ctx.restore();
  }

} // end doDraw


/* ============================================================
   Core helpers (adapted to accept ctx + info)
============================================================ */

/* ------------------------------------------------------------
   clearCanvasFull(ctx)
------------------------------------------------------------ */
function clearCanvasFull(ctx) {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.restore();

} // end clearCanvasFull


/* ------------------------------------------------------------
   drawPolygon(ctx, poly)
   poly: array of [x,y]
------------------------------------------------------------ */
function drawPolygon(ctx, poly) {

  if (!poly || poly.length < 3) return;

  ctx.moveTo(poly[0][0], poly[0][1]);

  for (let i = 1; i < poly.length; i++) {
    ctx.lineTo(poly[i][0], poly[i][1]);
  }

  ctx.closePath();

} // end drawPolygon


/* ------------------------------------------------------------
   centroidOfVertices(poly)
   Note: this is vertex-average, not true area centroid.
------------------------------------------------------------ */
function centroidOfVertices(poly) {

  let cx = 0;
  let cy = 0;

  for (let i = 0; i < poly.length; i++) {
    cx += poly[i][0];
    cy += poly[i][1];
  }

  cx /= poly.length;
  cy /= poly.length;

  return [cx, cy];

} // end centroidOfVertices


/* ------------------------------------------------------------
   spiralizePolygon(ctx, poly, thing)
------------------------------------------------------------ */
function spiralizePolygon(ctx, poly, thing) {

  const depth = thing.depth;
  const r     = thing.r;
  const f     = thing.f;
  const s     = thing.s;
  const t     = thing.t;

  const c = centroidOfVertices(poly);
  const cx = c[0];
  const cy = c[1];

  ctx.save();
  ctx.lineWidth = t;
  ctx.strokeStyle = thing.stroke;
  ctx.globalAlpha = thing.alpha;

  let rr = r;
  let p = poly.map((pt) => [pt[0], pt[1]]);

  ctx.beginPath();
  drawPolygon(ctx, p);

  for (let i = 0; i < depth; i++) {

    const angle = (rr + s) * Math.PI / 180;
    rr += s;

    // rotate around centroid
    p = p.map(([x, y]) => {

      const dx = x - cx;
      const dy = y - cy;

      const rx = cx + dx * Math.cos(angle) - dy * Math.sin(angle);
      const ry = cy + dx * Math.sin(angle) + dy * Math.cos(angle);

      return [rx, ry];

    });

    // scale about centroid
    p = p.map(([x, y]) => {
      return [
        cx + f * (x - cx),
        cy + f * (y - cy)
      ];
    });

    drawPolygon(ctx, p);
  }

  ctx.stroke();
  ctx.restore();

} // end spiralizePolygon


/* ------------------------------------------------------------
   rebuildVoronoi(info)
   Rebuild points + Voronoi from current element settings.
------------------------------------------------------------ */
function rebuildVoronoi(info) {

  if (!info) throw new Error("rebuildVoronoi: info missing");
  if (!info.elements) throw new Error("rebuildVoronoi: info.elements missing");
  if (!info.elements.ctx) throw new Error("rebuildVoronoi: info.elements.ctx missing");
  if (!info.elements.element) throw new Error("rebuildVoronoi: info.elements.element missing");

  const ctx = info.elements.ctx;
  const e   = info.elements.element;

  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  e.bounds = [0, 0, W, H];

  // Deterministic-ish seed stepping (not a full PRNG; good enough)
  // If you want true determinism later, we can drop in a tiny PRNG.
  const seed = e.seed;
  let x = (seed * 9301 + 49297) % 233280;

  function rand01() {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  } // end rand01

  e.pts = [];

  for (let i = 0; i < e.numSites; i++) {
    e.pts.push([rand01() * W, rand01() * H]);
  }

  const delaunay = Delaunay.from(e.pts);
  e.vor = delaunay.voronoi(e.bounds);

} // end rebuildVoronoi
