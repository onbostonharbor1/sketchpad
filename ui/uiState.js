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
  // It is TRANSIENT intent only; it is NOT saved/persisted.
  // It must be cleared after consumption.
  launch: {
    pending: false,        // boolean
    sourceTab: null,       // string, e.g. "home"
    targetTab: null,       // string, e.g. "draw"
    sourceType: null,      // string, e.g. "drawRegistry"
    registryKey: null      // string, e.g. "linkedCircles"
  }, // end launch


  /* =========================================================
     Canvas configuration
  ========================================================= */
  canvasWidth: 800,
  canvasHeight: 800,

  /* =========================================================
     Active tab
  ========================================================= */
  activeTab: "home",

  // Undocumented/Legacy members found in usage (uiCallbacks.js)
  activeDrawTab: null, // added
  drawTabs: null, // added

  /* =========================================================
     Per-tab state containers
  ========================================================= */
  home: {
    // Minimal “restore contract” object for Home.
    // null means “cold start”.
    needsUpdate: false,
    saved: {
      view: "categories",     // "categories" | "results"
      activeStatus: null,     // status string (or null)
      activeIndex: null,      // index within activeStatus group (or null)
      activeEntry: null       // manifest entry object (or null)
    }
  },


  draw: {
    needsUpdate: false,
    activeSubtab: null,     // e.g., "ellipse", "categories"
    tabs: {},               // keyed by subtab-id
    saved: null             // last saved state from DrawSpec.restore contract
  },

  patterns: {
    needsUpdate: false,
    activeCategory: null,
    activeItem: null,
    saved: null
  },

  gallery: {
    needsUpdate: false,
    /* -------------------------------------------------------
       Explicit members used by gallery.js (Architectural Change 1)
    ------------------------------------------------------- */

    // Which fixed domain subtab is currently selected.
    // "Ideabook" | "Patterns" | "Scripts" | null
    activeDomain: null,

    // For results view (Ideabook/Patterns/Scripts), which category is active.
    // For categories view, null.
    activeCategory: null,

    // Current manifest entry (object) when in results view; otherwise null.
    activeItem: null,

    // Which Gallery subtab is active in the UI.
    // "ideabook" | "patterns" | "scripts" | "results"
    activeSubtab: "ideabook",

    // Default saved-state template (explicit, never written by logic unless copied).
    defaultSaved: {
      view: "categories",      // "categories" | "results"
      domain: "Ideabook",      // "Ideabook" | "Patterns" | "Scripts"
      category: null,          // string | null
      index: null              // number | null
    },

    // The actual restore contract used by GalleryTabSpec.restore().
    // gallery.js owns this object and rewrites it on navigation.
    // null means “cold start”.
    saved: null
  },

  figures: {
    needsUpdate: false,
    // Tracks the currently active subtab (e.g., "tab-categories" or a figure ID)
    activeSubtab: "tab-categories", // added

    // Stores state for each open subtab (categories or figure instances)
    tabs: {
        "tab-categories": { type: "categories" }
    }, // added

    saved: null
  },

  utilities: {
    needsUpdate: false,
    activeCategory: null,
    activeItem: null,

    // Undocumented members found in usage:
    activeUtilityTabId: null, // added
    lastUtilitySubtab: null,  // added
    activeUtilityCategory: null, // added
    activeUtilityItem: null, // added
    lastResult: null, // added

    saved: null
  },


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
