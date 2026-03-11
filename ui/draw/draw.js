/* draw.js
   ============================================================
   Draw Tab -- Public Entry Point and Lifecycle
   ============================================================
   Role:
     Public entry point for the Draw tab. Owns exactly three things:

       1. DrawTabSpec / DrawController -- the objects consumed by
          setUI.js and external callers.

       2. Lifecycle functions -- initDrawTab(), restoreDrawTab(),
          saveDrawState(). These orchestrate the full tab.

       3. Launch intent -- consumeLaunchIfForDraw(), clearLaunch().
          Handles incoming navigation intent from other tabs (e.g.
          clicking a drawRegistry item in Home launches Draw with
          a specific registry entry pre-selected).

   What does NOT live here:
     * Subtab construction, switching, secondaries  -> draw/drawNav.js
     * Category rendering                           -> draw/drawCategories.js
     * Shared module state (idsWithSecondaries)     -> draw/drawTabState.js
     * Caption, action, menu commands, maintenance  -> draw/drawMenuCmds.js
   ============================================================ */

import { uiState }                    from "/ui/uiState.js";
import { clearDivs, setCommandsButtonLabel } from "/ui/uiUtilities.js";
import { drawActiveTab, setDrawSketchpad }   from "/ui/drawRunner.js";
import {
  setDrawSubtabs,
  addDrawSubtab,
  deleteTab,
  switchTab,
  markTabDirty,
  markTabClean,
  updateSecondariesDiscovery,
  validateOpenSecondaryTabs,
  showSecondaryOffcanvas,
  loadSecondaryObjectInTab
}                                           from "/ui/draw/drawNav.js";
import {
  setDrawText,
  collectRegistryEntries,
  groupEntriesByCategory,
  renderDrawCategories
}                                           from "/ui/draw/drawCategories.js";
import {
  clearDrawCaption,
  updateDrawCaption,
  setDrawAction,
  buildDrawMenuItems,
  copyActiveDrawObject,
  wireDrawCommandsButton
}                                           from "/ui/draw/drawMenuCmds.js";


/* ============================================================
   Constants
   ============================================================ */
const DEFAULT_DRAW_SUBTAB = "tab-categories";


/* ============================================================
   DrawTabSpec
   ============================================================ */
export const DrawTabSpec = {
  name:    "draw",
  theme:   "theme-draw",
  regions: ["subtabs", "sketchpad", "caption", "text", "action"],

  init:    initDrawTab,
  restore() { restoreDrawTab(); },
  save:    saveDrawState,

  buildSubtabs:          setDrawSubtabs,
  clearCaption:          clearDrawCaption,
  buildCaptionForObject: updateDrawCaption,
  buildText:             setDrawText,
  buildAction:           setDrawAction,
  buildSketchpad:        setDrawSketchpad
};


/* ============================================================
   DrawController
   ============================================================ */
export const DrawController = {
  initDrawTab,
  drawActiveTab,
  saveDrawState,
  setDrawSubtabs,
  addDrawSubtab,
  deleteTab,
  switchTab,
  markTabDirty,
  markTabClean,
  clearCanvas:          null, /* set by drawRunner at startup */
  setDrawAction,
  clearDrawCaption,
  updateDrawCaption,
  setDrawSketchpad,
  setDrawText,
  copyActiveDrawObject,
  buildDrawMenuItems,
  collectRegistryEntries,
  groupEntriesByCategory,
  renderDrawCategories
};


/* ============================================================
   initDrawTab(restored)
   ============================================================ */
export function initDrawTab(restored = false) {

  if (!uiState.draw.tabs) uiState.draw.tabs = {};

  /* 1. Async secondaries discovery */
  updateSecondariesDiscovery().then(() => {
    if (uiState.draw.activeSubtab === "tab-categories") {
      renderDrawCategories();
    }
    if (restored) {
      validateOpenSecondaryTabs();
    }
  });

  /* 2. Clear and wire */
  clearDivs();
  setCommandsButtonLabel("Draw Commands");
  wireDrawCommandsButton();

  /* 3. Build subtabs */
  setDrawSubtabs();

  /* 4. Launch intent */
  const intent = consumeLaunchIfForDraw();
  if (intent?.sourceType === "drawRegistry") {
    const entry = window.drawRegistry[intent.registryKey];
    addDrawSubtab({ name: entry.name || intent.registryKey, entry });
    return;
  }

  /* 5. Restore active subtab */
  const activeId = uiState.draw.activeSubtab || DEFAULT_DRAW_SUBTAB;

  if (!uiState.draw.tabs[activeId]) {
    uiState.draw.activeSubtab = DEFAULT_DRAW_SUBTAB;
    switchTab(DEFAULT_DRAW_SUBTAB);
  } else {
    switchTab(activeId);
  }

} // end initDrawTab


/* ============================================================
   restoreDrawTab()
   ============================================================ */
function restoreDrawTab() {

  if (window.disarmInteractor) window.disarmInteractor();

  setCommandsButtonLabel("Draw Commands");
  wireDrawCommandsButton();
  setDrawSubtabs();

  const intent = consumeLaunchIfForDraw();
  if (intent?.sourceType === "drawRegistry") {
    const entry = window.drawRegistry[intent.registryKey];
    addDrawSubtab({ name: entry.name, entry });
    return;
  }

  const activeId = uiState.draw.activeSubtab || DEFAULT_DRAW_SUBTAB;

  if (!uiState.draw.tabs[activeId]) {
    uiState.draw.activeSubtab = DEFAULT_DRAW_SUBTAB;
    clearDivs();
    renderDrawCategories();
    return;
  }

  switchTab(activeId);

} // end restoreDrawTab


/* ============================================================
   saveDrawState()
   ============================================================ */
export function saveDrawState() {

  const shallowTabs = {};

  for (const [id, info] of Object.entries(uiState.draw.tabs || {})) {
    let key         = null;
    let savedParams = {};

    if (info.drawRegistry) {
      key = Object.keys(window.drawRegistry).find(
        (k) => window.drawRegistry[k] === info.drawRegistry
      );

      const allParams = info.parameters || {};
      const controls  = info.drawRegistry.controls || {};

      for (const pKey in allParams) {
        const def = controls[pKey];
        if (def && def.control) continue;
        savedParams[pKey] = allParams[pKey];
      }
    } else {
      savedParams = info.parameters || {};
    }

    shallowTabs[id] = {
      type:         info.type,
      dirty:        info.dirty,
      parameters:   structuredClone(savedParams),
      drawRegistry: key,
      showControls: info.showControls ?? false
    };
  }

  return {
    activeDrawTab: uiState.draw.activeSubtab || null,
    drawTabs:      shallowTabs
  };

} // end saveDrawState


/* ============================================================
   consumeLaunchIfForDraw()
   ============================================================ */
function consumeLaunchIfForDraw() {

  if (!uiState.launch)         throw new Error("consumeLaunchIfForDraw: uiState.launch missing");
  if (!uiState.launch.pending) return null;
  if (uiState.launch.targetTab !== "draw") return null;

  const intent = {
    sourceTab:   uiState.launch.sourceTab,
    sourceType:  uiState.launch.sourceType,
    registryKey: uiState.launch.registryKey
  };

  clearLaunch();
  return intent;

} // end consumeLaunchIfForDraw


/* ============================================================
   clearLaunch()
   ============================================================ */
function clearLaunch() {

  uiState.launch.pending     = false;
  uiState.launch.sourceTab   = null;
  uiState.launch.targetTab   = null;
  uiState.launch.sourceType  = null;
  uiState.launch.registryKey = null;

} // end clearLaunch
