/* ui/uiState.js
   ------------------------------------------------------------
   Centralized UI State (pure data only)
   ------------------------------------------------------------
   Rules:
     • Contains NO logic and NO function references.
     • Does NOT store layout builders (that was old architecture).
     • Only stores persistent state needed by tabs and orchestrator.
     • Each tab keeps its own sub-state object.
     • overlay and manifest sections preserved.
   ------------------------------------------------------------ */

export const uiState = {
  /* =========================================================
     Canvas configuration
  ========================================================= */
  canvasWidth: 600,
  canvasHeight: 600,

  /* =========================================================
     Active tab
  ========================================================= */
  activeTab: "draw",

  /* =========================================================
     Per-tab state containers
     (Tabs may store anything they want inside their section.)
  ========================================================= */
  draw: {
    activeSubtab: null,     // e.g., "ellipse", "categories"
    tabs: {},               // keyed by subtab-id
    saved: null             // last saved state from DrawSpec.save()
  },

  patterns: {
    activeCategory: null,
    activeItem: null,
    saved: null
  },

  gallery: {
    activeCategory: null,
    activeItem: null,

    // persistent indices for Prev/Next restoration
    index: {
      ideabook: 0,
      patterns: 0,
      scripts: 0
    },

    saved: null
  },

  figures: {
    activeCategory: null,
    activeItem: null,
    saved: null
  },

  utilities: {
    activeCategory: null,
    activeItem: null,
    saved: null
  },

  /* =========================================================
     Manifest storage
     (Populated by manifest loader modules)
  ========================================================= */
  manifests: {
    gallery: {
      ideabook: null,
      patterns: null,
      scripts: null
    },
    draw: {
      patterns: null,
      figures: null
    },
    utilities: {
      tools: null
    }
  },

  /* =========================================================
     Directory / Manifest helper pointers
  ========================================================= */
  activeManifest: null,
  activeDirectoryInfo: null,

  /* =========================================================
     Overlay state
  ========================================================= */
  overlay: {
    active: false,
    type: null,
    title: ""
  }
};

window.uiState = uiState;

// end uiState.js
