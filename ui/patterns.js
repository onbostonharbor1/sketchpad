/* patterns.js
   ------------------------------------------------------------------
   Patterns Tab Controller (ManifestManager-based version)
   ------------------------------------------------------------------
   This rewrite modernizes the Patterns tab to use the same structure
   and comment style as the Gallery and Utilities rewrites.

   All manifest loading and lookup is performed exclusively through
   ManifestManager:

       manifest.load("patterns")
       manifest.getCategories("patterns")
       manifest.getItems("patterns", category)
       manifest.resolvePath("patterns", category, filename)

   This file implements:
     • Two-subtab navigation (Categories / Patterns)
     • Dynamic loading of ES modules for patterns
     • Caption bar updates (Prev / Next / Save / Show Script)
     • Thumbnail panel of category items (“action” div)
     • UI state persistence via uiState.patternsTabs

   All functions use:
     - Full block headers
     - Argument documentation
     - Internal comments
     - Fail-fast programming style
     - End-of-function markers
*/

import { manifest } from "./manifest.js";
import { clearDivs, showSharedOffcanvas } from "./ui_utilities.js";
import { renderCategories } from "./categories.js";
import { drawState } from "../draw/drawState.js";
import { uiState } from "./uiState.js";
import { setCaptionBar } from "./caption.js";   // NEW
import { menuManager } from "./menuManager.js";            // NEW

/* ============================================================
   CONSTANTS

   Purpose:
     Stable identifiers for internal subtab IDs used in
     uiState.patternsTabs and event wiring.
============================================================ */
const CATEGORIES_ID = "tab-patterns-categories";
const PATTERNS_ID = "tab-patterns-patterns";

/* ============================================================
   setPatternsButtons()

   Purpose:
     Clear the #buttons div for the Patterns tab.

   Arguments:
     (none)

   Notes:
     - All tabs own their own div-clearer functions.
============================================================ */
function setPatternsButtons() {
  const el = document.getElementById("buttons");
  if (el) el.innerHTML = "";
} // end setPatternsButtons

/* ============================================================
   setPatternsAction()

   Purpose:
     Clear the #action div (used for thumbnails).

   Arguments:
     (none)
============================================================ */
function setPatternsAction() {
  const el = document.getElementById("action");
  if (el) el.innerHTML = "";
} // end setPatternsAction

/* ============================================================
   setPatternsCaption()

   Purpose:
     Clear the #caption bar.

   Arguments:
     (none)
============================================================ */
function setPatternsCaption() {
  const el = document.getElementById("caption");
  if (el) el.innerHTML = "";
} // end setPatternsCaption

/* ============================================================
   setPatternsText()

   Purpose:
     Clear the #text div (used for category list).

   Arguments:
     (none)
============================================================ */
function setPatternsText() {
  const el = document.getElementById("text");
  if (el) el.innerHTML = "";
} // end setPatternsText

/* ============================================================
   setPatternsSketchpad()

   Purpose:
     Clear the #sketchpad div before inserting the shared canvas.

   Arguments:
     (none)
============================================================ */
function setPatternsSketchpad() {
  const el = document.getElementById("sketchpad");
  if (el) el.innerHTML = "";
} // end setPatternsSketchpad

/* ============================================================
   setPatternsSubtabs()

   Purpose:
     Build the subtab bar used in the Patterns tab.

   Arguments:
     (none)

   Notes:
     - Always creates the “Categories” tab.
     - The “Patterns” tab is created dynamically.
============================================================ */
function setPatternsSubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setPatternsSubtabs: #subtabs not found");

  // Clear the container and create a new <ul>
  el.innerHTML = "";
  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs patterns-subtabs";
  el.appendChild(bar);

  // Always add the Categories tab at startup
  addPatternsSubtab({ name: "Categories" });
} // end setPatternsSubtabs

