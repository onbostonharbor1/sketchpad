/* patterns.js
   ============================================================
   Patterns Tab -- Public Entry Point and Lifecycle
   ============================================================
   Role:
     Public entry point for the Patterns tab. Owns exactly
     three things:

       1. PatternsTabSpec -- the object consumed by setUI.js to
          drive tab activation (init / restore / save).

       2. Lifecycle functions -- initPatternsTab(), restorePatternsTab(),
          savePatternsState(), rehydratePatternsState().

       3. Cache loading -- ensurePatternsManifestLoaded().

   What does NOT live here:
     * Subtab construction and category rendering -- patterns/patternsNav.js
     * Pattern display and prev/next navigation   -- patterns/patternsDisplay.js
     * Caption bar, menu items, commands panel    -- patterns/patternsMenuCmds.js
     * Shared module-level state variables        -- patterns/patternsState.js
   ============================================================ */

import { manifest }                from "/ui/manifest.js";
import { setCommandsButtonLabel }  from "/ui/uiUtilities.js";
import {
  resetPatternsState,
  setCurrentCategory,
  setCurrentIndex
}                                  from "/ui/patterns/patternsState.js";
import {
  setPatternsSubtabs,
  addPatternSubtab,
  showCategoryList,
  clearPatternsCaption
}                                  from "/ui/patterns/patternsNav.js";
import { showSelectedPattern }     from "/ui/patterns/patternsDisplay.js";
import { wirePatternsCommandsButton } from "/ui/patterns/patternsMenuCmds.js";


/* ============================================================
   Constants
   ============================================================ */
const CATEGORIES_ID = "patterns-categories";
const PATTERN_ID    = "patterns-pattern";


/* ============================================================
   PatternsTabSpec
   ============================================================ */
export const PatternsTabSpec = {
  name:   "patterns",
  theme:  "theme-patterns",
  regions: ["caption", "text", "sketchpad", "action"],

  init:    initPatternsTab,
  restore: restorePatternsTab,
  save:    savePatternsState,

  buildCaption:  () => {},
  buildText:     () => {},
  buildSketchpad: () => {},
  buildAction:   () => {}
};


/* ============================================================
   PatternsController
   ============================================================ */
export const PatternsController = {
  initPatternsTab,
  showCategoryList,
  showSelectedPattern,
  onPrev: () => import("/ui/patterns/patternsDisplay.js").then(m => m.onPrev()),
  onNext: () => import("/ui/patterns/patternsDisplay.js").then(m => m.onNext())
};


/* ============================================================
   ensurePatternsManifestLoaded()
   ============================================================ */
export async function ensurePatternsManifestLoaded() {
  await manifest.get("patterns");
} // end ensurePatternsManifestLoaded


/* ============================================================
   initPatternsTab(restored)
   ============================================================ */
export async function initPatternsTab(restored) {

  if (!uiState.patterns) uiState.patterns = {};

  // Remove the "Pattern" subtab if it exists
  const patternBtn = document.querySelector(`[data-tab-id="${PATTERN_ID}"]`);
  if (patternBtn) patternBtn.parentElement.remove();

  setCommandsButtonLabel("Patterns Commands");
  wirePatternsCommandsButton();

  await ensurePatternsManifestLoaded();

  setPatternsSubtabs();

  if (restored && uiState.patterns.saved) {
    await restorePatternsTab();
    return;
  }

  resetPatternsState();

  uiState.patterns.activeCategory = null;
  uiState.patterns.activeItem     = null;
  uiState.patterns.saved = {
    view:           "categories",
    activeCategory: null,
    activeItem:     null
  };

  await showCategoryList();

} // end initPatternsTab


/* ============================================================
   restorePatternsTab()
   ============================================================ */
export async function restorePatternsTab() {

  const saved = uiState.patterns?.saved;
  if (!saved) return initPatternsTab(false);

  setCommandsButtonLabel("Patterns Commands");
  wirePatternsCommandsButton();
  await ensurePatternsManifestLoaded();
  setPatternsSubtabs();

  if (saved.view === "pattern") {
    const cat   = saved.activeCategory;
    const cache = manifest.getCategoryMap("patterns");
    const list  = cache?.[cat] || [];

    if (list.length === 0) {
      await showCategoryList();
      return;
    }

    let idx = saved.activeItem;
    if (typeof idx !== "number" || idx < 0) idx = 0;
    if (idx >= list.length) idx = list.length - 1;

    setCurrentCategory(cat);
    setCurrentIndex(idx);
    uiState.patterns.activeCategory  = cat;
    uiState.patterns.activeItem      = idx;
    uiState.patterns.saved.activeItem = idx;

    addPatternSubtab(cat);
    await showSelectedPattern(cat, idx);
  } else {
    await showCategoryList();
  }

} // end restorePatternsTab


/* ============================================================
   savePatternsState()
   ============================================================ */
export function savePatternsState() {

  if (!uiState.patterns || !uiState.patterns.saved) {
    return {
      view:           "categories",
      activeCategory: null,
      activeItem:     null
    };
  }

  return {
    view:           uiState.patterns.saved.view,
    activeCategory: uiState.patterns.saved.activeCategory,
    activeItem:     uiState.patterns.saved.activeItem
  };

} // end savePatternsState


/* ============================================================
   rehydratePatternsState()
   ============================================================ */
export function rehydratePatternsState() {

  const saved = sessionStorage.getItem("sketchpad.patterns.saved");
  if (!saved) return;

  if (!uiState.patterns) uiState.patterns = {};

  const parsed = JSON.parse(saved);
  uiState.patterns.saved = parsed;

  setCurrentCategory(parsed.activeCategory || null);
  setCurrentIndex(parsed.activeItem || null);

} // end rehydratePatternsState
