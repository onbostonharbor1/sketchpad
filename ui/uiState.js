/* ui/uiState.js
   ------------------------------------------------------------
   Tracks the current interface state: which tab is active,
   which div setter functions are assigned, and
   which manifests or saved states are loaded.
   ------------------------------------------------------------ */

const uiState = {
  /* =========================================================
     Canvas and layout
  ========================================================= */
  canvasHeight: 600,
  canvasWidth:  600,

  /* =========================================================
     Active UI div assignments (populated in setUI.js)
  ========================================================= */
  setAction:    null,
  setButtons:   null,
  setCaption:   null,
  setSketchpad: null,
  setSubtabs:   null,
  setText:      null,

  /* =========================================================
     Active tab and div context
  ========================================================= */
    activeTab:        "draw",   // default at startup
    activeDivs:       {},       // points to current tab’s div map
    activeGalleryTab: "tab-categories",

  /* =========================================================
     Per-tab working structures
  ========================================================= */
  drawTabs:      {},
  figuresTabs:   {},
  galleryTabs:   {},
  patternsTabs:  {},
  utilitiesTabs: {},

  /* =========================================================
     Saved UI state snapshots
  ========================================================= */
  drawSavedState:      null,
  patternsSavedState:  null,
  gallerySavedState:   null,
  figuresSavedState:   null,
  utilitiesSavedState: null,

  /* =========================================================
     Manifest storage
     Each manifest.json or directoryRegistry.json is cached
     by context. The activeManifest always points to the one
     currently in use.
  ========================================================= */
  manifests: {
    gallery: {
      ideabook: null,
      patterns: null,
      scripts:  null
    },
    draw: {
      patterns: null,
      figures:  null
    },
    utilities: {
      tools: null
    }
  },

    galleryIndex: {
	ideabook: 0,
	patterns: 0,
	scripts: 0
    },

  activeManifest: null,     // always points to current working manifest
  activeDirectoryInfo: null // optional: holds current directoryRegistry.json
};

window.uiState = uiState;  // expose globally
// end uiState.js
