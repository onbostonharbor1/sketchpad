/* ui/setUI.js
   ------------------------------------------------------------
   Sketchpad Tab Orchestrator (TabSpec Architecture)
   ------------------------------------------------------------
*/

import { DrawTabSpec }      from "./draw.js";
import { PatternsTabSpec }  from "./patterns.js";
import { GalleryTabSpec }   from "./gallery.js";
import { UtilityTabSpec }   from "./utilities.js";
import { FiguresTabSpec }   from "./figures.js";

import { clearDivs }        from "./ui_utilities.js";
import { initMenuManager }  from "./menuManager.js";
import { initOverlay }      from "./overlay.js";
import { uiState }          from "./uiState.js";

const START = "START_APP";
/* ============================================================
   Tab Registry
   All TabSpec objects must be registered here.
=========================================================== */
const TabRegistry = {
  draw:      DrawTabSpec,
  patterns:  PatternsTabSpec,
  gallery:   GalleryTabSpec,
  utilities: UtilityTabSpec,
  figures:   FiguresTabSpec
}; // end TabRegistry


/* ============================================================
   setActiveTab(tabKey)
   Cosmetic only — controls tab button highlighting.
=========================================================== */
function setActiveTab(tabKey) {
  const buttons = document.querySelectorAll("#mainTabs .nav-link");

  buttons.forEach((btn) => {
    if (!btn.id) return;
    const key = mapTabIdToKey(btn.id);

    if (key === tabKey) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
} // end setActiveTab


/* ============================================================
   mapTabIdToKey(tabId)
   Maps HTML button id → registry key.
=========================================================== */
function mapTabIdToKey(tabId) {
  const map = {
    "draw-tab":      "draw",
    "patterns-tab":  "patterns",
    "gallery-tab":   "gallery",
    "figures-tab":   "figures",
    "utilities-tab": "utilities"
  };

  return map[tabId] || null;
} // end mapTabIdToKey


/* ============================================================
   applyTheme(spec)
   Adds the theme class for the activated tab.
=========================================================== */
function applyTheme(tabKey) {
  const wrapper = document.getElementById("wrapper");
  if (!wrapper) throw new Error("applyTheme: #wrapper missing");

  // Remove any existing theme class
  const themeClasses = [
    "theme-draw",
    "theme-patterns",
    "theme-gallery",
    "theme-figures",
    "theme-utilities"
  ];
  themeClasses.forEach((cls) => wrapper.classList.remove(cls));

  // Map tab key → theme class
  const themeMap = {
    draw:      "theme-draw",
    patterns:  "theme-patterns",
    gallery:   "theme-gallery",
    figures:   "theme-figures",
    utilities: "theme-utilities"
  };

  const themeClass = themeMap[tabKey];
  if (themeClass) wrapper.classList.add(themeClass);
} // end applyTheme



/* ============================================================
   restoreTab(tabKey)
   Called only when uiState.<tab>.saved exists.
   Performs NO clearing. Delegates to TabSpec.restore().
=========================================================== */
function restoreTab(tabKey) {
  const spec = TabRegistry[tabKey];
  if (!spec || !spec.restore) {
    throw new Error("restoreTab: missing TabSpec.restore for " + tabKey);
  }

  spec.restore();
} // end restoreTab


/* ============================================================
   initTab(tabKey)
   Cold start: clear regions + TabSpec.init(false)
=========================================================== */
function initTab(tabKey) {
  const spec = TabRegistry[tabKey];
  if (!spec || !spec.init) {
    throw new Error("initTab: missing TabSpec.init for " + tabKey);
  }

  // 1. Clear main UI regions
  clearDivs();

  // 2. Cold init
  spec.init(false);
} // end initTab


/* ============================================================
   activateTab(tabKey)
   MASTER LOGIC:
     - If uiState.<tab>.saved exists → restore
     - Else → cold init
=========================================================== */
function activateTab(tab) {
  let tabKey = tab;

  if (tab === START) {
    tabKey = "draw";
    initTab(tabKey);
  } else {
    const saved = uiState[tabKey] && uiState[tabKey].saved;
    if (saved) {
      restoreTab(tabKey);
    } else {
      initTab(tabKey);
    }
  }

  // --- Common fall-through ---
  uiState.activeTab = tabKey;
  setActiveTab(tabKey);
} // end activateTab


/* ============================================================
   setUI(tabName)
   PUBLIC ENTRY: All tab switches call this.
=========================================================== */
export function setUI(tab) {
  let tabName;
  if (tab === START)
    tabName = "draw"
  else
      tabName = tab;

  if (!TabRegistry[tabName] && tabName !== START) {
    throw new Error("setUI: unknown tab " + tabName);
  }

  // ---- SAVE STATE OF PREVIOUS TAB ----
  const prev = uiState.activeTab;
  if (prev && TabRegistry[prev] && TabRegistry[prev].save) {
    uiState[prev].saved = TabRegistry[prev].save();
  }


  applyTheme(tabName); // Ensure the theme is reset first

  // Now activate the tab (this will call initTab() or restoreTab() accordingly)
  if (tab === START)
    activateTab(START);
  else
    activateTab(tabName);
} // end setUI


/* ============================================================
   handleTabChange(eventOrId)
=========================================================== */
function handleTabChange(eventOrId) {
  const tabId =
    typeof eventOrId === "string"
      ? eventOrId
      : (eventOrId && eventOrId.target && eventOrId.target.id);

  const tabKey = mapTabIdToKey(tabId);
  if (!tabKey) return;

  setUI(tabKey);
} // end handleTabChange


/* ============================================================
   onDomContentLoaded()
=========================================================== */
function onDomContentLoaded() {
  initMenuManager();
  initOverlay();

  const tabButtons = document.querySelectorAll("#mainTabs .nav-link");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      handleTabChange(btn.id);
    });
  });

  setUI(START); // Initial activation
} // end onDomContentLoaded


/* ============================================================
   DOMContentLoaded wiring
=========================================================== */
window.addEventListener("DOMContentLoaded", onDomContentLoaded);

// end setUI.js
