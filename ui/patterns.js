/* patterns.js
   ------------------------------------------------------------
   Patterns Tab — Correct Restored Behavior (2-Subtab Model)
   ------------------------------------------------------------
   Structure:
     • Categories subtab  — shows category frames in #text
     • Pattern subtab     — shows drawing in #sketchpad + thumbnails in #action
   ------------------------------------------------------------
*/

import { renderCategories }    from "./categories.js";
import { setCaptionBar }       from "./caption.js";
import { menuManager }         from "./menuManager.js";
import { loadScriptModule, executeScriptToCanvas } from "./scriptRunner.js";
import { uiState }             from "./uiState.js";
import { clearDivs, showScriptOffcanvas, renderThumbnailGrid,
  buildCategoryDescriptor }    from "./ui_utilities.js";
import { manifest }            from "./manifest.js";

/* ===========================================================
   Constants — permanent subtab IDs
=========================================================== */
const CATEGORIES_ID = "patterns-categories";
const PATTERN_ID    = "patterns-pattern";

/* ===========================================================
   PatternsTabSpec — used by setUI.js
=========================================================== */
export const PatternsTabSpec = {
  name: "patterns",
  theme: "theme-patterns",
  regions: ["caption", "text", "sketchpad", "buttons", "action"],
  init: initPatternsTab,
  save: savePatternsState,
  buildCaption: () => {},
  buildText: () => {},
  buildSketchpad: () => {},
  buildButtons: () => {},
  buildAction: () => {}
}; // end PatternsTabSpec

/* ===========================================================
   PatternsController — exported for external callbacks
=========================================================== */
export const PatternsController = {
  initPatternsTab,
  showCategoryList: setPatternsCategories,
  showSelectedPattern,
  onPrev,
  onNext,
  buildPatternsMenuItems
}; // end PatternsController

/* ===========================================================
   initPatternsTab()
   Entry point for the Patterns tab
=========================================================== */
export async function initPatternsTab(restored = false) {
  // Clear all main regions
  clearDivs();

  // ***** REQUIRED *****
  // Load the Patterns manifest and build cache
  const raw = await manifest.get("patterns");   // underlying manifest data
  const registry = manifest.getRegistry("patterns"); // category list
  const groups   = raw;

  const map = {};
  for (let i = 0; i < registry.length; i++) {
    map[registry[i]] = groups[i] || [];
  }
  manifest.cache.patterns = map;

  // Ensure patterns state object exists
  uiState.patterns = uiState.patterns || {};

  // Build the subtabs bar (Categories + dynamic Pattern tab)
  setPatternsSubtabs();

  // Restore previous pattern view if possible
  if (
    restored &&
    uiState.patterns.view === "pattern" &&
    uiState.patterns.category != null &&
    typeof uiState.patterns.index === "number"
  ) {
    showSelectedPattern(uiState.patterns.category, uiState.patterns.index);
    return;
  }

  // Default: Categories view
  uiState.patterns.view     = "categories";
  uiState.patterns.category = null;
  uiState.patterns.index    = null;

  setPatternsCategories();
} // end initPatternsTab


/* ===========================================================
   setPatternsSubtabs()
   Always creates the Categories subtab.
   Pattern subtab is created dynamically.
=========================================================== */
function setPatternsSubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setPatternsSubtabs: #subtabs not found");

  // Always rebuild
  el.innerHTML = "";

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs patterns-subtabs";
  el.appendChild(bar);

  // ----- Categories subtab -----
  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className = "nav-link active";
  btn.dataset.tabId = CATEGORIES_ID;
  btn.textContent = "Categories";

  btn.addEventListener("click", () => {
    // Switch to categories view only — DO NOT reload manifest
    uiState.patterns.view = "categories";

    // Clear only pattern-side regions
    const text = document.getElementById("text");
    if (text) text.innerHTML = "";

    const action = document.getElementById("action");
    if (action) action.innerHTML = "";

    const pad = document.getElementById("sketchpad");
    if (pad) pad.innerHTML = "";

    // Redisplay category frames
    setPatternsCategories();
  });

  li.appendChild(btn);
  bar.appendChild(li);
} // end setPatternsSubtabs



