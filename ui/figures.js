/* figures.js
   ------------------------------------------------------------
   Figures Tab Controller — NEW ARCHITECTURE
   Placeholder implementation (TBD content)
   ------------------------------------------------------------
*/

import { uiState } from "./uiState.js";

/* ============================================================
   initFiguresTab — initialize placeholder content
============================================================ */
export function initFiguresTab() {
  setFiguresAction();
  setFiguresSubtabs();
  setFiguresCaption();
  setFiguresText();
  setFiguresSketchpad();
} // end initFiguresTab


/* ============================================================
   Placeholder setters for each UI region
============================================================ */
function setFiguresAction() {
  const el = document.getElementById("action");
  if (el) el.innerHTML = "TBD figures action";
} // end setFiguresAction

function setFiguresSubtabs() {
  const el = document.getElementById("subtabs");
  if (el) el.innerHTML = "TBD figures subtabs";
} // end setFiguresSubtabs

function setFiguresCaption() {
  const el = document.getElementById("caption");
  if (el) el.innerHTML = "TBD figures caption";
} // end setFiguresCaption

function setFiguresText() {
  const el = document.getElementById("text");
  if (el) el.innerHTML = "TBD figures text";
} // end setFiguresText

function setFiguresSketchpad() {
  const el = document.getElementById("sketchpad");
  if (el) el.innerHTML = "TBD figures sketchpad";
} // end setFiguresSketchpad


/* ============================================================
   TabSpec for setUI.js
============================================================ */
export const FiguresTabSpec = {
  theme: "theme-figures",

  init: initFiguresTab,
  save: () => ({}),  // nothing to save yet

  action:    setFiguresAction,
  subtabs:   setFiguresSubtabs,
  caption:   setFiguresCaption,
  text:      setFiguresText,
  sketchpad: setFiguresSketchpad
}; // end FiguresTabSpec


/* ============================================================
   Optional div-controller object for consistency
============================================================ */
export const figuresDivs = {
  theme: "theme-figures",
  action:    setFiguresAction,
  subtabs:   setFiguresSubtabs,
  caption:   setFiguresCaption,
  text:      setFiguresText,
  sketchpad: setFiguresSketchpad
}; // end figuresDivs
