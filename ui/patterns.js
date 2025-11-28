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
  clearDivs();

  const raw      = await manifest.get("patterns");
  const registry = manifest.getRegistry("patterns");
  const groups   = raw;

  const map = {};
  for (let i = 0; i < registry.length; i++) {
    map[registry[i]] = groups[i] || [];
  }
  manifest.cache.patterns = map;

  uiState.patterns = uiState.patterns || {};

  setPatternsSubtabs();

  if (
    restored &&
    uiState.patterns.saved &&
    uiState.patterns.saved.view === "pattern" &&
    uiState.patterns.saved.activeCategory != null &&
    typeof uiState.patterns.saved.activeItem === "number"
  ) {
    showSelectedPattern(
      uiState.patterns.saved.activeCategory,
      uiState.patterns.saved.activeItem
    );
    return;
  }

  uiState.patterns.activeCategory = null;
  uiState.patterns.activeItem     = null;
  uiState.patterns.saved = {
    view: "categories",
    activeCategory: null,
    activeItem: null
  };

  setPatternsCategories();
} // end initPatternsTab

/* ===========================================================
   setPatternsSubtabs()
=========================================================== */
function setPatternsSubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setPatternsSubtabs: #subtabs not found");

  el.innerHTML = "";

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs patterns-subtabs";
  el.appendChild(bar);

  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className = "nav-link active";
  btn.dataset.tabId = CATEGORIES_ID;
  btn.textContent = "Categories";

  btn.addEventListener("click", () => {
    uiState.patterns.activeCategory = null;
    uiState.patterns.activeItem     = null;
    uiState.patterns.saved = {
      view: "categories",
      activeCategory: null,
      activeItem: null
    };

    const text = document.getElementById("text");
    if (text) text.innerHTML = "";

    const action = document.getElementById("action");
    if (action) action.innerHTML = "";

    const pad = document.getElementById("sketchpad");
    if (pad) pad.innerHTML = "";

    setPatternsCategories();
  });

  li.appendChild(btn);
  bar.appendChild(li);
} // end setPatternsSubtabs

/* ===========================================================
   setPatternsCategories()
=========================================================== */
async function setPatternsCategories() {
  const text = document.getElementById("text");
  if (!text) throw new Error("setPatternsCategories: #text not found");

  text.innerHTML = "<p>Loading pattern categories...</p>";

  const groups = manifest.cache.patterns;

  if (!groups) {
    text.innerHTML = "<p style='color:red'>Patterns manifest not loaded.</p>";
    return;
  }

  const descriptor = buildCategoryDescriptor(
    manifest.cache.patterns,
    (entry) => entry.title || entry.filename,

    (category, sortedList, entry, idx) => {
      uiState.patterns.activeCategory = category;
      uiState.patterns.activeItem     = idx;
      uiState.patterns.saved = {
        view: "pattern",
        activeCategory: category,
        activeItem: idx
      };

      addPatternSubtab(category);
      showSelectedPattern(category, idx);
    }
  );

  text.innerHTML = "";
  renderCategories("text", descriptor);

  const actionDiv = document.getElementById("action");
  if (actionDiv) actionDiv.innerHTML = "";

  const pad = document.getElementById("sketchpad");
  if (pad) pad.innerHTML = "";

  setCaptionBar({
    targetId: "caption",
    title: "Patterns",
    onPrev: null,
    onNext: null,
    onMenu: null
  });
} // end setPatternsCategories

