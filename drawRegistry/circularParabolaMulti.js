/* drawRegistry/circularParabolaDrift.js */
import { Point } from "../classes/classes.js";
import { CurveStitch } from "../classes/curveStitchClass.js";
import { drawCircularParabola } from "../draw/drawRegular.js";

window.drawRegistry_circularParabolaMulti = {
    name:         "Circular Parabola (Multi)",
    id:           "circularParabolaMulti",
    version:      1.8,
    category:     "curve_stitch",
    firstOrder:   true,
    source:       "internal",
    tags:         ["Curve Stitch", "Interactive"],
    description:  "Parabolas maintain size but drift apart when handle is dragged",
    status:       "",

    background: null,
    overlays:   [],
    transforms: [],
    elements:   [],

    interactive: true,
    params: {
        midpoint:  { x: 300, y: 300 }, // The 'Anchor'
        radius:    100,                // Internal size (Slider controlled)
        drift:     0,                  // Calculated distance
        numNodes:  6,
        numSteps:  20,
        rotate:    0,
        color:     "blue",
        lineWidth: 1,
        points:    []                  // [0] = Center, [1] = Drift Handle
    },

    controls: {
        radius:    { widget: "range", min: 50,  max: 300, step: 5,   label: "Parabola Size:" },
        numNodes:  { widget: "range", min: 3,   max: 12,  step: 1,   label: "Petals:" },
        numSteps:  { widget: "range", min: 10,  max: 50,  step: 1,   label: "Steps:" },
        color:     { widget: "colorPicker",                          label: "Color:" },
        lineWidth: { widget: "range", min: .5,  max: 3,   step: .5,  label: "Width:" }
    },

    init() {
        // Ensure we have our two interactive handles
        if (this.params.points.length < 2) {
            const { midpoint, drift, rotate, numNodes } = this.params;

            // Clear and rebuild to ensure indices [0] and [1] are correct
            this.params.points = [];

            // Point 0: The Central Anchor
            this.params.points.push({ x: midpoint.x, y: midpoint.y });

            // Point 1: The Handle on the circumference (offset for drift)
            // We place it at the drift distance. If drift is 0, it sits on the center.
            const handleAngle = (rotate * Math.PI / 180) + (Math.PI / numNodes);
            this.params.points.push({
                x: midpoint.x + (drift + 50) * Math.cos(handleAngle), // +50 so it's visible if drift is 0
                y: midpoint.y + (drift + 50) * Math.sin(handleAngle)
            });
        }
        this.refreshElements();
    },

    refreshElements() {
        this.elements = [];
        const pCenter = this.params.points[0];
        const angleStep = 360 / this.params.numNodes;

        for (let i = 0; i < this.params.numNodes; i++) {
            const currentAngleDeg = this.params.rotate + (i * angleStep);
            const rad = currentAngleDeg * (Math.PI / 180);

            // Each parabola's midpoint is pushed out by the drift amount
            const localX = pCenter.x + (this.params.drift * Math.cos(rad));
            const localY = pCenter.y + (this.params.drift * Math.sin(rad));

            this.elements.push(new CurveStitch({
                ...this.params,
                midpoint: new Point(localX, localY),
                rotate: currentAngleDeg
            }));
        }
    },

    update(incoming) {
        // If the user drags either point, we recalculate the drift and rotation
        if (incoming.points || incoming.numNodes || incoming.radius) {
            const p0 = this.params.points[0];
            const p1 = this.params.points[1];

            const dx = p1.x - p0.x;
            const dy = p1.y - p0.y;

            // Drift is the distance between center and handle
            this.params.drift = Math.sqrt(dx * dx + dy * dy);

            // Rotation is determined by the handle position
            this.params.rotate = (Math.atan2(dy, dx) * 180 / Math.PI) - (180 / this.params.numNodes);

            this.refreshElements();
        } else {
            // Attributes like color/width can be updated on existing elements
            this.elements.forEach(stitch => {
                for (const key in incoming) {
                    if (Object.hasOwn(stitch, key)) stitch[key] = incoming[key];
                }
            });
        }
    },

    draw() {
        this.elements.forEach(stitch => drawCircularParabola(stitch));
    }
};
