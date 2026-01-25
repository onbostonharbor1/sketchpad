/* drawRegistry/radiate.js
   ------------------------------------------------------------
   New lifecycle form (init, update, draw)
   Base line midpoint work is done first; endpoints updated only if needed.

   Rewrite notes:
   - Keep params JSON-safe at all times: start/end/midpoint/radialPt are plain {x,y}.
   - Geometry for the base segment lives in this.elements.line (Line/Point objects).
   - Radiate object lives in this.elements.thing and is what drawRadiate() consumes.
   - No duplicate param mirroring (params === this.params).
   ------------------------------------------------------------ */

import { Line, Point } from "../classes/classes.js";
import { Radiate }     from "../classes/radiate.js";
import { drawALine }   from "../draw/drawUtilities.js";
import { drawRadiate } from "../draw/drawUnicorns.js";

window.drawRegistry_radiate = {
  name:        "Radiate",
  id:          "radiate",
  version:     0.2,
  category:    "fundamental",
  firstOrder:  true,
  source:      "internal",
  tags:        ["Geometry", "Primitive"],
  description: "Draws many lines from start to end of another line",
  status:      "",
  hover:       "",

  background: null,
  overlays:   [],
  transforms: [],
  elements:   null,

  // --- Core defaults for drawing (JSON-safe) ---
  params: {
    radialPt:  { x: 300, y: 20 },
    start:     { x: 20,  y: 150 },
    end:       { x: 500, y: 450 },
    midpoint:  { x: 260, y: 300 },   // will be resynced in init()
    numSteps:  20,
    color:     "#0044cc",
    lineWidth: 1
  },

  // --- UI metadata (controls) ---
  controls: {
    numSteps:  { widget: "range", min: 12, max: 40, step: 1, label: "# steps:" },
    color:     { widget: "colorPicker", label: "Color:" },
    lineWidth: { widget: "range", min: 0.5, max: 3, step: 0.5, label: "Width:" },
    radialPt:  { widget: "pointPicker", label: "Radial pt:" },
    start:     { widget: "pointPicker", label: "Start pt:" },
    end:       { widget: "pointPicker", label: "End pt:" },
    midpoint:  { widget: "pointPicker", label: "Midpoint:" }
  },

  // ==========================================================
  // 1. init() – create persistent elements
  // ==========================================================
  init() {
    const p = this.params;

    // Persistent geometry for the base segment
    const line = new Line(
      new Point(p.start.x, p.start.y),
      new Point(p.end.x,   p.end.y)
    );

    // Sync midpoint from definitive geometry
    const mid = line.midpoint();
    p.midpoint = { x: mid.x, y: mid.y };

    // Persistent Radiate object (draw-side)
    const thing = new Radiate({
      radialPt:  { x: p.radialPt.x,  y: p.radialPt.y },
      start:     { x: p.start.x,     y: p.start.y },
      end:       { x: p.end.x,       y: p.end.y },
      numSteps:  p.numSteps,
      color:     p.color,
      lineWidth: p.lineWidth
    });

    this.elements = { line, thing };
  }, // end init

  // ==========================================================
  // 2. update(params) – apply new values from controls
  // ==========================================================
  update(params) {
    const p = this.params;
    const line = this.elements.line;
    const thing = this.elements.thing;

    // --- Base line updates (midpoint first; else endpoints) ---
    const incomingMid = new Point(p.midpoint.x, p.midpoint.y);
    const prevMid = line.midpoint();

    if (!incomingMid.isSame(prevMid)) {
      line.moveMidpointTo(incomingMid);
    } else {
      line.setStart(new Point(p.start.x, p.start.y));
      line.setEnd(new Point(p.end.x, p.end.y));
    }

    // --- Resync base geometry back into params (JSON-safe) ---
    const start = line.startPt();
    const end = line.endPt();
    const mid = line.midpoint();

    p.start = { x: start.x, y: start.y };
    p.end = { x: end.x, y: end.y };
    p.midpoint = { x: mid.x, y: mid.y };

    // --- Push current params into Radiate thing (JSON-safe) ---
    thing.color = p.color;
    thing.lineWidth = Number(p.lineWidth);
    p.lineWidth = thing.lineWidth;

    thing.numSteps = Number(p.numSteps);
    p.numSteps = thing.numSteps;

    thing.radialPt = { x: p.radialPt.x, y: p.radialPt.y };
    thing.start    = { x: p.start.x,    y: p.start.y };
    thing.end      = { x: p.end.x,      y: p.end.y };

    // Keep params in sync with what thing actually holds (deterministic)
    p.color = thing.color;
    p.radialPt = { x: thing.radialPt.x, y: thing.radialPt.y };
    p.start    = { x: thing.start.x,    y: thing.start.y };
    p.end      = { x: thing.end.x,      y: thing.end.y };
  }, // end update

  // ==========================================================
  // 3. draw() – render the current geometry
  // ==========================================================
  draw() {
    const line = this.elements.line;
    const thing = this.elements.thing;

    drawALine(thing.color, thing.lineWidth, line);
    drawRadiate(thing);
  } // end draw
};
