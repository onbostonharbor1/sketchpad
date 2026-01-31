/* drawRegistry/inverseStar.js */
import { Point }          from "../classes/classes.js";
import { CurveStitch }     from "../classes/curveStitchClass.js";
import { drawInverseStar } from "../draw/drawRegular.js";

window.drawRegistry_inverseStar = {
    name:         "Inverse Star",
    id:           "inverseStar",
    version:      1.5,
    category:     "curve_stitch",
    firstOrder:   true,
    source:       "internal",
    tags:         ["Curve Stitch"],
    description:  "An inverse star goes from the center outward",
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
        points:    [] // For canvas overlay system interaction
    },

    controls: {
        radius:    { widget: "range", min: 10,  max: 400, step: 5,   label: "Radius:" },
        numNodes:  { widget: "range", min: 3,   max: 16,  step: 1,   label: "Nodes:" },
        numSteps:  { widget: "range", min: 10,  max: 64,  step: 1,   label: "Steps:" },
        rotate:    { widget: "range", min: 0,   max: 360, step: 5,   label: "Rotation:" },
        xScale:    { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "X Scale:" },
        yScale:    { widget: "range", min: 0.5, max: 2,   step: 0.1, label: "Y Scale:" },
        color:     { widget: "colorPicker",                          label: "Color:" },
        lineWidth: { widget: "range", min: .5,  max: 3,   step: .5,  label: "Width:" }
    },

    init() {
        // Initialize interactive points from params.midpoint
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

            if (key === "points") {
                // Sync midpoint from the draggable point handle
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
        drawInverseStar(thing);
    }
};
