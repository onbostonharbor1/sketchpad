/* patterns.js
   ------------------------------------------------------------
   Patterns Tab — New Architecture (Cold Init + Restore Model)
   ------------------------------------------------------------
   New structure:
     • initPatternsTab(restoredFlag)  → cold-start only
     • restorePatternsTab()           → rebuild from uiState
     • PatternsController             → pure action functions
   ------------------------------------------------------------
*/

import { renderCategories }    from "./categories.js";
import { setCaptionBar }       from "./caption.js";
import { menuManager }         from "./menuManager.js";
import { loadScriptModule, executeScriptToCanvas } from "./scriptRunner.js";
import { showScriptOffcanvas, renderThumbnailGrid,
         buildCategoryDescriptor } from "./ui_utilities.js";
import { manifest }            from "./manifest.js";

/* ============================================================
   Constants — permanent subtab IDs
=========================================================== */
const CATEGORIES_ID = "patterns-categories";
const PATTERN_ID    = "patterns-pattern";

/* ============================================================
   PatternsTabSpec — used by setUI.js
   ------------------------------------------------------------
   Must implement:
     init(restoredFlag)
     restore()
     save()
=========================================================== */
export const PatternsTabSpec = {
  name: "patterns",
  theme: "theme-patterns",
  regions: ["caption", "text", "sketchpad", "action"],

  init: initPatternsTab,        // cold-start only
  restore: restorePatternsTab,  // rebuild from saved uiState
  save: savePatternsState,      // optional persistence hook

  buildCaption: () => {},
  buildText: () => {},
  buildSketchpad: () => {},
  buildAction: () => {}
}; // end PatternsTabSpec

/* ============================================================
   PatternsController — pure action functions
=========================================================== */
export const PatternsController = {
  initPatternsTab,
  showCategoryList,
  showSelectedPattern,
  onPrev,
  onNext,
  buildPatternsMenuItems
}; // end PatternsController

/* ============================================================
   ensurePatternsManifestLoaded()
   ------------------------------------------------------------
   Loads the patterns manifest once and caches it into
   manifest.cache.patterns as:
     {
       categoryName: [ entry, entry, ... ],
       ...
     }
=========================================================== */
async function ensurePatternsManifestLoaded() {
  if (manifest.cache && manifest.cache.patterns) {
    return;
  }

  const raw      = await manifest.get("patterns");
  const registry = manifest.getRegistry("patterns");

  if (!raw || !registry) {
    throw new Error("ensurePatternsManifestLoaded: patterns manifest data missing");
  }

  const map = {};
  for (let i = 0; i < registry.length; i++) {
    const categoryName = registry[i];
    map[categoryName] = raw[i] || [];
  }

  if (!manifest.cache) {
    manifest.cache = {};
  }

  manifest.cache.patterns = map;
} // end ensurePatternsManifestLoaded


/* ============================================================
   initPatternsTab(restored)
   ------------------------------------------------------------
   Cold-start initializer for the Patterns tab.

   NOTE:
     • setUI / setUI.initTab() has already cleared regions
       and applied the theme.
     • This function MUST NOT do any restore logic.
     • It sets up static UI (subtabs) and shows default
       category list.
=========================================================== */
export async function initPatternsTab(restored) {
  // defensive: patterns state container
  if (!uiState.patterns) {
    uiState.patterns = {};
  }

  // This init is called only on cold start; restored flag is ignored
  // by design in the new architecture.
  await ensurePatternsManifestLoaded();

  // Build the fixed subtabs bar for Patterns
  setPatternsSubtabs();

  // Default state is "categories" view
  uiState.patterns.activeCategory = null;
  uiState.patterns.activeItem     = null;
  uiState.patterns.saved = {
    view: "categories",
    activeCategory: null,
    activeItem: null
  };

  // Show the list of pattern categories in #text
  await showCategoryList();
} // end initPatternsTab


