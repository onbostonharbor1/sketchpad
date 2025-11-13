/* drawRegistry/2lines.js
   ------------------------------------------------------------
   Two independent lines with a shared style.
   Follows deterministic lifecycle: init, update, draw.
   ------------------------------------------------------------ */

window.drawRegistry_2lines = {
  name:        "Two Lines",
  id:          "drawTwoLines",
  version:     0.2,
  category:    "fundamental",
  firstOrder:  true,
  source:      "internal",
  tags:        ["Geometry", "Primitive"],
  description: "Draws two independent lines sharing a common style.",

  background: null,
  overlays:   [],
  transforms: [],
  elements:   null,

  // --- Core defaults (JSON-safe) ---
params: {
  line1_pt1: { x: 200, y: 200 },
  line1_pt2: { x: 400, y: 400 },
  line1_midpoint: null,
  line2_pt1: { x: 200, y: 300 },
  line2_pt2: { x: 400, y: 500 },
  line2_midpoint: null,
  color: "#0044cc",
  lineWidth: 2
},

// --- UI metadata (controls) ---
controls: {
  line1_pt1:  { widget: "pointPicker", label: "Line 1 Start:" },
  line1_pt2:  { widget: "pointPicker", label: "Line 1 End:" },
  line1_midpoint: { widget: "pointPicker", label: "Line 1 Midpoint:" },
  line2_pt1:  { widget: "pointPicker", label: "Line 2 Start:" },
  line2_pt2:  { widget: "pointPicker", label: "Line 2 End:" },
  line2_midpoint: { widget: "pointPicker", label: "Line 2 Midpoint:" },
  color:      { widget: "colorPicker", label: "Color:" },
  lineWidth:  { widget: "range", min: 0.5, max: 4, step: 0.5, label: "Width:" }
},

// ==========================================================
// 1. init() – create both lines and shared style
// ==========================================================
init() {
  const p = this.params;

  const l1 = new Line(new Point(p.line1_pt1.x, p.line1_pt1.y),
                      new Point(p.line1_pt2.x, p.line1_pt2.y));
  const m1 = l1.midpoint();
  p.line1_midpoint = new Point(m1.x, m1.y);

  const l2 = new Line(new Point(p.line2_pt1.x, p.line2_pt1.y),
                      new Point(p.line2_pt2.x, p.line2_pt2.y));
  const m2 = l2.midpoint();
  p.line2_midpoint = new Point(m2.x, m2.y);

  const thing = new StringThing({ color: p.color, lineWidth: p.lineWidth });
  this.elements = { l1, l2, thing };
}, // end init

  // ==========================================================
  // 2. update(params) – sync geometry and style
  // ==========================================================
update(params) {
  const p = this.params;
  const { l1, l2, thing } = this.elements;

  // ---- Line 1 ----
  const incomingMid1 = new Point(params.line1_midpoint.x, params.line1_midpoint.y);
  const prevMid1 = l1.midpoint();

  if (!incomingMid1.isSame(prevMid1)) {
    // Midpoint moved → reposition line
    l1.moveMidpointTo(incomingMid1);
  } else {
    // Endpoints changed → update from params
    l1.setStart(new Point(params.line1_pt1.x, params.line1_pt1.y));
    l1.setEnd(new Point(params.line1_pt2.x, params.line1_pt2.y));
  }

  // Always resync params from live geometry
  p.line1_pt1 = l1.startPt();
  p.line1_pt2 = l1.endPt();
  p.line1_midpoint = l1.midpoint();


  // ---- Line 2 ----
  const incomingMid2 = new Point(params.line2_midpoint.x, params.line2_midpoint.y);
  const prevMid2 = l2.midpoint();

  if (!incomingMid2.isSame(prevMid2)) {
    l2.moveMidpointTo(incomingMid2);
  } else {
    l2.setStart(new Point(params.line2_pt1.x, params.line2_pt1.y));
    l2.setEnd(new Point(params.line2_pt2.x, params.line2_pt2.y));
  }

  p.line2_pt1 = l2.startPt();
  p.line2_pt2 = l2.endPt();
  p.line2_midpoint = l2.midpoint();


  // ---- Shared style updates ----
  thing.color = params.color;
  thing.lineWidth = Number(params.lineWidth);
  p.color = thing.color;
  p.lineWidth = thing.lineWidth;

  // ---- Mirror geometry back into shared params (for UI sync) ----
  params.line1_pt1 = l1.startPt();
  params.line1_pt2 = l1.endPt();
  params.line1_midpoint = l1.midpoint();

  params.line2_pt1 = l2.startPt();
  params.line2_pt2 = l2.endPt();
  params.line2_midpoint = l2.midpoint();

  console.log("✅ update done (dual line, midpoint and endpoints synced)", this);
}, // end update



  // ==========================================================
  // 3. draw() – render both lines
  // ==========================================================
  draw() {
    const { l1, l2, thing } = this.elements;
      drawALine(thing.color, thing.lineWidth, l1);
      drawALine(thing.color, thing.lineWidth, l2);
  } // end draw
};
