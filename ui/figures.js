/* figures.js
   ------------------------------------------------------------
   Defines placeholder functions for initializing Figures tab divs.
   Each function currently sets its target div to display
   a simple "TBD" message indicating its future purpose.
   ------------------------------------------------------------ */

/* ------------------------------------------------------------
   Individual placeholder functions
------------------------------------------------------------ */
function setFiguresButtons() {
  const el = document.getElementById("buttons");
  if (el) el.innerHTML = "TBD figures buttons";
} // end setFiguresButtons

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

/* ------------------------------------------------------------
   figuresDivs object mapping div names to their setter functions
------------------------------------------------------------ */
const figuresDivs = {
    activeDivs: ["buttons", "action", "caption", "text", "sketchpad", "subtabs"],
    theme:      "theme-figures",
  buttons: setFiguresButtons,
  action: setFiguresAction,
  subtabs: setFiguresSubtabs,
  caption: setFiguresCaption,
  text: setFiguresText,
  sketchpad: setFiguresSketchpad
}; // end figuresDivs
