/* galleryResults.js
   ============================================================
   Gallery Tab â€” Results Display and Navigation
   ============================================================
   Role:
     Owns everything related to showing a selected item in the
     Results view and navigating between items with prev/next.

     There are two distinct result types in Gallery:
       â€¢ Image results  â€” Ideabook and Patterns domains.
                          Items are displayed as <img> elements
                          inside #text, with a thumbnail grid
                          in #action.
       â€¢ Script results â€” Scripts domain.
                          Items are executed as ES modules into
                          the shared canvas (#sketchpad).

     This file handles both types and the shared navigation
     (prev/next) that works across both.

   Architectural rules:
     â€¢ Does NOT build or activate subtabs. That is galleryNav.js.
     â€¢ Does NOT build the caption bar. That is galleryMenuCmds.js.
       This file calls updateGalleryCaption() from galleryMenuCmds.js
       after displaying an item.
     â€¢ Reads and writes galleryState.js via getters and setters.
       Never declares its own copies of the shared variables.
     â€¢ All uiState writes go through this file for result-related
       state (activeDomain, activeCategory, activeItem, saved).

   Exports:
     showGalleryResultsImages(domain, category, startIndex)
     showGalleryResultsScripts(category, index)
     showPrevGalleryItem(domain)
     showNextGalleryItem(domain)
   ============================================================ */

import { drawState } from "/draw/drawState.js";
import { runScriptByPath } from "../scriptRunner.js";
import {
  clearDivs,
  renderThumbnailGrid,
  markSelectedThumbnail
} from "/ui/uiUtilities.js";
import {
  getCurrentList,
  getCurrentIndex,
  getCurrentCategory,
  setCurrentDomain,
  setCurrentCategory,
  setCurrentList,
  setCurrentIndex
} from "./galleryState.js";
import { getGalleryCache } from "../gallery.js";
import { updateGalleryCaption } from "./galleryMenuCmds.js";


/* ============================================================
   Constants â€” must stay in sync with gallery.js and galleryNav.js
   ============================================================ */
const DOMAIN_SCRIPTS = "Scripts";


/* ============================================================
   showGalleryResultsImages(domain, category, startIndex)
   ============================================================
   Displays an image-based result view for the given domain
   and category, starting at startIndex.

   Sequence:
     1. Clear all shared regions.
     2. Load the entry list from the cache.
     3. Write current navigation state to galleryState and uiState.
     4. Render the thumbnail grid in #action.
     5. Display the selected image in #text.
     6. Update the caption bar.

   The thumbnail grid wires its own click handlers so that
   clicking a thumbnail updates the image and caption without
   re-rendering the grid.

   Arguments:
     domain      â€” "Ideabook" or "Patterns"
     category    â€” category string (e.g. "architecture")
     startIndex  â€” zero-based index of the item to show first
   ============================================================ */
export async function showGalleryResultsImages(domain, category, startIndex) {

  clearDivs();

  const cache = getGalleryCache();
  if (!cache) throw new Error("showGalleryResultsImages: gallery cache not loaded");

  const domainMap = cache[domain];
  if (!domainMap) throw new Error("showGalleryResultsImages: unknown domain: " + domain);

  const list = domainMap[category];
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("showGalleryResultsImages: empty or missing category: " + category);
  }

  /* Clamp startIndex to valid range. */
  let idx = startIndex;
  if (idx < 0 || idx >= list.length) idx = 0;

  /* Write shared navigation state */
  setCurrentDomain(domain);
  setCurrentCategory(category);
  setCurrentList(list);
  setCurrentIndex(idx);

  /* Write uiState */
  uiState.gallery.activeDomain   = domain;
  uiState.gallery.activeCategory = category;
  uiState.gallery.activeItem     = list[idx];

  const saved = {
    view: "results",
    domain:   domain,
    category: category,
    index:    idx
  };
  uiState.gallery.saved = saved;
  sessionStorage.setItem("sketchpad.gallery.saved", JSON.stringify(saved));

  /* Thumbnail grid in #action */
  renderThumbnailGrid(
    "action",
    list,
    /* thumbPath builder â€” one thumbnail image per entry */
    (entry) => `./gallery/${domain}/${category}/images/thumb_${entry.filename}.png`,
    /* onClick â€” update state, image, caption, and highlight */
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

  /* Initial image and caption */
  markSelectedThumbnail("action", idx);
  showGalleryImage(domain, category, list[idx]);
  updateGalleryCaption(domain, category);

} // end showGalleryResultsImages


/* ============================================================
   showGalleryResultsScripts(category, index)
   ============================================================
   Displays a script-based result view for the Scripts domain.

   Unlike image results, scripts are executed directly into the
   shared canvas. There is no thumbnail grid â€” scripts run
   one at a time and fill the sketchpad.

   Sequence:
     1. Clear all shared regions.
     2. Load the entry list from the cache.
     3. Write current navigation state to galleryState and uiState.
     4. Execute the script into the canvas via runScriptByPath().
     5. Update the caption bar.

   Arguments:
     category â€” category string under gallery/Scripts/
     index    â€” zero-based index of the script to execute
   ============================================================ */
