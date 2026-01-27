/* ============================================================
   Lissajous Curve (Static)
   Gallery Script (ParameterControls-integrated)

   REWRITTEN FOR:
   - Parametric Class (/classes/parametric.js)
   - drawParametric Engine (/draw/drawParametrics.js)
   ============================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";
import { drawParametric } from "/draw/drawParametrics.js";
import { Parametric } from "/classes/parametric.js";

/**
 * draw()
 * Now creates a "pure model" Parametric object and delegates
 * the actual drawing and scaling to the centralized engine.
 */
function draw() {
    const p = scriptInfo.params;

    // Define the Lissajous using the declarative "Pure Model" philosophy
    const lissajous = new Parametric({
        // The mathematical definition
        funcX: (t) => Math.sin(p.a * t + p.delta),
        funcY: (t) => Math.sin(p.b * t),

        // Rendering style
        color: p.color,
        lineWidth: p.lineWidth,
        showIntersections: true, // Highlights the woven intersections

        // Sampling domain
        domain: {
            tMin: 0,
            tMax: 2 * Math.PI,
            numPoints: p.numPoints
        }
    });

    // Delegate to the engine: handles Auto-Fit, Circuit Breaking, and Drawing
    drawParametric(lissajous);
}

/* ------------------------------------------------------------
   Lifecycle functions for ParameterControls compatibility
------------------------------------------------------------ */

function init() {
    // Initialization logic if needed for complex state
}

function update(params) {
    // Update the live params object with values from the UI
    for (const key in params) {
        scriptInfo.params[key] = params[key];
    }
}

/* ------------------------------------------------------------
   scriptInfo (ParameterControls contract)
------------------------------------------------------------ */
export const scriptInfo = {
    title: "Lissajous Curve",

    // UI Widget definitions
    controls: {
        a:         { label: "a (freq x)",   widget: "range", min: 1,   max: 10,   step: 1,    default: 3 },
        b:         { label: "b (freq y)",   widget: "range", min: 1,   max: 10,   step: 1,    default: 2 },
        delta:     { label: "δ (phase)",    widget: "range", min: 0,   max: 6.28, step: 0.01, default: 1.57 },
        numPoints: { label: "Complexity",   widget: "range", min: 100, max: 2000, step: 100,  default: 800 },
        lineWidth: { label: "Line Width",   widget: "range", min: 0.5, max: 5.0,  step: 0.5,  default: 1.5 },
        color:     { label: "Color",        widget: "colorPicker",                            default: "#0000ff" }
    },

    // Current state values
    params: {
        a: 3,
        b: 2,
        delta: 1.57,
        numPoints: 800,
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
export function runPattern() {
    scriptInfo.parameters = scriptInfo.params;
    scriptInfo.init();

    buildParameterControls(
        scriptInfo,
        "tab-scripts",
        true
    );

    scriptInfo.redrawHandler();
}
