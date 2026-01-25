/* ===========================================================
   setCanvasSize.js – Tools script
   -----------------------------------------------------------
   Directly updates the drawState canvas dimensions.
=========================================================== */

import { drawState } from "/draw/drawState.js";
import { buildScriptParameterData, renderParameterControls } from "/ui/parameterControls.js";

// Capture session start from drawState
const initialWidth = drawState.canvasWidth;
const initialHeight = drawState.canvasHeight;

/* ===========================================================
   runPattern()
=========================================================== */
export function runPattern() {

  const sourceInfo = {
    parameters: {
      width: drawState.canvasWidth,
      height: drawState.canvasHeight
    },

    controls: {
      reset: {
        label: "Reset to Original Size",
        widget: "button",
        action: () => {
          // Manually reset the text boxes in the UI
          const wInput = document.getElementById("tab-tools-width");
          const hInput = document.getElementById("tab-tools-height");
          if (wInput) wInput.value = initialWidth;
          if (hInput) hInput.value = initialHeight;

          applyCanvasChanges({ width: initialWidth, height: initialHeight });
        } // end action
      },
      width: {
        label: "Width (px):",
        widget: "text"
      },
      height: {
        label: "Height (px):",
        widget: "text"
      },
      apply: {
        label: "Apply New Size",
        widget: "button",
        action: () => {
           const wVal = document.getElementById("tab-tools-width").value;
           const hVal = document.getElementById("tab-tools-height").value;
           applyCanvasChanges({ width: wVal, height: hVal });
        } // end action
      } // end apply
    },

    redrawHandler() {}
  };

  renderParameterControls(
    sourceInfo,
    buildScriptParameterData(sourceInfo),
    "tab-tools"
  );

  // Initialize the text boxes with the current state values
  const wInput = document.getElementById("tab-tools-width");
  const hInput = document.getElementById("tab-tools-height");
  if (wInput) wInput.value = drawState.canvasWidth;
  if (hInput) hInput.value = drawState.canvasHeight;

  const startMsg = "Enter changed values and press apply.";
  updateFeedbackDisplay(startMsg);

  return `<p>${startMsg}</p>`;

} // end runPattern


/* ------------------------------------------------------------
   applyCanvasChanges(params)
------------------------------------------------------------ */
function applyCanvasChanges(params) {
  const w = Number(params.width);
  const h = Number(params.height);

  if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
    updateFeedbackDisplay("Invalid dimensions. Please use positive numbers.");
    return;
  }

  // Update State Mirror variables
  drawState.canvasWidth = w;
  drawState.canvasHeight = h;

  // Also update the physical canvas if it exists in this context
  const mainCanvas = document.getElementById("sharedCanvas");
  if (mainCanvas) {
    mainCanvas.width = w;
    mainCanvas.height = h;
  }

  updateFeedbackDisplay(`Canvas state set to ${w} x ${h}.`);

} // end applyCanvasChanges


/* ------------------------------------------------------------
   updateFeedbackDisplay(msg)
------------------------------------------------------------ */
function updateFeedbackDisplay(msg) {
  const textDiv = document.getElementById("text");
  if (textDiv) {
    textDiv.innerHTML = `<p>${msg}</p>`;
  }
} // end updateFeedbackDisplay

// end setCanvasSize.js
