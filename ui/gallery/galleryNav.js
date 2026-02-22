/* galleryNav.js
   ============================================================
   Gallery Tab â€” Subtab Construction and Category Views
   ============================================================
   Role:
     Owns everything related to building the Gallery subtab bar
     and rendering the three domain category views (Ideabook,
     Patterns, Scripts).

     This file sits between the lifecycle layer (gallery.js) and
     the results layer (galleryResults.js). Its job is to put
     the correct category frames on screen and wire the clicks
     that transition into the Results view.

   Architectural rules:
     â€¢ Does NOT own the TabSpec, init(), restore(), or save().
       Those live in gallery.js.
     â€¢ Does NOT render result content (images or scripts).
       That lives in galleryResults.js.
     â€¢ Does NOT build caption bars or command offcanvas panels.
       Those live in galleryMenuCmds.js.
     â€¢ Reads galleryCache via getters from galleryState.js.
       Never imports the raw variable directly.

   Exports:
     buildGallerySubtabs()         â€” build the full subtab bar
     ensureResultsSubtab(domain)   â€” add/update the Results subtab
     activateGallerySubtab(id)     â€” highlight the active subtab
     showIdeabookCategories()      â€” render Ideabook category frames
     showPatternsCategories()      â€” render Patterns category frames
     showScriptsCategories()       â€” render Scripts category frames
     clearGalleryCaption()         â€” empty the caption region
   ============================================================ */

import { renderCategories } from "../categories.js";
import { clearDivs }        from "/ui/uiUtilities.js";
import {
    setCurrentDomain,
  setCurrentCategory,
  setCurrentList,
  setCurrentIndex
} from "./galleryState.js";
import { getGalleryCache } from "../gallery.js";
import {
  showGalleryResultsImages,
  showGalleryResultsScripts
} from "./galleryResults.js";


/* ============================================================
   Constants â€” domain and subtab identifiers
   These mirror the constants in gallery.js and must stay in sync.
   They are redeclared here (rather than imported) to keep this
   file self-contained with respect to the nav layer.
   ============================================================ */
const DOMAIN_IDEABOOK = "Ideabook";
const DOMAIN_PATTERNS = "Patterns";
const DOMAIN_SCRIPTS  = "Scripts";

const SUBTAB_IDEABOOK = "gallery-ideabook";
const SUBTAB_PATTERNS = "gallery-patterns";
const SUBTAB_SCRIPTS  = "gallery-scripts";
const SUBTAB_RESULTS  = "gallery-results";

const GALLERY_COMMAND = "Gallery Commands";


/* ============================================================
   buildGallerySubtabs()
   ============================================================
   Builds the three fixed domain subtabs (Ideabook, Patterns,
   Scripts) inside the shared #subtabs container.

   Each button click:
     1. Updates uiState.gallery.activeDomain and activeSubtab.
     2. Calls the appropriate show*Categories() function.
     3. Activates the clicked subtab visually.
     4. Clears the caption (no item is selected in category view).

   The Results subtab is NOT built here â€” it is added lazily
   by ensureResultsSubtab() the first time a category item is
   clicked. This keeps the subtab bar clean until it is needed.

   Called by:
     initGalleryTab()    â€” on every cold start
     restoreGalleryTab() â€” before restoring the saved view
   ============================================================ */
export function buildGallerySubtabs() {

  const container = document.getElementById("subtabs");
  if (!container) throw new Error("buildGallerySubtabs: #subtabs not found");

  /* Replace existing subtabs entirely so stale buttons from
     a previous session do not accumulate. */
  container.replaceChildren();

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs gallery-subtabs";
  container.appendChild(bar);

  /* Ideabook subtab */
  bar.appendChild(buildSubtabButton(SUBTAB_IDEABOOK, "Ideabook", async () => {
    uiState.gallery.activeDomain = DOMAIN_IDEABOOK;
    uiState.gallery.activeSubtab = "ideabook";
    uiState.gallery.saved = {
      view: "categories",
      domain: DOMAIN_IDEABOOK,
      category: null,
      index: null
    };
    await showIdeabookCategories();
    activateGallerySubtab(SUBTAB_IDEABOOK);
    clearGalleryCaption();
  }));

  /* Patterns subtab */
  bar.appendChild(buildSubtabButton(SUBTAB_PATTERNS, "Patterns", async () => {
    uiState.gallery.activeDomain = DOMAIN_PATTERNS;
    uiState.gallery.activeSubtab = "patterns";
    uiState.gallery.saved = {
      view: "categories",
      domain: DOMAIN_PATTERNS,
      category: null,
      index: null
    };
    await showPatternsCategories();
    activateGallerySubtab(SUBTAB_PATTERNS);
    clearGalleryCaption();
  }));

  /* Scripts subtab */
  bar.appendChild(buildSubtabButton(SUBTAB_SCRIPTS, "Scripts", async () => {
    uiState.gallery.activeDomain = DOMAIN_SCRIPTS;
    uiState.gallery.activeSubtab = "scripts";
    uiState.gallery.saved = {
      view: "categories",
      domain: DOMAIN_SCRIPTS,
      category: null,
      index: null
    };
    await showScriptsCategories();
    activateGallerySubtab(SUBTAB_SCRIPTS);
    clearGalleryCaption();
  }));

} // end buildGallerySubtabs