/* ===========================================================
   setPatternsCategories()
   -----------------------------------------------------------
   Displays category frames in #text.
   Clears #action and #sketchpad.
   This is the Categories subtab.
=========================================================== */
/* ===========================================================
   setPatternsCategories()
   -----------------------------------------------------------
   Displays category frames in #text.
   Clears #action and #sketchpad.
   This is the Categories subtab.
=========================================================== */
async function setPatternsCategories() {
  const text = document.getElementById("text");
  if (!text) throw new Error("setPatternsCategories: #text not found");

  text.innerHTML = "<p>Loading pattern categories...</p>";

  // Manifest already loaded in initPatternsTab()
  const groups = manifest.cache.patterns;

  if (!groups) {
    text.innerHTML = "<p style='color:red'>Patterns manifest not loaded.</p>";
    return;
  }

  // Build category descriptor
const descriptor = buildCategoryDescriptor(
  manifest.cache.patterns,
  // label builder
  (entry) => entry.title || entry.filename,
  // click handler
  (category, sortedList, entry, idx) => {
    uiState.patterns.view     = "pattern";
    uiState.patterns.category = category;
    uiState.patterns.index    = idx;

    addPatternSubtab(category);
    showSelectedPattern(category, idx);
  }
);

  // Display category frames
  text.innerHTML = "";
  renderCategories("text", descriptor);

  // Clear pattern-side UI
  const actionDiv = document.getElementById("action");
  if (actionDiv) actionDiv.innerHTML = "";

  const pad = document.getElementById("sketchpad");
  if (pad) pad.innerHTML = "";

  // Caption bar
  setCaptionBar({
    targetId: "caption",
    title: "Patterns",
    onPrev: null,
    onNext: null,
    onMenu: null
  });
} // end setPatternsCategories


/* ===========================================================
   addPatternSubtab(category)
   -----------------------------------------------------------
   Creates the Pattern subtab (dynamic) if missing.
   Also activates it.
=========================================================== */
function addPatternSubtab(category) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) throw new Error("addPatternSubtab: missing subtab bar");

  let btn = bar.querySelector(`[data-tab-id="${PATTERN_ID}"]`);

  // Create the tab if needed
  if (!btn) {
    const li = document.createElement("li");
    li.className = "nav-item";

    btn = document.createElement("button");
    btn.className = "nav-link";
    btn.dataset.tabId = PATTERN_ID;
    btn.textContent = "Pattern";

    btn.addEventListener("click", () => {
      uiState.patterns.view = "pattern";
      clearDivs();
      const cat = uiState.patterns.category;
      const idx = uiState.patterns.index;
      if (cat != null && idx != null) {
        showSelectedPattern(cat, idx);
      }
    });

    li.appendChild(btn);
    bar.appendChild(li);
  }

  // Activate Pattern tab
  bar.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  uiState.patterns.view = "pattern";
} // end addPatternSubtab


/* ===========================================================
   showSelectedPattern(category, index)
   -----------------------------------------------------------
   Displays the selected pattern:
     • Activates Pattern subtab
     • Draws the object into #sketchpad via runPattern()
     • Shows thumbnails for this category in #action
     • Updates uiState
     • Builds caption bar
=========================================================== */
export async function showSelectedPattern(category, index) {

  uiState.patterns.view     = "pattern";
  uiState.patterns.category = category;
  uiState.patterns.index    = index;

  const list = manifest.cache.patterns?.[category] || [];
  const item = list[index];

  if (!item) {
    const pad = document.getElementById("sketchpad");
    if (pad) pad.innerHTML = "<p style='color:red'>(Missing pattern)</p>";
    return;
  }

  const filename   = item.filename;
  const scriptPath = `../patterns/${category}/${filename}.js`;

  const helpKey = `${category}/${filename}`;
  const items   = await buildPatternsMenuItems("patterns", helpKey, scriptPath);

  // Ensure Pattern subtab is active
  addPatternSubtab(category);

  // Clear the category list when showing a pattern
  const textDiv = document.getElementById("text");
  if (textDiv) textDiv.innerHTML = "";

  /* ----------------------------------------------------------
     Prepare sketchpad
  ---------------------------------------------------------- */
  const pad = document.getElementById("sketchpad");
  if (!pad) throw new Error("showSelectedPattern: #sketchpad not found");

  pad.innerHTML = "";
  pad.appendChild(window.drawCanvas);

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);

  /* ----------------------------------------------------------
     Build script path and load module using scriptRunner.js
  ---------------------------------------------------------- */
  let mod = null;

  try {
    mod = await loadScriptModule(scriptPath);
  } catch (err) {
    console.error("Patterns: load error:", err);
    pad.innerHTML =
      `<p style='color:red'>Pattern load error: ${err.message}</p>`;
    return;
  }

  /* ----------------------------------------------------------
     Execute script into the canvas (scriptRunner.js)
  ---------------------------------------------------------- */
  try {
    executeScriptToCanvas(mod, filename);
  } catch (err) {
    console.error("Patterns: execute error:", err);
    pad.innerHTML =
      `<p style='color:red'>Pattern execute error: ${err.message}</p>`;
    return;
  }

  /* ----------------------------------------------------------
     Thumbnails for this category
  ---------------------------------------------------------- */
  renderThumbnailGrid(
    "action",
    list,
    (entry) => `./patterns/${category}/images/thumb_${entry.filename}.png`,
    (_, idx) => {
      uiState.patterns.category = category;
      uiState.patterns.index    = idx;
      showSelectedPattern(category, idx);
    }
  );

  /* ----------------------------------------------------------
     Caption bar
  ---------------------------------------------------------- */
  setCaptionBar({
    targetId: "caption",
    title: item.title || filename,
    onPrev: () => onPrev(),
    onNext: () => onNext(),
    onMenu: async (anchor) => {
      const items = await buildPatternsMenuItems(
        "patterns",
        helpKey,
        scriptPath
      );
      menuManager.open(items, anchor);
    }
  });

} // end showSelectedPattern