export async function showGalleryResultsScripts(category, index) {

  clearDivs();

  const cache = getGalleryCache();
  if (!cache) throw new Error("showGalleryResultsScripts: gallery cache not loaded");

  const list = cache.Scripts[category];
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("showGalleryResultsScripts: empty or missing category: " + category);
  }

  /* Clamp index to valid range. */
  let idx = index;
  if (idx < 0 || idx >= list.length) idx = 0;

  /* Write shared navigation state */
  setCurrentDomain(DOMAIN_SCRIPTS);
  setCurrentCategory(category);
  setCurrentList(list);
  setCurrentIndex(idx);

  /* Write uiState */
  uiState.gallery.activeDomain   = DOMAIN_SCRIPTS;
  uiState.gallery.activeCategory = category;
  uiState.gallery.activeItem     = list[idx];

  const saved = {
    view:     "results",
    domain:   DOMAIN_SCRIPTS,
    category: category,
    index:    idx
  };
  uiState.gallery.saved = saved;
  sessionStorage.setItem("sketchpad.gallery.saved", JSON.stringify(saved));

  /* Execute the script and update caption */
  await showGalleryScript(category, list[idx]);
  updateGalleryCaption(DOMAIN_SCRIPTS, category);

} // end showGalleryResultsScripts


/* ============================================================
   showPrevGalleryItem(domain)
   ============================================================
   Navigates to the previous item in the current result list,
   wrapping around to the last item if already at the start.

   Works for both image and script domains â€” the domain argument
   determines which display function is called.

   Arguments:
     domain â€” the active domain string
   ============================================================ */
export async function showPrevGalleryItem(domain) {

  const list = getCurrentList();
  if (!list || !list.length) {
    throw new Error("showPrevGalleryItem: currentList is empty");
  }

  const oldIndex = getCurrentIndex();
  const newIndex = (oldIndex <= 0) ? list.length - 1 : oldIndex - 1;
  setCurrentIndex(newIndex);

  /* Persist new position */
  uiState.gallery.activeItem  = list[newIndex];
  uiState.gallery.saved.index = newIndex;
  sessionStorage.setItem("sketchpad.gallery.saved", JSON.stringify(uiState.gallery.saved));

  const category = getCurrentCategory();

  /* Display the new item */
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
   ============================================================
   Navigates to the next item in the current result list,
   wrapping around to the first item if already at the end.

   Arguments:
     domain â€” the active domain string
   ============================================================ */
export async function showNextGalleryItem(domain) {

  const list = getCurrentList();
  if (!list || !list.length) return;

  const oldIndex = getCurrentIndex();
  const newIndex = (oldIndex >= list.length - 1) ? 0 : oldIndex + 1;
  setCurrentIndex(newIndex);

  /* Persist new position */
  uiState.gallery.activeItem  = list[newIndex];
  uiState.gallery.saved.index = newIndex;
  sessionStorage.setItem("sketchpad.gallery.saved", JSON.stringify(uiState.gallery.saved));

  const category = getCurrentCategory();

  /* Display the new item */
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
   ============================================================
   Renders a single gallery image into the #text region.

   The image is sized to fit within the canvas dimensions
   (drawState.canvasWidth Ã— drawState.canvasHeight) while
   preserving aspect ratio via CSS max-width/max-height.

   Arguments:
     domain   â€” domain string (used to build the image URL path)
     category â€” category string
     entry    â€” manifest entry object with path or filename field
   ============================================================ */
export function showGalleryImage(domain, category, entry) {

  const text = document.getElementById("text");
  if (!text) throw new Error("showGalleryImage: #text not found");

  text.innerHTML = "";
  if (!entry) return;

  const img = document.createElement("img");

  /* Resolve the relative path from the manifest entry. */
  const relPath  = normalizeGalleryEntryPath(category, entry);
  const fullPath = `/gallery/${domain}/${category}/${relPath}`;

  img.src     = fullPath;
  img.alt     = entry.title || entry.filename || entry.path || "(image)";
  img.style.display   = "block";
  img.style.maxWidth  = drawState.canvasWidth  + "px";
  img.style.maxHeight = drawState.canvasHeight + "px";
  img.style.margin    = "0 auto";

  text.appendChild(img);

} // end showGalleryImage


/* ============================================================
   showGalleryScript(category, entry)
   ============================================================
   Executes a gallery script into the shared canvas.

   The script is loaded as a dynamic ES module via
   runScriptByPath(). Parameter controls are enabled so the
   script can expose interactive sliders if it defines them.

   Arguments:
     category â€” category string under gallery/Scripts/
     entry    â€” manifest entry object with a filename field
   ============================================================ */
async function showGalleryScript(category, entry) {

  if (!category) throw new Error("showGalleryScript: category missing");
  if (!entry)    throw new Error("showGalleryScript: entry missing");
  if (!entry.filename) throw new Error("showGalleryScript: entry.filename missing");

  const textDiv   = document.getElementById("text");
  const actionDiv = document.getElementById("action");
  const sketchDiv = document.getElementById("sketchpad");

  if (!textDiv)   throw new Error("showGalleryScript: #text not found");
  if (!actionDiv) throw new Error("showGalleryScript: #action not found");
  if (!sketchDiv) throw new Error("showGalleryScript: #sketchpad not found");

  /* Clear regions before script execution to prevent ghost content. */
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
   ============================================================
   Resolves a manifest entry's path or filename field into a
   clean relative path string, stripping any "./" prefix or
   leading "category/" prefix that may be present.

   This normalisation is needed because different manifest
   entries were created at different times and may use slightly
   different path conventions.

   Arguments:
     category â€” category string used to strip a leading prefix
     entry    â€” manifest entry with path or filename field

   Returns:
     A clean relative path string (e.g. "myImage.jpg")
   ============================================================ */
export function normalizeGalleryEntryPath(category, entry) {

  let p = entry.path || entry.filename;
  if (!p) throw new Error("normalizeGalleryEntryPath: entry missing path/filename");

  /* Strip leading "./" if present. */
  if (p.startsWith("./")) p = p.slice(2);

  /* Strip leading "category/" prefix if present. */
  const prefix = category + "/";
  if (p.startsWith(prefix)) p = p.slice(prefix.length);

  return p;

} // end normalizeGalleryEntryPath