/* ============================================================
   buildSubtabButton(tabId, label, onClick)
   ============================================================
   Creates a single <li><button> subtab element.

   Arguments:
     tabId   â€” the data-tab-id attribute value (e.g. "gallery-ideabook")
     label   â€” visible button text
     onClick â€” async click handler

   Returns:
     The <li> element ready to append to the subtab <ul>.

   This is a pure DOM factory â€” it has no knowledge of which
   domain or view the button represents.
   ============================================================ */
function buildSubtabButton(tabId, label, onClick) {

  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className    = "nav-link";
  btn.dataset.tabId = tabId;
  btn.textContent  = label;

  /* Wrap onClick so errors surface in the console rather than
     being silently swallowed by the event listener. */
  btn.addEventListener("click", () => { onClick(); });

  li.appendChild(btn);
  return li;

} // end buildSubtabButton


/* ============================================================
   ensureResultsSubtab(domain)
   ============================================================
   Adds a Results subtab to the bar if one does not yet exist,
   or updates its label if it does.

   The Results subtab label changes depending on the domain:
     â€¢ Scripts domain  â†’ "Drawings"  (canvas output)
     â€¢ Other domains   â†’ "Images"    (image viewer)

   The click handler on the Results button restores the last
   selected item in whichever domain is currently active.

   Arguments:
     domain â€” one of the DOMAIN_* constants

   Called by:
     showIdeabookCategories / showPatternsCategories /
     showScriptsCategories â€” when a category item is clicked,
     before transitioning to the Results view.
   ============================================================ */
export function ensureResultsSubtab(domain) {

  const container = document.getElementById("subtabs");
  if (!container) throw new Error("ensureResultsSubtab: #subtabs not found");

  const bar = container.querySelector("ul.gallery-subtabs");
  if (!bar) throw new Error("ensureResultsSubtab: .gallery-subtabs not found");

  /* Label reflects whether the domain shows images or scripts. */
  const label = (domain === DOMAIN_SCRIPTS) ? "Drawings" : "Images";

  const existing = bar.querySelector(`[data-tab-id="${SUBTAB_RESULTS}"]`);

  /* If the tab already exists, just update its label and return. */
  if (existing) {
    existing.textContent = label;
    return;
  }

  /* Build and append a new Results subtab. */
  const li  = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className     = "nav-link";
  btn.dataset.tabId = SUBTAB_RESULTS;
  btn.textContent   = label;

  btn.addEventListener("click", async () => {
    const saved = uiState.gallery.saved;
    activateGallerySubtab(SUBTAB_RESULTS);
    uiState.gallery.activeSubtab = "results";

    /* Restore whichever result type was last active. */
    const idx = (typeof saved.index === "number") ? saved.index : 0;
    if (saved.domain === DOMAIN_SCRIPTS) {
      await showGalleryResultsScripts(saved.category, idx);
    } else {
      await showGalleryResultsImages(saved.domain, saved.category, idx);
    }
  });

  li.appendChild(btn);
  bar.appendChild(li);

} // end ensureResultsSubtab


/* ============================================================
   activateGallerySubtab(subtabId)
   ============================================================
   Adds the "active" CSS class to the button whose data-tab-id
   matches subtabId, and removes it from all others.

   Arguments:
     subtabId â€” the data-tab-id value of the button to activate

   This is a pure visual operation â€” it does not change uiState.
   Callers are responsible for updating uiState.gallery.activeSubtab
   before or after calling this function.
   ============================================================ */
