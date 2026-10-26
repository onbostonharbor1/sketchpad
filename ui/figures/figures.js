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

  const prevLabel = document.createElement("label");
  prevLabel.id        = "figurePreviewLabel";
  prevLabel.className = "tab-extra";
  prevLabel.title     = "Preview: every layer at full strength, hidden layers included, as the final drawing will look";

  const prevCheck = document.createElement("input");
  prevCheck.type = "checkbox";
  prevCheck.id   = "figurePreviewCheck";
  prevLabel.appendChild(prevCheck);
  prevLabel.appendChild(document.createTextNode(" Show All"));
  buttonDiv.appendChild(prevLabel);

  // Points Mode checkbox (figure tabs only; wired in figuresNav.js). A label
  // wraps the checkbox so the text is clickable too.
  const brM = document.createElement("br");
  brM.id = "figureBrMode";
  brM.className = "tab-extra";
  buttonDiv.appendChild(brM);

  const modeLabel = document.createElement("label");
  modeLabel.id        = "figureModeLabel";
  modeLabel.className = "tab-extra";
  modeLabel.title     = "Show only points. Click to place a point on the active layer; Delete removes the selected one. The object's handles still drag.";

  const modeCheck = document.createElement("input");
  modeCheck.type = "checkbox";
  modeCheck.id   = "figureModeCheck";
  modeLabel.appendChild(modeCheck);
  modeLabel.appendChild(document.createTextNode(" Points Mode"));
  buttonDiv.appendChild(modeLabel);

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
