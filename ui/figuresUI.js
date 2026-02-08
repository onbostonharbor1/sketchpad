/* figuresUI.js
   ------------------------------------------------------------
   Figures UI: Overlay Buttons in Sidebar
   ------------------------------------------------------------
   NOTE: Button styles defined in wrapper.css
*/

import { getActiveOverlays, setActiveOverlayIndex, moveOverlayToBack, getActiveOverlayIndex } from "./figuresRunner.js";

/* ============================================================
   initFigureOverlays
   Initialize global update function
============================================================ */
export function initFigureOverlays() {
    // Expose update function globally
    window.updateFigureOverlayButtons = updateFigureOverlayButtons;
}

/* ============================================================
   updateFigureOverlayButtons
   Rebuild overlay buttons in #figure-sidebar
============================================================ */
export function updateFigureOverlayButtons() {
    const sidebar = document.getElementById("figure-sidebar");
    if (!sidebar) return;

    // Clear existing buttons
    sidebar.innerHTML = "";

    const overlays = getActiveOverlays();
    const activeIndex = getActiveOverlayIndex();

    overlays.forEach((overlay, index) => {
        const btn = document.createElement("button");
        btn.className = "figure-overlay-btn";
        btn.textContent = index + 1;

        if (index === activeIndex) {
            btn.classList.add("active");
        }

        // Left-click to select
        btn.onclick = (e) => {
            e.stopPropagation();
            setActiveOverlayIndex(index);
        };

        // Right-click to move to back
        btn.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            moveOverlayToBack(index);
        };

        // Tooltip showing parameter diffs
        const tooltip = document.createElement("div");
        tooltip.className = "figure-tooltip";
        const diffText = getParameterDiff(overlay);
        tooltip.textContent = diffText || "No changes";
        btn.appendChild(tooltip);

        sidebar.appendChild(btn);
    });
}

/* ============================================================
   getParameterDiff
   Compare overlay params to defaults, return diff string
============================================================ */
function getParameterDiff(overlay) {
    if (!overlay.defaultParams || !overlay.params) return "";

    let diffs = [];
    for (const key in overlay.params) {
        if (JSON.stringify(overlay.params[key]) !== JSON.stringify(overlay.defaultParams[key])) {
            diffs.push(`${key}: ${overlay.params[key]}`);
        }
    }
    return diffs.length > 0 ? "Changes:\n" + diffs.join("\n") : "";
}
