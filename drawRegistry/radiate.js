/* drawRegistry/radiate.js
 */
import { Line, Point }      from "../classes/classes.js";
import { Radiate }          from "../classes/radiate.js";
import { drawALine }        from "../draw/draw_utilities.js";
import { drawRadiate }      from "../draw/unicorns.js";

window.drawRegistry_radiate = {
  name:        "Radiate",
  id:          "drawRaditae",
  version:     .1,
  category:    "fundamental",
  firstOrder:  true,
  source:      "internal",
  tags:        ["Geometry", "Primitive"],
  description: "Draws many lines from start to end of another line",
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
    midpoint:  { widget: "pointPicker", label: "Midpoint:" },
  },

  // ==========================================================
  // 1. init() – create persistent elements
  // ==========================================================

  init() {
    const p = this.params;
    const line = new Line(new Point(p.start.x, p.start.y),
                          new Point(p.end.x,   p.end.y));
    const mid = line.midpoint();
    this.params.midpoint = { x: mid.x, y: mid.y };
    const s = {radialPt:  p.radialPt,
               start:     p.start,
               end:       p.end,
               numSteps:  p.numSteps,
               color:     p.color,
               lineWidth: p.lineWidth
    };
    const thing = new Radiate(s);
    this.elements = { line, thing };
  }, // end init

  // ==========================================================
  // 2. update(params) – apply new values from controls
  // ==========================================================
update(params) {
  const p = this.params;
  const { line, thing } = this.elements;

  // Compare against live geometry, not p/params (which are the same object)
  const incomingMid = new Point(params.midpoint.x, params.midpoint.y);
  const prevMid = line.midpoint();

  if (!incomingMid.isSame(prevMid)) {
    // Midpoint moved → reposition line (updates endpoints internally)
    line.moveMidpointTo(incomingMid);
  } else {
    // Otherwise endpoints may have changed
    line.setStart(new Point(params.start.x, params.start.y));
    line.setEnd(new   Point(params.end.x,   params.end.y));
  }

  // Resync registry params from definitive geometry
  const mid  = line.midpoint();
  p.start    = line.startPt();
  p.end      = line.endPt();
  p.midpoint = new Point(mid.x, mid.y);

  // Style
  thing.color = params.color;
  thing.lineWidth = Number(params.lineWidth);
  thing.radialPt  = params.radialPt;
  thing.start     = params.start;
  thing.end       = params.end;
  thing.numSteps  = params.numSteps;

  p.color = thing.color;
  p.lineWidth = thing.lineWidth;
  p.radialPt  = thing.radialPt;
  p.start     = thing.start;

  // Mirror back into shared params for UI
  params.start    = line.startPt();
  params.end      = line.endPt();
  params.midpoint = new Point(mid.x, mid.y);
}, // end update

  // ==========================================================
  // 3. draw() – render the current geometry
  // ==========================================================
  draw() {
    const { line, thing } = this.elements;
    drawALine(thing.color, thing.lineWidth, line);
    drawRadiate(thing);
  } // end draw
};
