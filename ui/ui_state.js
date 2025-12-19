/* ui/ui_state.js
   ------------------------------------------------------------
   Centralized storage for all UI-related state.
   Keeps UI logic separate from drawing context (gl).
   ------------------------------------------------------------ */

window.uiState = {
    canvasLayer: null,
    currentCategory: null,
    currentDraw: null,
    currentMode: null,
    currentFileName: null,
    currentSelection: null,
  currentTab: null,        // active main tab (e.g., 'draw', 'gallery')
    currentThing: null,
    currentTitle: null,
  currentSubtab: null,     // active subtab within currentTab
  selectedCategory: null,  // for Draw/Patterns categories
  selectedItem: null,      // specific draw object or pattern
  overlayVisible: false,   // overlay open/closed
  controlValues: {},       // any persistent control slider/color values
  canvasSnapshots: {},     // optional per-tab ImageData cache
};
