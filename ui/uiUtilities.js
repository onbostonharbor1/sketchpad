/* ===========================================================
   uiUtilities.js
   -----------------------------------------------------------
   clearDivs(): empties the regions every tab shares (#action, #caption, #text, #sketchpad, the
   figure sidebar, per-tab button extras, canvas layers) and disarms the interactor.
   Other helpers that used to live here are in offcanvas.js, commandsButton.js, thumbnails.js,
   rebuildSync.js and htmlText.js.
   =========================================================== */

import { canvasLayerManager } from "./canvasLayerManager.js";
import { disarmInteractor } from "/ui/interactor.js";
import { REGIONS, BUTTON_EXTRA_SELECTOR } from "/ui/regions.js";

/* ------------------------------------------------------------
   clearDivs(args="")
   Empties the core divs shared by all tabs.

   Arguments:
     args - optional string id of an extra div to clear in addition
------------------------------------------------------------ */
function clearDivs(args = "") {
    // 1. Clear the regions listed in regions.js, plus one extra if the caller names it.
    const regions = [...REGIONS];
    if (args !== "") {
        regions.push({ id: args, clear: "empty-show" });
    }

    regions.forEach(({ id, clear }) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (clear === "hide") {
            el.style.display = "none";     // tabs must explicitly show it again
            return;
        }
        el.innerHTML = "";
        if (clear === "empty-show") el.style.display = "";
        if (clear === "empty-hide") el.style.display = "none";
    });

    // Remove per-tab additions to the permanent #button div.
    document.querySelectorAll(BUTTON_EXTRA_SELECTOR).forEach(el => el.remove());

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
    disarmInteractor();
} // end clearDivs

export { clearDivs };
