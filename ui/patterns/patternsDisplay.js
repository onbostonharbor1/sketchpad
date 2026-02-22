/* patternsDisplay.js
   ============================================================
   Patterns Tab â€” Pattern Display and Navigation
   ============================================================
   Role:
     Owns everything related to showing a selected pattern and
     navigating between patterns with prev/next.

     Patterns are displayed by executing their script module
     into the shared canvas (#sketchpad), with parameter controls
     in #action and a thumbnail grid also in #action.

   Architectural rules:
     â€¢ Does NOT build or activate subtabs. That is patternsNav.js.
     â€¢ Does NOT build the caption bar. That is patternsMenuCmds.js.
       This file calls updatePatternsCaption() from patternsMenuCmds.js
       after displaying a pattern.
     â€¢ Reads and writes patternsState.js via getters and setters.
       Never declares its own copies of the shared variables.
     â€¢ All uiState writes go through this file for pattern-related
       state (activeCategory, activeItem, saved).

   Exports:
     showSelectedPattern(category, index)
     renderPatternThumbGrid(category)
     onPrev()
     onNext()
   ============================================================ */

import { runScriptByPath } from "../scriptRunner.js";
import { manifest } from "../manifest.js";
import {
  renderThumbnailGrid,
  markSelectedThumbnail
} from "/ui/uiUtilities.js";
import {
  getCurrentCategory,
  getCurrentIndex,
  setCurrentCategory,
  setCurrentIndex
} from "./patternsState.js";
import {
  updatePatternsCaption
} from "./patternsMenuCmds.js";
import {
  addPatternSubtab
} from "./patternsNav.js";


/* ============================================================
   renderPatternThumbGrid(category)
   ------------------------------------------------------------
   Rebuilds the thumbnail grid for the given category into #action.
   Click behavior remains "select pattern idx".
   ============================================================ */
export function renderPatternThumbGrid(category) {

  if (!category) throw new Error("renderPatternThumbGrid: category missing");

  const cache = manifest.getCategoryMap("patterns");
  const list = cache[category];

  if (!Array.isArray(list)) {
    throw new Error("renderPatternThumbGrid: list missing for category: " + category);
  }

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
        view: "pattern",
        activeCategory: category,
        activeItem: idx
      };

      // IMPORTANT: showSelectedPattern will rebuild the grid anyway.
      showSelectedPattern(category, idx);
    }
  );

  // AFTER the grid exists, mark the selected one.
  // This is the key: first arg is the panel id, second is the index.
  markSelectedThumbnail("action", uiState.patterns.activeItem);

} // end renderPatternThumbGrid


/* ============================================================
   showSelectedPattern(category, index)
   ------------------------------------------------------------
   Draws the pattern on the shared canvas.
   Populates captions and thumbnails.
   ============================================================ */
export async function showSelectedPattern(category, index) {
  setCurrentCategory(category);
  setCurrentIndex(index);

  uiState.patterns.activeCategory = category;
  uiState.patterns.activeItem     = index;

  const savedState = {
    view: "pattern",
    activeCategory: category,
    activeItem: index
  };
  uiState.patterns.saved = savedState;

  // Persist to sessionStorage for page reload survival
  sessionStorage.setItem("sketchpad.patterns.saved", JSON.stringify(savedState));

  const cache = manifest.getCategoryMap("patterns");
  const list = cache[category] || [];
  const item = list[index];

  const textDiv   = document.getElementById("text");
  const padDiv    = document.getElementById("sketchpad");
  const actionDiv = document.getElementById("action");

  if (!textDiv || !padDiv || !actionDiv) {
    throw new Error("showSelectedPattern: missing required region");
  }

  // Clear dynamic regions
  textDiv.innerHTML   = "";
  actionDiv.innerHTML = "";
  padDiv.innerHTML    = "";

  if (!item) {
    padDiv.innerHTML =
      "<p style='color:red'>(Missing pattern entry)</p>";
    return;
  }

  const filename   = item.filename;
  const scriptPath = `/patterns/${category}/${filename}.js`;
  const helpKey    = `${category}/${filename}`;

  // Execute the pattern script
  try {
    await runScriptByPath(scriptPath, "canvas", {
      canvasRegionId: "sketchpad",
      enableControls: true
    });
  } catch (err) {
    padDiv.innerHTML =
      `<p style='color:red'>Pattern execute error: ${err.message}</p>`;
    return;
  }

  renderPatternThumbGrid(category);

  // Caption bar: "{category}: {title}"
  updatePatternsCaption(category, item, helpKey);

  // Ensure Pattern subtab active
  addPatternSubtab(category);
} // end showSelectedPattern


/* ============================================================
   onPrev() / onNext()
   ------------------------------------------------------------
   Simple index cycling â€” fail-fast if cache missing.
   ============================================================ */
export function onPrev() {
  const category = getCurrentCategory();
  const index    = getCurrentIndex();

  const cache = manifest.getCategoryMap("patterns");
  const list = cache?.[category] || [];
  if (!list.length) return;

  const newIndex = index > 0 ? index - 1 : list.length - 1;

  setCurrentIndex(newIndex);
  uiState.patterns.activeItem = newIndex;
  uiState.patterns.saved = {
    view: "pattern",
    activeCategory: category,
    activeItem: newIndex
  };

  showSelectedPattern(category, newIndex);
} // end onPrev


export function onNext() {
  const category = getCurrentCategory();
  const index    = getCurrentIndex();

  const cache = manifest.getCategoryMap("patterns");
  const list = cache?.[category] || [];
  if (!list.length) return;

  const newIndex = index < list.length - 1 ? index + 1 : 0;

  setCurrentIndex(newIndex);
  uiState.patterns.activeItem = newIndex;
  uiState.patterns.saved = {
    view: "pattern",
    activeCategory: category,
    activeItem: newIndex
  };

  showSelectedPattern(category, newIndex);
} // end onNext
