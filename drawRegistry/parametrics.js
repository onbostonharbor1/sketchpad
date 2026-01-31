/* ============================================================
   Draw Registry Entry: Parametrics (Advanced Morphing)
   ============================================================ */

import { Parametric }     from "/classes/parametric.js";
import { drawParametric } from "/draw/drawParametrics.js";

window.drawRegistry_parametrics = {

    name:        "Parametrics",
    id:          "parametrics",
    version:     0.3,
    category:    "Parametrics",
    firstOrder:  true,
    source:      "internal",
    tags:        ["Parametric", "CurveStitch"],
    description: "Advanced morphing patterns with thinning and intersection controls",
    status:      "",
    hover:       "Two parametric demos with a selector accordion",

    // -- visual styling ---
    background:  null,   // Future link: will be used to draw background layer
    overlays:    [],     // Future link: for drawing on top of the math
    transforms:  [],     // Future link: for post-computation manipulations

    // Placeholder for all elements drawn
    elements:    null,

    params: {
        variant:   "fourCircles",
        color:     "#0000ff",
        lineWidth: 1,
        depth:     0.5,
        sharpness: 3,
        phase:     0,
        complexity: 75,      // Lowered default so "Ends" are visible
        showIntersections: false
    },

    controls: {
        color:     { widget: "colorPicker", label: "Color" },
        lineWidth: { widget: "range", min: 0.5, max: 5, step: 0.5, label: "Width" },
        depth:     { widget: "range", min: 0.1, max: 1.5, step: 0.1, label: "Inner Scale" },
        sharpness: { widget: "range", min: 1,   max: 9,   step: 2,   label: "Pointy-ness" }, // Odd steps only
        phase:     { widget: "range", min: 0,   max: 6.28,step: 0.01,label: "Rotation" },

        thinningHeader: { widget: "staticText", text: "--- Thin Drawing ---" },

        // Complexity slider: Lowering this "thins" the ripples to reveal the star.
        complexity: { widget: "range", min: 3,   max: 200, step: 1,   label: "Loops" },
        showIntersections: { widget: "checkbox", label: "Show Intersection Dots" },

        parametricChooser: {
            widget: "accordion",
            startOpen: true,
            clearOnAction: true,
            sections: [{ title: "Select Pattern Variant", items: [] }]
        }
    },

    init() {
        const self = this;
        function setVariantAndRedraw(newVariant) {
            self.update({ variant: newVariant });
            self.draw();
        }
        self.controls.parametricChooser.sections[0].items = [
            { label: "Four Circles", action() { setVariantAndRedraw("fourCircles"); } },
            { label: "Four Ended",  action() { setVariantAndRedraw("fourEnded");   } }
        ];
        self.elements = { curve: buildCurveFromParams(self.params) };
    },

    update(params) {
        if (!params) return;
        if (params.variant) this.params.variant = params.variant;
        Object.assign(this.params, params);
        this.elements.curve = buildCurveFromParams(this.params);
    },

    draw() {
        if (!this.elements || !this.elements.curve) return;
        drawParametric(this.elements.curve);
    }
};

function buildCurveFromParams(p) {
    const common = {
        color: p.color,
        lineWidth: p.lineWidth,
        showIntersections: p.showIntersections,
        printEquations: false,
        margin: 40
    };

    if (p.variant === "fourCircles") {
        return new Parametric({
            ...common,
            domain: { tMin: 0, tMax: 2 * Math.PI, numPoints: 0, maxFreq: p.complexity, samplesPerCycle: 60 },
            funcX: (t) => 1.5 * Math.cos(t) + p.depth * Math.sin((p.complexity - 2) * t + p.phase),
            funcY: (t) => 1.5 * Math.sin(t) + p.depth * Math.cos(p.complexity * t)
        });
    }

    // FOUR ENDED (The Subtractive Version)
    return new Parametric({
        ...common,
        domain: { tMin: 0, tMax: 2 * Math.PI, numPoints: 0, maxFreq: p.complexity, samplesPerCycle: 60 },
        // x(t) = (highFreq - lowFreq) * scale
        funcX: (t) => 150 * (Math.cos(p.complexity * t) - Math.pow(Math.cos(t + p.phase), p.sharpness)),
        funcY: (t) => 150 * (Math.sin(p.complexity * t) - Math.pow(Math.sin(t), p.sharpness))
    });
}
