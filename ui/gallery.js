/* gallery.js
   ============================================================
   Gallery Tab — Public Entry Point and Lifecycle
   ============================================================
   Role:
     This is the public entry point for the Gallery tab.
     It owns exactly three things:

       1. GalleryTabSpec — the object consumed by setUI.js to
          drive tab activation (init / restore / save).

       2. Lifecycle functions — initGalleryTab(), restoreGalleryTab(),
          saveGalleryState(), rehydrateGalleryState(). These are
          the only functions that orchestrate the full tab.

       3. Cache loading — ensureGalleryCacheLoaded(). This lives
          here because it is called by both init and restore, and
          also by refreshGalleryFromManifestEdit() in galleryMenuCmds.js
          via dynamic import.

   What does NOT live here:
     • Subtab construction and category rendering → gallery/galleryNav.js
     • Results display and prev/next navigation  → gallery/galleryResults.js
     • Caption bar, menu items, commands panel   → gallery/galleryMenuCmds.js
     • Shared module-level state variables       → gallery/galleryState.js

   Import structure:
     gallery.js imports from the gallery/ sub-modules.
     Sub-modules import from gallery.js only via dynamic import()
     to avoid circular references (e.g. galleryMenuCmds.js needs
     initGalleryTab and restoreGalleryTab for the rebuild handler).
   ============================================================ */

import { manifest } from "./manifest.js";
import {
  clearDivs,
  setCommandsButtonLabel
} from "./uiUtilities.js";
import {
  resetGalleryState,
  setGalleryCache,
  getGalleryCache,
  setCurrentDomain,
  setCurrentCategory,
  setCurrentIndex
} from "./gallery/galleryState.js";
import {
  buildGallerySubtabs,
  activateGallerySubtab,
  clearGalleryCaption,
  showIdeabookCategories,
  showPatternsCategories,
  showScriptsCategories,
  ensureResultsSubtab
} from "./gallery/galleryNav.js";
import {
  showGalleryResultsImages,
  showGalleryResultsScripts
} from "./gallery/galleryResults.js";
import {
  wireGalleryCommandsButton
} from "./gallery/galleryMenuCmds.js";


/* ============================================================
   Constants
   ============================================================ */
const DOMAIN_IDEABOOK = "Ideabook";
const DOMAIN_PATTERNS = "Patterns";
const DOMAIN_SCRIPTS  = "Scripts";

const GALLERY_COMMAND = "Gallery Commands";

const SUBTAB_IDEABOOK = "gallery-ideabook";
const SUBTAB_RESULTS  = "gallery-results";


/* ============================================================
   GalleryTabSpec
   ============================================================
   Consumed by setUI.js to activate the Gallery tab.

   setUI.js calls:
     init(restored)  — on cold start or after needsUpdate
     restore()       — when uiState.gallery.saved exists
     save()          — before leaving the tab (optional)
   ============================================================ */
export const GalleryTabSpec = {
  name:  "gallery",
  theme: "theme-gallery",
  regions: ["caption", "text", "sketchpad", "action"],

  init:    initGalleryTab,
  restore: restoreGalleryTab,
  save:    saveGalleryState,

  buildCaption:   () => {},
  buildText:      () => {},
  buildSketchpad: () => {},
  buildAction:    () => {}
};


/* ============================================================
   GalleryController
   ============================================================
   Exposes the public action surface used by external callers
   (e.g. overlay prev/next buttons wired in setUI.js).
   ============================================================ */
export const GalleryController = {
  initGalleryTab,
  showPrev: (domain) => import("./gallery/galleryResults.js")
    .then(m => m.showPrevGalleryItem(domain)),
  showNext: (domain) => import("./gallery/galleryResults.js")
    .then(m => m.showNextGalleryItem(domain))
};


