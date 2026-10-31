/* ===========================================================
   uiUtilities.js
   -----------------------------------------------------------
   clearDivs(): empties the regions every tab shares (#action, #caption, #text, #sketchpad, the
   figure sidebar, per-tab button extras, canvas layers) and disarms the interactor.
   Other helpers that used to live here are in offcanvas.js, commandsButton.js, thumbnails.js,
   rebuildSync.js and htmlText.js.
   =========================================================== */

import { canvasLayerManager } from "./canvasLayerManager.js";

/* ------------------------------------------------------------
   clearDivs(args="")
   Empties the core divs shared by all tabs.

   Arguments:
     args - optional string id of an extra div to clear in addition
------------------------------------------------------------ */
function clearDivs(args = "") {
    // 1. Clear standard regions
    let ids = ["action", "caption", "text", "sketchpad"];
    if (args !== "") {
        ids.push(args);
    }

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = "";
            el.style.display = "";
        }
    });

    // 1b. Hide/Clear Layout-specific Elements
    const sidebar = document.getElementById("figure-sidebar");
    if (sidebar) {
        sidebar.innerHTML = "";
        sidebar.style.display = "none";
    }

    // Remove per-tab additions to the permanent #button div.
    document.querySelectorAll("#button .tab-extra").forEach(el => el.remove());

    const ifc = document.getElementById("interface-controls");
    if (ifc) {
        ifc.innerHTML = "";
        // CSS :empty rule handles display:none, or we can force it:
        // ifc.style.display = "none";
    }

    // Hide sketchpad wrapper by default (tabs must explicitly show it)
    const wrapper = document.getElementById("sketchpad-wrapper");
    if (wrapper) wrapper.style.display = "none";

    // 2. Clear canvas overlay layers (pixels + HTML)
    canvasLayerManager.clearAll();

    // 3. Clear main canvas pixels (prevent ghosting)
    const canvas = window.drawCanvas;
    if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    // 4. Disarm interactor
    if (window.disarmInteractor) {
        window.disarmInteractor();
    }
} // end clearDivs

export { clearDivs };
