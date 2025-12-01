////////////////////////////////////////////////////////////////
// overlay.js — CLEAN FINAL VERSION
////////////////////////////////////////////////////////////////

export const overlayManager = {
  // Panel overlays (help / notes / debug)
  layers: {},

  // Canvas overlays (interaction / bbox / nodes / guides)
  canvasLayers: {},

  // ---------- Panel overlay API ----------
  register(name, element) {
    if (!name || !element) {
      throw new Error("overlayManager.register: invalid args");
    }
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
    if (!el) throw new Error("overlayManager.clearLayer: unknown layer " + name);
    el.innerHTML = "";
    el.style.display = "none";
  }, // end clearLayer

  clearAll() {
    // clears panel overlays (NOT canvas overlays)
    for (const name in this.layers) {
      const el = this.layers[name];
      el.innerHTML = "";
      el.style.display = "none";
    }
  }, // end clearAll

  // ---------- Canvas overlay API ----------
  registerCanvas(name, element) {
    if (!name || !element) {
      throw new Error("overlayManager.registerCanvas: invalid args");
    }
    this.canvasLayers[name] = element;
  }, // end registerCanvas

  getCanvasLayer(name) {
    const el = this.canvasLayers[name];
    if (!el) {
      throw new Error("overlayManager.getCanvasLayer: unknown canvas layer " + name);
    }
    return el;
  } // end getCanvasLayer
}; // end overlayManager

// Expose for older code
window.overlayManager = overlayManager;

////////////////////////////////////////////////////////////////
// initOverlay() — CALL ONCE IN onDomContentLoaded()
////////////////////////////////////////////////////////////////
export function initOverlay() {

  // ----- Panel overlays -----
  const helpEl  = document.getElementById("overlay-help");
  const notesEl = document.getElementById("overlay-notes");
  const debugEl = document.getElementById("overlay-debug");

  if (!helpEl || !notesEl || !debugEl) {
    throw new Error("initOverlay: missing help/notes/debug overlay elements");
  }

  overlayManager.register("help", helpEl);
  overlayManager.register("notes", notesEl);
  overlayManager.register("debug", debugEl);

  // ----- Canvas overlays -----
  const inter  = document.getElementById("interaction-layer");
  const bbox   = document.getElementById("bbox-layer");
  const nodes  = document.getElementById("nodes-layer");
  const guides = document.getElementById("guides-layer");

  if (!inter || !bbox || !nodes || !guides) {
    throw new Error("initOverlay: missing one or more canvas overlay layers");
  }

  overlayManager.registerCanvas("interaction", inter);
  overlayManager.registerCanvas("bbox", bbox);
  overlayManager.registerCanvas("nodes", nodes);
  overlayManager.registerCanvas("guides", guides);

  // ----- Close button for help/notes/debug panel -----
  const closeBtn = document.getElementById("overlayClose");
  if (!closeBtn) throw new Error("initOverlay: #overlayClose missing");

  closeBtn.onclick = function () {
    document.getElementById("overlayContainer").style.display = "none";
    overlayManager.clearAll();  // panel overlays only
  }; // end onclick

  console.log("overlay.js registered:",
    overlayManager.layers,
    overlayManager.canvasLayers
  );
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
// Panel-style overlay open/close (rarely used)
////////////////////////////////////////////////////////////////
export function openOverlay(html) {
  overlayManager.show("help", html);  // panel overlay
} // end openOverlay

export function closeOverlay() {
  overlayManager.hide("help");
} // end closeOverlay

////////////////////////////////////////////////////////////////
// Full HTML help loader
////////////////////////////////////////////////////////////////
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

      document.getElementById("overlayContainer").style.display = "block";
    });
} // end showHelpOverlay
