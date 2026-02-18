/* draw.js
   ============================================================
   Draw Tab — Public Entry Point and Lifecycle
   ============================================================
   Role:
     Public entry point for the Draw tab. Owns exactly three things:

       1. DrawTabSpec / DrawController — the objects consumed by
          setUI.js and external callers.

       2. Lifecycle functions — initDrawTab(), restoreDrawTab(),
          saveDrawState(). These orchestrate the full tab.

       3. Launch intent — consumeLaunchIfForDraw(), clearLaunch().
          Handles incoming navigation intent from other tabs (e.g.
          clicking a drawRegistry item in Home launches Draw with
          a specific registry entry pre-selected).

   What does NOT live here:
     • Subtab construction, switching, secondaries → draw/drawNav.js
     • Category rendering                          → draw/drawCategories.js
     • Shared module state (idsWithSecondaries)    → draw/drawState.js
     • Caption, action, menu commands, maintenance → drawMenuCmds.js

   Circular dependency note:
     The previous draw.js ↔ drawMenuCmds.js circular import has
     been resolved. draw.js no longer imports drawMenuCmds.js.
     drawMenuCmds.js imports from draw/drawNav.js directly.
   ============================================================ */

import { uiState }                from "./uiState.js";
import { clearDivs, setCommandsButtonLabel } from "./uiUtilities.js";
import { drawActiveTab, setDrawSketchpad } from "./drawRunner.js";
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
}                                 from "./draw/drawNav.js";
import {
  setDrawText,
  collectRegistryEntries,
  groupEntriesByCategory,
  renderDrawCategories
}                                 from "./draw/drawCategories.js";
import {
  clearDrawCaption,
  setDrawCaption,
  setDrawAction,
  buildDrawMenuItems,
  copyActiveDrawObject,
  wireDrawCommandsButton
}                                 from "./drawMenuCmds.js";


/* ============================================================
   Constants
   ============================================================ */
const DEFAULT_DRAW_SUBTAB = "tab-categories";


/* ============================================================
   DrawTabSpec
   ============================================================
   Consumed by setUI.js to activate the Draw tab.
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
  buildCaptionForObject: setDrawCaption,
  buildText:             setDrawText,
  buildAction:           setDrawAction,
  buildSketchpad:        setDrawSketchpad
};


/* ============================================================
   DrawController
   ============================================================
   Public interface for external callers (drawRunner.js,
   drawMenuCmds.js, parameter controls, etc.).
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
  setDrawCaption,
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
   ============================================================
   Cold-start initialiser for the Draw tab.

   Sequence:
     1. Kick secondary discovery async (updates idsWithSecondaries).
        When discovery completes, refresh the category list and
        optionally validate open secondary tabs.
     2. Clear regions and wire the commands button.
     3. Build the subtab bar.
     4. Check for an incoming launch intent from another tab.
        If present, open that registry entry immediately.
     5. Otherwise, activate the previously active subtab or fall
        back to Categories.

   Arguments:
     restored — true when called in Refresh & Restore mode.
                Triggers validateOpenSecondaryTabs() after discovery.
   ============================================================ */
export function initDrawTab(restored = false) {

  if (!uiState.draw.tabs) uiState.draw.tabs = {};

  /* ── 1. Async secondaries discovery ────────────────────── */
  updateSecondariesDiscovery().then(() => {
    /* Refresh the category list now that discovery is complete. */
    if (uiState.draw.activeSubtab === "tab-categories") {
      renderDrawCategories();
    }
    /* In Refresh & Restore mode, prune stale secondary tabs. */
    if (restored) {
      validateOpenSecondaryTabs();
    }
  });

  /* ── 2. Clear and wire ──────────────────────────────────── */
  clearDivs();
  setCommandsButtonLabel("Draw Commands");
  wireDrawCommandsButton();

  /* ── 3. Build subtabs ───────────────────────────────────── */
  setDrawSubtabs();

  /* ── 4. Launch intent ───────────────────────────────────── */
  const intent = consumeLaunchIfForDraw();
  if (intent?.sourceType === "drawRegistry") {
    const entry = window.drawRegistry[intent.registryKey];
    addDrawSubtab({ name: entry.name || intent.registryKey, entry });
    return;
  }

  /* ── 5. Restore active subtab ───────────────────────────── */
  const activeId = uiState.draw.activeSubtab || DEFAULT_DRAW_SUBTAB;

  if (!uiState.draw.tabs[activeId]) {
    /* Active tab was removed — fall back to Categories. */
    uiState.draw.activeSubtab = DEFAULT_DRAW_SUBTAB;
    switchTab(DEFAULT_DRAW_SUBTAB);
  } else {
    switchTab(activeId);
  }

} // end initDrawTab


/* ============================================================
   restoreDrawTab()
   ============================================================
   Restore path — called when returning to the Draw tab after
   a previous visit.

   Disarms any active interactor from the previous session,
   rebuilds the subtab bar, handles any pending launch intent,
   then restores the previously active tab.
   ============================================================ */
function restoreDrawTab() {

  if (window.disarmInteractor) window.disarmInteractor();

  setCommandsButtonLabel("Draw Commands");
  wireDrawCommandsButton();
  setDrawSubtabs();

  /* Handle launch intent (e.g. from Home). */
  const intent = consumeLaunchIfForDraw();
  if (intent?.sourceType === "drawRegistry") {
    const entry = window.drawRegistry[intent.registryKey];
    addDrawSubtab({ name: entry.name, entry });
    return;
  }

  const activeId = uiState.draw.activeSubtab || DEFAULT_DRAW_SUBTAB;

  if (!uiState.draw.tabs[activeId]) {
    /* Active tab no longer exists — show categories. */
    uiState.draw.activeSubtab = DEFAULT_DRAW_SUBTAB;
    clearDivs();
    renderDrawCategories();
    return;
  }

  switchTab(activeId);

} // end restoreDrawTab


/* ============================================================
   saveDrawState()
   ============================================================
   Serialises the current draw tab state into a plain object
   for persistence in uiState.

   Filters out "control" parameters (UI-only controls like
   sliders that drive interaction but are not part of the
   draw object's persistent definition) before saving.
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

      /* Exclude parameters marked as UI controls from the saved snapshot. */
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
   ============================================================
   Checks uiState.launch for a pending intent targeting the Draw
   tab. If found, extracts the intent, clears the launch state,
   and returns the intent object.

   Returns null if there is no pending intent or if the intent
   targets a different tab.
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
   ============================================================
   Resets all fields of uiState.launch to their idle state.
   Called immediately after consuming a launch intent.
   ============================================================ */
function clearLaunch() {

  uiState.launch.pending     = false;
  uiState.launch.sourceTab   = null;
  uiState.launch.targetTab   = null;
  uiState.launch.sourceType  = null;
  uiState.launch.registryKey = null;

} // end clearLaunch
