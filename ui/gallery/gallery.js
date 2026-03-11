/* gallery.js
   ============================================================
   Gallery Tab -- Public Entry Point and Lifecycle
   ============================================================
   Role:
     Public entry point for the Gallery tab. Owns exactly
     three things:

       1. GalleryTabSpec -- the object consumed by setUI.js to
          drive tab activation (init / restore / save).

       2. Lifecycle functions -- initGalleryTab(), restoreGalleryTab(),
          saveGalleryState(), rehydrateGalleryState().

       3. Cache loading -- ensureGalleryCacheLoaded().

   What does NOT live here:
     * Subtab construction and category rendering -> gallery/galleryNav.js
     * Results display and prev/next navigation  -> gallery/galleryResults.js
     * Caption bar, menu items, commands panel   -> gallery/galleryMenuCmds.js
     * Shared module-level state variables       -> gallery/galleryState.js
   ============================================================ */

import { manifest }              from "/ui/manifest.js";
import {
  clearDivs,
  setCommandsButtonLabel
}                                from "/ui/uiUtilities.js";
import {
  resetGalleryState,
  setCurrentDomain,
  setCurrentCategory,
  setCurrentIndex
}                                from "/ui/gallery/galleryState.js";
import {
  buildGallerySubtabs,
  activateGallerySubtab,
  clearGalleryCaption,
  showIdeabookCategories,
  showPatternsCategories,
  showScriptsCategories,
  ensureResultsSubtab
}                                from "/ui/gallery/galleryNav.js";
import {
  showGalleryResultsImages,
  showGalleryResultsScripts
}                                from "/ui/gallery/galleryResults.js";
import { wireGalleryCommandsButton } from "/ui/gallery/galleryMenuCmds.js";


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
   ============================================================ */
export const GalleryController = {
  initGalleryTab,
  showPrev: (domain) => import("/ui/gallery/galleryResults.js")
    .then(m => m.showPrevGalleryItem(domain)),
  showNext: (domain) => import("/ui/gallery/galleryResults.js")
    .then(m => m.showNextGalleryItem(domain))
};


/* ============================================================
   ensureGalleryCacheLoaded()
   ============================================================ */
export async function ensureGalleryCacheLoaded() {

  const domains = [DOMAIN_IDEABOOK, DOMAIN_PATTERNS, DOMAIN_SCRIPTS];
  for (const dom of domains) {
    await manifest.get(`gallery/${dom}`);
  }

} // end ensureGalleryCacheLoaded


/* ============================================================
   getGalleryCache()
   ============================================================ */
export function getGalleryCache() {
  return {
    [DOMAIN_IDEABOOK]: manifest.getCategoryMap(`gallery/${DOMAIN_IDEABOOK}`),
    [DOMAIN_PATTERNS]: manifest.getCategoryMap(`gallery/${DOMAIN_PATTERNS}`),
    [DOMAIN_SCRIPTS]:  manifest.getCategoryMap(`gallery/${DOMAIN_SCRIPTS}`)
  };
} // end getGalleryCache


/* ============================================================
   initGalleryTab(restored)
   ============================================================ */
export async function initGalleryTab(restored) {

  if (!uiState.gallery)
    throw new Error("initGalleryTab: uiState.gallery missing");

  resetGalleryState();

  await ensureGalleryCacheLoaded();

  buildGallerySubtabs();
  setCommandsButtonLabel(GALLERY_COMMAND);
  wireGalleryCommandsButton();

  if (restored && uiState.gallery.saved) {
    await restoreGalleryTab();
    return;
  }

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
   ============================================================ */
export async function restoreGalleryTab() {

  if (!uiState.gallery?.saved) return initGalleryTab(false);

  await ensureGalleryCacheLoaded();
  buildGallerySubtabs();
  setCommandsButtonLabel(GALLERY_COMMAND);
  wireGalleryCommandsButton();

  const saved = uiState.gallery.saved;

  if (saved.view === "categories") {
    if      (saved.domain === DOMAIN_IDEABOOK) await showIdeabookCategories();
    else if (saved.domain === DOMAIN_PATTERNS) await showPatternsCategories();
    else if (saved.domain === DOMAIN_SCRIPTS)  await showScriptsCategories();

    activateGallerySubtab(`gallery-${saved.domain.toLowerCase()}`);
    clearGalleryCaption();
    return;
  }

  if (saved.view === "results") {
    ensureResultsSubtab(saved.domain);
    activateGallerySubtab(SUBTAB_RESULTS);
    uiState.gallery.activeSubtab = "results";

    const cache = getGalleryCache();
    const list  = cache[saved.domain]?.[saved.category] || [];

    if (list.length === 0) {
      uiState.gallery.saved = { ...saved, view: "categories", index: null };
      if      (saved.domain === DOMAIN_IDEABOOK) return showIdeabookCategories();
      else if (saved.domain === DOMAIN_PATTERNS) return showPatternsCategories();
      return showScriptsCategories();
    }

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
   ============================================================ */
export function saveGalleryState() {

  return {
    domain:   getCurrentDomain(),
    category: getCurrentCategory(),
    index:    getCurrentIndex()
  };

} // end saveGalleryState


/* ============================================================
   rehydrateGalleryState()
   ============================================================ */
export function rehydrateGalleryState() {

  const savedStr = sessionStorage.getItem("sketchpad.gallery.saved");

  if (!uiState.gallery) uiState.gallery = {};

  if (savedStr) {
    const saved = JSON.parse(savedStr);
    uiState.gallery.saved = saved;

    setCurrentDomain(saved.domain     || null);
    setCurrentCategory(saved.category || null);
    setCurrentIndex(saved.index       || 0);
  }

} // end rehydrateGalleryState
