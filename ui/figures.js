/* figures.js
   ============================================================
   Figures Tab — Public Entry Point and Lifecycle
   ============================================================
   Role:
     This is the public entry point for the Figures tab.
     It owns exactly three things:

       1. FiguresTabSpec — the object consumed by setUI.js to
          drive tab activation (init / restore / save).

       2. Lifecycle functions — initFiguresTab(). Figures does
          not currently implement restore or save hooks.

       3. UI region setup — setFiguresAction(), setFiguresText(),
          setFiguresSketchpad(). These establish the initial UI
          structure for the tab.

   What does NOT live here:
     • Subtab construction and navigation      → figures/figuresNav.js
     • Category loading and figure loading     → figures/figuresDisplay.js
     • Caption bar and menu items              → figures/figuresMenuCmds.js
     • Shared module-level state variables     → figures/figuresState.js
     • Figure execution and rendering          → figuresRunner.js
     • Overlay UI management                   → figuresUI.js

   Import structure:
     figures.js imports from the figures/ sub-modules.
     Sub-modules import from figures.js only via dynamic import()
     to avoid circular references.
   ============================================================ */

import { uiState } from "/ui/uiState.js";
import { setCommandsButtonLabel } from "/ui/uiUtilities.js";
import {
  resetFiguresState,
  setCurrentTabId
} from "./figures/figuresState.js";
import {
  setFiguresSubtabs,
  renderSubtabs,
  switchToCategories,
  switchToFigureTab
} from "./figures/figuresNav.js";
import {
  loadFiguresCategories
} from "./figures/figuresDisplay.js";
import {
  setFiguresCaption
} from "./figures/figuresMenuCmds.js";
import { initFigureOverlays } from "./figuresUI.js";
import { initFiguresInteraction } from "./figuresRunner.js";


/* ============================================================
   FiguresTabSpec
   ============================================================
   Consumed by setUI.js to activate the Figures tab.

   setUI.js calls:
     init(restored)  — on cold start or after needsUpdate
     save()          — before leaving the tab (optional)
   ============================================================ */
export const FiguresTabSpec = {
  theme: "theme-figures",

  init: initFiguresTab,
  save: () => ({}),

  action:    setFiguresAction,
  subtabs:   setFiguresSubtabs,
  caption:   setFiguresCaption,
  text:      setFiguresText,
  sketchpad: setFiguresSketchpad
};


/* ============================================================
   initFiguresTab(restored)
   ============================================================
   Cold-start initializer for the Figures tab.

   Called by setUI.js when:
     a) The tab has never been visited (no saved state).
     b) uiState.figures.needsUpdate is true (post-rebuild).

   Sequence:
     1. Ensure the state container exists with default values.
     2. Set up all UI regions.
     3. Initialize overlay UI and interaction systems.
     4. Load and render categories.
     5. Render subtabs and switch to active tab.

   Arguments:
     restored — true when called with needsUpdate (Refresh & Restore).
                Currently figures does not implement full restore,
                but the flag is here for future use.
   ============================================================ */
export function initFiguresTab(restored = false) {
  
  // 1. Ensure default state if missing
  if (!uiState.figures) {
    uiState.figures = {
      activeSubtab: "tab-categories",
      tabs: {
        "tab-categories": { type: "categories" }
      },
      saved: null
    };
  }

  // 2. Set up UI regions
  setFiguresAction();
  setFiguresSubtabs();
  setFiguresCaption();
  setFiguresText();
  setFiguresSketchpad();

  // 3. Initialize Overlay UI and Interaction
  initFigureOverlays();
  initFiguresInteraction();

  // 4. Load Categories (always refresh categories for now)
  loadFiguresCategories();

  // 5. Restore active tab
  const activeId = uiState.figures.activeSubtab;

  // Render subtabs first
  renderSubtabs();

  if (activeId && activeId !== "tab-categories") {
    // Check if tab exists
    if (uiState.figures.tabs[activeId]) {
      switchToFigureTab(activeId);
    } else {
      switchToCategories();
    }
  } else {
    switchToCategories();
  }

} // end initFiguresTab


/* ============================================================
   UI Region Setup Functions
   ============================================================
   These functions establish the initial structure for each
   UI region. They are called once during init.
   ============================================================ */

function setFiguresAction() {
  const el = document.getElementById("action");
  if (el) el.innerHTML = "Select an overlay to view controls.";
} // end setFiguresAction


function setFiguresText() {
  const el = document.getElementById("text");
  if (el) el.innerHTML = "Loading categories...";
} // end setFiguresText


function setFiguresSketchpad() {
  // The structure is now permanent in index.html.
  // We just need to ensure the canvas is in the correct place if it was moved.

  const sketchpad = document.getElementById("sketchpad");
  const canvas = window.drawCanvas;

  if (sketchpad && canvas && !sketchpad.contains(canvas)) {
    sketchpad.appendChild(canvas);
    canvas.style.display = "block";
  }

  // Ensure wrapper is visible if we are in figures tab (handled by switchTo...)
  // But initially, setFiguresSketchpad is called during init.
  // Layout logic is mostly in switch functions now.
} // end setFiguresSketchpad
