/* drawRegistry/line.js */
import { Line, Point, StringThing } from "/classes/classes.js";
import { drawALine }                from "/draw/drawUtilities.js";

window.drawRegistry_line = {
  name:        "Line",
  id:          "drawLine",
  version:     2.7,
  category:    "fundamental",
  firstOrder:  true,
  source:      "internal",
  tags:        ["Geometry", "Primitive"],
  description: "Draws a line with draggable endpoints and midpoint.",
  status:      "",
  hover:       "",

  background: null,
  overlays:   [],
  transforms: [],
  elements:   null,

  interactive: true,
  params: {
    pt1:       { x: 200, y: 200 },
    pt2:       { x: 400, y: 400 },
    midpoint:  { x: 300, y: 300 },
    color:     "#0044cc",
    lineWidth: 2,
    points:    [] // [0]=pt1, [1]=pt2, [2]=midpoint for the overlay system
  },

  controls: {
    color:     { widget: "colorPicker", label: "Color:" },
    lineWidth: { widget: "range", min: 0.5, max: 2.5, step: 0.5, label: "Line wid.:" }
    // Points are handled by the canvas overlay (pointPicker logic removed)
  },

  init() {
    const p = this.params;

    // Seed the points array for the interactive overlay
    if (p.points.length === 0) {
      p.points.push({ x: p.pt1.x, y: p.pt1.y });
      p.points.push({ x: p.pt2.x, y: p.pt2.y });
      p.points.push({ x: p.midpoint.x, y: p.midpoint.y });
    }

    const line = new Line(
      new Point(p.points[0].x, p.points[0].y),
      new Point(p.points[1].x, p.points[1].y)
    );

    const thing = new StringThing({
      color: p.color,
      lineWidth: p.lineWidth
    });

    this.elements = { line, thing };

    // Initial sync of the JSON-safe midpoint
    const mid = line.midpoint();
    p.midpoint = { x: mid.x, y: mid.y };
    p.points[2] = { x: mid.x, y: mid.y };
  },

  update(incoming) {
    const p = this.params;
    const { line, thing } = this.elements;

    // 1. Handle Point Interaction (The definitive source)
    if (incoming.points) {
      const incomingMid = new Point(p.points[2].x, p.points[2].y);
      const prevMid     = line.midpoint();

      if (!incomingMid.isSame(prevMid)) {
        // Midpoint was dragged: move the whole line
        line.moveMidpointTo(incomingMid);
      } else {
        // Endpoints were dragged: update geometry directly
        line.setStart(new Point(p.points[0].x, p.points[0].y));
        line.setEnd(new Point(p.points[1].x, p.points[1].y));
      }

      // 2. Sync authoritative geometry back to JSON-safe params
      const start = line.startPt();
      const end   = line.endPt();
      const mid   = line.midpoint();

      p.pt1 = { x: start.x, y: start.y };
      p.pt2 = { x: end.x,   y: end.y   };
      p.midpoint = { x: mid.x, y: mid.y };

      // Update overlay array to match recalculated geometry
      p.points[0] = { ...p.pt1 };
      p.points[1] = { ...p.pt2 };
      p.points[2] = { ...p.midpoint };
    }

    // 3. Style Sync
    if (incoming.color) thing.color = incoming.color;
    if (incoming.lineWidth) {
      thing.lineWidth = Number(incoming.lineWidth);
      p.lineWidth = thing.lineWidth;
    }
  },

  draw() {
    const { line, thing } = this.elements;
    drawALine(thing.color, thing.lineWidth, line);
  }
};
