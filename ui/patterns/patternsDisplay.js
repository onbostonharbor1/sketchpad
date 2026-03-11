/* patternsDisplay.js
   ============================================================
   Patterns Tab -- Pattern Display and Navigation
   ============================================================
   Role:
     Owns everything related to showing a selected pattern and
     navigating between patterns with prev/next.

   Architectural rules:
     * Does NOT build or activate subtabs. That is patternsNav.js.
     * Does NOT build the caption bar. That is patternsMenuCmds.js.
     * Reads and writes patternsState.js via getters and setters.
     * All uiState writes go through this file for pattern-related
       state (activeCategory, activeItem, saved).

   Exports:
     showSelectedPattern(category, index)
     renderPatternThumbGrid(category)
     onPrev()
     onNext()
   ============================================================ */

import { runScriptByPath }                      from "/ui/scriptRunner.js";
import { manifest }                             from "/ui/manifest.js";
import { renderThumbnailGrid, markSelectedThumbnail } from "/ui/uiUtilities.js";
import { getCurrentCategory, getCurrentIndex,
         setCurrentCategory, setCurrentIndex }  from "./patternsState.js";
import { updatePatternsCaption }                from "./patternsMenuCmds.js";
import { addPatternSubtab }                     from "./patternsNav.js";


/* ============================================================
   renderPatternThumbGrid(category)
   ============================================================ */
export function renderPatternThumbGrid(category) {

  if (!category) throw new Error("renderPatternThumbGrid: category missing");

  const cache = manifest.getCategoryMap("patterns");
  const list  = cache[category];

  if (!Array.isArray(list))
    throw new Error("renderPatternThumbGrid: list missing for category: " + category);

  renderThumbnailGrid(
    "action",
    list,
    (entry) => `./patterns/${category}/images/thumb_${entry.filename}.png`,
    (_, idx) => {
      setCurrentCategory(category);
      setCurrentIndex(idx);

      uiState.patterns.activeCategory = category;
      uiState.patterns.activeItem     = idx;
      uiState.patterns.saved = {
        view:           "pattern",
        activeCategory: category,
        activeItem:     idx
      };

      showSelectedPattern(category, idx);
    }
  );

  markSelectedThumbnail("action", uiState.patterns.activeItem);

} // end renderPatternThumbGrid


/* ============================================================
   showSelectedPattern(category, index)
   ============================================================ */
export async function showSelectedPattern(category, index) {

  setCurrentCategory(category);
  setCurrentIndex(index);

  uiState.patterns.activeCategory = category;
  uiState.patterns.activeItem     = index;

  const savedState = {
    view:           "pattern",
    activeCategory: category,
    activeItem:     index
  };
  uiState.patterns.saved = savedState;

  sessionStorage.setItem("sketchpad.patterns.saved", JSON.stringify(savedState));

  const cache = manifest.getCategoryMap("patterns");
  const list  = cache[category] || [];
  const item  = list[index];

  const textDiv   = document.getElementById("text");
  const padDiv    = document.getElementById("sketchpad");
  const actionDiv = document.getElementById("action");

  if (!textDiv || !padDiv || !actionDiv)
    throw new Error("showSelectedPattern: missing required region");

  textDiv.innerHTML   = "";
  actionDiv.innerHTML = "";
  padDiv.innerHTML    = "";

  if (!item) {
    padDiv.innerHTML = "<p style='color:red'>(Missing pattern entry)</p>";
    return;
  }

  const filename   = item.filename;
  const scriptPath = `/patterns/${category}/${filename}.js`;
  const helpKey    = `${category}/${filename}`;

  try {
    await runScriptByPath(scriptPath, "canvas", {
      canvasRegionId: "sketchpad",
      enableControls: true
    });
  } catch (err) {
    padDiv.innerHTML = `<p style='color:red'>Pattern execute error: ${err.message}</p>`;
    return;
  }

  renderPatternThumbGrid(category);
  updatePatternsCaption(category, item, helpKey);
  addPatternSubtab(category);

} // end showSelectedPattern


/* ============================================================
   onPrev()
   ============================================================ */
export function onPrev() {

  const category = getCurrentCategory();
  const index    = getCurrentIndex();

  const cache = manifest.getCategoryMap("patterns");
  const list  = cache?.[category] || [];
  if (!list.length) return;

  const newIndex = index > 0 ? index - 1 : list.length - 1;

  setCurrentIndex(newIndex);
  uiState.patterns.activeItem = newIndex;
  uiState.patterns.saved = {
    view:           "pattern",
    activeCategory: category,
    activeItem:     newIndex
  };

  showSelectedPattern(category, newIndex);

} // end onPrev


/* ============================================================
   onNext()
   ============================================================ */
export function onNext() {

  const category = getCurrentCategory();
  const index    = getCurrentIndex();

  const cache = manifest.getCategoryMap("patterns");
  const list  = cache?.[category] || [];
  if (!list.length) return;

  const newIndex = index < list.length - 1 ? index + 1 : 0;

  setCurrentIndex(newIndex);
  uiState.patterns.activeItem = newIndex;
  uiState.patterns.saved = {
    view:           "pattern",
    activeCategory: category,
    activeItem:     newIndex
  };

  showSelectedPattern(category, newIndex);

} // end onNext
