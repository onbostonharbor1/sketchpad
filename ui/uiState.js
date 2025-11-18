/* ui/uiState.js
   ------------------------------------------------------------
   Tracks the current interface state: which tab is active,
   which div setter functions are assigned, and
   which manifests or saved states are loaded.
   ------------------------------------------------------------ */
import { Overlay } from "../classes/overlayClass.js";

export const uiState = {
  /* =========================================================
     Canvas and layout
  ========================================================= */
  canvasHeight: 600,
  canvasWidth: 600,

  /* =========================================================
     Active UI div assignments (populated in setUI.js)
  ========================================================= */
  setAction: null,
  setButtons: null,
  setCaption: null,
  setSketchpad: null,
  setSubtabs: null,
  setText: null,

  /* =========================================================
     Active tab and div context
  ========================================================= */
  activeTab: "draw",
  activeDivs: {},
  activeGalleryTab: "tab-categories",

  /* =========================================================
     Per-tab working structures
  ========================================================= */
  drawTabs: {},
  figuresTabs: {},
  galleryTabs: {},
  patternsTabs: {},
  utilitiesTabs: {},

  /* =========================================================
     Saved UI state snapshots
  ========================================================= */
  drawSavedState: null,
  patternsSavedState: null,
  gallerySavedState: null,
  figuresSavedState: null,
  utilitiesSavedState: null,

  /* =========================================================
     Manifest storage
  ========================================================= */
  manifests: {
    gallery: {
      ideabook: null,
      patterns: null,
      scripts: null,
    },
    draw: {
      patterns: null,
      figures: null,
    },
    utilities: {
      tools: null,
    },
  },

  galleryIndex: {
    ideabook: 0,
    patterns: 0,
    scripts: 0,
  },

  /* =========================================================
     Overlay state
  ========================================================= */
  overlay: {
    active: false,
    title: "",
  },

  activeManifest: null,
  activeDirectoryInfo: null,
};

window.uiState = uiState;

/* =========================================================
   Global overlay instance (fail-fast if DOM missing)
========================================================= */
window.overlay = new Overlay();
// end uiState.js