/* ============================================================
   initPatternsTab()

   Purpose:
     Entry point for the Patterns tab.
     Responsibilities:
       - Clear UI regions
       - Restore state if present
       - Otherwise initialize subtabs and show categories

   Arguments:
     (none)

   Notes:
     - Called from ui_callbacks.onTabActivated("patterns")
============================================================ */
export function initPatternsTab() {
  // Clear all major UI divs that belong to the active tab
  clearDivs();

  // If tab state already exists → restore it
  if (uiState.patternsTabs && uiState.activePatternsTab) {
    restorePatternsState({
      activeTabId: uiState.activePatternsTab,
      activeTabInfo: uiState.patternsTabs[uiState.activePatternsTab],
    });
    return;
  }

  // First-time initialization
  uiState.patternsTabs = uiState.patternsTabs || {};
  setPatternsSubtabs();
  uiState.activePatternsTab = CATEGORIES_ID;

  // Show categories
  switchPatternsTab(CATEGORIES_ID);
} // end initPatternsTab

/* ============================================================
   restorePatternsState(saved)

   Purpose:
     Reinstate the state of the Patterns tab:
       - Which subtab was active
       - What script was loaded, if any

   Arguments:
     saved (object)
       {
         activeTabId:   string,
         activeTabInfo: { type, category, filename, path, title }
       }

   Notes:
     - Falls back to Categories if state is incomplete.
============================================================ */
export function restorePatternsState(saved) {
  // Invalid state → reset to Categories
  if (!saved || !saved.activeTabId) {
    setPatternsSubtabs();
    uiState.patternsTabs = { [CATEGORIES_ID]: { type: "categories" } };
    uiState.activePatternsTab = CATEGORIES_ID;
    switchPatternsTab(CATEGORIES_ID);
    return;
  }

  uiState.activePatternsTab = saved.activeTabId;
  uiState.patternsTabs = uiState.patternsTabs || {};

  // Copy the metadata into uiState
  if (saved.activeTabInfo) {
    uiState.patternsTabs[saved.activeTabId] = saved.activeTabInfo;
  }

  // Rebuild subtabs from scratch
  setPatternsSubtabs();

  // Was the saved tab a script?
  if (saved.activeTabInfo?.type === "script") {
    // Re-create the Patterns subtab
    addPatternsSubtab({
      name: saved.activeTabInfo.title || saved.activeTabInfo.filename,
      type: "script",
      category: saved.activeTabInfo.category,
      filename: saved.activeTabInfo.filename,
      path: saved.activeTabInfo.path,
      title: saved.activeTabInfo.title,
    });
    return;
  }

  // Otherwise restore the Categories tab
  switchPatternsTab(saved.activeTabId);
} // end restorePatternsState

