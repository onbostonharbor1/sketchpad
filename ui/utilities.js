/* utilities.js
   ------------------------------------------------------------
   Defines placeholder functions for initializing Utilities tab divs.
   Each function currently sets its target div to display
   a simple "TBD" message indicating its future purpose.
   ------------------------------------------------------------ */

/* ------------------------------------------------------------
   Individual placeholder functions
------------------------------------------------------------ */
function setUtilitiesButtons() {
  const el = document.getElementById("buttons");
  if (el) el.innerHTML = "TBD utilities buttons";
} // end setUtilitiesButtons

function setUtilitiesAction() {
  const el = document.getElementById("action");
  if (el) el.innerHTML = "TBD utilities action";
} // end setUtilitiesAction

function setUtilitiesSubtabs() {
  const el = document.getElementById("subtabs");
  if (el) el.innerHTML = "TBD utilities subtabs";
} // end setUtilitiesSubtabs

function setUtilitiesCaption() {
  const el = document.getElementById("caption");
  if (el) el.innerHTML = "TBD utilities caption";
} // end setUtilitiesCaption

function setUtilitiesText() {
  const el = document.getElementById("text");
  if (el) el.innerHTML = "TBD utilities text";
} // end setUtilitiesText

function setUtilitiesSketchpad() {
  const el = document.getElementById("sketchpad");
  if (el) el.innerHTML = "TBD utilities sketchpad";
} // end setUtilitiesSketchpad

/* ------------------------------------------------------------
   utilitiesDivs object mapping div names to their setter functions
------------------------------------------------------------ */
const utilitiesDivs = {
    theme:      "theme-utilities",
  buttons: setUtilitiesButtons,
  action: setUtilitiesAction,
  subtabs: setUtilitiesSubtabs,
  caption: setUtilitiesCaption,
  text: setUtilitiesText,
  sketchpad: setUtilitiesSketchpad
}; // end utilitiesDivs