/* ============================================================
   ensureGalleryCacheLoaded()
   ============================================================
   Loads the full gallery manifest data from disk and stores
   it in galleryState as a structured cache object:

     {
       Ideabook: { categoryName: [entries...], ... },
       Patterns: { categoryName: [entries...], ... },
       Scripts:  { categoryName: [entries...], ... }
     }

   Returns immediately if the cache is already populated.
   Called by init, restore, and (via dynamic import) by
   refreshGalleryFromManifestEdit() in galleryMenuCmds.js.

   Cache invalidation:
     Call setGalleryCache(null) before calling this function
     to force a reload from disk (e.g. after a rebuild).
   ============================================================ */
export async function ensureGalleryCacheLoaded() {

  /* Return immediately if cache is already warm. */
  const existing = getGalleryCache();
  if (existing && Object.keys(existing).length > 0) return;

  /* Load all three domains in sequence. */
  const domains = [DOMAIN_IDEABOOK, DOMAIN_PATTERNS, DOMAIN_SCRIPTS];
  const gallery = {};

  for (const dom of domains) {
    const basedir  = `gallery/${dom}`;
    const raw      = await manifest.get(basedir);
    const registry = manifest.getRegistry(basedir);

    /* Transform the array-of-arrays from ManifestManager into
       a { categoryName: [entries] } map for easy lookup. */
    const domainData = {};
    for (let i = 0; i < registry.length; i++) {
      domainData[registry[i]] = raw[i] || [];
    }

    gallery[dom] = domainData;
  }

  setGalleryCache(gallery);

} // end ensureGalleryCacheLoaded


/* ============================================================
   initGalleryTab(restored)
   ============================================================
   Cold-start initialiser for the Gallery tab.

   Called by setUI.js when:
     a) The tab has never been visited (no saved state).
     b) uiState.gallery.needsUpdate is true (post-rebuild).

   Sequence:
     1. Reset all shared module state to clean defaults.
     2. Load the gallery cache from disk (or warm cache).
     3. Build the subtab bar and wire the commands button.
     4. If restored=true and saved state exists, delegate to
        restoreGalleryTab() to reconstruct the previous view.
     5. Otherwise, default to Ideabook categories view.

   Arguments:
     restored — true when called with needsUpdate (Refresh & Restore).
                The saved state is preserved and the view is restored.
   ============================================================ */
export async function initGalleryTab(restored) {

  if (!uiState.gallery) {
    throw new Error("initGalleryTab: uiState.gallery missing");
  }

  /* ── 1. Reset shared state ──────────────────────────────── */
  resetGalleryState();

  /* ── 2. Load manifest data ──────────────────────────────── */
  await ensureGalleryCacheLoaded();

  /* ── 3. Build chrome ────────────────────────────────────── */
  buildGallerySubtabs();
  setCommandsButtonLabel(GALLERY_COMMAND);
  wireGalleryCommandsButton();

  /* ── 4. Restore saved view if applicable ────────────────── */
  if (restored && uiState.gallery.saved) {
    await restoreGalleryTab();
    return;
  }

  /* ── 5. Default view: Ideabook categories ───────────────── */
  uiState.gallery.activeDomain   = DOMAIN_IDEABOOK;
  uiState.gallery.activeCategory = null;
  uiState.gallery.activeItem     = null;
  uiState.gallery.activeSubtab   = "ideabook";

  uiState.gallery.saved = {
    view:     "categories",
    domain:   DOMAIN_IDEABOOK,
    category: null,
    index:    null
  };

  await showIdeabookCategories();
  activateGallerySubtab(SUBTAB_IDEABOOK);
  clearGalleryCaption();

} // end initGalleryTab


/* ============================================================
   restoreGalleryTab()
   ============================================================
   Reconstructs the Gallery tab from uiState.gallery.saved.

   Called by:
     initGalleryTab(true)             — Refresh & Restore path
     setUI.js / activateTab()         — returning to the tab
     refreshGalleryFromManifestEdit() — after manifest mutation

   Restore contract (uiState.gallery.saved fields):
     view      — "categories" or "results"
     domain    — "Ideabook" | "Patterns" | "Scripts"
     category  — category string or null
     index     — item index or null

   If saved state is missing entirely, falls back to a cold
   init to avoid an unrecoverable blank state.
   ============================================================ */