/* ============================================================
   addPatternsSubtab(item)

   Purpose:
     Create (or activate) one of the two subtabs in the Patterns tab:
       • Categories
       • Patterns (single dynamic subtab for viewing scripts)

   Arguments:
     item (object):
       {
         name:     "Categories" OR <pattern title>,
         type:     "categories" | "script",
         category: <string>   (required for scripts),
         filename: <string>   (required for scripts),
         path:     <string>   (manifest path; required for scripts),
         title:    <string>   (optional override)
       }

   Notes:
     - Follows the same logic as gallery/utilities addSubtab.
     - Only *one* Patterns subtab exists at any time.
============================================================ */
function addPatternsSubtab(item) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) throw new Error("addPatternsSubtab: subtab bar not found");

  /* ---------------------------------------------------------
     CASE 1 — CATEGORIES SUBTAB
     --------------------------------------------------------- */
  if (item.name === "Categories") {
    // Create the Categories subtab if missing
    if (!bar.querySelector(`[data-tab-id="${CATEGORIES_ID}"]`)) {
      const li = document.createElement("li");
      li.className = "nav-item";

      const btn = document.createElement("button");
      btn.className = "nav-link active";
      btn.dataset.tabId = CATEGORIES_ID;
      btn.textContent = "Categories";

      btn.addEventListener("click", () => switchPatternsTab(CATEGORIES_ID));

      li.appendChild(btn);
      bar.appendChild(li);
    }

    // Activate the Categories button visually
    bar.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
    bar.querySelector(`[data-tab-id="${CATEGORIES_ID}"]`).classList.add("active");

    // Update internal UI state
    uiState.patternsTabs[CATEGORIES_ID] = { type: "categories" };
    uiState.activePatternsTab = CATEGORIES_ID;

    // Show category list
    clearDivs();
    setPatternsCategories();
    return;
  } // end Categories case


  /* ---------------------------------------------------------
     CASE 2 — PATTERNS SUBTAB (SCRIPT)
     --------------------------------------------------------- */
  // Ensure the dynamic Patterns subtab exists
  if (!bar.querySelector(`[data-tab-id="${PATTERNS_ID}"]`)) {
    const li = document.createElement("li");
    li.className = "nav-item";

    const btn = document.createElement("button");
    btn.className = "nav-link";
    btn.dataset.tabId = PATTERNS_ID;
    btn.textContent = "Patterns";

    btn.addEventListener("click", () => switchPatternsTab(PATTERNS_ID));

    li.appendChild(btn);
    bar.appendChild(li);
  }

  // Highlight this tab
  bar.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
  bar.querySelector(`[data-tab-id="${PATTERNS_ID}"]`).classList.add("active");

  // Update UI state for this script
  uiState.patternsTabs[PATTERNS_ID] = {
    type:     "script",
    category: item.category,
    filename: item.filename,
    path:     item.path,
    title:    item.title
  };
  uiState.activePatternsTab = PATTERNS_ID;

  // Load and run the selected script
  clearDivs();
  loadAndRunPattern(item.category, item.filename);
} // end addPatternsSubtab


/* ============================================================
   switchPatternsTab(tabId)

   Purpose:
     Select a subtab (“Categories” or “Patterns”) and rebuild
     its associated UI.

   Arguments:
     tabId (string)
       - CATEGORIES_ID
       - PATTERNS_ID

   Notes:
     - Reads uiState.patternsTabs to determine which content
       should be displayed.
============================================================ */
function switchPatternsTab(tabId) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) return;

  // Clear all active states; highlight selected tab
  bar.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
  const btn = bar.querySelector(`[data-tab-id="${tabId}"]`);
  if (btn) btn.classList.add("active");

  // Update UI state to reflect active tab
  const info = uiState.patternsTabs[tabId];
  uiState.activePatternsTab = tabId;

  clearDivs();

  // No entry? Nothing to show
  if (!info) return;

  // Categories → show the categories list
  if (info.type === "categories") {
    setPatternsCategories();
    return;
  }

  // Otherwise, load the stored script
  loadAndRunPattern(info.category, info.filename);
} // end switchPatternsTab


/* ============================================================
   loadAndRunPattern(category, filename)

   Purpose:
     Load a pattern module using ManifestManager and run its
     runPattern() function.

   Arguments:
     category (string)  – manifest category folder
     filename (string)  – script filename (no extension)

   Behavior:
     • Prepares and displays the shared canvas.
     • Resolves path through manifest.resolvePath().
     • Loads ES module using dynamic import().
     • Executes runPattern().
     • Updates uiState.activePattern.
     • Updates caption and thumbnails panel.

   Notes:
     - Fail-fast if runPattern is missing.
============================================================ */
async function loadAndRunPattern(category, filename) {
  /* Prepare the sketchpad region */
  const sketchDiv = document.getElementById("sketchpad");
  if (!sketchDiv) throw new Error("loadAndRunPattern: #sketchpad not found");

  sketchDiv.innerHTML = "";
  sketchDiv.appendChild(window.drawCanvas);

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);

  try {
    /* Resolve ES module path for the pattern */
    const moduleUrl = manifest.resolvePath("patterns", category, filename);
    if (!moduleUrl)
      throw new Error(`Failed to resolve URL for ${category}/${filename}`);

    /* Load ES module with cache-bypass timestamp */
    const mod = await import(`${moduleUrl}?t=${Date.now()}`);

    if (typeof mod.runPattern !== "function")
      throw new Error(`runPattern() missing in ${moduleUrl}`);

    mod.runPattern();  // Execute the pattern

  } catch (err) {
    console.error("Pattern load/execution failed:", err);
    sketchDiv.innerHTML =
      `<p style="color:red;">Error loading pattern: ${err.message}</p>`;
    return;
  }

  /* Build activePattern record */
  uiState.activePattern = {
    category,
    filename,
    title: drawState.currentTitle || filename
  };

  /* Update UI */
  updatePatternsCaption();
  setPatternsThumbnails(category);

  /* Pull manifest entry for caption data */
  const all = manifest.getItems("patterns", category) || [];
  const entry = all.find(it => it.filename === filename);

  setPatternsCaptionContent({
    title: entry?.title || uiState.activePattern.title,
    filename,
    path: entry?.path || `${filename}.js`
  });
} // end loadAndRunPattern


