/* ===========================================================
   commandsButton.js
   -----------------------------------------------------------
   The Commands button: set its label and its click handler for the active tab.
   =========================================================== */

/**
 * Set the Commands button label for the active top-level tab.
 *
 * Assumptions (fail-fast):
 * - #commandsButton exists in the DOM
 * - caller supplies a non-empty string
 *
 * @param {string} label - Full label text (e.g. "Draw Commands")
 */
export function setCommandsButtonLabel(label) {
  if (!label) {
    throw new Error("setCommandsButtonLabel: label is required");
  }

  const btn = document.getElementById("commandsButton");
  if (!btn) {
    throw new Error("setCommandsButtonLabel: #commandsButton not found");
  }

  btn.textContent = label;
} // end setCommandsButtonLabel

/*************************************************************
   setCommandsButtonHandler(onClick)
   -----------------------------------------------------------
   Replaces the Commands button click handler deterministically.
*************************************************************/
export function setCommandsButtonHandler(onClick) {

  const btn = document.getElementById("commandsButton");
  if (!btn) throw new Error("setCommandsButtonHandler: #commandsButton not found");

  if (typeof onClick !== "function") {
    throw new Error("setCommandsButtonHandler: onClick must be a function");
  }

  // Deterministic: overwrite any previous handler.
  btn.onclick = onClick;

} // end setCommandsButtonHandler
