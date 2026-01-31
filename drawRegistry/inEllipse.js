/* drawRegistry/inEllipse.js */
import { Ellipse, START_END, FULL, TAPER, START_TAPER, END_TAPER }
                                  from "../classes/ellipseClass.js";
import { Point }                  from "../classes/classes.js";
import { drawInEllipse }          from "../draw/drawEllipse.js";

window.drawRegistry_inEllipse = {
  name: "Chords in Ellipse",
  id: "inEllipse",
  version: 1.6,
  category: "circles",
  firstOrder: true,
  source: "internal",
  tags: ["Ellipse", "Curve Stitch"],
  description: "Draws chord patterns with adjustable center tapering.",
  status:       "",
  hover:        "",

  background: null,
  overlays: [],
  transforms: [],
  elements: null,

  interactive: true,
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
    taperCenter: 0.5, // 0.5 is default center
    rotate: 0,
    points: []
  },

  controls: {
    withinCirc: {
      widget: "select",
      options: [
        { value: START_END,   label: "Start–End" },
        { value: FULL,        label: "Full" },
        { value: TAPER,       label: "Taper (Both)" },
        { value: START_TAPER, label: "Start Taper" },
        { value: END_TAPER,   label: "End Taper" },
      ],
      label: "Mode:",
    },
    taperCenter: {
      widget: "range",
      min: 0.1,
      max: 0.9,
      step: 0.05,
      label: "Taper Bias:",
    },
    ellipse_a: { widget: "range", min: 50, max: 600, step: 10, label: "Width:" },
    ellipse_b: { widget: "range", min: 50, max: 600, step: 10, label: "Height:" },
    chordLength: { widget: "range", min: 10, max: 50, step: 1, label: "Chord len:" },
    numNodes: { widget: "range", min: 50, max: 400, step: 5, label: "# Nodes:" },
    rotate: { widget: "range", min: 0, max: 360, step: 5, label: "Rotation:" },
    color: { widget: "colorPicker", label: "Color:" },
    lineWidth: { widget: "range", min: 1, max: 5, step: 1, label: "Line wid.:" },
  },

  init() {
    if (this.params.points.length === 0) {
        this.params.points.push({ x: this.params.midpoint.x, y: this.params.midpoint.y });
    }

    const p = this.params.points[0];
    this.elements = {
        ellipse: new Ellipse({
            ...this.params,
            midpoint: new Point(p.x, p.y)
        })
    };
  },

  update(incoming) {
    const e = this.elements.ellipse;
    for (const key in incoming) {
      const val = incoming[key];
      if (val === undefined) continue;

      if (key === "points") {
        const p = this.params.points[0];
        e.midpoint.x = p.x;
        e.midpoint.y = p.y;
      } else if (key === "ellipse_a") {
        e.ellipse.a = val;
      } else if (key === "ellipse_b") {
        e.ellipse.b = val;
      } else if (Object.hasOwn(e, key)) {
        e[key] = val;
      }
    }
  },

  draw() {
    const e = this.elements.ellipse;
    drawInEllipse(e);
  },
};
