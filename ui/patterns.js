/* patterns.js
   ============================================================
   Patterns Tab — Public Entry Point and Lifecycle
   ============================================================
   Role:
     This is the public entry point for the Patterns tab.
     It owns exactly three things:

       1. PatternsTabSpec — the object consumed by setUI.js to
          drive tab activation (init / restore / save).

       2. Lifecycle functions — initPatternsTab(), restorePatternsTab(),
          savePatternsState(), rehydratePatternsState(). These are
          the only functions that orchestrate the full tab.

       3. Cache loading — ensurePatternsManifestLoaded(). This lives
          here because it is called by both init and restore, and
          also by refreshPatternsFromManifestEdit() in patternsMenuCmds.js
          via dynamic import.

   What does NOT live here:
     • Subtab construction and category rendering → patterns/patternsNav.js
     • Pattern display and prev/next navigation   → patterns/patternsDisplay.js
     • Caption bar, menu items, commands panel    → patterns/patternsMenuCmds.js
     • Shared module-level state variables        → patterns/patternsState.js

   Import structure:
     patterns.js imports from the patterns/ sub-modules.
     Sub-modules import from patterns.js only via dynamic import()
     to avoid circular references (e.g. patternsMenuCmds.js needs
     initPatternsTab and restorePatternsTab for the rebuild handler).
   ============================================================ */

import { manifest } from "./manifest.js";
import {
  setCommandsButtonLabel
} from "./uiUtilities.js";
import {
  resetPatternsState,
  setPatternsCache,
  getPatternsCache,
  setCurrentCategory,
  setCurrentIndex
} from "./patterns/patternsState.js";
import {
  setPatternsSubtabs,
  addPatternSubtab,
  showCategoryList,
  clearPatternsCaption
} from "./patterns/patternsNav.js";
import {
  showSelectedPattern
} from "./patterns/patternsDisplay.js";
import {
  wirePatternsCommandsButton
} from "./patterns/patternsMenuCmds.js";


/* ============================================================
   Constants — permanent subtab IDs
   ============================================================ */
const CATEGORIES_ID = "patterns-categories";
const PATTERN_ID    = "patterns-pattern";


/* ============================================================
   PatternsTabSpec
   ============================================================
   Consumed by setUI.js to activate the Patterns tab.

   setUI.js calls:
     init(restored)  — on cold start or after needsUpdate
     restore()       — when uiState.patterns.saved exists
     save()          — before leaving the tab (optional)
   ============================================================ */
export const PatternsTabSpec = {
  name: "patterns",
  theme: "theme-patterns",
  regions: ["caption", "text", "sketchpad", "action"],

  init: initPatternsTab,        // cold-start only
  restore: restorePatternsTab,  // rebuild from saved uiState
  save: savePatternsState,      // optional persistence hook

  buildCaption: () => {},
  buildText: () => {},
  buildSketchpad: () => {},
  buildAction: () => {}
};


/* ============================================================
   PatternsController
   ============================================================
   Exposes the public action surface used by external callers
   (e.g. overlay prev/next buttons wired in setUI.js).
   ============================================================ */
export const PatternsController = {
  initPatternsTab,
  showCategoryList,
  showSelectedPattern,
  onPrev: () => import("./patterns/patternsDisplay.js")
    .then(m => m.onPrev()),
  onNext: () => import("./patterns/patternsDisplay.js")
    .then(m => m.onNext())
};


/* ============================================================
   ensurePatternsManifestLoaded()
   ============================================================
   Loads the patterns manifest once and caches it into
   patternsState as:
     {
       categoryName: [ entry, entry, ... ],
       ...
     }

   Returns immediately if the cache is already populated.
   Called by init, restore, and (via dynamic import) by
   refreshPatternsFromManifestEdit() in patternsMenuCmds.js.

   Cache invalidation:
     Call setPatternsCache(null) before calling this function
     to force a reload from disk (e.g. after a rebuild).
   ============================================================ */
export async function ensurePatternsManifestLoaded() {
  
  /* Return immediately if cache is already warm. */
  const existing = getPatternsCache();
  if (existing && Object.keys(existing).length > 0) return;

  /* Load the patterns manifest. */
  const raw      = await manifest.get("patterns");
  const registry = manifest.getRegistry("patterns");

  if (!raw || !registry) {
    throw new Error("ensurePatternsManifestLoaded: patterns manifest data missing");
  }

  /* Transform array-of-arrays into a category map. */
  const map = {};
  for (let i = 0; i < registry.length; i++) {
    const categoryName = registry[i];
    map[categoryName] = raw[i] || [];
  }

  setPatternsCache(map);

  // Also update manifest.cache for backward compatibility
  if (!manifest.cache) {
    manifest.cache = {};
  }
  manifest.cache.patterns = map;

} // end ensurePatternsManifestLoaded


/* ============================================================
   initPatternsTab(restored)
   ============================================================
   Cold-start initializer for the Patterns tab.

   Called by setUI.js when:
     a) The tab has never been visited (no saved state).
     b) uiState.patterns.needsUpdate is true (post-rebuild).

   Sequence:
     1. Ensure the state container exists.
     2. Remove any existing Pattern subtab (clean slate).
     3. Wire the commands button.
     4. Load the patterns cache from disk (or warm cache).
     5. Build the subtab bar.
     6. If restored=true and saved state exists, delegate to
        restorePatternsTab() to reconstruct the previous view.
     7. Otherwise, default to Categories view.

   Arguments:
     restored — true when called with needsUpdate (Refresh & Restore).
                The saved state is preserved and the view is restored.
   ============================================================ */