/* ===========================================================
   addPatternSubtab()
=========================================================== */
function addPatternSubtab(category) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) throw new Error("addPatternSubtab: missing subtab bar");

  let btn = bar.querySelector(`[data-tab-id="${PATTERN_ID}"]`);

  if (!btn) {
    const li = document.createElement("li");
    li.className = "nav-item";

    btn = document.createElement("button");
    btn.className = "nav-link";
    btn.dataset.tabId = PATTERN_ID;
    btn.textContent = "Pattern";

    btn.addEventListener("click", () => {
      clearDivs();
      const cat = uiState.patterns.activeCategory;
      const idx = uiState.patterns.activeItem;

      if (cat != null && idx != null) {
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

  bar.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  uiState.patterns.saved = {
    view: "pattern",
    activeCategory: category,
    activeItem: uiState.patterns.activeItem
  };
} // end addPatternSubtab

/* ===========================================================
   showSelectedPattern()
=========================================================== */
export async function showSelectedPattern(category, index) {

  uiState.patterns.activeCategory = category;
  uiState.patterns.activeItem     = index;
  uiState.patterns.saved = {
    view: "pattern",
    activeCategory: category,
    activeItem: index
  };

  const list = manifest.cache.patterns?.[category] || [];
  const item = list[index];

  if (!item) {
    const padMissing = document.getElementById("sketchpad");
    if (padMissing) {
      padMissing.innerHTML = "<p style='color:red'>(Missing pattern)</p>";
    }
    return;
  }

  const filename   = item.filename;
  const scriptPath = `../patterns/${category}/${filename}.js`;

  const helpKey = `${category}/${filename}`;
  const items   = await buildPatternsMenuItems("patterns", helpKey, scriptPath);

  addPatternSubtab(category);

  const textDiv = document.getElementById("text");
  if (textDiv) textDiv.innerHTML = "";

  const pad = document.getElementById("sketchpad");
  if (!pad) throw new Error("showSelectedPattern: #sketchpad not found");

  pad.innerHTML = "";
  pad.appendChild(window.drawCanvas);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);

  let mod = null;

  try {
    mod = await loadScriptModule(scriptPath);
  } catch (err) {
    console.error("Patterns: load error:", err);
    pad.innerHTML =
      `<p style='color:red'>Pattern load error: ${err.message}</p>`;
    return;
  }

  try {
    executeScriptToCanvas(mod, filename);
  } catch (err) {
    console.error("Patterns: execute error:", err);
    pad.innerHTML =
      `<p style='color:red'>Pattern execute error: ${err.message}</p>`;
    return;
  }

  renderThumbnailGrid(
    "action",
    list,
    (entry) => `./patterns/${category}/images/thumb_${entry.filename}.png`,
    (_, idx) => {
      uiState.patterns.activeCategory = category;
      uiState.patterns.activeItem     = idx;
      uiState.patterns.saved = {
        view: "pattern",
        activeCategory: category,
        activeItem: idx
      };
      showSelectedPattern(category, idx);
    }
  );

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
=========================================================== */
export function onPrev() {
  const category = uiState.patterns.activeCategory;
  const index    = uiState.patterns.activeItem;

  const list = manifest.cache.patterns?.[category] || [];
  if (!list.length) return;

  const newIndex = index > 0 ? index - 1 : list.length - 1;

  uiState.patterns.activeItem = newIndex;
  uiState.patterns.saved = {
    view: "pattern",
    activeCategory: category,
    activeItem: newIndex
  };

  showSelectedPattern(category, newIndex);
} // end onPrev

/* ===========================================================
   onNext()
=========================================================== */
export function onNext() {
  const category = uiState.patterns.activeCategory;
  const index    = uiState.patterns.activeItem;

  const list = manifest.cache.patterns?.[category] || [];
  if (!list.length) return;

  const newIndex = index < list.length - 1 ? index + 1 : 0;

  uiState.patterns.activeItem = newIndex;
  uiState.patterns.saved = {
    view: "pattern",
    activeCategory: category,
    activeItem: newIndex
  };

  showSelectedPattern(category, newIndex);
} // end onNext

/* ===========================================================
   buildPatternsMenuItems()
=========================================================== */
export async function buildPatternsMenuItems(tabName, helpKey, scriptPath) {
  const items = [];

  const helpItem = await menuManager.buildHelpItem(tabName, helpKey);
  items.push(helpItem);

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
  const state = uiState.patterns.saved || {
    view: "categories",
    activeCategory: null,
    activeItem: null
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

