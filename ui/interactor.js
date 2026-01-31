/* ===========================================================
   interactor.js – Unified Interaction Manager
   =========================================================== */
import { overlayManager } from "/ui/overlay.js";

const PointPickerPresets = {
    handleRadius: 5,        // Normal size
    hitTolerance: 10,       // Grab tolerance
    idleColor: "#C91A09",   // LEGO Bright Red
    activeColor: "#FE8A18"  // LEGO Bright Orange
};

let deactivateCurrent = null;

/* ===========================================================
   DRAW SIDE: Coordination Logic
   =========================================================== */

export function armInteractor(instance) {
    // 1. Ensure any existing interactor is fully shut down
    disarmInteractor();

    const pts = instance?.params?.points;
    if (!pts) {
        console.warn("Interactor: armInteractor called, but no points array found.");
        return;
    }

    // Disable navigation overlays that might interfere with dragging
    const nav = document.getElementById("next-prev-overlay");
    if (nav) nav.style.pointerEvents = "none";

    // 2. Activate the picker and store the cleanup function
    deactivateCurrent = activatePointPicker(instance.params.points, {
        uiKey: instance.id,
        onUpdate: () => {
            // Safety: Only proceed if this instance is still the active one
            if (!deactivateCurrent) return;

            // Sync script-internal state
            if (instance.update) {
                instance.update(instance.params);
            }

            // Trigger engine redraw via uiState bridge
            const activeTabId = uiState.draw.activeSubtab;
            const activeTab = uiState.draw.tabs[activeTabId];

            if (activeTab && activeTab.redrawHandler) {
                activeTab.redrawHandler();
            } else if (instance.draw) {
                instance.draw();
            }
        }
    });
}

export function disarmInteractor() {
    // 1. Shut down the listeners and clear the cleanup reference
    if (deactivateCurrent) {
        deactivateCurrent();
        deactivateCurrent = null;
    }

    // 2. Hard-reset the interaction canvas layer
    const canvas = overlayManager.getCanvasLayer("interaction");
    if (canvas) {
        const ctx = canvas.getContext("2d");
        // Wipe all pixels
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Hide the layer so it cannot capture events or show "ghosts"
        canvas.style.display = "none";
        canvas.style.pointerEvents = "none";
    }
}

/* ===========================================================
   CORE PICKER LOGIC
   =========================================================== */

function activatePointPicker(points, config = {}) {
    const settings = { ...PointPickerPresets, ...config };
    const canvas = overlayManager.getCanvasLayer("interaction");
    const ctx = canvas.getContext("2d");

    // Sync dimensions with the main drawing canvas
    const mainCanvas = window.drawCanvas;
    if (mainCanvas) {
        canvas.width = mainCanvas.width;
        canvas.height = mainCanvas.height;
        canvas.style.display = "block";
        canvas.style.pointerEvents = "auto";
    }

    let draggedIndex = null;
    let hoverIndex = null;

    // Use AbortController for clean, one-shot listener removal
    const controller = new AbortController();
    const { signal } = controller;

    function getCanvasCoords(event) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    }

    function render() {
        // CRITICAL SAFETY: If the interactor is disarmed, the signal is aborted.
        // Returning here prevents the "ghost draw" when UI controls are touched.
        if (signal.aborted) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        points.forEach((pt, i) => {
            const isActive = (i === draggedIndex || i === hoverIndex);

            ctx.beginPath();
            ctx.arc(pt.x, pt.y, settings.handleRadius, 0, Math.PI * 2);

            // Red dot normally, Orange when active
            ctx.fillStyle = isActive ? settings.activeColor : settings.idleColor;
            ctx.fill();

            // High-contrast stroke for visibility against dark backgrounds
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1.5;
            ctx.stroke();
        });
    }

    const handleMouseDown = (e) => {
        const mouse = getCanvasCoords(e);
        for (let i = 0; i < points.length; i++) {
            const pt = points[i];
            const dist = Math.sqrt((mouse.x - pt.x) ** 2 + (mouse.y - pt.y) ** 2);
            if (dist < settings.hitTolerance) {
                draggedIndex = i;
                render();
                return;
            }
        }
    };

    const handleMouseMove = (e) => {
        const mouse = getCanvasCoords(e);
        let currentHover = null;

        for (let i = 0; i < points.length; i++) {
            const pt = points[i];
            const dist = Math.sqrt((mouse.x - pt.x) ** 2 + (mouse.y - pt.y) ** 2);
            if (dist < settings.hitTolerance) {
                currentHover = i;
                break;
            }
        }

        if (currentHover !== hoverIndex || draggedIndex !== null) {
            hoverIndex = currentHover;
            if (draggedIndex !== null) {
                points[draggedIndex].x = mouse.x;
                points[draggedIndex].y = mouse.y;
                if (settings.onUpdate) settings.onUpdate();
            }
            render();
        }
    };

    const handleMouseUp = () => {
        draggedIndex = null;
        render();
    };

    // Attach listeners to window to ensure we don't lose the drag if mouse leaves canvas
    window.addEventListener("mousedown", handleMouseDown, { signal });
    window.addEventListener("mousemove", handleMouseMove, { signal });
    window.addEventListener("mouseup",   handleMouseUp,   { signal });

    // Initial render call to show dots immediately
    render();

    // The cleanup function returned to 'deactivateCurrent'
    return () => {
        controller.abort();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = "none";
    };
}

// Global Exports
window.armInteractor = armInteractor;
window.disarmInteractor = disarmInteractor;