/* ============================================================
   loadPatternsManifest()

   Purpose:
     Load and cache all patterns manifest groups using the
     ManifestManager interface.

   Arguments:
     (none)

   Returns:
     { categoryName → manifestEntry[] }

   Notes:
     - Uses uiState.manifests.patterns.main as cache.
============================================================ */
async function loadPatternsManifest() {
  try {
    // Already loaded? use cache
    if (uiState.manifests.patterns?.main) {
      uiState.activeManifest = uiState.manifests.patterns.main;
      return uiState.manifests.patterns.main;
    }

    // First load via ManifestManager
    const data = await manifest.load("patterns");
    if (!data)
      throw new Error("ManifestManager returned empty patterns manifest");

    uiState.manifests.patterns ??= {};
    uiState.manifests.patterns.main = data;
    uiState.activeManifest = data;

    return data;

  } catch (err) {
    console.error("Failed to load Patterns manifest:", err);
    return null;
  }
} // end loadPatternsManifest

/* ============================================================
   setPatternsCategories()

   Purpose:
     Build the category list for the Patterns tab.
     Displayed inside the #text region.

   Behavior:
     • Loads pattern manifests if needed
     • Renders category cards via renderCategories()
     • Each category item calls addPatternsSubtab() to load
       its first/default pattern script

   Notes:
     - lastCategoriesRequest prevents stale async loads.
============================================================ */
let lastCategoriesRequest = 0;

async function setPatternsCategories() {
  const requestId = ++lastCategoriesRequest;

  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("setPatternsCategories: #text not found");

  textDiv.innerHTML = "<p>Loading pattern categories...</p>";

  const manifestInfo = await loadPatternsManifest();
  if (requestId !== lastCategoriesRequest) return;   // stale request
  if (!manifestInfo) {
    textDiv.innerHTML =
      `<p style="color:red;">Error loading manifest.</p>`;
    return;
  }

  // If Patterns view is active, don't show Categories.
  if (uiState.activePatternsTab === PATTERNS_ID) return;

  /* ---------------------------------------------------------
     Build the hierarchical categories descriptor
     --------------------------------------------------------- */
  const categoriesArray = manifest
    .getCategories("patterns")
    .map(categoryName => {
      const items = manifest.getItems("patterns", categoryName) || [];

      const sorted = [...items].sort((a, b) =>
        (a.title || a.filename).toLowerCase()
          .localeCompare((b.title || b.filename).toLowerCase())
      );

      return {
        title: categoryName,
        items: sorted.map(it => ({
          name: it.title || it.filename,
          hasSubitems: false,
          onClick: () => {
            addPatternsSubtab({
              name: it.title || it.filename,
              type: "script",
              category: categoryName,
              filename: it.filename,
              path: it.path,
              title: it.title
            });
          }
        }))
      };
    });

  /* ---------------------------------------------------------
     Render using the backward-compatible hierarchical renderer
     --------------------------------------------------------- */
  textDiv.innerHTML = "";
  renderCategories("text", categoriesArray, (item) => {
    if (item.onClick) item.onClick();
  });
} // end setPatternsCategories