export async function initPatternsTab(restored) {
  
  // 1. Ensure the state container exists
  if (!uiState.patterns) {
    uiState.patterns = {};
  }

  // 2. Clean slate: Remove the "Pattern" subtab if it exists
  const patternBtn = document.querySelector(`[data-tab-id="${PATTERN_ID}"]`);
  if (patternBtn) {
    patternBtn.parentElement.remove();
  }

  // 3. Static setup
  setCommandsButtonLabel("Patterns Commands");
  wirePatternsCommandsButton();

  // 4. Re-load from manifest
  // If restored=true (Refresh & Restore), this will hit the disk
  // because manifest.clearCache() was called by syncSystemStateAfterRebuild.
  await ensurePatternsManifestLoaded();

  // 5. Build UI
  setPatternsSubtabs();

  if (restored && uiState.patterns.saved) {
    await restorePatternsTab();
    return;
  }

  // 6. Reset state to Categories
  resetPatternsState();
  
  uiState.patterns.activeCategory = null;
  uiState.patterns.activeItem     = null;
  uiState.patterns.saved = {
    view: "categories",
    activeCategory: null,
    activeItem: null
  };

  await showCategoryList();

} // end initPatternsTab


/* ============================================================
   restorePatternsTab()
   ============================================================
   Reconstructs the Patterns tab from uiState.patterns.saved.

   Called by:
     initPatternsTab(true)             — Refresh & Restore path
     setUI.js / activateTab()          — returning to the tab
     refreshPatternsFromManifestEdit() — after manifest mutation

   Restore contract (uiState.patterns.saved fields):
     view           — "categories" or "pattern"
     activeCategory — category string or null
     activeItem     — item index or null

   If saved state is missing entirely, falls back to a cold
   init to avoid an unrecoverable blank state.
   ============================================================ */
export async function restorePatternsTab() {
  
  const saved = uiState.patterns?.saved;
  if (!saved) {
    /* No saved state — fall back to cold init. */
    return initPatternsTab(false);
  }

  // 1. Rebuild the static parts
  setCommandsButtonLabel("Patterns Commands");
  wirePatternsCommandsButton();
  await ensurePatternsManifestLoaded();

  // 2. Build the navigation subtabs
  setPatternsSubtabs();

  if (saved.view === "pattern") {
    // Verify category/item still exist (Refresh & Restore scenario)
    const cat = saved.activeCategory;
    const cache = getPatternsCache();
    const list = cache?.[cat] || [];

    if (list.length === 0) {
      // Fallback if category empty/gone
      await showCategoryList();
      return;
    }

    // Clamp index
    let idx = saved.activeItem;
    if (typeof idx !== "number" || idx < 0) idx = 0;
    if (idx >= list.length) idx = list.length - 1;

    // Update state if clamped
    setCurrentCategory(cat);
    setCurrentIndex(idx);
    uiState.patterns.activeCategory = cat;
    uiState.patterns.activeItem = idx;
    uiState.patterns.saved.activeItem = idx;

    // 3. Manually add the "Pattern" subtab back
    addPatternSubtab(cat);

    // 4. Show the actual pattern content
    await showSelectedPattern(cat, idx);
  } else {
    await showCategoryList();
  }

} // end restorePatternsTab


/* ============================================================
   savePatternsState()
   ============================================================
   Called by setUI.js before leaving the tab (optional hook).
   Returns the current save snapshot for persistence.

   The snapshot is also maintained continuously by the display
   functions, so this function is mostly a safety net to ensure
   the saved state is always current at tab-leave time.
   ============================================================ */
export function savePatternsState() {
  
  // uiState.patterns.saved is always maintained by controller actions.
  if (!uiState.patterns || !uiState.patterns.saved) {
    return {
      view: "categories",
      activeCategory: null,
      activeItem: null
    };
  }

  return {
    view: uiState.patterns.saved.view,
    activeCategory: uiState.patterns.saved.activeCategory,
    activeItem: uiState.patterns.saved.activeItem
  };

} // end savePatternsState


/* ============================================================
   rehydratePatternsState()
   ============================================================
   Restores uiState.patterns.saved and the shared module state
   from sessionStorage so that the patterns tab can be restored
   correctly after a full page reload.

   Called once by setUI.js during DOMContentLoaded, before
   the first setUI() call.
   ============================================================ */
export function rehydratePatternsState() {
  
  const saved = sessionStorage.getItem("sketchpad.patterns.saved");
  if (!saved) return;

  if (!uiState.patterns) uiState.patterns = {};

  const parsed = JSON.parse(saved);
  uiState.patterns.saved = parsed;

  // Sync patternsState so getCurrentCategory() etc. return
  // the correct values immediately after rehydration.
  setCurrentCategory(parsed.activeCategory || null);
  setCurrentIndex(parsed.activeItem || null);

} // end rehydratePatternsState


// Rehydrate on load
rehydratePatternsState();