/* ===========================================================
   onPrev()
   -----------------------------------------------------------
   Navigate to previous item in the same category.
=========================================================== */
export function onPrev() {
  const category = uiState.patterns.category;
  const index    = uiState.patterns.index;

  const list = manifest.cache.patterns?.[category] || [];
  if (!list.length) return;

  const newIndex = index > 0 ? index - 1 : list.length - 1;
  uiState.patterns.index = newIndex;

  showSelectedPattern(category, newIndex);
} // end onPrev


/* ===========================================================
   onNext()
   -----------------------------------------------------------
   Navigate to next item in the same category.
=========================================================== */
export function onNext() {
  const category = uiState.patterns.category;
  const index    = uiState.patterns.index;

  const list = manifest.cache.patterns?.[category] || [];
  if (!list.length) return;

  const newIndex = index < list.length - 1 ? index + 1 : 0;
  uiState.patterns.index = newIndex;

  showSelectedPattern(category, newIndex);
} // end onNext


/* ===========================================================
   buildPatternsMenuItems(tabName, category, scriptPath)
   -----------------------------------------------------------
   Builds dropdown menu items (Help + Show Script).
=========================================================== */
export async function buildPatternsMenuItems(tabName, helpKey, scriptPath) {
  const items = [];

  // HELP item – resolves to /help/<tabName>/<helpKey>.html
  const helpItem = await menuManager.buildHelpItem(tabName, helpKey);
  items.push(helpItem);

  // SCRIPT item
  if (scriptPath) {
    items.push({
      label: "Show Script",
      onClick: () => showScriptOffcanvas(scriptPath, helpKey)
    });
  } else {
    items.push({
      label: "Show Script",
      disabled: true,
      onClick: () => {}
    });
  }

  return items;
} // end buildPatternsMenuItems



/* ===========================================================
   savePatternsState()
=========================================================== */
export function savePatternsState() {
  const state = {
    view:     uiState.patterns.view || "categories",
    category: uiState.patterns.category || null,
    index:    uiState.patterns.index ?? null
  };

  console.log("💾 Saved Patterns state:", state);
  return state;
} // end savePatternsState


/* ===========================================================
   patternsDivs — required by setUI.js
=========================================================== */
export const patternsDivs = {
  activeDivs: ["subtabs"],
  theme: "theme-patterns",

  action: () => {
    const el = document.getElementById("action");
    if (el) el.innerHTML = "";
  },

  buttons: () => {
    const el = document.getElementById("buttons");
    if (el) el.innerHTML = "";
  },

  caption: () => {
    const el = document.getElementById("caption");
    if (el) el.innerHTML = "";
  },

  sketchpad: () => {
    const el = document.getElementById("sketchpad");
    if (el) el.innerHTML = "";
  },

  subtabs: () => {
    setPatternsSubtabs();
  },

  text: () => {
    const el = document.getElementById("text");
    if (el) el.innerHTML = "";
  }
}; // end patternsDivs
