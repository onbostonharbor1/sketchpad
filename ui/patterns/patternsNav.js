/* patternsNav.js
   ============================================================
   Patterns Tab -- Subtab Construction and Category Views
   ============================================================
   Role:
     Owns everything related to building the Patterns subtab bar
     and rendering the category view.

   Architectural rules:
     * Does NOT own the TabSpec, init(), restore(), or save().
       Those live in patterns.js.
     * Does NOT render pattern content (canvas execution).
       That lives in patternsDisplay.js.
     * Does NOT build caption bars or command offcanvas panels.
       Those live in patternsMenuCmds.js.
     * Reads patternsState via getters from patternsState.js.
       Never imports the raw variable directly.

   Exports:
     setPatternsSubtabs()
     addPatternSubtab(category)
     showCategoryList()
     clearPatternsCaption()
   ============================================================ */

import { renderCategories, buildCategoryDescriptor } from "/ui/categories.js";
import { manifest }                                  from "/ui/manifest.js";
import { setCurrentCategory, setCurrentIndex }       from "./patternsState.js";
import { showSelectedPattern }                       from "./patternsDisplay.js";


/* ============================================================
   Constants
   ============================================================ */
const CATEGORIES_ID = "patterns-categories";
const PATTERN_ID    = "patterns-pattern";


/* ============================================================
   setPatternsSubtabs()
   ============================================================ */
export function setPatternsSubtabs() {

  const container = document.getElementById("subtabs");
  if (!container) throw new Error("setPatternsSubtabs: #subtabs not found");

  container.innerHTML = "";

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs patterns-subtabs";
  container.appendChild(bar);

  const li  = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className     = "nav-link active";
  btn.dataset.tabId = CATEGORIES_ID;
  btn.textContent   = "Categories";

  btn.addEventListener("click", async function () {
    if (!uiState.patterns) uiState.patterns = {};

    setCurrentCategory(null);
    setCurrentIndex(null);

    uiState.patterns.activeCategory = null;
    uiState.patterns.activeItem     = null;
    uiState.patterns.saved = {
      view:           "categories",
      activeCategory: null,
      activeItem:     null
    };

    const textDiv   = document.getElementById("text");
    const actionDiv = document.getElementById("action");
    const padDiv    = document.getElementById("sketchpad");

    if (!textDiv || !actionDiv || !padDiv)
      throw new Error("setPatternsSubtabs: one or more regions missing");

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
   ============================================================ */
export function addPatternSubtab(category) {

  const bar = document.querySelector("#subtabs ul");
  if (!bar) throw new Error("addPatternSubtab: #subtabs ul not found");

  let btn = bar.querySelector(`[data-tab-id="${PATTERN_ID}"]`);

  if (!btn) {
    const li  = document.createElement("li");
    li.className = "nav-item";

    btn = document.createElement("button");
    btn.className     = "nav-link";
    btn.dataset.tabId = PATTERN_ID;
    btn.textContent   = "Pattern";

    btn.addEventListener("click", () => {
      const cat = uiState.patterns.activeCategory;
      const idx = uiState.patterns.activeItem;

      if (cat != null && typeof idx === "number") {
        uiState.patterns.saved = {
          view:           "pattern",
          activeCategory: cat,
          activeItem:     idx
        };
        showSelectedPattern(cat, idx);
      }
    });

    li.appendChild(btn);
    bar.appendChild(li);
  }

  bar.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  uiState.patterns.saved = {
    view:           "pattern",
    activeCategory: category,
    activeItem:     uiState.patterns.activeItem
  };

} // end addPatternSubtab


/* ============================================================
   showCategoryList()
   ============================================================ */
export async function showCategoryList() {

  const textDiv   = document.getElementById("text");
  const actionDiv = document.getElementById("action");
  const padDiv    = document.getElementById("sketchpad");

  if (!textDiv || !actionDiv || !padDiv)
    throw new Error("showCategoryList: required region missing");

  clearPatternsCaption();

  textDiv.innerHTML   = "Loading pattern categories...";
  actionDiv.innerHTML = "";
  padDiv.innerHTML    = "";

  const groups = manifest.getCategoryMap("patterns");
  if (!groups) throw new Error("showCategoryList: patterns manifest not loaded");

  const descriptor = buildCategoryDescriptor(
    groups,
    (entry) => entry.title || entry.filename,
    (categoryName, sortedList, entry, idx) => {
      setCurrentCategory(categoryName);
      setCurrentIndex(idx);

      uiState.patterns.activeCategory = categoryName;
      uiState.patterns.activeItem     = idx;
      uiState.patterns.saved = {
        view:           "pattern",
        activeCategory: categoryName,
        activeItem:     idx
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
   ============================================================ */
export function clearPatternsCaption() {
  const captionDiv = document.getElementById("caption");
  if (captionDiv) captionDiv.innerHTML = "";
} // end clearPatternsCaption
