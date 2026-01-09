/* drawRegistry/inEllipse.js
   ------------------------------------------------------------
   Draw Registry Entry: In Ellipse
   Uses Ellipse class and drawInEllipse() renderer.
   Lifecycle: init → update → draw
   ------------------------------------------------------------ */
import { Ellipse, START_END, FULL, TAPER, START_TAPER, END_TAPER }
                                  from "../classes/ellipseClass.js";
import { Point }                  from "../classes/classes.js";
import { drawInEllipse }          from "../draw/drawEllipse.js";


window.drawRegistry_inEllipse = {
  name: "In Ellipse",
  id: "inEllipse",
  version: 0.4,
  category: "circles",
  firstOrder: true,
  source: "internal",
  tags: ["Ellipse", "Curve Stitch"],
  description:
    "Draws chord patterns inside an ellipse using skip, taper, and withinCirc modes.",
  status:      "",
  hover:       "",

  background: null,
  overlays: [],
  transforms: [],
  elements: null,

  // ==========================================================
  // Default parameters (JSON-safe)
  // ==========================================================
  params: {
    midpoint: { x: 300, y: 150 },
    color: "blue",
    lineWidth: 1,
    ellipse: { a: 500, b: 250 },
    numNodes: 120,
    chordLength: 20,
    startSkip: 0,
    endSkip: 0,
    withinCirc: TAPER,
    rotate: 0,
  },

  // ==========================================================
  // UI Controls metadata
  // ==========================================================
  controls: {
    midpoint: { widget: "pointPicker", label: "Center:" },
    ellipse_a: {
      widget: "range",
      min: 50,
      max: 600,
      step: 10,
      label: "Width:",
    },
    ellipse_b: {
      widget: "range",
      min: 50,
      max: 600,
      step: 10,
      label: "Height:",
    },
    chordLength: {
      widget: "range",
      min: 10,
      max: 80,
      step: 1,
      label: "Chord Length:",
    },
    numNodes: {
      widget: "range",
      min: 50,
      max: 400,
      step: 5,
      label: "# Nodes:",
    },
    startSkip: {
      widget: "range",
      min: -50,
      max: 50,
      step: 1,
      label: "Start Skip:",
    },
    endSkip: {
      widget: "range",
      min: -50,
      max: 50,
      step: 1,
      label: "End Skip:",
    },
    withinCirc: {
      widget: "select",
      options: [
        { value: START_END, label: "Start–End" },
        { value: FULL, label: "Full" },
        { value: TAPER, label: "Taper (Both)" },
        { value: START_TAPER, label: "Start Taper" },
        { value: END_TAPER, label: "End Taper" },
      ],
      label: "Mode:",
    },
    rotate: { widget: "range", min: 0, max: 360, step: 5, label: "Rotation:" },
    color: { widget: "colorPicker", label: "Color:" },
    lineWidth: {
      widget: "range",
      min: 1,
      max: 5,
      step: 1,
      label: "Line Width:",
    },
  },

  // ==========================================================
  // 1. init() – create persistent Ellipse object
  // ==========================================================
  init() {
    const p = this.params;
    if (!(p.midpoint instanceof Point))
      p.midpoint = new Point(p.midpoint.x, p.midpoint.y);
    this.elements = { ellipse: new Ellipse(p) };
  }, // end init

  // ==========================================================
  // 2. update(params) – apply new values from UI
  // ==========================================================
  update(params) {
    const e = this.elements.ellipse;
    for (const key in params) {
      const val = params[key];
      if (val === undefined) continue;

      if (key === "midpoint") {
        e.midpoint = val instanceof Point ? val : new Point(val.x, val.y);
      } else if (key === "ellipse_a") {
        e.ellipse.a = val;
      } else if (key === "ellipse_b") {
        e.ellipse.b = val;
      } else if (key in e) {
        e[key] = val;
      }
    }
  }, // end update

  // ==========================================================
  // 3. draw() – render current Ellipse
  // ==========================================================
  draw() {
    const e = this.elements.ellipse;
    drawInEllipse(e);
  }, // end draw
}; // end drawRegistry_inEllipse
