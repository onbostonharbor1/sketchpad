/* ui/setUI.js
   ------------------------------------------------------------
   Sketchpad UI Controller
   - Clears all shared divs when a top-level tab is selected.
   - Assigns the active tab's div setter functions (from *Divs objects).
   - Establishes a predictable ownership model for interface actions.
   ------------------------------------------------------------ */

// activateTab(tabKey)          – switch to selected top-level tab
// handleTabChange(tabId)       – translate clicked tab id to internal key
// restoreTabState(tabName)     – rebuild previous state for tab if saved
// saveTabState(tabName)        – serialize current tab before leaving
// window.addEventListener()    – initialize UI on page load

/* ------------------------------------------------------------
   Registry of all tab div-controllers
   Each entry points to the *Divs object defined in that tab's file.
------------------------------------------------------------ */
const allDivSets = {
  draw: drawDivs,
  patterns: patternsDivs,
  figures: figuresDivs,
  gallery: galleryDivs,
  utilities: utilityDivs,
}; // end allDivSets

/* ===========================================================
   TAB STATE SAVE / RESTORE HANDLERS
   =========================================================== */

/* ------------------------------------------------------------
   saveTabState(tabName)
   Called before switching away from a tab.
   Captures any saveable state via that tab's save*State() function.

   Arguments:
     tabName – string key of the current top-level tab
------------------------------------------------------------ */
function saveTabState(tabName) {
  switch (tabName) {
    case "draw":
      if (typeof saveDrawState === "function")
        uiState.drawSavedState = saveDrawState();
      break;
    case "patterns":
      if (typeof savePatternsState === "function")
        uiState.patternsSavedState = savePatternsState();
      break;
    default:
      break;
  }
} // end saveTabState

/* ------------------------------------------------------------
   restoreTabState(tabName)
   Called when switching into a tab.
   If a saved state exists for that tab, it rehydrates the tab’s content.

   Arguments:
     tabName – string key of the tab being entered

   Returns:
     true  if a saved state was successfully restored
     false if no saved state existed
------------------------------------------------------------ */
function restoreTabState(tabName) {
  switch (tabName) {
    case "draw":
      if (uiState.drawSavedState && typeof restoreDrawState === "function") {
        restoreDrawState(uiState.drawSavedState);
        return true;
      }
      break;
    case "patterns":
      if (
        uiState.patternsSavedState &&
        typeof restorePatternsState === "function"
      ) {
        restorePatternsState(uiState.patternsSavedState);
        return true;
      }
      break;
    default:
      break;
  }
  return false; // no prior state
} // end restoreTabState

/* ------------------------------------------------------------
   activateTab(tabKey)
   Clears all divs and reassigns current setter functions
   based on the selected top-level tab.

   Arguments:
     tabKey – string key of the tab being activated
------------------------------------------------------------ */
function activateTab(tabKey) {
  clearDivs("subtabs");

  activeDivs = allDivSets[tabKey] || {};

  // apply theme
  const wrapper = document.getElementById("wrapper");
  wrapper.classList.remove(
    "theme-draw",
    "theme-patterns",
    "theme-figures",
    "theme-gallery",
    "theme-utilities"
  );
  if (activeDivs.theme) wrapper.classList.add(activeDivs.theme);

  // assign local references
  uiState.setAction = activeDivs.action || null;
  uiState.setButtons = activeDivs.buttons || null;
  uiState.setCaption = activeDivs.caption || null;
  uiState.setSketchpad = activeDivs.sketchpad || null;
  uiState.setSubtabs = activeDivs.subtabs || null;
  uiState.setText = activeDivs.text || null;

  // populate only the divs listed for this tab
  if (Array.isArray(activeDivs.activeDivs)) {
    if (activeDivs.activeDivs.includes("buttons") && uiState.setButtons)
      uiState.setButtons();
    if (activeDivs.activeDivs.includes("action") && uiState.setAction)
      uiState.setAction();
    if (activeDivs.activeDivs.includes("subtabs") && uiState.setSubtabs)
      uiState.setSubtabs();
    if (activeDivs.activeDivs.includes("caption") && uiState.setCaption)
      uiState.setCaption();
    if (activeDivs.activeDivs.includes("text") && uiState.setText)
      uiState.setText();
    if (activeDivs.activeDivs.includes("sketchpad") && uiState.setSketchpad)
      uiState.setSketchpad();
  }

  // --- Restore saved state if available ---
  const restored = restoreTabState(tabKey);

  // --- Call tab-specific initializer if needed ---
  if (!restored) {
    switch (tabKey) {
      case "draw":
        initDrawTab();
        break;
      case "patterns":
        initPatternsTab();
        break;
      case "figures":
        initFiguresTab();
        break;
      case "gallery":
        initGalleryTab();
        break;
      case "utilities":
        initUtilityTab();
        break;
    }
  }

  // update active tab
  uiState.activeTab = tabKey;
} // end activateTab

/* ------------------------------------------------------------
   handleTabChange(tabId)
   Called when a top-level tab button is clicked.
   Translates Bootstrap button IDs into internal tab keys.

   Arguments:
     tabId – DOM id of the clicked nav button
------------------------------------------------------------ */
function handleTabChange(event) {
  // handles both event object or id string
  const tabId = event?.target?.id || event;

  const map = {
    "draw-tab": "draw",
    "patterns-tab": "patterns",
    "figures-tab": "figures",
    "gallery-tab": "gallery",
    "utilities-tab": "utilities",
  };

  const tabKey = map[tabId];
  if (!tabKey) {
    console.warn("Unknown tab ID:", tabId);
    return;
  }

  // --- Save current tab state before switching ---
  if (uiState.activeTab) saveTabState(uiState.activeTab);

  // --- Switch to the requested tab ---
  activateTab(tabKey);
} // end handleTabChange

/* ------------------------------------------------------------
   Initialize UI on first load.
   Adds event listeners to main tab buttons and activates
   the Draw tab by default.

   Arguments:
     (none)
------------------------------------------------------------ */
window.addEventListener("DOMContentLoaded", () => {
  // attach tab listeners
  const tabButtons = document.querySelectorAll("#mainTabs .nav-link");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => handleTabChange(btn.id));
  });

  // initial state: Draw tab active
  activateTab("draw");
}); // end DOMContentLoaded
