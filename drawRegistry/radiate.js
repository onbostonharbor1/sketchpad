/* drawRegistry/radiate.js */
import { Line, Point } from "../classes/classes.js";
import { Radiate }     from "../classes/radiate.js";
import { drawALine }   from "../draw/drawUtilities.js";
import { drawRadiate } from "../draw/drawUnicorns.js";

window.drawRegistry_radiate = {
  name:         "Radiate",
  id:           "radiate",
  version:      1.0, // Phase 3 Canvas Interactor Version
  category:     "fundamental",
  firstOrder:   true,
  source:       "internal",
  tags:         ["Geometry", "Primitive"],
  description:  "Draws many lines from a radial point to the segment of a base line.",
  status:       "",

  background: null,
  overlays:   [],
  transforms: [],
  elements:   null,

  interactive: true,
  params: {
    numSteps:  20,
    color:     "#0044cc",
    lineWidth: 1,
    // points mapping: [0]: radialPt, [1]: start, [2]: end, [3]: midpoint
    points:    []
  },

  controls: {
    numSteps:  { widget: "range", min: 12, max: 40, step: 1, label: "# steps:" },
    color:     { widget: "colorPicker", label: "Color:" },
    lineWidth: { widget: "range", min: 0.5, max: 3, step: 0.5, label: "Width:" }
  },

  /* ==========================================================
     1. init()
     ========================================================== */
  init() {
    const p = this.params;

    // Clear old handles (ghost prevention)
    p.points.length = 0;

    // Set default positions if array was just cleared
    const initialRadial = { x: 300, y: 20 };
    const initialStart  = { x: 20,  y: 150 };
    const initialEnd    = { x: 500, y: 450 };

    const line = new Line(
      new Point(initialStart.x, initialStart.y),
      new Point(initialEnd.x,   initialEnd.y)
    );
    const mid = line.midpoint();

    // Rebuild the authoritative points array
    p.points.push(
      { x: initialRadial.x, y: initialRadial.y }, // [0] radialPt
      { x: initialStart.x,  y: initialStart.y  }, // [1] start
      { x: initialEnd.x,    y: initialEnd.y    }, // [2] end
      { x: mid.x,           y: mid.y           }  // [3] midpoint
    );

    const thing = new Radiate({
      radialPt:  { ...p.points[0] },
      start:     { ...p.points[1] },
      end:       { ...p.points[2] },
      numSteps:  p.numSteps,
      color:     p.color,
      lineWidth: p.lineWidth
    });

    this.elements = { line, thing };
  },

  /* ==========================================================
     2. update(incoming)
     ========================================================== */
  update(incoming) {
    const p = this.params;
    const { line, thing } = this.elements;

    if (incoming.points) {
      // 1. Process Base Line Midpoint logic
      const incomingMid = new Point(p.points[3].x, p.points[3].y);
      if (!incomingMid.isSame(line.midpoint())) {
        line.moveMidpointTo(incomingMid);
      } else {
        line.setStart(new Point(p.points[1].x, p.points[1].y));
        line.setEnd(new Point(p.points[2].x, p.points[2].y));
      }

      // 2. Sync line geometry back to points array
      const start = line.startPt();
      const end   = line.endPt();
      const mid   = line.midpoint();

      p.points[1] = { x: start.x, y: start.y };
      p.points[2] = { x: end.x,   y: end.y   };
      p.points[3] = { x: mid.x,   y: mid.y   };

      // 3. Update the Radiate "thing"
      thing.radialPt = { x: p.points[0].x, y: p.points[0].y };
      thing.start    = { x: p.points[1].x, y: p.points[1].y };
      thing.end      = { x: p.points[2].x, y: p.points[2].y };
    }

    // Apply slider/picker updates
    if (incoming.numSteps !== undefined) thing.numSteps = p.numSteps = Number(incoming.numSteps);
    if (incoming.color) thing.color = p.color = incoming.color;
    if (incoming.lineWidth !== undefined) thing.lineWidth = p.lineWidth = Number(incoming.lineWidth);
  },

  /* ==========================================================
     3. draw()
     ========================================================== */
  draw() {
    const { line, thing } = this.elements;
    // Draw the base segment
    drawALine(thing.color, thing.lineWidth, line);
    // Draw the radiating fans
    drawRadiate(thing);
  }
};
