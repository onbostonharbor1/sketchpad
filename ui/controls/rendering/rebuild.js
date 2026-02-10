/* controls/rendering/rebuild.js
   ============================================================
   REBUILD
   ============================================================ */

/**
 * rebuildControls(sourceInfo, targetTabId)
 * -----------------------------------------------------------
 * CONTROL PANEL REBUILD TRIGGER
 * 
 * PURPOSE:
 * --------
 * Provides a self-contained rebuild mechanism for dynamic
 * control visibility based on group membership.
 * 
 * WHEN THIS IS CALLED:
 * -------------------
 * - Automatically triggered when a control with showsGroup: true changes
 * - Called from change handlers in setSelectControl and setRadioControl
 * 
 * WHAT IT DOES:
 * ------------
 * 1. Rebuilds the control data (applies group filtering)
 * 2. Re-renders the control panel
 * 3. Preserves all parameter values (they live in sourceInfo.parameters)
 * 
 * PARAMETERS:
 * ----------
 * - sourceInfo: The script or tab state object
 * - targetTabId: The tab identifier (e.g., "tab-scripts-1", "tab-draw")
 * 
 */
export function rebuildControls(sourceInfo, targetTabId) {
  // Dynamic import to avoid circular dependency
  // buildParameterControls is in controlsCore.js which imports this file
  import("../controlsCore.js").then(module => {
    module.buildParameterControls(sourceInfo, targetTabId, true);
  });
} // end rebuildControls