/* ============================================================
   openPatternsMenu(entry)
   ------------------------------------------------------------
   Helper that invokes the global caption menu for the Patterns
   tab. It packages the current pattern's context so the menu
   can decide which actions to offer (edit in Draw, save copy,
   metadata, show source, etc.).
============================================================ */
function openPatternsMenu(entry) {
  const active = uiState.activePattern || {};
  const base = entry || active;
  if (!base) return;

  // Build a minimal context object for the menu system
  const context = {
    tab: "patterns",
    category: base.category || active.category || null,
    filename: base.filename || active.filename || null,
    title:
      base.title ||
      active.title ||
      drawState.currentTitle ||
      base.filename ||
      "(untitled pattern)",
  };

  menuManager.open("patterns", context);
} // end openPatternsMenu




/* ============================================================
   renderPatternsCaption(entry)
   ------------------------------------------------------------
   Internal helper that builds the caption row using the shared
   caption bar helper:

       | Title                          | Prev | Next | ▾ |

   - Title comes from entry.title or entry.filename.
   - Prev / Next call showPrevPattern / showNextPattern.
   - ▾ opens the Patterns caption menu via openPatternsMenu().
============================================================ */
function renderPatternsCaption(entry) {
  const titleText =
    entry.title || entry.filename || "Untitled Pattern";

  setCaptionBar({
    targetId: "caption",
    title: titleText,
    onPrev: showPrevPattern,
    onNext: showNextPattern,
    onMenu: () => openPatternsMenu(entry),
  });
} // end renderPatternsCaption

/* ============================================================
   updatePatternsCaption()
   ------------------------------------------------------------
   Called after loadAndRunPattern() when uiState.activePattern
   is already set.

   Uses uiState.activePattern + drawState.currentTitle to build
   a minimal entry object, then delegates to renderPatternsCaption().
============================================================ */
function updatePatternsCaption() {
  const capDiv = document.getElementById("caption");
  if (!capDiv) throw new Error("updatePatternsCaption: #caption not found");
  capDiv.innerHTML = "";

  const info = uiState.activePattern;
  if (!info) {
    capDiv.textContent = "(no pattern loaded)";
    return;
  }

  const entry = {
    title: drawState.currentTitle || info.title || info.filename,
    filename: info.filename,
    category: info.category,
  };

  renderPatternsCaption(entry);
} // end updatePatternsCaption

/* ============================================================
   setPatternsCaptionContent(entry)
   ------------------------------------------------------------
   Called from loadAndRunPattern() when we have a manifest
   entry (with title/filename/path). It normalizes the entry
   and reuses renderPatternsCaption() so caption behavior is
   identical no matter how it is reached.
============================================================ */
function setPatternsCaptionContent(entry) {
  // If no entry was supplied, fall back to the activePattern info
  if (!entry) {
    updatePatternsCaption();
    return;
  }

  const normalized = {
    title: entry.title,
    filename: entry.filename,
    category: uiState.activePattern?.category || entry.category,
  };

  renderPatternsCaption(normalized);
} // end setPatternsCaptionContent



/* ============================================================
   showNextPattern()

   Purpose:
     Move to next pattern *within the same category* and load it.
============================================================ */
function showNextPattern() {
  const info = uiState.activePattern;
  if (!info) return;

  const items = manifest.getItems("patterns", info.category);
  if (!items || !items.length) return;

  const idx = items.findIndex(i => i.filename === info.filename);
  const nextIdx = (idx + 1) % items.length;
  const next = items[nextIdx];

  uiState.activePattern = {
    category: info.category,
    filename: next.filename,
    title: next.title
  };

  addPatternsSubtab({
    name: next.title || next.filename,
    type: "script",
    category: info.category,
    filename: next.filename,
    path: next.path,
    title: next.title,
  });
} // end showNextPattern


