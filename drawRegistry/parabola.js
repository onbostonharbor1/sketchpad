/* drawRegistry/parabola.js */
import { Line, Point, StringThing } from "../classes/classes.js";
import { drawAParab }               from "../draw/drawRegular.js";

window.drawRegistry_parabola = {
  name:         "Parabola",
  id:           "parabola",
  version:      2.0,
  category:     "fundamental",
  firstOrder:   true,
  source:       "internal",
  tags:         ["Geometry", "Curve Stitch"],
  description:  "Stitched parabola with stable scaffold handles and dynamic trimming.",
  status:       "",

  background: null,
  overlays:   [],
  transforms: [],
  elements:   null,

  interactive: true,
  params: {
    line1_pt1: { x: 50,  y: 50  },
    line1_pt2: { x: 50,  y: 350 },
    line2_pt1: { x: 50,  y: 350 },
    line2_pt2: { x: 350, y: 350 },
    truncate:  2,
    shorten:   3,
    color:     "#008800",
    lineWidth: 2,
    points:    [] // The interaction layer monitors this array
  },

  controls: {
    truncate:  { widget: "range", min: 0,   max: 20, step: 1,   label: "Trim Bottom:" },
    shorten:   { widget: "range", min: 0,   max: 20, step: 1,   label: "Shorten Top:" },
    color:     { widget: "colorPicker", label: "Color:" },
    lineWidth: { widget: "range", min: 0.5, max: 4,  step: 0.5, label: "Width:" }
  },

  /**
   * Initializes the registry, establishing the stable master geometry
   * and populating the interactor array.
   */
  init() {
    const p = this.params;

    // 1. LIFECYCLE SYNC: Clear the array to drop old handles
    p.points.length = 0;

    // 2. Setup definitive master geometry
    const l1 = new Line(new Point(p.line1_pt1.x, p.line1_pt1.y), new Point(p.line1_pt2.x, p.line1_pt2.y));
    const l2 = new Line(new Point(p.line2_pt1.x, p.line2_pt1.y), new Point(p.line2_pt2.x, p.line2_pt2.y));

    // Pass initial truncate/shorten to the StringThing
    const thing = new StringThing({
      color: p.color,
      lineWidth: p.lineWidth,
      truncate: p.truncate,
      shorten: p.shorten
    });

    // 3. Populate handles for the canvas overlay
    const m1 = l1.midpoint();
    p.points.push({ x: p.line1_pt1.x, y: p.line1_pt1.y });
    p.points.push({ x: p.line1_pt2.x, y: p.line1_pt2.y });
    p.points.push({ x: m1.x, y: m1.y });

    const m2 = l2.midpoint();
    p.points.push({ x: p.line2_pt1.x, y: p.line2_pt1.y });
    p.points.push({ x: p.line2_pt2.x, y: p.line2_pt2.y });
    p.points.push({ x: m2.x, y: m2.y });

    this.elements = { l1, l2, thing };
  },

  /**
   * Processes changes from the interaction layer and UI controls,
   * updating the master geometry and styles without breaking references.
   */
  update(incoming) {
    const p = this.params;
    const { l1, l2, thing } = this.elements;

    // Handle interactive drags from the canvas overlay
    if (incoming.points) {
      // Line 1 Update (Midpoint-First)
      const incomingMid1 = new Point(p.points[2].x, p.points[2].y);
      if (!incomingMid1.isSame(l1.midpoint())) {
        l1.moveMidpointTo(incomingMid1);
      } else {
        l1.setStart(new Point(p.points[0].x, p.points[0].y));
        l1.setEnd(new Point(p.points[1].x, p.points[1].y));
      }

      // Line 2 Update (Midpoint-First)
      const incomingMid2 = new Point(p.points[5].x, p.points[5].y);
      if (!incomingMid2.isSame(l2.midpoint())) {
        l2.moveMidpointTo(incomingMid2);
      } else {
        l2.setStart(new Point(p.points[3].x, p.points[3].y));
        l2.setEnd(new Point(p.points[4].x, p.points[4].y));
      }

      // Sync internal params back to the handles
      const s1 = l1.startPt(), e1 = l1.endPt(), m1 = l1.midpoint();
      const s2 = l2.startPt(), e2 = l2.endPt(), m2 = l2.midpoint();

      p.line1_pt1 = { x: s1.x, y: s1.y }; p.line1_pt2 = { x: e1.x, y: e1.y };
      p.line2_pt1 = { x: s2.x, y: s2.y }; p.line2_pt2 = { x: e2.x, y: e2.y };

      p.points[0] = { ...p.line1_pt1 }; p.points[1] = { ...p.line1_pt2 }; p.points[2] = { x: m1.x, y: m1.y };
      p.points[3] = { ...p.line2_pt1 }; p.points[4] = { ...p.line2_pt2 }; p.points[5] = { x: m2.x, y: m2.y };
    }

    // Handle style and slider updates dynamically
    for (const [key, val] of Object.entries(incoming)) {
      if (key === "lineWidth") { thing.lineWidth = p.lineWidth = Number(val); }
      else if (key === "shorten") { thing.shorten = p.shorten = Number(val); }
      else if (key === "truncate") { thing.truncate = p.truncate = Number(val); }
      else if (key in thing) { thing[key] = p[key] = val; }
    }
  },

  /**
   * Executes the drawing logic based on the current master geometry and styles.
   */
  draw() {
    const { l1, l2, thing } = this.elements;

    // drawAParab and its internal changeLine function handle the point array manipulation.
    drawAParab(thing, l1, l2);
  }
};
