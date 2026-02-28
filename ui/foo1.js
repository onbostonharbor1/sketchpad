/* drawRegistry/parabola.js */
import { Line, Point, StringThing } from "../classes/classes.js";
import { drawAParab }               from "../draw/drawRegular.js";

function updateLine(line, pts, iStart, iEnd, iMid) {
  const incomingMid = new Point(pts[iMid].x, pts[iMid].y);
  if (!incomingMid.isSame(line.midpoint())) {
    line.moveMidpointTo(incomingMid);
  } else {
    line.setStart(new Point(pts[iStart].x, pts[iStart].y));
    line.setEnd(new Point(pts[iEnd].x,     pts[iEnd].y));
  }
}

function syncHandles(p, l1, l2) {
  const [s1, e1, m1] = [l1.startPt(), l1.endPt(), l1.midpoint()];
  const [s2, e2, m2] = [l2.startPt(), l2.endPt(), l2.midpoint()];
  p.line1_pt1 = pt(s1);  p.line1_pt2 = pt(e1);
  p.line2_pt1 = pt(s2);  p.line2_pt2 = pt(e2);
  p.points[0] = pt(s1);  p.points[1] = pt(e1);  p.points[2] = pt(m1);
  p.points[3] = pt(s2);  p.points[4] = pt(e2);  p.points[5] = pt(m2);
}

const pt = ({ x, y }) => ({ x, y });

window.drawRegistry_parabola = {
  name:         "Parabola",
  id:           "parabola",
  version:      2.0,
  category:     "fundamental",
  firstOrder:   true,
  source:       "internal",
  tags:         ["Geometry", "Curve Stitch"],
  description:  "Stitched parabola with synchronized lifecycle handles.",
  status:       "",

  background: null,
  overlays:   [],
  transforms: [],
  elements:   null,

  interactive: true,
  params: {
    line1_pt1: { x: 30,  y: 50  },
    line1_pt2: { x: 50,  y: 350 },
    line2_pt1: { x: 50,  y: 350 },
    line2_pt2: { x: 350, y: 350 },
    color:     "#008800",
    lineWidth: 1,
    truncate:  2,
    shorten:   3,
    points:    []
  },

  controls: {
    truncate:  { widget: "range", min: 0,   max: 20, step: 1,   label: "Truncate:" },
    shorten:   { widget: "range", min: 0,   max: 20, step: 1,   label: "Shorten:"  },
    color:     { widget: "colorPicker", label: "Color:" },
    lineWidth: { widget: "range", min: 0.5, max: 4,  step: 0.5, label: "Line wid.:" }
  },

  init() {
    const p = this.params;
    p.points.length = 0;

    const l1 = new Line(new Point(p.line1_pt1.x, p.line1_pt1.y), new Point(p.line1_pt2.x, p.line1_pt2.y));
    const l2 = new Line(new Point(p.line2_pt1.x, p.line2_pt1.y), new Point(p.line2_pt2.x, p.line2_pt2.y));
    const thing = new StringThing({ color: p.color, lineWidth: p.lineWidth });

    const m1 = l1.midpoint();
    p.points.push({ x: p.line1_pt1.x, y: p.line1_pt1.y });  // [0] l1 start
    p.points.push({ x: p.line1_pt2.x, y: p.line1_pt2.y });  // [1] l1 end
    p.points.push({ x: m1.x, y: m1.y });                    // [2] l1 mid

    const m2 = l2.midpoint();
    p.points.push({ x: p.line2_pt1.x, y: p.line2_pt1.y });  // [3] l2 start
    p.points.push({ x: p.line2_pt2.x, y: p.line2_pt2.y });  // [4] l2 end
    p.points.push({ x: m2.x, y: m2.y });                    // [5] l2 mid

    this.elements = { l1, l2, thing };
  },

  update(incoming) {
    const p = this.params;
    const { l1, l2, thing } = this.elements;

    if (incoming.points) {
      updateLine(l1, p.points, 0, 1, 2);
      updateLine(l2, p.points, 3, 4, 5);
      syncHandles(p, l1, l2);
    }

    for (const [key, val] of Object.entries(incoming)) {
      if (key === "lineWidth") { thing.lineWidth = p.lineWidth = Number(val); }
      else if (key in thing)   { thing[key] = p[key] = val; }
    }

    // 1. Calculate the trimmed line based on parameters
    const s = p.shorten  / thing.numSteps;
    const t = p.truncate / thing.numSteps;

    const startPt = l1.pointAt(s);
    const endPt   = l1.pointAt(1 - t);

    this.elements.trimmedL1 = new Line(startPt, endPt);

    // 2. Sync the draggable points array to the trimmed coordinates
    // This ensures the red dots move to the visual start/end of the line
    p.points[0].x = startPt.x;
    p.points[0].y = startPt.y;
    p.points[1].x = endPt.x;
    p.points[1].y = endPt.y;

    // Update midpoint handle so it stays between the trimmed ends
    const mid = this.elements.trimmedL1.midpoint();
    p.points[2].x = mid.x;
    p.points[2].y = mid.y;
  },


  draw() {
    const { trimmedL1, l2, thing } = this.elements;

    // We no longer need to manually toggle truncate/shorten here
    // because trimmedL1 is already calculated in update()
    drawAParab(thing, trimmedL1, l2);
  }


};
