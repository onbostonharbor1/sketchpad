/* drawRegistry/linkedCircles.js */
import { LinkedCircles }     from "/classes/linkedCircles.js";
import { drawLinkedCircles } from "/draw/drawLinkedCircles.js";
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
  overlays:   ["interaction"],
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
  }
};
