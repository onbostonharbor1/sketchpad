/* drawRegistry/cycloid.js */
import { Point, StringThing }   from '../classes/classes.js';
import { drawCycloid }          from '../draw/drawUnicorns.js';

window.drawRegistry_cycloid = {
    name:         "Cycloid",
    id:           "cycloid",
    version:      1.4,
    category:     "circles",
    firstOrder:   true,
    source:       "internal",
    tags:         ["cycloid"],
    description:  "Interactive cycloid generated via modular multiplication",
    status:       "",
    hover:        "",

    // -- visual styling ---
    background: null,
    overlays:   [],
    transforms: [],

    // Placeholder for all elements drawn
    elements:   null,

    interactive: true,
    params: {
      midpoint:    { x: 300, y: 300 },
      radius:      250,
      numNodes:    240,
      numCycloids: 2,
      xScale:      1,
      yScale:      1,
      color:       "blue",
      lineWidth:   1,
      points:      [] // Integrated for canvas overlay interaction
    },

    controls: {
        numCycloids: { widget: "range", min: 1,   max: 12,  step: 1,   label: "Loops:" },
        radius:      { widget: "range", min: 80,  max: 350, step: 5,   label: "Radius:" },
        numNodes:    { widget: "range", min: 64,  max: 300, step: 10,  label: "Points:" },
        xScale:      { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "Width:" },
        yScale:      { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "Height:" },
        color:       { widget: "colorPicker",                          label: "Color:" },
        lineWidth:   { widget: "range", min: .5,  max: 3,   step: .5,  label: "Line wid.:" }
    },

    init() {
        // Initialize the interactive point if empty
        if (this.params.points.length === 0) {
            this.params.points.push({ x: this.params.midpoint.x, y: this.params.midpoint.y });
        }

        const p = this.params.points[0];
        this.elements = {
            thing: new StringThing({
                ...this.params,
                midpoint: new Point(p.x, p.y)
            })
        };
    },

    update(incoming) {
        const s = this.elements.thing;
        for (const key in incoming) {
            const value = incoming[key];   // ← add this line
            if (value === undefined) continue;

            if (key === "points") {
                const p = this.params.points[0];
                s.midpoint.x = p.x;
                s.midpoint.y = p.y;
            } else if (Object.hasOwn(s, key)) {
                s[key] = value;
            }
        }
    },

    draw() {
        const thing = this.elements.thing;
        drawCycloid(thing);
    }
};
