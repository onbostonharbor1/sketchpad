/* ui/setUI.js
   ------------------------------------------------------------
   Sketchpad Tab Orchestrator (TabSpec Architecture)
   ------------------------------------------------------------
*/

import { HomeTabSpec }     from "./home.js";
import { DrawTabSpec }     from "./draw.js";
import { PatternsTabSpec } from "./patterns.js";
import { GalleryTabSpec }  from "./gallery.js";
import { UtilityTabSpec }  from "./utilities.js";
import { FiguresTabSpec }  from "./figures.js";

import { clearDivs }        from "/ui/uiUtilities.js";
import { initMenuManager }  from "./menuManager.js";
import { initOverlay }      from "./overlay.js";
import { initCanvasLayers } from "./canvasLayerManager.js";
import { uiState }          from "/ui/uiState.js";
import { disableAllNextPrevOverlays } from "./nextPrevOverlay.js";

const START = "START_APP";
const LAST_TAB_KEY = "sketchpad.lastActiveTab";

/* ============================================================
   Tab Registry
=========================================================== */
const TabRegistry = {
  home:      HomeTabSpec,
  draw:      DrawTabSpec,
  patterns:  PatternsTabSpec,
  gallery:   GalleryTabSpec,
  utilities: UtilityTabSpec,
  figures:   FiguresTabSpec
};

/* ============================================================
   Helpers
=========================================================== */
function setActiveTab(tabKey) {
  const buttons = document.querySelectorAll("#mainTabs .nav-link");
  buttons.forEach((btn) => {
    if (!btn.id) return;
    const key = mapTabIdToKey(btn.id);
    if (key === tabKey) btn.classList.add("active");
    else btn.classList.remove("active");
  });
}

function mapTabIdToKey(tabId) {
  const map = {
    "home-tab":      "home",
    "draw-tab":      "draw",
    "patterns-tab":  "patterns",
    "gallery-tab":   "gallery",
    "figures-tab":   "figures",
    "utilities-tab": "utilities"
  };
  return map[tabId] || null;
}

function applyTheme(tabKey) {
  const wrapper = document.getElementById("wrapper");
  if (!wrapper) throw new Error("applyTheme: #wrapper missing");

  const themeClasses = [
    "theme-home", "theme-draw", "theme-patterns",
    "theme-gallery", "theme-figures", "theme-utilities"
  ];
  themeClasses.forEach((cls) => wrapper.classList.remove(cls));

  const themeMap = {
    home:      "theme-home",
    draw:      "theme-draw",
    patterns:  "theme-patterns",
    gallery:   "theme-gallery",
    figures:   "theme-figures",
    utilities: "theme-utilities"
  };

  const themeClass = themeMap[tabKey];
  if (themeClass) wrapper.classList.add(themeClass);
}

/* ============================================================
   Lifecycle: Restore & Init
=========================================================== */
async function restoreTab(tabKey) {
  const spec = TabRegistry[tabKey];
  if (!spec || !spec.restore) {
    throw new Error("restoreTab: missing TabSpec.restore for " + tabKey);
  }
  clearDivs();
  await spec.restore();
}

async function initTab(tabKey, restored = false) {
  const spec = TabRegistry[tabKey];
  if (!spec || !spec.init) {
    throw new Error("initTab: missing TabSpec.init for " + tabKey);
  }
  clearDivs();
  await spec.init(restored);
}

/* ============================================================
   activateTab(tabKey)
=========================================================== */
async function activateTab(tab) {
  let tabKey = tab;

  if (tab === START) {
    tabKey = "home";
    if (uiState.home && uiState.home.needsUpdate) {
      uiState.home.needsUpdate = false;
      await initTab(tabKey, true);
    } else {
      await initTab(tabKey, false);
    }
  } else {
    if (uiState[tabKey] && uiState[tabKey].needsUpdate) {
      uiState[tabKey].needsUpdate = false;
      await initTab(tabKey, true);
    } else {
      const saved = uiState[tabKey] && uiState[tabKey].saved;
      if (saved) {
        await restoreTab(tabKey);
      } else {
        await initTab(tabKey, false);
      }
    }
  }

  uiState.activeTab = tabKey;
  setActiveTab(tabKey);
}

/* ============================================================
   setUI(tabName)
   PUBLIC ENTRY
============================================================ */
export async function setUI(tab) {
  disableAllNextPrevOverlays();

  let tabName = (tab === START) ? START : tab;

  if (tabName !== START && !TabRegistry[tabName]) {
    throw new Error("setUI: unknown tab " + tabName);
  }

  // 1. Persist the tab selection
  if (tabName !== START) {
    sessionStorage.setItem(LAST_TAB_KEY, tabName);
  }

  // 2. THE CLEANUP
  // If we are leaving Patterns, forget its bookmark
  // if (tabName !== "patterns") {
  //   sessionStorage.removeItem("sketchpad.patterns.saved");
  // }

  // // If we are leaving Gallery, forget its bookmark
  // // (This was the missing logic!)
  // if (tabName !== "gallery") {
  //   sessionStorage.removeItem("sketchpad.gallery.saved");
  // }

  // 3. Apply theme
  applyTheme(tabName === START ? "home" : tabName);

  // 4. Activate
  await activateTab(tabName);

  // 5. Handle Launch Intents
  if (!uiState.launch || uiState.launch.pending !== true) return;
  const targetTab = uiState.launch.targetTab;
  uiState.launch.pending = false;
  if (uiState.activeTab !== targetTab) setUI(targetTab);
}

/* --- Tab Handling Logic --- */
function handleTabChange(eventOrId) {
  const tabId =
    typeof eventOrId === "string"
      ? eventOrId
      : (eventOrId && eventOrId.target && eventOrId.target.id);

  // Note: ensure mapTabIdToKey is also available here
  const tabKey = (typeof mapTabIdToKey === "function") ? mapTabIdToKey(tabId) : tabId;
  if (!tabKey) return;

  setUI(tabKey);
}
/* --------------------------- */

async function onDomContentLoaded() {
  initMenuManager();
  initOverlay();
  initCanvasLayers();

  // 1. Rehydrate all potential stateful tabs from sessionStorage.
  // Tab state is not rehydrated from sessionStorage on refresh.
  // All tabs start fresh (cold init) after a page reload.

  // 2. Define tabButtons (This was the missing line causing the error!)
  const tabButtons = document.querySelectorAll("#mainTabs .nav-link");

  // 3. Wire up the main tab buttons
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      handleTabChange(btn.id);
    });
  });

  // 4. Determine the landing tab
  setUI(START);
  // const lastTab = sessionStorage.getItem(LAST_TAB_KEY);
  // if (lastTab && TabRegistry[lastTab]) {
  //   setUI(lastTab);
  // } else {
  //   setUI(START);
  // }
}


window.addEventListener("DOMContentLoaded", onDomContentLoaded);