/* ============================================================
   showPrevPattern()

   Purpose:
     Move to previous pattern within same category.
============================================================ */
function showPrevPattern() {
  const info = uiState.activePattern;
  if (!info) return;

  const items = manifest.getItems("patterns", info.category);
  if (!items || !items.length) return;

  const idx = items.findIndex(i => i.filename === info.filename);
  const prevIdx = (idx - 1 + items.length) % items.length;
  const prev = items[prevIdx];

  uiState.activePattern = {
    category: info.category,
    filename: prev.filename,
    title: prev.title
  };

  addPatternsSubtab({
    name: prev.title || prev.filename,
    type: "script",
    category: info.category,
    filename: prev.filename,
    path: prev.path,
    title: prev.title,
  });
} // end showPrevPattern


/* ============================================================
   setPatternsThumbnails(category)

   Purpose:
     Show thumbnails for the current category in #action.

   Notes:
     - Matches gallery.js style
============================================================ */
function setPatternsThumbnails(category) {
  const actDiv = document.getElementById("action");
  if (!actDiv) throw new Error("setPatternsThumbnails: #action not found");

  actDiv.innerHTML = "";

  const items = manifest.getItems("patterns", category);
  if (!items || !items.length) {
    actDiv.innerHTML = `<p>No items for ${category}</p>`;
    return;
  }

  const panel = document.createElement("div");
  panel.className = "thumb-panel";

  items.forEach(item => {
    const box = document.createElement("div");
    box.className = "thumb-box";

    const img = document.createElement("img");
    img.src = `/patterns/${category}/images/${item.filename}.png`;
    img.alt = item.filename;
    img.title = item.filename;
    img.className = "thumb-image";

    img.onclick = () => {
      addPatternsSubtab({
        name: item.title || item.filename,
        type: "script",
        category,
        filename: item.filename,
        path: item.path,
        title: item.title,
      });
    };

    box.appendChild(img);
    panel.appendChild(box);
  });

  actDiv.appendChild(panel);
} // end setPatternsThumbnails


/* ============================================================
   PUBLIC ENTRY POINTS
   These match gallery.js and utilities.js
============================================================ */

/* ------------------------------------------------------------
   loadCategory(categoryName)
   Load first item in category.
------------------------------------------------------------ */
export async function loadCategory(categoryName) {
  await loadPatternsManifest();

  const items = manifest.getItems("patterns", categoryName);
  if (!items || !items.length) return;

  const first = items[0];

  addPatternsSubtab({
    name: first.title || first.filename,
    type: "script",
    category: categoryName,
    filename: first.filename,
    path: first.path,
    title: first.title
  });
} // end loadCategory


/* ------------------------------------------------------------
   loadItem(itemName)
   Find item by title or filename.
------------------------------------------------------------ */
export async function loadItem(itemName) {
  await loadPatternsManifest();

  let found = null;
  let foundCategory = null;

  for (const category of manifest.getCategories("patterns")) {
    const list = manifest.getItems("patterns", category);

    for (const it of list) {
      const title = it.title || "";
      const fname = it.filename || "";

      if (title === itemName || fname === itemName) {
        found = it;
        foundCategory = category;
        break;
      }
    }
    if (found) break;
  }

  if (!found) return;

  addPatternsSubtab({
    name: found.title || found.filename,
    type: "script",
    category: foundCategory,
    filename: found.filename,
    path: found.path,
    title: found.title
  });
} // end loadItem


/* ------------------------------------------------------------
   savePatternsState()
   Minimal serializable UI state snapshot.
------------------------------------------------------------ */
export function savePatternsState() {
  const state = {
    activePatternsTab: uiState.activePatternsTab || null,
    patternsTabs: uiState.patternsTabs || {},
    activePattern: uiState.activePattern || null
  };

  console.log("💾 Saved Patterns state:", state);
  return state;
} // end savePatternsState


/* ============================================================
   patternsDivs for setUI.js
============================================================ */
export const patternsDivs = {
  activeDivs: ["subtabs"],
  theme: "theme-patterns",
  action: setPatternsAction,
  buttons: setPatternsButtons,
  caption: setPatternsCaption,
  sketchpad: setPatternsSketchpad,
  subtabs: setPatternsSubtabs,
  text: setPatternsText,
}; // end patternsDivs
