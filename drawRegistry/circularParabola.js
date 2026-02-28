/* drawRegistry/circularParabola.js */
import { Point }                from "../classes/classes.js";
import { CurveStitch }           from "../classes/curveStitchClass.js";
import { drawCircularParabola }  from "../draw/drawRegular.js";

window.drawRegistry_circularParabola = {
    name:         "Circular Parabola",
    id:           "circularParabola",
    version:      1.5,
    category:     "curve_stitch",
    firstOrder:   true,
    source:       "internal",
    tags:         ["Curve Stitch"],
    description:  "Parabola with arm on defining circle",
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
        midpoint:  { x: 300, y: 300 },
        radius:    150,
        numNodes:  5,
        numSteps:  20,
        rotate:    0,
        xScale:    1,
        yScale:    1,
        color:     "blue",
        lineWidth: 1,
        points:    [] // For canvas interaction
    },

    controls: {
        radius:    { widget: "range", min: 10,  max: 400, step: 5,   label: "Radius:" },
        numNodes:  { widget: "range", min: 3,   max: 16,  step: 1,   label: "Nodes:" },
        numSteps:  { widget: "range", min: 10,  max: 64,  step: 1,   label: "Steps:" },
        rotate:    { widget: "range", min: 0,   max: 360, step: 5,   label: "Rotation:" },
        xScale:    { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "Width:" },
        yScale:    { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "Height:" },
        color:     { widget: "colorPicker",                          label: "Color:" },
        lineWidth: { widget: "range", min: .5,  max: 3,   step: .5,  label: "Line Wid.:" }
    },

    init() {
        // Initialize points array for the overlay system
        if (this.params.points.length === 0) {
            this.params.points.push({ x: this.params.midpoint.x, y: this.params.midpoint.y });
        }

        const p = this.params.points[0];
        this.elements = {
            thing: new CurveStitch({
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
            if (key === "radius") {
                s.ellipse.a = incoming[key]*2;
                s.ellipse.b = incoming[key]*2;
            }
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
        drawCircularParabola(thing);
    }
};
