/* drawRegistry/mysticRoseEllipse.js */
import { Point, StringThing }       from '../classes/classes.js';
import { drawMysticRose }           from '../draw/drawUnicorns.js';

window.drawRegistry_mysticRoseEllipse = {
    name:         "Mystic Rose (ellipse)",
    id:           "mysticRoseEllipse",
    version:      1.5,
    category:     "unicorns",
    firstOrder:   true,
    source:       "internal",
    tags:         ["circular"],
    description:  "Lines drawn to all nodes from each node in an ellipse",
    status:       "",
    hover:        "",

    // -- visual styling ---
    background: null,
    overlays:   [],
    transforms: [],

    // Placeholder for all elements drawn
    elements:   null,

    interactive:  true,
    params: {
      midpoint:  { x: 300, y: 200 },
      numNodes:  20,
      ellipse:   { a: 400, b: 300 },
      xScale:    1,
      yScale:    1,
      color:     "blue",
      lineWidth: 1,
      points:    [] // For the canvas overlay system
    },

    controls: {
        ellipseLength: { widget: "range", min: 80,  max: 500, step: 5,   label: "Length (a):" },
        ellipseHeight: { widget: "range", min: 80,  max: 400, step: 5,   label: "Height (b):" },
        numNodes:      { widget: "range", min: 12,  max: 30,  step: 1,   label: "Nodes:" },
        xScale:        { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "X Scale:" },
        yScale:        { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "Y Scale:" },
        color:         { widget: "colorPicker",                          label: "Color:" },
        lineWidth:     { widget: "range", min: .5,  max: 3,   step: .5,  label: "Width:" }
    },

    init() {
        // Initialize points array if empty
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
            } else if (key === "ellipseHeight") {
                s.ellipse.b = value;
            } else if (key === "ellipseLength") {
                s.ellipse.a = value;
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
