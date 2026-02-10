/* controls/controlsCore.js
   ============================================================
   PARAMETER CONTROLS - CORE MODULE
   
   Main orchestrator that ties all modules together and provides
   the public API. This is what the facade re-exports.
   ============================================================ */

// ============================================================
// PUBLIC API EXPORTS
// ============================================================

// Builders
export {
  buildDrawParameterData,
  buildScriptParameterData
} from "./builders/dataBuilder.js";

export { filterControlsByActiveGroups } from "./builders/groupFilter.js";

// Rendering
export {
  renderParameterControls,
  buildSingleControl
} from "./rendering/renderer.js";

export { rebuildControls } from "./rendering/rebuild.js";

// ============================================================
// MAIN ENTRY POINT
// ============================================================

import { buildDrawParameterData, buildScriptParameterData } from "./builders/dataBuilder.js";
import { renderParameterControls } from "./rendering/renderer.js";

/**
 * buildParameterControls()
 * -----------------------------------------------------------
 * UNIVERSAL ENTRY POINT (ROUTER)
 *
 * This function determines which environment is active
 * (Draw tab, Scripts tab, etc.) and delegates to the
 * appropriate data builder.
 *
 * The "environment" here means:
 *   - Which top-level tab is active (Draw, Scripts, etc.)
 *   - Which tab-specific ACTION AREA will receive controls
 *     when renderParameterControls() is invoked.
 *
 * Typical environments:
 *   - Draw tab      -> #tab-draw -> action panel
 *   - Scripts tab   -> #tab-scripts -> action panel
 *   - Other tabs    -> future extensions
 *
 * This function is intentionally generic and delegates:
 *   - data extraction -> tab-specific builders
 *   - DOM rendering   -> renderParameterControls()
 */
export function buildParameterControls(
  sourceInfo,
  targetTabId = "tab-generic",
  render = true
) {
  let controlData = [];

  // ---------------------------------------------------------
  // AUTO-DETECT ENVIRONMENT (CRITICAL FIX)
  // ---------------------------------------------------------
  // If caller did not provide a specific tab id, infer the
  // correct builder from the shape of sourceInfo.
  //
  // Utilities Lab passes scriptInfo directly.
  // scriptInfo has: { parameters, controls, redrawHandler, ... }
  //
  // Draw passes a tabState with: { drawRegistry, parameters, ... }
  // ---------------------------------------------------------
  if (targetTabId === "tab-generic") {

    // ScriptInfo path (Utilities / Scripts-style)
    if (sourceInfo && sourceInfo.controls) {
      controlData = buildScriptParameterData(sourceInfo);
    }

    // Draw tabState path
    else if (sourceInfo && sourceInfo.drawRegistry) {
      controlData = buildDrawParameterData(sourceInfo);
    }

    // Unknown shape -> no controls
    else {
      controlData = [];
    }

  } else if (targetTabId.startsWith("tab-scripts")) {

    controlData = buildScriptParameterData(sourceInfo);

  } else if (targetTabId.startsWith("tab-draw")) {

    controlData = buildDrawParameterData(sourceInfo);

  } else {

    // Fallback: if caller provided some other tab id, still try shape-based inference
    if (sourceInfo && sourceInfo.controls) {
      controlData = buildScriptParameterData(sourceInfo);
    } else if (sourceInfo && sourceInfo.drawRegistry) {
      controlData = buildDrawParameterData(sourceInfo);
    } else {
      controlData = [];
    }
  }

  if (render) {
    renderParameterControls(sourceInfo, controlData, targetTabId);
  }

  return controlData;
} // end buildParameterControls