/* ============================================================
   setPatternsSubtabs()
   ------------------------------------------------------------
   Builds the Patterns subtab bar inside #subtabs.

   • "Categories" tab is always present and active by default.
   • "Pattern" tab is added later by addPatternSubtab() when
     a specific pattern is selected.
=========================================================== */
function setPatternsSubtabs() {
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
   restorePatternsTab()
   ------------------------------------------------------------
   Called ONLY when uiState.patterns.saved exists.

   Rules:
     • NO clearing — setUI/initTab already handled that.
     • NO static UI building — subtabs already built during init.
     • JUST restore the exact previous view from uiState.
=========================================================== */
async function restorePatternsTab() {
  if (!uiState.patterns || !uiState.patterns.saved) {
    throw new Error("restorePatternsTab: no saved Patterns state found");
  }

  const saved = uiState.patterns.saved;
  const view  = saved.view;

  // Ensure manifest is loaded before reconstructing
  await ensurePatternsManifestLoaded();

  // Set subtabs (needed after every cold-init)
  setPatternsSubtabs();

  if (view === "categories") {
    // Restore the categories list exactly as it was
    uiState.patterns.activeCategory = null;
    uiState.patterns.activeItem     = null;
    await showCategoryList();
    return;
  }

  if (view === "pattern") {
    const cat = saved.activeCategory;
    const idx = saved.activeItem;

    if (!cat || typeof idx !== "number") {
      throw new Error("restorePatternsTab: invalid saved pattern state");
    }

    // NOTE: This does NOT clear #text, #sketchpad, #action.
    // showSelectedPattern will repopulate regions as needed.
    uiState.patterns.activeCategory = cat;
    uiState.patterns.activeItem     = idx;

    await showSelectedPattern(cat, idx);
    return;
  }

  // Any unknown view is an error (fail-fast)
  throw new Error(
    "restorePatternsTab: unknown saved view type '" + view + "'"
  );
} // end restorePatternsTab

/* ============================================================
   showCategoryList()
   ------------------------------------------------------------
   Cold and restore both use this to show category frames
   inside #text.  Uses manifest.cache.patterns exclusively.
=========================================================== */
async function showCategoryList() {
  const textDiv = document.getElementById("text");
  const actionDiv = document.getElementById("action");
  const padDiv = document.getElementById("sketchpad");

  if (!textDiv || !actionDiv || !padDiv) {
    throw new Error("showCategoryList: required region missing");
  }

  // Clear dynamic regions only (subtabs are already built)
  textDiv.innerHTML   = "Loading pattern categories...";
  actionDiv.innerHTML = "";
  padDiv.innerHTML    = "";

  await ensurePatternsManifestLoaded();
  const groups = manifest.cache.patterns;

  if (!groups) {
    textDiv.innerHTML =
      "<p style='color:red'>Patterns manifest not available.</p>";
    return;
  }

  // Descriptor drives the categories UI
  const descriptor = buildCategoryDescriptor(
    groups,
    entry => entry.title || entry.filename,   // label
    (category, sortedList, entry, idx) => {   // click handler
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

  textDiv.innerHTML = "";
  renderCategories("text", descriptor);

  // Caption: Patterns root
  setCaptionBar({
    targetId: "caption",
    title: "Patterns",
    onPrev: null,
    onNext: null,
    onMenu: null
  });
} // end showCategoryList


/* ============================================================
   addPatternSubtab(category)
   ------------------------------------------------------------
   Ensures that the "Pattern" subtab exists and becomes active.
   Does NOT clear regions.
=========================================================== */
function addPatternSubtab(category) {
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
   showSelectedPattern(category, index)
   ------------------------------------------------------------
   Draws the pattern on the shared canvas.
   Populates captions and thumbnails.
=========================================================== */
async function showSelectedPattern(category, index) {
  uiState.patterns.activeCategory = category;
  uiState.patterns.activeItem     = index;
  uiState.patterns.saved = {
    view: "pattern",
    activeCategory: category,
    activeItem: index
  };

  await ensurePatternsManifestLoaded();
  const list = manifest.cache.patterns?.[category] || [];
  const item = list[index];

  const textDiv  = document.getElementById("text");
  const padDiv   = document.getElementById("sketchpad");
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
  const scriptPath = `../patterns/${category}/${filename}.js`;
  const helpKey    = `${category}/${filename}`;

  // Load and execute pattern script
  let mod = null;

  try {
    mod = await loadScriptModule(scriptPath);
  } catch (err) {
    padDiv.innerHTML =
      `<p style='color:red'>Pattern load error: ${err.message}</p>`;
    return;
  }

  // Attach shared canvas
  if (!window.drawCanvas) {
    throw new Error("showSelectedPattern: window.drawCanvas missing");
  }

  padDiv.appendChild(window.drawCanvas);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);

  try {
    executeScriptToCanvas(mod, filename);
  } catch (err) {
    padDiv.innerHTML =
      `<p style='color:red'>Pattern execute error: ${err.message}</p>`;
    return;
  }

  // Thumbnail grid
  renderThumbnailGrid(
    "action",
    list,
    (entry) =>
      `./patterns/${category}/images/thumb_${entry.filename}.png`,
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

  // Caption bar
  setCaptionBar({
    targetId: "caption",
    title: item.title || filename,
    onPrev: () => onPrev(),
    onNext: () => onNext(),
    onMenu: async (anchor) => {
      const menuItems = await buildPatternsMenuItems(
        "patterns",
        helpKey,
        scriptPath
      );
      menuManager.open(menuItems, anchor);
    }
  });

  // Ensure Pattern subtab active
  addPatternSubtab(category);
} // end showSelectedPattern


/* ============================================================
   onPrev() / onNext()
   ------------------------------------------------------------
   Simple index cycling — fail-fast if manifest missing.
=========================================================== */
function onPrev() {
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


function onNext() {
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


/* ============================================================
   buildPatternsMenuItems()
   ------------------------------------------------------------
   Delegates to menuManager for Help.
=========================================================== */
async function buildPatternsMenuItems(tabName, helpKey, scriptPath) {
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

/* ============================================================
   savePatternsState()
   ------------------------------------------------------------
   Called by setUI before a tab switch.
   Must return a plain object representing current state.
=========================================================== */
function savePatternsState() {
  // uiState.patterns.saved is always maintained by controller actions.
  if (!uiState.patterns || !uiState.patterns.saved) {
    return {
      view: "categories",
      activeCategory: null,
      activeItem: null
    };
  }

  return {
    view: uiState.patterns.saved.view,
    activeCategory: uiState.patterns.saved.activeCategory,
    activeItem: uiState.patterns.saved.activeItem
  };
} // end savePatternsState


/* ============================================================
   patternsDivs (REMOVED)
   ------------------------------------------------------------
   This entire structure is now obsolete under the TabSpec
   architecture and has been intentionally omitted.

   Region clearing is done exclusively in:
     setUI → initTab(tabKey) → clearDivs()

   Region rebuilding is done via:
     initPatternsTab  → (cold start)
     restorePatternsTab → (state restore)
     controller functions → (dynamic updates)

   No patternsDivs object remains in the rewritten file.
=========================================================== */

// end of rewritten patterns.js
