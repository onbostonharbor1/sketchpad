////////////////////////////////////////////////////////////////
// overlay.js --  CLEAN FINAL VERSION
////////////////////////////////////////////////////////////////
import { openHelpEditorTinyMCE} from "./help.js";

export const overlayManager = {
  // Panel overlays (help / forms / debug)
  layers: {},

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

    // CRITICAL: Disable interactor when showing any overlay
    if (window.disarmInteractor) {
      window.disarmInteractor();
    }

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
    // Clears panel overlays only.
    // Canvas layers are managed by canvasLayerManager.js
    for (const name in this.layers) {
      const el = this.layers[name];
      el.innerHTML = "";
      el.style.display = "none";
    }
  } // end clearAll

}; // end overlayManager

// Expose for older code
window.overlayManager = overlayManager;

////////////////////////////////////////////////////////////////
// initOverlay() --  CALL ONCE IN onDomContentLoaded()
////////////////////////////////////////////////////////////////
export function initOverlay() {

  // ----- Panel overlays -----
  const helpEl  = document.getElementById("overlay-help");
  const formsEl = document.getElementById("overlay-forms");
  const debugEl = document.getElementById("overlay-debug");

  if (!helpEl || !formsEl || !debugEl) {
    throw new Error("initOverlay: missing help/forms/debug overlay elements");
  }

  overlayManager.register("help", helpEl);
  overlayManager.register("forms", formsEl);
  overlayManager.register("debug", debugEl);

  // ----- Close button for help/forms/debug panel -----
  // Note: Canvas layers are initialized separately via initCanvasLayers()
  // in canvasLayerManager.js
  const closeBtn = document.getElementById("overlayClose");
  if (!closeBtn) throw new Error("initOverlay: #overlayClose missing");

   closeBtn.onclick = function () {
    const overlayPanel = document.getElementById("overlayPanel");
    if (!overlayPanel) throw new Error("initOverlay: #overlayPanel missing");

    // Remove any per-overlay sizing class (safe even if not present)
    overlayPanel.classList.remove("helpBrowserPanel");

    document.getElementById("overlayContainer").style.display = "none";
    overlayManager.clearAll();  // panel overlays only
  }; // end onclick


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

// overlay.js  (UPDATE showHelpOverlay)

// overlay.js  (REPLACE showHelpOverlay with this version)

export function showHelpOverlay(helpPath, titleText, options = {}) {

  if (!helpPath) throw new Error("showHelpOverlay: helpPath missing");

  const createIfMissing = (options && options.createIfMissing === true);
  const allowEdit = (options && options.allowEdit === false) ? false : true;

  // CREATE PATH: do NOT fetch; open empty editor immediately.
  if (createIfMissing) {
    if (!titleText) throw new Error("showHelpOverlay(create): titleText missing");
    openHelpEditorTinyMCE(helpPath, titleText, { initialBodyHtml: "" });
    return;
  }

  // VIEW PATH: help exists; fetch and display.
  fetch(helpPath)
    .then((resp) => {
      if (!resp.ok) {
        throw new Error("showHelpOverlay: fetch failed " + resp.status + " for " + helpPath);
      }
      return resp.text();
    })
    .then((html) => {

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const bodyHtml = doc.body ? doc.body.innerHTML : html;

      // Use <title> from the HTML page if present; else fall back to titleText; else fall back to helpPath.
      let pageTitle = "";
      if (doc && doc.title) pageTitle = String(doc.title).trim();

      if (!pageTitle) {
        pageTitle = String(titleText || "").trim();
      }

      if (!pageTitle) {
        const parts = String(helpPath).split("/");
        pageTitle = parts[parts.length - 1] || "Help";
      }

      let toolbarHtml = "<div class='overlayHelpToolbar'>";

      if (allowEdit) {
        toolbarHtml += "<button id='helpEditButton' type='button'>Edit</button>";
      }

      toolbarHtml += "</div>";

      const finalHtml =
        toolbarHtml +
        "<div class='overlayHelp'>" + bodyHtml + "</div>";

      overlayManager.show("help", finalHtml);

      const header = document.getElementById("overlayTitle");
      if (!header) throw new Error("showHelpOverlay: #overlayTitle missing");

      // IMPORTANT: do NOT append " Help" --  the page title is the overlay title.
      header.textContent = pageTitle;

      document.getElementById("overlayContainer").style.display = "block";

      // Only wire Edit if it exists
      if (allowEdit) {
        const editBtn = document.getElementById("helpEditButton");
        if (!editBtn) throw new Error("showHelpOverlay: #helpEditButton not found");

        editBtn.onclick = () => {
          openHelpEditorTinyMCE(helpPath, pageTitle, { initialBodyHtml: bodyHtml });
        }; // end onclick
      }

    });

} // end showHelpOverlay




