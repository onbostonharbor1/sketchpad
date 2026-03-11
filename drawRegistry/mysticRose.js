/* drawRegistry/mysticRose.js */
import { Point, StringThing }       from '../classes/classes.js';
import { drawMysticRose }           from '../draw/drawUnicorns.js';

window.drawRegistry_mysticRose = {
    name:         "Mystic Rose (circle)",
    id:           "mysticRose",
    version:      1.4,
    category:     "unicorns",
    firstOrder:   true,
    source:       "internal",
    tags:         ["circular"],
    description:  "Lines drawn to all nodes from each node in an ellipse",
    status:      "",
    hover:        "",


    // -- visual styling ---
    background: null,
    overlays:   [],
    transforms: [],

        // Placeholder for all elements drawn
    elements:   null,

    interactive:  true,
    params: {
      midpoint:  { x: 300, y: 300 },
      radius:    200,
      numNodes:  20,
      xScale:    1,
      yScale:    1,
      color:     "blue",
      lineWidth: 1,
      points:    []
    },

    controls: {
        radius:    { widget: "range", min: 80,  max: 300, step: 5,   label: "Radius:" },
        numNodes:  { widget: "range", min: 12,  max: 30,  step: 1,   label: "Nodes:" },
        xScale:    { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "X Scale:" },
        yScale:    { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "Y Scale:" },
        color:     { widget: "colorPicker",                          label: "Color:" },
        lineWidth: { widget: "range", min: .25,  max: 3, step: .25,  label: "Line wid.:" }
    },

    init() {
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
            const value = incoming[key];
            if (value === undefined) continue;

            if (key === "points") {
                const p = this.params.points[0];
                s.midpoint.x = p.x;
                s.midpoint.y = p.y;
            } else if (key === "radius") {
                s.ellipse.a = value*2;
                s.ellipse.b = value*2;
            } else if (Object.hasOwn(s, key)) {
                s[key] = value;
            }
        }
    },

    draw() {
        const thing = this.elements.thing;
        drawMysticRose(thing);
    }
};