export async function restoreGalleryTab() {

  if (!uiState.gallery?.saved) {
    /* No saved state — fall back to cold init. */
    return initGalleryTab(false);
  }

  /* ── Rebuild tab chrome ─────────────────────────────────── */
  await ensureGalleryCacheLoaded();
  buildGallerySubtabs();
  setCommandsButtonLabel(GALLERY_COMMAND);
  wireGalleryCommandsButton();

  const saved = uiState.gallery.saved;

  /* ── Restore Categories view ────────────────────────────── */
  if (saved.view === "categories") {
    if      (saved.domain === DOMAIN_IDEABOOK) await showIdeabookCategories();
    else if (saved.domain === DOMAIN_PATTERNS) await showPatternsCategories();
    else if (saved.domain === DOMAIN_SCRIPTS)  await showScriptsCategories();

    activateGallerySubtab(`gallery-${saved.domain.toLowerCase()}`);
    clearGalleryCaption();
    return;
  }

  /* ── Restore Results view ───────────────────────────────── */
  if (saved.view === "results") {

    ensureResultsSubtab(saved.domain);
    activateGallerySubtab(SUBTAB_RESULTS);
    uiState.gallery.activeSubtab = "results";

    const cache = getGalleryCache();
    const list  = cache[saved.domain]?.[saved.category] || [];

    /* If the category is now empty or gone, bounce to categories. */
    if (list.length === 0) {
      uiState.gallery.saved = { ...saved, view: "categories", index: null };
      if      (saved.domain === DOMAIN_IDEABOOK) return showIdeabookCategories();
      else if (saved.domain === DOMAIN_PATTERNS) return showPatternsCategories();
      return showScriptsCategories();
    }

    /* Clamp the saved index to the current list length. */
    let idx = (typeof saved.index === "number") ? saved.index : 0;
    if (idx >= list.length) idx = list.length - 1;
    if (idx < 0)            idx = 0;

    uiState.gallery.saved.index = idx;
    uiState.gallery.activeItem  = list[idx];

    if (saved.domain === DOMAIN_SCRIPTS) {
      await showGalleryResultsScripts(saved.category, idx);
    } else {
      await showGalleryResultsImages(saved.domain, saved.category, idx);
    }
  }

} // end restoreGalleryTab


/* ============================================================
   saveGalleryState()
   ============================================================
   Called by setUI.js before leaving the tab (optional hook).
   Returns the current save snapshot for persistence.

   The snapshot is also maintained continuously by the result
   display functions, so this function is mostly a safety net
   to ensure the saved state is always current at tab-leave time.
   ============================================================ */
export function saveGalleryState() {

  const { getCurrentDomain, getCurrentCategory, getCurrentIndex }
    = require("./gallery/galleryState.js");

  return {
    domain:   getCurrentDomain(),
    category: getCurrentCategory(),
    index:    getCurrentIndex()
  };

} // end saveGalleryState


/* ============================================================
   rehydrateGalleryState()
   ============================================================
   Restores uiState.gallery.saved and the shared module state
   from sessionStorage so that the gallery can be restored
   correctly after a full page reload.

   Called once by setUI.js during DOMContentLoaded, before
   the first setUI() call.
   ============================================================ */
export function rehydrateGalleryState() {

  const savedStr = sessionStorage.getItem("sketchpad.gallery.saved");

  if (!uiState.gallery) uiState.gallery = {};

  if (savedStr) {
    const saved = JSON.parse(savedStr);
    uiState.gallery.saved = saved;

    /* Sync galleryState so getCurrentDomain() etc. return
       the correct values immediately after rehydration. */
    setCurrentDomain(saved.domain     || null);
    setCurrentCategory(saved.category || null);
    setCurrentIndex(saved.index       || 0);
  }

} // end rehydrateGalleryState
