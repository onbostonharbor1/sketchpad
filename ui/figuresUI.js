/* figuresUI.js
   ------------------------------------------------------------
   Figures UI: Overlay Buttons & Interaction
   ------------------------------------------------------------
*/

import { getActiveOverlays, setActiveOverlayIndex, moveOverlayToBack, getActiveOverlayIndex } from "./figuresRunner.js";

let buttonContainer = null;

export function initFigureOverlays() {
    // Ensure container exists
    const sketchpad = document.getElementById("sketchpad");
    if (!sketchpad) return;

    // Check if already exists
    let container = document.getElementById("figure-overlay-buttons");
    if (!container) {
        container = document.createElement("div");
        container.id = "figure-overlay-buttons";
        container.style.position = "absolute";
        container.style.top = "10px";
        container.style.left = "10px";
        container.style.zIndex = "100";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "5px";
        sketchpad.appendChild(container);
    }
    buttonContainer = container;

    // Add event listener to window for updates (as hooked in figuresRunner)
    window.updateFigureOverlayButtons = updateFigureOverlayButtons;

    // CSS for buttons (injected for now, should move to CSS file)
    if (!document.getElementById("figure-overlay-css")) {
        const style = document.createElement("style");
        style.id = "figure-overlay-css";
        style.textContent = `
            .figure-overlay-btn {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                border: 2px solid var(--theme-figures-btn-border, #666);
                background-color: var(--theme-figures-btn-bg, #eee);
                color: var(--theme-figures-btn-text, #333);
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0.7;
                transition: all 0.2s;
                position: relative; /* For tooltip */
            }
            .figure-overlay-btn:hover {
                opacity: 1.0;
                background-color: var(--theme-figures-btn-hover, #ddd);
            }
            .figure-overlay-btn.active {
                border-color: var(--theme-figures-btn-active-border, #007bff);
                background-color: var(--theme-figures-btn-active-bg, #007bff);
                color: white;
                opacity: 1.0;
                transform: scale(1.1);
            }
            /* Tooltip */
            .figure-tooltip {
                position: absolute;
                left: 120%;
                top: 50%;
                transform: translateY(-50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 12px;
                white-space: pre;
                pointer-events: none;
                z-index: 101;
                display: none;
                min-width: 150px;
            }
            .figure-overlay-btn:hover .figure-tooltip {
                display: block;
            }
        `;
        document.head.appendChild(style);
    }
}

export function updateFigureOverlayButtons() {
    if (!buttonContainer) initFigureOverlays();
    if (!buttonContainer) return;

    buttonContainer.innerHTML = "";

    const overlays = getActiveOverlays();
    const activeIndex = getActiveOverlayIndex();

    overlays.forEach((overlay, index) => {
        const btn = document.createElement("div");
        btn.className = "figure-overlay-btn";
        btn.textContent = index + 1;

        if (index === activeIndex) {
            btn.classList.add("active");
        }

        // Click to select
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

        // Tooltip for diffs
        const tooltip = document.createElement("div");
        tooltip.className = "figure-tooltip";
        const diffText = getParameterDiff(overlay);
        tooltip.textContent = diffText || "No changes";
        btn.appendChild(tooltip);

        buttonContainer.appendChild(btn);
    });
}

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
