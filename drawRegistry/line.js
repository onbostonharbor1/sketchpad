/* drawRegistry/line.js
   ------------------------------------------------------------
   New lifecycle form (init, update, draw)
   Midpoint work is done first; endpoints updated only if needed.
   ------------------------------------------------------------ */

window.drawRegistry_line = {
  name:        "Line",
  id:          "drawLine",
  version:     2.5,
  category:    "fundamental",
  firstOrder:  true,
  source:      "internal",
  tags:        ["Geometry", "Primitive"],
  description: "Draws a line with draggable endpoints and midpoint.",

  background: null,
  overlays:   [],
  transforms: [],
  elements:   null,

  // --- Core defaults for drawing (JSON-safe) ---
  params: {
    pt1:       { x: 200, y: 200 },
    pt2:       { x: 400, y: 400 },
    midpoint:  { x: 300, y: 300 },
    color:     "#0044cc",
    lineWidth: 2
  },

  // --- UI metadata (controls) ---
  controls: {
    pt1:       { widget: "pointPicker", label: "Start Point:" },
    pt2:       { widget: "pointPicker", label: "End Point:" },
    midpoint:  { widget: "pointPicker", label: "Midpoint:" },
    color:     { widget: "colorPicker", label: "Color:" },
    lineWidth: { widget: "range", min: 0.5, max: 4, step: 0.5, label: "Width:" }
  },

  // ==========================================================
  // 1. init() – create persistent elements
  // ==========================================================

  init() {
    const p = this.params;
    const line = new Line(new Point(p.pt1.x, p.pt1.y),
                          new Point(p.pt2.x, p.pt2.y));
    const mid = line.midpoint();
    this.params.midpoint = { x: mid.x, y: mid.y };

    const thing = new StringThing({ color: p.color, lineWidth: p.lineWidth });
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
    line.setStart(new Point(params.pt1.x, params.pt1.y));
    line.setEnd(new Point(params.pt2.x, params.pt2.y));
  }

  // Resync registry params from definitive geometry
  const mid = line.midpoint();
  p.pt1 = line.startPt();
  p.pt2 = line.endPt();
  p.midpoint = new Point(mid.x, mid.y);

  // Style
  thing.color = params.color;
  thing.lineWidth = Number(params.lineWidth);
  p.color = thing.color;
  p.lineWidth = thing.lineWidth;

  // Mirror back into shared params for UI
  params.pt1 = line.startPt();
  params.pt2 = line.endPt();
  params.midpoint = new Point(mid.x, mid.y);

  console.log("✅ update done (single line, midpoint-driven)", this);
}, // end update

  // ==========================================================
  // 3. draw() – render the current geometry
  // ==========================================================
  draw() {
    const { line, thing } = this.elements;
      drawALine(thing.color, thing.lineWidth, line);
  } // end draw
};
