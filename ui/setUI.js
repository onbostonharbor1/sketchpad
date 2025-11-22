/* ui/setUI.js
   ------------------------------------------------------------
   Sketchpad UI Controller
   - Clears all shared divs when a top-level tab is selected.
   - Assigns the active tab's div setter functions (from *Divs objects).
   - Establishes a predictable ownership model for interface actions.
   ------------------------------------------------------------ */

import { drawDivs } from "./draw.js";
import { initDrawTab } from "./draw.js";
import { saveDrawState } from "./draw.js";

import { patternsDivs } from "./patterns.js";
import { initPatternsTab } from "./patterns.js";

import { figuresDivs } from "./figures.js";
import { initFiguresTab } from "./figures.js";

import { galleryDivs } from "./gallery.js";
import { initGalleryTab } from "./gallery.js";

import { initOverlay } from "./overlay.js";

import { utilityDivs } from "./utilities.js";
import { initUtilityTab } from "./utilities.js";

import { clearDivs } from "./ui_utilities.js";
import { uiState } from "./uiState.js";

const allDivSets = {
  draw: drawDivs,
  patterns: patternsDivs,
  figures: figuresDivs,
  gallery: galleryDivs,
  utilities: utilityDivs,
}; // end allDivSets

/* ===========================================================
   saveTabState(tabName)
=========================================================== */
function saveTabState(tabName) {
  switch (tabName) {
    case "draw":
      uiState.drawSavedState = saveDrawState();
      break;

    default:
      break;
  }
} // end saveTabState

/* ------------------------------------------------------------
   activateTab(tabKey)

   Purpose:
     - Applies the correct theme (wrapper class)
     - Assigns all clearing/setter functions from the tab’s DivSet
     - Clears any shared divs (subtabs)
     - Invokes the tab’s init function
     - Lets the tab’s own init function restore its state

   Arguments:
     tabKey (string) – one of:
         "draw", "patterns", "figures", "gallery", "utilities"

   Notes:
     - The old restoreTabState() logic has been REMOVED.
     - Each tab now manages its OWN restoration:
         initDrawTab()         restores draw state
         initPatternsTab()     restores patterns state
         initGalleryTab()      restores gallery state
         initUtilityTab()      restores utilities state

     - setUI.js no longer performs global restoration.
------------------------------------------------------------ */
function activateTab(tabKey) {
  // ----------------------------------------------------------
  // 1. Clear subtabs area completely
  // ----------------------------------------------------------
  clearDivs("subtabs");

  // ----------------------------------------------------------
  // 2. Load this tab’s DivSet (declared in each tab’s file)
  // ----------------------------------------------------------
  const activeDivs = allDivSets[tabKey] || {};

  // ----------------------------------------------------------
  // 3. Apply theme to wrapper
  // ----------------------------------------------------------
  const wrapper = document.getElementById("wrapper");
  wrapper.classList.remove(
    "theme-draw",
    "theme-patterns",
    "theme-figures",
    "theme-gallery",
    "theme-utilities"
  );

  if (activeDivs.theme) wrapper.classList.add(activeDivs.theme);

  // ----------------------------------------------------------
  // 4. Assign div-setter functions to uiState
  // ----------------------------------------------------------
  uiState.setAction = activeDivs.action || null;
  uiState.setButtons = activeDivs.buttons || null;
  uiState.setCaption = activeDivs.caption || null;
  uiState.setSketchpad = activeDivs.sketchpad || null;
  uiState.setSubtabs = activeDivs.subtabs || null;
  uiState.setText = activeDivs.text || null;

  // ----------------------------------------------------------
  // 5. Call active div initializers (buttons/action/caption/etc.)
  // ----------------------------------------------------------
  if (Array.isArray(activeDivs.activeDivs)) {
    if (activeDivs.activeDivs.includes("buttons") && uiState.setButtons)
      uiState.setButtons();

    if (activeDivs.activeDivs.includes("action") && uiState.setAction)
      uiState.setAction();

    if (activeDivs.activeDivs.includes("caption") && uiState.setCaption)
      uiState.setCaption();

    if (activeDivs.activeDivs.includes("text") && uiState.setText)
      uiState.setText();

    if (activeDivs.activeDivs.includes("sketchpad") && uiState.setSketchpad)
      uiState.setSketchpad();
  }

  // ----------------------------------------------------------
  // 6. Invoke the tab's own initializer
  //    (Each init function now includes its own restore logic.)
  // ----------------------------------------------------------
  switch (tabKey) {
    case "draw":
      initDrawTab(); // draw.js handles restoring state internally
      uiState.activeTab = "draw";
      return;

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

  // ----------------------------------------------------------
  // 7. Record active tab
  // ----------------------------------------------------------
  uiState.activeTab = tabKey;
} // end activateTab

/* ===========================================================
   handleTabChange(event)
=========================================================== */
function handleTabChange(event) {
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

  if (uiState.activeTab) saveTabState(uiState.activeTab);

  activateTab(tabKey);
} // end handleTabChange

/* ===========================================================
   DOMContentLoaded
=========================================================== */
window.addEventListener("DOMContentLoaded", () => {

  // Initialize overlay layers BEFORE tab activation
  initOverlay();

  const tabButtons = document.querySelectorAll("#mainTabs .nav-link");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => handleTabChange(btn.id));
  });

  activateTab("draw");   // safe because overlays now exist
}); // end DOMContentLoaded


