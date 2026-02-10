/* ============================================================================
   VARIED ELLIPSE - Gallery Script
   ============================================================================

   Simple ellipse chord pattern with variation controls:
   - spacingBias: Non-uniform point distribution
   - jitter: Random displacement of points
   - jitterMode: Direction of jitter (radial, tangent, xy)

   ============================================================================ */

import { buildParameterControls } from "/ui/parameterControls.js";
import { Ellipse, TAPER, START_END, FULL, START_TAPER, END_TAPER } from "/classes/ellipseClass.js";
import { Point } from "/classes/classes.js";
import { drawInVariedEllipse } from "/draw/drawEllipse.js";

export const scriptInfo = {
  title: "Varied Ellipse Chords",

  params: {
    midpoint: { x: 350, y: 300 },
    color: "blue",
    lineWidth: 1,
    ellipse: { a: 400, b: 200 },
    numNodes: 120,
    chordLength: 20,
    startSkip: 0,
    endSkip: 0,
    withinCirc: TAPER,
    rotate: 0,
    xScale: 1,
    yScale: 1,
    spacingBias: 0.0,
    jitter: 0.0,
    jitterMode: "radial",
    points: []  // Required for interactor
  },

  parameters: null,
  elements: null,

  controls: {
    withinCirc: {
      label: "Mode",
      widget: "select",
      options: [
        { value: START_END, label: "Start—End" },
        { value: FULL, label: "Full" },
        { value: TAPER, label: "Taper (Both)" },
        { value: START_TAPER, label: "Start Taper" },
        { value: END_TAPER, label: "End Taper" }
      ]
    },
    ellipse_a: { label: "Width", widget: "range", min: 50, max: 600, step: 10 },
    ellipse_b: { label: "Height", widget: "range", min: 50, max: 600, step: 10 },
    chordLength: { label: "Chord length", widget: "range", min: 10, max: 50, step: 1 },
    numNodes: { label: "# Nodes", widget: "range", min: 50, max: 400, step: 5 },
    rotate: { label: "Rotation", widget: "range", min: 0, max: 360, step: 5 },

    variationGroup: { widget: "staticText", text: "--- VARIATION ---" },
    spacingBias: { label: "Spacing bias", widget: "range", min: -1.0, max: 1.0, step: 0.01 },
    jitter: { label: "Jitter amount", widget: "range", min: 0.0, max: 30.0, step: 0.5 },
    jitterMode: { label: "Jitter mode", widget: "select", options: ["radial", "tangent", "xy"] },

    styleGroup: { widget: "staticText", text: "--- STYLE ---" },
    color: { label: "Color", widget: "color" },
    lineWidth: { label: "Line width", widget: "range", min: 0.5, max: 5, step: 0.5 }
  },

  onParamChange() {},
  redrawHandler: null
};

/**
 * Initialize - called once when script loads
 */
function init() {
  const p = scriptInfo.params;

  // Initialize points array for draggable center
  if (p.points.length === 0) {
    p.points.push({ x: p.midpoint.x, y: p.midpoint.y });
  }

  const pt = p.points[0];
  scriptInfo.elements = {
    ellipse: new Ellipse({
      ...p,
      midpoint: new Point(pt.x, pt.y)
    })
  };
}

/**
 * Update - called when parameters change
 */
function update(incoming) {
  const e = scriptInfo.elements.ellipse;

  for (const key in incoming) {
    const val = incoming[key];
    if (val === undefined) continue;

    if (key === "points") {
      // Update midpoint from dragged point
      const p = scriptInfo.params.points[0];
      e.midpoint.x = p.x;
      e.midpoint.y = p.y;
    } else if (key === "ellipse_a") {
      // Map ellipse_a control to ellipse.a
      e.ellipse.a = val;
    } else if (key === "ellipse_b") {
      // Map ellipse_b control to ellipse.b
      e.ellipse.b = val;
    } else if (Object.hasOwn(e, key)) {
      // Direct property assignment
      e[key] = val;
    }
  }
}

/**
 * Draw - renders the ellipse
 */
function draw() {
  drawInVariedEllipse(scriptInfo.elements.ellipse);
}

/**
 * Entry point for the Gallery system
 */
export function runPattern() {
  scriptInfo.parameters = scriptInfo.params;

  // Initialize once
  init();

  // Build parameter controls
  buildParameterControls(scriptInfo, "tab-scripts", true);

  // Set up redraw handler (required for interactor)
  scriptInfo.redrawHandler = () => {
    // Update elements from current params
    update(scriptInfo.params);
    // Clear and draw
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    draw();
  };

  // Initial draw
  scriptInfo.redrawHandler();

  // Arm interactor for draggable center point
  if (window.armInteractor) {
    window.armInteractor(scriptInfo);
  }
}
