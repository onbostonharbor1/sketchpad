
/* drawRunner.js
   ------------------------------------------------------------
   Drawing Execution & Transformation Engine
   ------------------------------------------------------------
   Responsibilities:
     - Render active drawRegistry objects to the shared canvas
     - Manage the #sketchpad DOM and interaction overlay sync
     - Handle coordinate alignment for the interaction layer
     (The export of a Draw object as a Pattern script is in ui/menuCmds.js.)
   ------------------------------------------------------------ */

import { uiState }               from "/ui/uiState.js";
import { resetCanvas }           from "/draw/drawState.js";
import { buildParameterControls } from "/ui/parameterControls.js";
import { markTabDirty }           from "/ui/draw/drawNav.js";
import { syncLayerToCanvas as syncOverlayToCanvas } from "/ui/canvasLayerManager.js";
import { canvasLayerManager } from "/ui/canvasLayerManager.js";

/**
 * drawActiveTab()
 * Core execution logic for the active Draw object.
 */

/**
 * drawActiveTab()
 * Core execution logic for the active Draw object.
 */
export function drawActiveTab() {
  const tabId = uiState.draw.activeSubtab;
  const info = uiState.draw.tabs[tabId];

  if (!info || info.type !== "object" || !info.drawRegistry) return;

  const entry = info.drawRegistry;

  // Ensure wrapper is visible
  const wrapper = document.getElementById("sketchpad-wrapper");
  if (wrapper) wrapper.style.display = "flex";

  const sketchpad = document.getElementById("sketchpad");
  if (!sketchpad) throw new Error("drawActiveTab: #sketchpad not found");

  sketchpad.innerHTML = "";

  const canvas = window.drawCanvas;
  if (!canvas) throw new Error("drawActiveTab: window.drawCanvas missing");

  sketchpad.appendChild(canvas);

  if (!ctx) throw new Error("drawActiveTab: global ctx missing");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sync the interaction layer (and future layers) via canvasLayerManager
  syncOverlayToCanvas("interaction", canvas);
  syncOverlayToCanvas("guides", canvas);

  const state = uiState.draw.tabs[tabId];
  if (!state) throw new Error("drawActiveTab: missing tab state");

  state.redrawHandler = drawActiveTab;
  state.onParamChange = () => markTabDirty(tabId);

  buildParameterControls(state, "tab-draw", true);

  try {
    const params = (state.parameters = entry.params);
    entry.update(params);
    entry.draw();

    // --- NEW: Render the ghost skeleton for Line 1 ---
    renderScaffoldGuides(entry);

  } catch (err) {
    console.error("✗ Error redrawing " + entry.name, err);
  }
} // end drawActiveTab

/**
 * Renders the dashed scaffolding for the active drawing's primary arm.
 * Targets the 'guides' canvas layer managed by canvasLayerManager.
 */
function renderScaffoldGuides(entry) {
  // 1. Safety check: Does this entry have a master scaffold Line?
  if (!entry.elements || !entry.elements.l1) return;

  try {
    const guideCanvas = canvasLayerManager.get("guides");
    const mainCanvas = window.drawCanvas;

    const gCtx = guideCanvas.getContext("2d");
    const l1 = entry.elements.l1;

    // 2. Clear the specific guides layer
    gCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);

    // 3. Draw the ghost line
    gCtx.save();
    gCtx.strokeStyle = "rgba(180, 180, 180, 0.4)"; // Subtle gray
    gCtx.lineWidth = 1.5;
    gCtx.setLineDash([8, 4]); // Dashed

    gCtx.beginPath();
    gCtx.moveTo(l1.start.x, l1.start.y);
    gCtx.lineTo(l1.end.x, l1.end.y);
    gCtx.stroke();

    gCtx.restore();
  } catch (err) {
    // Fail silently if the guides layer isn't initialized yet
    console.warn("renderScaffoldGuides: guides layer not available", err);
  }
} // end renderScaffoldGuides

/**
 * setDrawSketchpad(item)
 */
export function setDrawSketchpad(item) {
  const tabId = "tab-" + item.name.replace(/\s+/g, "-").toLowerCase();
  uiState.draw.activeSubtab = tabId;
  drawActiveTab();
} // end setDrawSketchpad

/**
 * clearCanvas()
 */
export function clearCanvas() {
  if (!ctx) return;
  ctx.clearRect(0, 0, window.drawCanvas.width, window.drawCanvas.height);
} // end clearCanvas