export function activateGallerySubtab(subtabId) {

  const buttons = document.querySelectorAll(".gallery-subtabs .nav-link");
  buttons.forEach((btn) => {
    if (btn.dataset.tabId === subtabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

} // end activateGallerySubtab


/* ============================================================
   clearGalleryCaption()
   ============================================================
   Empties the #caption region.

   Called whenever the Gallery tab enters a category view where
   no individual item is selected, so the caption bar does not
   display stale information from the previous result.
   ============================================================ */
export function clearGalleryCaption() {

  const captionDiv = document.getElementById("caption");
  if (captionDiv) captionDiv.innerHTML = "";

} // end clearGalleryCaption


/* ============================================================
   showIdeabookCategories()
   ============================================================
   Renders the Ideabook domain category frames into #text.

   Each category frame contains one clickable item per manifest
   entry. Clicking an item:
     1. Adds/updates the Results subtab.
     2. Activates the Results subtab visually.
     3. Updates uiState.gallery.activeSubtab.
     4. Loads the Results view for that entry.

   The category frame list and item sort order are both handled
   by renderCategories() in categories.js.
   ============================================================ */
export async function showIdeabookCategories() {

  clearDivs();

  const cache = getGalleryCache();
  if (!cache) throw new Error("showIdeabookCategories: gallery cache not loaded");

  const domainMap = cache.Ideabook;
  const cats = Object.keys(domainMap);

  /* Build the descriptor array that renderCategories() expects. */
  const frames = cats.map((cat) => {
    const list = domainMap[cat];
    return {
      title: cat,
      items: list.map((entry, idx) => ({
        name: entry.title || entry.filename || entry.path || "(untitled)",
        hasSubitems: false,
        onClick: async () => {
          ensureResultsSubtab(DOMAIN_IDEABOOK);
          activateGallerySubtab(SUBTAB_RESULTS);
          uiState.gallery.activeSubtab = "results";
          await showGalleryResultsImages(DOMAIN_IDEABOOK, cat, idx);
        }
      }))
    };
  });

  renderCategories("text", frames);

} // end showIdeabookCategories


/* ============================================================
   showPatternsCategories()
   ============================================================
   Renders the Patterns domain category frames into #text.
   Behaviour is identical to showIdeabookCategories() except
   the domain is DOMAIN_PATTERNS.
   ============================================================ */
export async function showPatternsCategories() {

  clearDivs();

  const cache = getGalleryCache();
  if (!cache) throw new Error("showPatternsCategories: gallery cache not loaded");

  const domainMap = cache.Patterns;
  const cats = Object.keys(domainMap);

  const frames = cats.map((cat) => {
    const list = domainMap[cat];
    return {
      title: cat,
      items: list.map((entry, idx) => ({
        name: entry.title || entry.filename || entry.path || "(untitled)",
        hasSubitems: false,
        onClick: async () => {
          ensureResultsSubtab(DOMAIN_PATTERNS);
          activateGallerySubtab(SUBTAB_RESULTS);
          uiState.gallery.activeSubtab = "results";
          await showGalleryResultsImages(DOMAIN_PATTERNS, cat, idx);
        }
      }))
    };
  });

  renderCategories("text", frames);

} // end showPatternsCategories


/* ============================================================
   showScriptsCategories()
   ============================================================
   Renders the Scripts domain category frames into #text.

   Scripts differ from the image domains in two ways:
     1. Clicking an item calls showGalleryResultsScripts()
        instead of showGalleryResultsImages().
     2. sortItems is set to false â€” scripts have a meaningful
        manual order in the manifest and should not be
        alphabetically re-sorted by renderCategories().
   ============================================================ */
export async function showScriptsCategories() {

  clearDivs();

  const cache = getGalleryCache();
  if (!cache) throw new Error("showScriptsCategories: gallery cache not loaded");

  const domainMap = cache.Scripts;
  const cats = Object.keys(domainMap);

  const frames = cats.map((cat) => {
    const list = domainMap[cat];
    return {
      title: cat,
      sortItems: false,   /* preserve manifest order for scripts */
      items: list.map((entry, idx) => ({
        name: entry.title || entry.filename || "(untitled)",
        hasSubitems: false,
        onClick: async () => {
          ensureResultsSubtab(DOMAIN_SCRIPTS);
          activateGallerySubtab(SUBTAB_RESULTS);
          uiState.gallery.activeSubtab = "results";
          await showGalleryResultsScripts(cat, idx);
        }
      }))
    };
  });

  renderCategories("text", frames);

} // end showScriptsCategories
