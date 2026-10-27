/* drawRegistry/linkedCircles.js

   Linked circles (2 to 7).

   Draws numCircles circles of the same radius, then stitches between
   neighboring circles: points around one circle are joined to points
   around the next, offset by numSteps positions. linkMode chooses which
   circles are linked: pairwise (0-1, 1-2, ...), ring (pairwise plus
   last-to-first) or allToAll.
   The circles themselves are always drawn, including in final mode;
   only the stitches are reduced to endpoints.
   Drawing is done by drawLinkedCircles() in draw/drawLinkedCircles.js.
*/
import { LinkedCircles }     from "/classes/linkedCircles.js";
import { drawLinkedCircles, circlePoints } from "/draw/drawLinkedCircles.js";
import { Point }             from "../classes/classes.js";

window.drawRegistry_linkedCircles = {
  name:         "Linked Circles",
  id:           "linkedCircles",
  version:      1.9,
  category:     "unicorns",
  firstOrder:   true,
  source:       "internal",
  tags:         ["Geometry", "String Art", "Circles"],
  description:  "Linked circles with forced-mutation handles for dynamic counts.",
  status:       "",

  background: null,
  overlays:   [],
  elements:   null,

  interactive: true,
  params: {
    linkMode:   "pairwise",
    numCircles: 2,
    numPoints:  80,
    radius:     100,
    numSteps:   10,
    color:      "#0000ff",
    lineWidth:  1,
    points:     [] // The interaction layer holds a reference to THIS specific array
  },

  controls: {
    linkMode: {
      widget: "select",
      label:  "Link Mode:",
      options: [
        { value: "pairwise", label: "pairwise" },
        { value: "ring",     label: "ring"     },
        { value: "allToAll", label: "allToAll" }
      ]
    },
    numCircles: {
      widget: "range",
      label:  "Circles:",
      min: 2,
      max: 7,
      step: 1,
      rebuildControls: true
    },
    numPoints: { widget: "range", min: 10, max: 400, step: 1, label: "Points:" },
    radius:    { widget: "range", min: 10, max: 400, step: 1, label: "Radius:" },
    numSteps:  { widget: "range", min: 0,  max: 200, step: 1, label: "Steps:" },
    color:     { widget: "colorPicker",                       label: "Color:" },
    lineWidth: { widget: "range", min: 0.5, max: 3.5, step: 0.5, label: "Width:" }
  },

  init() {
    const p = this.params;
    const thing = new LinkedCircles({
      numCircles: p.numCircles,
      linkMode:   p.linkMode,
      radius:     p.radius,
      numPoints:  p.numPoints,
      numSteps:   p.numSteps,
      color:      p.color,
      lineWidth:  p.lineWidth
    });

    // Mutate the array instead of replacing it
    p.points.length = 0;
    thing.midpoints.forEach(m => p.points.push({ x: m.x, y: m.y }));

    this.elements = { thing };
  },

  update(incoming) {
    const p = this.params;
    const thing = this.elements.thing;

    // 1. Structural Change: Circle count updated
    if (incoming.numCircles !== undefined && Number(incoming.numCircles) !== thing.numCircles) {
      thing.setNumCircles(Number(incoming.numCircles));

      // CRITICAL: Mutate the existing array reference.
      // Setting .length = 0 and then pushing keeps the same array object
      // but changes the content that the interaction layer is watching.
      p.points.length = 0;
      thing.midpoints.forEach(m => p.points.push({ x: m.x, y: m.y }));
    }

    // 2. Interaction Change: Handle Drag
    if (incoming.points) {
      // Use the points provided in the incoming object to update the class
      p.points.forEach((pt, i) => {
        if (i < thing.numCircles) {
            thing.setMidpoint(i, pt);
        }
      });
    }

    // 3. Attribute Changes
    for (const key in incoming) {
      const val = incoming[key];
      if (val === undefined || key === "points" || key === "numCircles") continue;

      if (key === "linkMode") thing.setLinkMode(val);
      else if (Object.hasOwn(thing, key)) {
        thing[key] = (key === "color") ? val : Number(val);
      }
    }
  },

  draw() {
    drawLinkedCircles(this.elements.thing);
  },

  /* ==========================================================
     infrastructure()  (Figures points mode, Phase 7d)
     ----------------------------------------------------------
     One ring per circle. Every linking stitch runs between two single
     rim points (no arm to subdivide), same as Mystic Rose and Cycloid.
     ========================================================== */
  infrastructure() {
    const thing = this.elements.thing;
    return thing.midpoints.map((center, i) => {
      const pts = circlePoints(center, thing.radius, thing.numPoints);
      return { id: "circle" + i, points: pts, steps: pts.length - 1, from: 0, to: pts.length - 1 };
    });
  }
};
