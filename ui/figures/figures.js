/* figures.js
   ============================================================
   Figures Tab -- Public Entry Point and Lifecycle
   ============================================================
   Role:
     Public entry point for the Figures tab. Owns exactly
     three things:

       1. FiguresTabSpec -- the object consumed by setUI.js to
          drive tab activation (init / restore / save).

       2. Lifecycle functions -- initFiguresTab().

       3. UI region setup -- setFiguresAction(), setFiguresText(),
          setFiguresSketchpad().

   What does NOT live here:
     * Subtab construction and navigation    -> figures/figuresNav.js
     * Category loading and figure loading   -> figures/figuresDisplay.js
     * Caption bar and menu items            -> figures/figuresMenuCmds.js
     * Shared module-level state variables   -> figures/figuresState.js
     * Figure execution and rendering        -> figuresRunner.js
     * Overlay UI management                 -> figuresUI.js
   ============================================================ */

import { setCommandsButtonLabel }    from "/ui/uiUtilities.js";
import {
  setFiguresCaption,
  openCreateFigureDialog,
  wireFiguresCommandsButton
}                                    from "/ui/figures/figuresMenuCmds.js";
import {
  resetFiguresState,
  setCurrentTabId
}                                    from "/ui/figures/figuresState.js";
import {
  setFiguresSubtabs,
  renderSubtabs,
  switchToCategories,
  switchToFigureTab
}                                    from "/ui/figures/figuresNav.js";
import { loadFiguresCategories }     from "/ui/figures/figuresDisplay.js";
import { initFigureOverlays }        from "/ui/figuresUI.js";
import { initFiguresInteraction }    from "/ui/figuresRunner.js";


/* ============================================================
   FiguresTabSpec
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
   ============================================================ */
export function initFiguresTab(restored = false) {

  if (!uiState.figures) {
    uiState.figures = {
      activeSubtab: "tab-categories",
      tabs: {
        "tab-categories": { type: "categories" }
      },
      saved: null
    };
  }

  setCommandsButtonLabel("Figures Commands");
  wireFiguresCommandsButton();

  setFiguresAction();
  setFiguresSubtabs();
  setFiguresCaption();
  setFiguresText();
  setFiguresSketchpad();

  initFigureOverlays();
  initFiguresInteraction();

  loadFiguresCategories();

  renderSubtabs();

  const activeId = uiState.figures.activeSubtab;

  if (activeId && activeId !== "tab-categories") {
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
   ============================================================ */

function setFiguresAction() {
  /* Append Create Figure button into #button below Commands.
     Guard against double-adding on restore.                  */
  if (document.getElementById("createFigureButton")) return;

  const buttonDiv = document.getElementById("button");
  if (!buttonDiv) return;

  buttonDiv.appendChild(document.createElement("br"));

  const btn = document.createElement("button");
  btn.id          = "createFigureButton";
  btn.className   = "cmdButton";
  btn.type        = "button";
  btn.textContent = "Create Figure";
  btn.onclick     = openCreateFigureDialog;
  buttonDiv.appendChild(btn);

} // end setFiguresAction

function setFiguresText() {
  const el = document.getElementById("text");
  if (el) el.innerHTML = "Loading categories...";
} // end setFiguresText

function setFiguresSketchpad() {
  const sketchpad = document.getElementById("sketchpad");
  const canvas    = window.drawCanvas;

  if (sketchpad && canvas && !sketchpad.contains(canvas)) {
    sketchpad.appendChild(canvas);
    canvas.style.display = "block";
  }
} // end setFiguresSketchpad
