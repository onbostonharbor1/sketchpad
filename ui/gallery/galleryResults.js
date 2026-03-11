/* galleryResults.js
   ============================================================
   Gallery Tab -- Results Display and Navigation
   ============================================================
   Role:
     Owns everything related to showing a selected item in the
     Results view and navigating between items with prev/next.

   Architectural rules:
     * Does NOT build or activate subtabs. That is galleryNav.js.
     * Does NOT build the caption bar. That is galleryMenuCmds.js.
     * Reads and writes galleryState.js via getters and setters.
     * All uiState writes go through this file for result-related
       state (activeDomain, activeCategory, activeItem, saved).

   Exports:
     showGalleryResultsImages(domain, category, startIndex)
     showGalleryResultsScripts(category, index)
     showPrevGalleryItem(domain)
     showNextGalleryItem(domain)
     showGalleryImage(domain, category, entry)
     normalizeGalleryEntryPath(category, entry)
   ============================================================ */

import { drawState }              from "/draw/drawState.js";
import { runScriptByPath }        from "/ui/scriptRunner.js";
import {
  clearDivs,
  renderThumbnailGrid,
  markSelectedThumbnail
}                                 from "/ui/uiUtilities.js";
import {
  getCurrentList,
  getCurrentIndex,
  getCurrentCategory,
  setCurrentDomain,
  setCurrentCategory,
  setCurrentList,
  setCurrentIndex
}                                 from "./galleryState.js";
import { getGalleryCache }        from "/ui/gallery/gallery.js";
import { updateGalleryCaption }   from "./galleryMenuCmds.js";


/* ============================================================
   Constants
   ============================================================ */
const DOMAIN_SCRIPTS = "Scripts";


/* ============================================================
   showGalleryResultsImages(domain, category, startIndex)
   ============================================================ */
export async function showGalleryResultsImages(domain, category, startIndex) {

  clearDivs();

  const cache = getGalleryCache();
  if (!cache) throw new Error("showGalleryResultsImages: gallery cache not loaded");

  const domainMap = cache[domain];
  if (!domainMap) throw new Error("showGalleryResultsImages: unknown domain: " + domain);

  const list = domainMap[category];
  if (!Array.isArray(list) || list.length === 0)
    throw new Error("showGalleryResultsImages: empty or missing category: " + category);

  let idx = startIndex;
  if (idx < 0 || idx >= list.length) idx = 0;

  setCurrentDomain(domain);
  setCurrentCategory(category);
  setCurrentList(list);
  setCurrentIndex(idx);

  uiState.gallery.activeDomain   = domain;
  uiState.gallery.activeCategory = category;
  uiState.gallery.activeItem     = list[idx];

  const saved = { view: "results", domain, category, index: idx };
  uiState.gallery.saved = saved;
  sessionStorage.setItem("sketchpad.gallery.saved", JSON.stringify(saved));

  renderThumbnailGrid(
    "action",
    list,
    (entry) => `./gallery/${domain}/${category}/images/thumb_${entry.filename}.png`,
    async (_, i) => {
      setCurrentIndex(i);
      uiState.gallery.activeItem  = list[i];
      uiState.gallery.saved.index = i;
      sessionStorage.setItem("sketchpad.gallery.saved", JSON.stringify(uiState.gallery.saved));

      showGalleryImage(domain, category, list[i]);
      updateGalleryCaption(domain, category);
      markSelectedThumbnail("action", i);
    }
  );

  markSelectedThumbnail("action", idx);
  showGalleryImage(domain, category, list[idx]);
  updateGalleryCaption(domain, category);

} // end showGalleryResultsImages


/* ============================================================
   showGalleryResultsScripts(category, index)
   ============================================================ */
export async function showGalleryResultsScripts(category, index) {

  clearDivs();

  const cache = getGalleryCache();
  if (!cache) throw new Error("showGalleryResultsScripts: gallery cache not loaded");

  const list = cache.Scripts[category];
  if (!Array.isArray(list) || list.length === 0)
    throw new Error("showGalleryResultsScripts: empty or missing category: " + category);

  let idx = index;
  if (idx < 0 || idx >= list.length) idx = 0;

  setCurrentDomain(DOMAIN_SCRIPTS);
  setCurrentCategory(category);
  setCurrentList(list);
  setCurrentIndex(idx);

  uiState.gallery.activeDomain   = DOMAIN_SCRIPTS;
  uiState.gallery.activeCategory = category;
  uiState.gallery.activeItem     = list[idx];

  const saved = { view: "results", domain: DOMAIN_SCRIPTS, category, index: idx };
  uiState.gallery.saved = saved;
  sessionStorage.setItem("sketchpad.gallery.saved", JSON.stringify(saved));

  await showGalleryScript(category, list[idx]);
  updateGalleryCaption(DOMAIN_SCRIPTS, category);

} // end showGalleryResultsScripts


