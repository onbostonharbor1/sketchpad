/* drawRunner.js
   ------------------------------------------------------------
   Drawing Execution & Transformation Engine
   ------------------------------------------------------------
   Responsibilities:
     - Render active drawRegistry objects to the shared canvas
     - Manage the #sketchpad DOM and interaction overlay sync
     - Handle coordinate alignment for the interaction layer
     - Export drawRegistry state to standalone Pattern scripts
   ------------------------------------------------------------ */

import { uiState }               from "./uiState.js";
import { resetCanvas }           from "/draw/drawState.js";
import { buildParameterControls } from "./parameterControls.js";
import { markTabDirty }           from "./draw.js";
import { syncOverlayToCanvas }    from "./uiUtilities.js";

/**
 * drawActiveTab()
 * Core execution logic for the active Draw object.
 */

export function drawActiveTab() {
  const tabId = uiState.draw.activeSubtab;
  const info = uiState.draw.tabs[tabId];

  if (!info || info.type !== "object" || !info.drawRegistry) return;

  const entry = info.drawRegistry;
  const sketchpad = document.getElementById("sketchpad");
  if (!sketchpad) throw new Error("drawActiveTab: #sketchpad not found");

  sketchpad.innerHTML = "";

  const canvas = window.drawCanvas;
  if (!canvas) throw new Error("drawActiveTab: window.drawCanvas missing");

  sketchpad.appendChild(canvas);

  if (!ctx) throw new Error("drawActiveTab: global ctx missing");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sync the interaction layer (and future layers) via uiUtilities
  syncOverlayToCanvas("interaction", canvas);

  const state = uiState.draw.tabs[tabId];
  if (!state) throw new Error("drawActiveTab: missing tab state");

  state.redrawHandler = drawActiveTab;
  state.onParamChange = () => markTabDirty(tabId);

  buildParameterControls(state, "tab-draw", true);

  try {
    const params = (state.parameters = entry.params);
    entry.update(params);
    entry.draw();
  } catch (err) {
    console.error("✗ Error redrawing " + entry.name, err);
  }
} // end drawActiveTab

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

/**
 * createPatternScriptTextFromDrawRegistry(entry, params)
 * Note: Template string imports are now strictly at the top.
 */
export function createPatternScriptTextFromDrawRegistry(entry, params) {
  if (!entry) throw new Error("createPatternScriptTextFromDrawRegistry: entry missing");
  if (!params) throw new Error("createPatternScriptTextFromDrawRegistry: params missing");

  const title = entry.name.trim();
  const paramsJson = JSON.stringify(params, null, 2);
  const controlsJson = entry.controls ? JSON.stringify(entry.controls, null, 2) : "null";

  return `import { resetCanvas } from "/ui/drawState.js";

/* ============================================================
    PATTERN EXPORT: ${escapeForBlockComment(title)}
============================================================ */

export const scriptInfo = {
  title: ${JSON.stringify(title)},
  params: ${paramsJson},
  controls: ${controlsJson},
  parameters: null,
  onParamChange() {}, 
  redrawHandler: null
};

export async function runPattern() {
  scriptInfo.parameters = scriptInfo.params;
  resetCanvas();

  const idName = "__DRAW_REGISTRY_ID__";
  const mod = await import(/* @vite-ignore */ \`/drawRegistry/\${idName}.js?t=\${Date.now()}\`);

  if (!window.drawRegistry) throw new Error("Pattern export: window.drawRegistry missing");

  const entry = window.drawRegistry[idName];
  if (!entry) throw new Error("Pattern export: drawRegistry entry not found: " + idName);

  entry.params = structuredClone(scriptInfo.params);
  entry.init();
  entry.update(entry.params);
  entry.draw(entry.params);

  return null;
} // end runPattern
`;
} // end createPatternScriptTextFromDrawRegistry

function escapeForBlockComment(s) {
  return String(s).replace(/\*\//g, "* /");
} // end escapeForBlockComment
