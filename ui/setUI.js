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

/* ============================================================
   Tab Registry (TabSpec-based)
=========================================================== */
const TabRegistry = {
  draw:     DrawTabSpec,
  patterns: PatternsTabSpec,
  gallery:  GalleryTabSpec,
  utilities: UtilityTabSpec,
  figures:   FiguresTabSpec
}; // end TabRegistry



/* ============================================================
   saveTabState(tabKey)
=========================================================== */
function saveTabState(tabKey) {
  const spec = TabRegistry[tabKey];
  if (!spec || !spec.save) return;

  const snapshot = spec.save();

  if (!uiState.tabSnapshots) {
    uiState.tabSnapshots = {};
  }

  uiState.tabSnapshots[tabKey] = snapshot;
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
    "theme-gallery",
    "theme-figures",
    "theme-utility"
  );

  const theme = spec && spec.theme;
  if (theme) wrapper.classList.add(theme);
} // end applyTheme


/* ============================================================
   mapTabIdToKey(tabId)
=========================================================== */
function mapTabIdToKey(tabId) {
  const map = {
    "draw-tab":     "draw",
    "patterns-tab": "patterns",
    "gallery-tab":  "gallery",
    "figures-tab":  "figures",
    "utilities-tab":  "utilities"
  };

  return map[tabId] || null;
} // end mapTabIdToKey


/* ============================================================
   activateTab(tabKey)
=========================================================== */
function activateTab(tabKey) {
  const spec = TabRegistry[tabKey];
  if (!spec) throw new Error("activateTab: no TabSpec for " + tabKey);

  clearDivs();
  applyTheme(spec);

  if (!spec.init || typeof spec.init !== "function") {
    throw new Error("activateTab: TabSpec.init missing for " + tabKey);
  }

  spec.init();
  uiState.activeTab = tabKey;
} // end activateTab


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

  if (uiState.activeTab) {
    saveTabState(uiState.activeTab);
  }

  activateTab(tabKey);
} // end handleTabChange


/* ============================================================
   onDomContentLoaded()
=========================================================== */
function onDomContentLoaded() {
   initMenuManager();
   initOverlay();     // REQUIRED

  const tabButtons = document.querySelectorAll("#mainTabs .nav-link");
  tabButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      handleTabChange(btn.id);
    });
  });

  activateTab("draw");
} // end onDomContentLoaded


/* ============================================================
   DOMContentLoaded wiring
=========================================================== */
window.addEventListener("DOMContentLoaded", onDomContentLoaded);

// end setUI.js
