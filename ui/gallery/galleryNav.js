/* galleryNav.js
   ============================================================
   Gallery Tab -- Subtab Construction and Category Views
   ============================================================
   Role:
     Owns everything related to building the Gallery subtab bar
     and rendering the three domain category views (Ideabook,
     Patterns, Scripts).

   Architectural rules:
     * Does NOT own the TabSpec, init(), restore(), or save().
       Those live in gallery.js.
     * Does NOT render result content (images or scripts).
       That lives in galleryResults.js.
     * Does NOT build caption bars or command offcanvas panels.
       Those live in galleryMenuCmds.js.
     * Reads galleryCache via getters from galleryState.js.

   Exports:
     buildGallerySubtabs()
     ensureResultsSubtab(domain)
     activateGallerySubtab(id)
     showIdeabookCategories()
     showPatternsCategories()
     showScriptsCategories()
     clearGalleryCaption()
   ============================================================ */

import { renderCategories }        from "/ui/categories.js";
import { clearDivs }               from "/ui/uiUtilities.js";
import {
  setCurrentDomain,
  setCurrentCategory,
  setCurrentList,
  setCurrentIndex
}                                  from "./galleryState.js";
import { getGalleryCache }         from "/ui/gallery/gallery.js";
import {
  showGalleryResultsImages,
  showGalleryResultsScripts
}                                  from "./galleryResults.js";


/* ============================================================
   Constants
   ============================================================ */
const DOMAIN_IDEABOOK = "Ideabook";
const DOMAIN_PATTERNS = "Patterns";
const DOMAIN_SCRIPTS  = "Scripts";

const SUBTAB_IDEABOOK = "gallery-ideabook";
const SUBTAB_PATTERNS = "gallery-patterns";
const SUBTAB_SCRIPTS  = "gallery-scripts";
const SUBTAB_RESULTS  = "gallery-results";


/* ============================================================
   buildGallerySubtabs()
   ============================================================ */
export function buildGallerySubtabs() {

  const container = document.getElementById("subtabs");
  if (!container) throw new Error("buildGallerySubtabs: #subtabs not found");

  container.replaceChildren();

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs gallery-subtabs";
  container.appendChild(bar);

  bar.appendChild(buildSubtabButton(SUBTAB_IDEABOOK, "Ideabook", async () => {
    uiState.gallery.activeDomain = DOMAIN_IDEABOOK;
    uiState.gallery.activeSubtab = "ideabook";
    uiState.gallery.saved = { view: "categories", domain: DOMAIN_IDEABOOK, category: null, index: null };
    await showIdeabookCategories();
    activateGallerySubtab(SUBTAB_IDEABOOK);
    clearGalleryCaption();
  }));

  bar.appendChild(buildSubtabButton(SUBTAB_PATTERNS, "Patterns", async () => {
    uiState.gallery.activeDomain = DOMAIN_PATTERNS;
    uiState.gallery.activeSubtab = "patterns";
    uiState.gallery.saved = { view: "categories", domain: DOMAIN_PATTERNS, category: null, index: null };
    await showPatternsCategories();
    activateGallerySubtab(SUBTAB_PATTERNS);
    clearGalleryCaption();
  }));

  bar.appendChild(buildSubtabButton(SUBTAB_SCRIPTS, "Scripts", async () => {
    uiState.gallery.activeDomain = DOMAIN_SCRIPTS;
    uiState.gallery.activeSubtab = "scripts";
    uiState.gallery.saved = { view: "categories", domain: DOMAIN_SCRIPTS, category: null, index: null };
    await showScriptsCategories();
    activateGallerySubtab(SUBTAB_SCRIPTS);
    clearGalleryCaption();
  }));

} // end buildGallerySubtabs


/* ============================================================
   buildSubtabButton(tabId, label, onClick)
   ============================================================ */
function buildSubtabButton(tabId, label, onClick) {

  const li  = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className     = "nav-link";
  btn.dataset.tabId = tabId;
  btn.textContent   = label;

  btn.addEventListener("click", () => { onClick(); });

  li.appendChild(btn);
  return li;

} // end buildSubtabButton


/* ============================================================
   ensureResultsSubtab(domain)
   ============================================================ */
export function ensureResultsSubtab(domain) {

  const container = document.getElementById("subtabs");
  if (!container) throw new Error("ensureResultsSubtab: #subtabs not found");

  const bar = container.querySelector("ul.gallery-subtabs");
  if (!bar) throw new Error("ensureResultsSubtab: .gallery-subtabs not found");

  const label    = (domain === DOMAIN_SCRIPTS) ? "Drawings" : "Images";
  const existing = bar.querySelector(`[data-tab-id="${SUBTAB_RESULTS}"]`);

  if (existing) {
    existing.textContent = label;
    return;
  }

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
   ============================================================ */
export function activateGallerySubtab(subtabId) {

  const buttons = document.querySelectorAll(".gallery-subtabs .nav-link");
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tabId === subtabId);
  });

} // end activateGallerySubtab


/* ============================================================
   clearGalleryCaption()
   ============================================================ */
export function clearGalleryCaption() {
  const captionDiv = document.getElementById("caption");
  if (captionDiv) captionDiv.innerHTML = "";
} // end clearGalleryCaption


/* ============================================================
   showIdeabookCategories()
   ============================================================ */
export async function showIdeabookCategories() {

  clearDivs();

  const cache = getGalleryCache();
  if (!cache) throw new Error("showIdeabookCategories: gallery cache not loaded");

  const domainMap = cache.Ideabook;
  const frames = Object.keys(domainMap).map((cat) => {
    const list = domainMap[cat];
    return {
      title: cat,
      items: list.map((entry, idx) => ({
        name:        entry.title || entry.filename || entry.path || "(untitled)",
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
   ============================================================ */
export async function showPatternsCategories() {

  clearDivs();

  const cache = getGalleryCache();
  if (!cache) throw new Error("showPatternsCategories: gallery cache not loaded");

  const domainMap = cache.Patterns;
  const frames = Object.keys(domainMap).map((cat) => {
    const list = domainMap[cat];
    return {
      title: cat,
      items: list.map((entry, idx) => ({
        name:        entry.title || entry.filename || entry.path || "(untitled)",
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
   ============================================================ */
export async function showScriptsCategories() {

  clearDivs();

  const cache = getGalleryCache();
  if (!cache) throw new Error("showScriptsCategories: gallery cache not loaded");

  const domainMap = cache.Scripts;
  const frames = Object.keys(domainMap).map((cat) => {
    const list = domainMap[cat];
    return {
      title:     cat,
      sortItems: false,
      items: list.map((entry, idx) => ({
        name:        entry.title || entry.filename || "(untitled)",
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
