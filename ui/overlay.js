////////////////////////////////////////////////////////////////
// overlay.js
// ------------------------------------------------------------
// Single-file overlay system.
// Contains:
//   - overlayManager object
//   - initOverlay() to register layers
//   - showHelp / hideHelp wrappers
//   - openOverlay / closeOverlay wrappers
//
// Nothing else. No overlayClass. No descriptors.
// Fully aligned with current UI architecture.
////////////////////////////////////////////////////////////////

export const overlayManager = {
  layers: {},

  register(name, element) {
    if (!name || !element)
      throw new Error("overlayManager.register: invalid args");
    this.layers[name] = element;
  }, // end register

  show(name, html) {
    const el = this.layers[name];
    if (!el) throw new Error("overlayManager.show: unknown layer " + name);
    el.innerHTML = html;
    el.style.display = "block";
  }, // end show

  hide(name) {
    const el = this.layers[name];
    if (!el) throw new Error("overlayManager.hide: unknown layer " + name);
    el.style.display = "none";
  }, // end hide

  clearLayer(name) {
    const el = this.layers[name];
    if (!el)
      throw new Error("overlayManager.clearLayer: unknown layer " + name);
    el.innerHTML = "";
    el.style.display = "none";
  }, // end clearLayer

  clearAll() {
    for (const name in this.layers) {
      const el = this.layers[name];
      el.innerHTML = "";
      el.style.display = "none";
    }
  }, // end clearAll
}; // end overlayManager

window.overlayManager = overlayManager;

////////////////////////////////////////////////////////////////
// initOverlay()
// Must be called ONCE from main.js
////////////////////////////////////////////////////////////////
export function initOverlay() {
  const helpEl = document.getElementById("overlay-help");
  const interEl = document.getElementById("overlay-interaction");
  const notesEl = document.getElementById("overlay-notes");
  const debugEl = document.getElementById("overlay-debug");

  if (!helpEl || !interEl || !notesEl || !debugEl) {
    throw new Error("initOverlay: one or more overlay elements missing");
  }

  overlayManager.register("help", helpEl);
  overlayManager.register("interaction", interEl);
  overlayManager.register("notes", notesEl);
  overlayManager.register("debug", debugEl);

  ////////////////////////////////////////////////////////////////
// Close button for entire overlay window
////////////////////////////////////////////////////////////////
document.getElementById("overlayClose").onclick = function () {
  document.getElementById("overlayContainer").style.display = "none";
  overlayManager.clearAll();
}; // end onclick


  console.log("overlay.js: registered overlay layers:", overlayManager.layers);
} // end initOverlay

////////////////////////////////////////////////////////////////
// Help Overlay
////////////////////////////////////////////////////////////////
export function showHelp(text) {
  const html = "<div class='help-block'>" + text + "</div>";
  overlayManager.show("help", html);
} // end showHelp

export function hideHelp() {
  overlayManager.hide("help");
} // end hideHelp

////////////////////////////////////////////////////////////////
// Interaction Overlay
////////////////////////////////////////////////////////////////
export function openOverlay(html) {
  overlayManager.show("interaction", html);
} // end openOverlay

export function closeOverlay() {
  overlayManager.hide("interaction");
} // end closeOverlay

/* ------------------------------------------------------------
   showHelpOverlay(helpPath, titleText)
   Loads a full HTML help file, extracts <body>, places content
   into overlay-help layer, and opens the overlay panel.
------------------------------------------------------------ */
export function showHelpOverlay(helpPath, titleText) {

  fetch(helpPath)
    .then(resp => resp.text())
    .then(html => {

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const bodyHtml = doc.body ? doc.body.innerHTML : html;

      const finalHtml =
        "<div class='overlayHelp'>" + bodyHtml + "</div>";

      overlayManager.show("help", finalHtml);

      const header = document.getElementById("overlayTitle");
      header.textContent = titleText + " Help";

      const oc = document.getElementById("overlayContainer");
      oc.style.display = "block";
    });
} // end showHelpOverlay


////////////////////////////////////////////////////////////////
// Close button for entire overlay window
///////////////////////////////////////////'
//
/////////////////////
document.getElementById("overlayClose").onclick = function () {
  // Hide the whole overlay container
  document.getElementById("overlayContainer").style.display = "none";

  // Clear all overlay layers
  overlayManager.clearAll();
}; // end onclick