/* ============================================================
   showPrevGalleryItem(domain)
   ============================================================ */
export async function showPrevGalleryItem(domain) {

  const list = getCurrentList();
  if (!list || !list.length) throw new Error("showPrevGalleryItem: currentList is empty");

  const oldIndex = getCurrentIndex();
  const newIndex = (oldIndex <= 0) ? list.length - 1 : oldIndex - 1;
  setCurrentIndex(newIndex);

  uiState.gallery.activeItem  = list[newIndex];
  uiState.gallery.saved.index = newIndex;
  sessionStorage.setItem("sketchpad.gallery.saved", JSON.stringify(uiState.gallery.saved));

  const category = getCurrentCategory();

  if (domain === DOMAIN_SCRIPTS) {
    await showGalleryResultsScripts(category, newIndex);
    updateGalleryCaption(domain, category);
    return;
  }

  showGalleryImage(domain, category, list[newIndex]);
  updateGalleryCaption(domain, category);
  markSelectedThumbnail("action", newIndex);

} // end showPrevGalleryItem


/* ============================================================
   showNextGalleryItem(domain)
   ============================================================ */
export async function showNextGalleryItem(domain) {

  const list = getCurrentList();
  if (!list || !list.length) return;

  const oldIndex = getCurrentIndex();
  const newIndex = (oldIndex >= list.length - 1) ? 0 : oldIndex + 1;
  setCurrentIndex(newIndex);

  uiState.gallery.activeItem  = list[newIndex];
  uiState.gallery.saved.index = newIndex;
  sessionStorage.setItem("sketchpad.gallery.saved", JSON.stringify(uiState.gallery.saved));

  const category = getCurrentCategory();

  if (domain === DOMAIN_SCRIPTS) {
    await showGalleryResultsScripts(category, newIndex);
  } else {
    showGalleryImage(domain, category, list[newIndex]);
    markSelectedThumbnail("action", newIndex);
  }
  updateGalleryCaption(domain, category);

} // end showNextGalleryItem


/* ============================================================
   showGalleryImage(domain, category, entry)
   ============================================================ */
export function showGalleryImage(domain, category, entry) {

  const text = document.getElementById("text");
  if (!text) throw new Error("showGalleryImage: #text not found");

  text.innerHTML = "";
  if (!entry) return;

  const relPath  = normalizeGalleryEntryPath(category, entry);
  const fullPath = `/gallery/${domain}/${category}/${relPath}`;

  const img = document.createElement("img");
  img.src             = fullPath;
  img.alt             = entry.title || entry.filename || entry.path || "(image)";
  img.style.display   = "block";
  img.style.maxWidth  = drawState.canvasWidth  + "px";
  img.style.maxHeight = drawState.canvasHeight + "px";
  img.style.margin    = "0 auto";

  text.appendChild(img);

} // end showGalleryImage


/* ============================================================
   showGalleryScript(category, entry)
   ============================================================ */
async function showGalleryScript(category, entry) {

  if (!category)        throw new Error("showGalleryScript: category missing");
  if (!entry)           throw new Error("showGalleryScript: entry missing");
  if (!entry.filename)  throw new Error("showGalleryScript: entry.filename missing");

  const textDiv   = document.getElementById("text");
  const actionDiv = document.getElementById("action");
  const sketchDiv = document.getElementById("sketchpad");

  if (!textDiv)   throw new Error("showGalleryScript: #text not found");
  if (!actionDiv) throw new Error("showGalleryScript: #action not found");
  if (!sketchDiv) throw new Error("showGalleryScript: #sketchpad not found");

  textDiv.innerHTML   = "";
  actionDiv.innerHTML = "";
  sketchDiv.innerHTML = "";

  const scriptPath = `/gallery/Scripts/${category}/${entry.filename}`;

  try {
    await runScriptByPath(scriptPath, "canvas", {
      canvasRegionId: "sketchpad",
      enableControls: true
    });
  } catch (err) {
    throw new Error("showGalleryScript: execute error: " + err.message);
  }

} // end showGalleryScript


/* ============================================================
   normalizeGalleryEntryPath(category, entry)
   ============================================================ */
export function normalizeGalleryEntryPath(category, entry) {

  let p = entry.path || entry.filename;
  if (!p) throw new Error("normalizeGalleryEntryPath: entry missing path/filename");

  if (p.startsWith("./")) p = p.slice(2);

  const prefix = category + "/";
  if (p.startsWith(prefix)) p = p.slice(prefix.length);

  return p;

} // end normalizeGalleryEntryPath
