/* patternsNav.js
   ============================================================
   Patterns Tab Ã¢â‚¬â€ Subtab Construction and Category Views
   ============================================================
   Role:
     Owns everything related to building the Patterns subtab bar
     and rendering the category view.

     This file sits between the lifecycle layer (patterns.js) and
     the display layer (patternsDisplay.js). Its job is to put
     the correct category frames on screen and wire the clicks
     that transition into the Pattern view.

   Architectural rules:
     Ã¢â‚¬Â¢ Does NOT own the TabSpec, init(), restore(), or save().
       Those live in patterns.js.
     Ã¢â‚¬Â¢ Does NOT render pattern content (canvas execution).
       That lives in patternsDisplay.js.
     Ã¢â‚¬Â¢ Does NOT build caption bars or command offcanvas panels.
       Those live in patternsMenuCmds.js.
     Ã¢â‚¬Â¢ Reads patternsCache via getters from patternsState.js.
       Never imports the raw variable directly.

   Exports:
     setPatternsSubtabs()       Ã¢â‚¬â€ build the full subtab bar
     addPatternSubtab(category) Ã¢â‚¬â€ add/update the Pattern subtab
     showCategoryList()         Ã¢â‚¬â€ render category frames
     clearPatternsCaption()     Ã¢â‚¬â€ empty the caption region
   ============================================================ */

import { renderCategories, buildCategoryDescriptor } from "../categories.js";
import { manifest } from "../manifest.js";
import {
  setCurrentCategory,
  setCurrentIndex
} from "./patternsState.js";
import {
  showSelectedPattern
} from "./patternsDisplay.js";


/* ============================================================
   Constants Ã¢â‚¬â€ permanent subtab IDs
   ============================================================ */
const CATEGORIES_ID = "patterns-categories";
const PATTERN_ID    = "patterns-pattern";


/* ============================================================
   setPatternsSubtabs()
   ------------------------------------------------------------
   Builds the Patterns subtab bar inside #subtabs.

   Ã¢â‚¬Â¢ "Categories" tab is always present and active by default.
   Ã¢â‚¬Â¢ "Pattern" tab is added later by addPatternSubtab() when
     a specific pattern is selected.
   ============================================================ */
export function setPatternsSubtabs() {
  const container = document.getElementById("subtabs");
  if (!container) {
    throw new Error("setPatternsSubtabs: #subtabs not found");
  }

  container.innerHTML = "";

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs patterns-subtabs";
  container.appendChild(bar);

  // Categories tab ------------------------------------------------
  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className = "nav-link active";
  btn.dataset.tabId = CATEGORIES_ID;
  btn.textContent = "Categories";

  btn.addEventListener("click", async function () {
    if (!uiState.patterns) {
      uiState.patterns = {};
    }

    setCurrentCategory(null);
    setCurrentIndex(null);

    uiState.patterns.activeCategory = null;
    uiState.patterns.activeItem     = null;
    uiState.patterns.saved = {
      view: "categories",
      activeCategory: null,
      activeItem: null
    };

    const textDiv = document.getElementById("text");
    const actionDiv = document.getElementById("action");
    const padDiv = document.getElementById("sketchpad");

    if (!textDiv || !actionDiv || !padDiv) {
      throw new Error("setPatternsSubtabs: one or more regions missing");
    }

    textDiv.innerHTML   = "";
    actionDiv.innerHTML = "";
    padDiv.innerHTML    = "";

    await showCategoryList();
  });

  li.appendChild(btn);
  bar.appendChild(li);
} // end setPatternsSubtabs


/* ============================================================
   addPatternSubtab(category)
   ------------------------------------------------------------
   Ensures that the "Pattern" subtab exists and becomes active.
   Does NOT clear regions.
   ============================================================ */
export function addPatternSubtab(category) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) {
    throw new Error("addPatternSubtab: #subtabs ul not found");
  }

  // Look for existing Pattern tab
  let btn = bar.querySelector(`[data-tab-id="${PATTERN_ID}"]`);

  // If not present, create it
  if (!btn) {
    const li = document.createElement("li");
    li.className = "nav-item";

    btn = document.createElement("button");
    btn.className = "nav-link";
    btn.dataset.tabId = PATTERN_ID;
    btn.textContent = "Pattern";

    btn.addEventListener("click", () => {
      // On click, simply reselect the current pattern from uiState
      const cat = uiState.patterns.activeCategory;
      const idx = uiState.patterns.activeItem;

      if (cat != null && typeof idx === "number") {
        uiState.patterns.saved = {
          view: "pattern",
          activeCategory: cat,
          activeItem: idx
        };
        showSelectedPattern(cat, idx);
      }
    });

    li.appendChild(btn);
    bar.appendChild(li);
  }

  // Activate the Pattern tab and deactivate the Categories tab
  bar.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  // Update saved state
  uiState.patterns.saved = {
    view: "pattern",
    activeCategory: category,
    activeItem: uiState.patterns.activeItem
  };
} // end addPatternSubtab


/* ============================================================
   showCategoryList()
   ------------------------------------------------------------
   Shows category frames inside #text.
   Uses manifest.getCategoryMap("patterns") exclusively.
   ============================================================ */
export async function showCategoryList() {
  const textDiv   = document.getElementById("text");
  const actionDiv = document.getElementById("action");
  const padDiv    = document.getElementById("sketchpad");

  if (!textDiv || !actionDiv || !padDiv) {
    throw new Error("showCategoryList: required region missing");
  }

  clearPatternsCaption();

  // Clear dynamic regions only (subtabs are already built)
  textDiv.innerHTML   = "Loading pattern categories...";
  actionDiv.innerHTML = "";
  padDiv.innerHTML    = "";

  const groups = manifest.getCategoryMap("patterns");

  if (!groups) {
    throw new Error("showCategoryList: patterns manifest not loaded");
  }

  const descriptor = buildCategoryDescriptor(
    groups,
    function (entry) { return entry.title || entry.filename; }, // label
    function (categoryName, sortedList, entry, idx) {           // click handler
      setCurrentCategory(categoryName);
      setCurrentIndex(idx);

      uiState.patterns.activeCategory = categoryName;
      uiState.patterns.activeItem     = idx;
      uiState.patterns.saved = {
        view: "pattern",
        activeCategory: categoryName,
        activeItem: idx
      };

      addPatternSubtab(categoryName);
      showSelectedPattern(categoryName, idx);
    }
  );

  textDiv.innerHTML = "";
  renderCategories("text", descriptor);
} // end showCategoryList


/* ============================================================
   clearPatternsCaption()
   ------------------------------------------------------------
   Empties the caption region.
   ============================================================ */
export function clearPatternsCaption() {
  const captionDiv = document.getElementById("caption");
  if (captionDiv) captionDiv.innerHTML = "";
}
