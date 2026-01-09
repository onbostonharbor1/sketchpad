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
  canvasWidth: 600,
  canvasHeight: 600,

  /* =========================================================
     Active tab
  ========================================================= */
  activeTab: "home",

  /* =========================================================
     Per-tab state containers
  ========================================================= */
  home: {
    // Minimal “restore contract” object for Home.
    // null means “cold start”.
    saved: {
      view: "categories",     // "categories" | "results"
      activeStatus: null,     // status string (or null)
      activeIndex: null,      // index within activeStatus group (or null)
      activeEntry: null       // manifest entry object (or null)
    }
  },


  draw: {
    activeSubtab: null,     // e.g., "ellipse", "categories"
    tabs: {},               // keyed by subtab-id
    saved: null             // last saved state from DrawSpec.restore contract
  },

  patterns: {
    activeCategory: null,
    activeItem: null,
    saved: null
  },

  gallery: {
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
