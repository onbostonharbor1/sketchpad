/* ============================================================
   Lissajous Curve (Dynamic)
   Gallery Script (ParameterControls-integrated)

   HOW TO USE THE CONTROLS:
   ------------------------
   • a (freq x) & b (freq y):
     These determine the ratio of oscillations. Integer ratios (e.g., 3:2)
     create closed loops. Higher numbers create more complex, "tight" weaves.

   • δ (phase):
     Shifts the horizontal sine wave relative to the vertical. This
     effectively "rotates" the 3D projection of the curve. At 0 or PI,
     the curve may collapse into a single line.

   • Complexity (numPoints):
     Sets the sampling density. If the dots look "jagged," increase this.
     Higher values also help the intersection math find exact crossings.

   • Show Intersections:
     Toggles the incremental O(n^2) intersection engine. When active,
     red dots will mark every point where the curve crosses itself.

   • Line Width & Color:
     Standard rendering styles passed directly to the draw engine.

   ARCHITECTURE:
   -------------
   - Uses Parametric class for "Pure Model" data.
   - Uses drawParametric for Auto-Fit and Circuit Breaking.
   ============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";
import { drawParametric } from "/draw/drawParametrics.js";
import { Parametric } from "/classes/parametric.js";

/**
 * draw()
 * Executed by the redrawHandler whenever a UI slider or checkbox moves.
 */
function draw() {
    const p = scriptInfo.params;

    const lissajous = new Parametric({
        // The mathematical definition: x = sin(at + d), y = sin(bt)
        funcX: (t) => Math.sin(p.a * t + p.delta),
        funcY: (t) => Math.sin(p.b * t),

        // Rendering style
        color: p.color,
        lineWidth: p.lineWidth,
        showIntersections: p.showIntersections, // Linked to checkbox

        // Sampling domain
        domain: {
            tMin: 0,
            tMax: 2 * Math.PI,
            numPoints: p.numPoints
        }
    });

    // Delegate to engine for scaling and circuit breaking
    drawParametric(lissajous);
}

/* ------------------------------------------------------------
   Lifecycle functions
------------------------------------------------------------ */

function init() {
    // Initialization of script state
}

function update(params) {
    // Update live params from UI input
    for (const key in params) {
        scriptInfo.params[key] = params[key];
    }
}

/* ------------------------------------------------------------
   scriptInfo (ParameterControls contract)
------------------------------------------------------------ */
export const scriptInfo = {
    title: "Lissajous Curve",

    controls: {
        a:                 { label: "a (freq x)",   widget: "range", min: 1,   max: 10,   step: 1,    default: 3 },
        b:                 { label: "b (freq y)",   widget: "range", min: 1,   max: 10,   step: 1,    default: 2 },
        delta:             { label: "δ (phase)",    widget: "range", min: 0,   max: 6.28, step: 0.01, default: 1.57 },
        numPoints:         { label: "Complexity",   widget: "range", min: 100, max: 2000, step: 100,  default: 800 },
        showIntersections: { label: "Show Intersections", widget: "checkbox",                 default: true },
        lineWidth:         { label: "Line Width",   widget: "range", min: 0.5, max: 5.0,  step: 0.5,  default: 1.5 },
        color:             { label: "Color",        widget: "colorPicker",                            default: "#0000ff" }
    },

    params: {
        a: 3,
        b: 2,
        delta: 1.57,
        numPoints: 800,
        showIntersections: true,
        lineWidth: 1.5,
        color: "#0000ff"
    },

    init,
    update,
    draw,

    parameters: null,
    redrawHandler() {
        this.draw();
    }
};

/* ------------------------------------------------------------
   runPattern() — Gallery entry point
------------------------------------------------------------ */
export function runPattern(_ctx) {
    scriptInfo.parameters = scriptInfo.params;
    scriptInfo.init();

    buildParameterControls(
        scriptInfo,
        "tab-scripts",
        true
    );

    scriptInfo.redrawHandler();
}
