/* ui/setUI.js
   ------------------------------------------------------------
   Sketchpad Tab Orchestrator
   ------------------------------------------------------------
   Responsibilities:
     - Own the activation of top-level tabs (Draw, Patterns, etc.)
     - Clear shared layout regions when switching tabs
     - Apply per-tab theme classes to #wrapper
     - Run each tab's div builders in a predictable sequence
     - Call each tab's init() to let it restore/initialize state
     - Save tab state before switching away (when provided)

   This file is the central "engine" for top-level tab behavior.
   All per-tab details (what divs to build, how to initialize)
   live in the tab modules (draw.js, patterns.js, etc.).
   ------------------------------------------------------------ */

import { DrawController, initDrawTab, saveDrawState } from "./draw.js";
import { patternsDivs, initPatternsTab } from "./patterns.js";
import { figuresDivs, initFiguresTab } from "./figures.js";
import { galleryDivs, initGalleryTab } from "./gallery.js";
import { initOverlay } from "./overlay.js";
import { utilityDivs, initUtilityTab } from "./utilities.js";
import { clearDivs } from "./ui_utilities.js";
import { uiState } from "./uiState.js";

/* ============================================================
   Tab Specifications
   ------------------------------------------------------------
   NOTE:
     - Draw uses an inline DivSpec built from DrawController.
     - Other tabs currently still use their *Divs objects.
     - All specs share the same shape:
         { key, theme, divs, init, saveState, saveSlot }
=========================================================== */

// Inline DivSpec for Draw (replaces drawDivs usage here)
const drawDivSpec = {
  theme: "theme-draw",
  activeDivs: ["subtabs"],

  // Only subtabs are built at tab activation; Draw then
  // manages caption/sketchpad internally via initDrawTab/switchTab.
  buttons: null,
  action: null,
  caption: null,
  sketchpad: null,
  text: null,

  // Use DrawController to build the subtabs bar
  subtabs: () => {
    DrawController.setDrawSubtabs();
  }
}; // end drawDivSpec

const tabSpecs = {
  draw: {
    key: "draw",
    theme: drawDivSpec.theme,
    divs: drawDivSpec,
    init: initDrawTab,
    saveState: saveDrawState,
    saveSlot: "drawSavedState"
  },

  patterns: {
    key: "patterns",
    theme: patternsDivs.theme,
    divs: patternsDivs,
    init: initPatternsTab,
    saveState: null,
    saveSlot: "patternsSavedState"
  },

  figures: {
    key: "figures",
    theme: figuresDivs.theme,
    divs: figuresDivs,
    init: initFiguresTab,
    saveState: null,
    saveSlot: "figuresSavedState"
  },

  gallery: {
    key: "gallery",
    theme: galleryDivs.theme,
    divs: galleryDivs,
    init: initGalleryTab,
    saveState: null,
    saveSlot: "gallerySavedState"
  },

  utilities: {
    key: "utilities",
    theme: utilityDivs.theme,
    divs: utilityDivs,
    init: initUtilityTab,
    saveState: null,
    saveSlot: "utilitiesSavedState"
  }
}; // end tabSpecs

/* ============================================================
   saveTabState(tabName)
=========================================================== */
function saveTabState(tabName) {
  const spec = tabSpecs[tabName];
  if (!spec) return;

  if (!spec.saveState || !spec.saveSlot) return;

  const snapshot = spec.saveState();
  uiState[spec.saveSlot] = snapshot;
} // end saveTabState

/* ============================================================
   applyTheme(spec)
=========================================================== */
function applyTheme(spec) {
  const wrapper = document.getElementById("wrapper");
  if (!wrapper) throw new Error("applyTheme: #wrapper not found");

  wrapper.classList.remove(
    "theme-draw",
    "theme-patterns",
    "theme-figures",
    "theme-gallery",
    "theme-utilities"
  );

  if (spec && spec.theme) {
    wrapper.classList.add(spec.theme);
  }
} // end applyTheme

/* ============================================================
   assignDivBuilders(spec)
=========================================================== */
function assignDivBuilders(spec) {
  const divs = spec ? spec.divs : {};

  uiState.setAction    = divs.action    || null;
  uiState.setButtons   = divs.buttons   || null;
  uiState.setCaption   = divs.caption   || null;
  uiState.setSketchpad = divs.sketchpad || null;
  uiState.setSubtabs   = divs.subtabs   || null;
  uiState.setText      = divs.text      || null;

  uiState.activeDivs = divs.activeDivs || [];
} // end assignDivBuilders

/* ============================================================
   buildActiveDivs(spec)
=========================================================== */
function buildActiveDivs(spec) {
  const divs = spec.divs;
  const active = Array.isArray(divs.activeDivs) ? divs.activeDivs : [];

  if (active.includes("buttons")   && typeof divs.buttons   === "function") divs.buttons();
  if (active.includes("action")    && typeof divs.action    === "function") divs.action();
  if (active.includes("caption")   && typeof divs.caption   === "function") divs.caption();
  if (active.includes("text")      && typeof divs.text      === "function") divs.text();
  if (active.includes("sketchpad") && typeof divs.sketchpad === "function") divs.sketchpad();
  if (active.includes("subtabs")   && typeof divs.subtabs   === "function") divs.subtabs();
} // end buildActiveDivs

/* ============================================================
   activateTab(tabKey)
=========================================================== */
function activateTab(tabKey) {
  const spec = tabSpecs[tabKey];
  if (!spec) {
    console.warn("activateTab: unknown tab key:", tabKey);
    return;
  }

  clearDivs("subtabs");      // 1. Clear shared divs
  applyTheme(spec);          // 2. Apply theme
  assignDivBuilders(spec);   // 3. Assign div builders
  buildActiveDivs(spec);     // 4. Build UI regions

  if (typeof spec.init === "function") {
    spec.init();             // 5. Tab init/restoration
  }

  uiState.activeTab = tabKey; // 6. Track active
} // end activateTab

/* ============================================================
   handleTabChange(eventOrId)
=========================================================== */
function handleTabChange(eventOrId) {
  const tabId =
    typeof eventOrId === "string"
      ? eventOrId
      : (eventOrId && eventOrId.target && eventOrId.target.id);

  const map = {
    "draw-tab":      "draw",
    "patterns-tab":  "patterns",
    "figures-tab":   "figures",
    "gallery-tab":   "gallery",
    "utilities-tab": "utilities"
  };

  const tabKey = map[tabId];
  if (!tabKey) {
    console.warn("handleTabChange: Unknown tab ID:", tabId);
    return;
  }

  if (uiState.activeTab) {
    saveTabState(uiState.activeTab);
  }

  activateTab(tabKey);
} // end handleTabChange

/* ============================================================
   DOMContentLoaded
=========================================================== */
window.addEventListener("DOMContentLoaded", () => {
  initOverlay();  // must exist before any tab init()

  const tabButtons = document.querySelectorAll("#mainTabs .nav-link");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => handleTabChange(btn.id));
  });

  activateTab("draw");  // default
}); // end DOMContentLoaded

// end setUI.js
