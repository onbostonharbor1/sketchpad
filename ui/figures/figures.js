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
     * Shared module-level state variables   -> figures/figuresState.js
     * The figure data model                 -> figures/figureModel.js
     * Commands button and caption bar       -> figures/figuresCommands.js
   ============================================================ */

import { setCommandsButtonLabel }    from "/ui/uiUtilities.js";
import { manifest }                  from "/ui/manifest.js";
import {
  setFiguresCaption,
  wireFiguresCommandsButton
}                                    from "/ui/figures/figuresCommands.js";
import {
  resetFiguresState,
  setCurrentTabId
}                                    from "/ui/figures/figuresState.js";
import {
  setFiguresSubtabs,
  renderSubtabs,
  switchToCategories,
  switchToFigureTab,
  openNewFigureTab
}                                    from "/ui/figures/figuresNav.js";
import { loadFiguresCategories }     from "/ui/figures/figuresDisplay.js";


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
      hitRadius: 5,
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

  if (!initFiguresTab._registered) {
    manifest.register("figures", () => initFiguresTab(false));
    initFiguresTab._registered = true;
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

  // Tagged "tab-extra": #button is permanent, so clearDivs() removes
  // everything tagged this way on each tab switch.
  // Show All (preview) toggle, figure tabs only; wired in figuresNav.js.
  const brP = document.createElement("br");
  brP.id = "figureBrPreview";
  brP.className = "tab-extra";
  buttonDiv.appendChild(brP);

  const prev = document.createElement("button");
  prev.id          = "figurePreviewButton";
  prev.className   = "cmdButton tab-extra";
  prev.type        = "button";
  prev.textContent = "Show All";
  prev.title       = "Preview: every layer at full strength, hidden layers included, as the final drawing will look";
  buttonDiv.appendChild(prev);

  // Points Mode and Numbers toggles (figure tabs only; wired in figuresNav.js)
  const brM = document.createElement("br");
  brM.id = "figureBrMode";
  brM.className = "tab-extra";
  buttonDiv.appendChild(brM);

  const modeBtn = document.createElement("button");
  modeBtn.id          = "figureModeButton";
  modeBtn.className   = "cmdButton tab-extra";
  modeBtn.type        = "button";
  modeBtn.textContent = "Points Mode";
  modeBtn.title       = "Show only points. Click to number a point; drag to move it; Delete removes it";
  buttonDiv.appendChild(modeBtn);

  const brN = document.createElement("br");
  brN.id = "figureBrNumbers";
  brN.className = "tab-extra";
  buttonDiv.appendChild(brN);

  const numBtn = document.createElement("button");
  numBtn.id          = "figureNumbersButton";
  numBtn.className   = "cmdButton tab-extra";
  numBtn.type        = "button";
  numBtn.textContent = "Numbers";
  numBtn.title       = "Show the point numbers over the lines (points mode always shows them)";
  buttonDiv.appendChild(numBtn);

  const br = document.createElement("br");
  br.id = "figureBr1";
  br.className = "tab-extra";
  buttonDiv.appendChild(br);

  const btn = document.createElement("button");
  btn.id          = "createFigureButton";
  btn.className   = "cmdButton tab-extra";
  btn.type        = "button";
  btn.textContent = "Create Figure";
  btn.onclick     = openNewFigureTab;
  buttonDiv.appendChild(btn);

  // Insert Object: a list of every registry object. Filled and enabled
  // by updateFigureButtons() in figuresNav.js. Create Figure shows only
  // on the Categories tab; Insert Object only on a figure tab.
  const br2 = document.createElement("br");
  br2.id = "figureBr2";
  br2.className = "tab-extra";
  buttonDiv.appendChild(br2);

  const sel = document.createElement("select");
  sel.id        = "figureInsertSelect";
  sel.className = "cmdButton tab-extra";
  sel.title     = "Insert any registry object as a new layer";
  buttonDiv.appendChild(sel);

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
