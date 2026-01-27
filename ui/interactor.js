/* ===========================================================
   interactor.js – Unified Interaction Manager
   -----------------------------------------------------------
   Handles the Canvas Overlay (interaction-layer) and the
   Draw-side coordination for "Primary" patterns.
=========================================================== */

import { drawState } from "/draw/drawState.js";
import { overlayManager } from "/ui/overlay.js";

const PointPickerPresets = {
    handleRadius: 3,
    hitTolerance: 7,
    idleColor: "#0055BF",   // LEGO Bright Blue
    activeColor: "#FE8A18"  // LEGO Bright Orange
};

// Internal state to track the active session
let deactivateCurrent = null;

/* ===========================================================
   DRAW SIDE: Coordination Logic
=========================================================== */

/**
 * armInteractor(instance)
 * Public API to connect a class instance to the overlay.
 *//**
 * armInteractor(instance)
 * Public API to connect a class instance to the overlay.
 */
export function armInteractor(instance) {
    // 1. Clean up existing session
    disarmInteractor();

    // 2. Fail-fast if instance lacks points
    const pts = instance?.params?.points;

    if (!pts) {
        console.warn("Interactor: armInteractor was called, but no points array found.");
        return;
    }

    // Temporary fix: disable navigation zones to ensure clicks reach the interaction layer
    const nav = document.getElementById("next-prev-overlay");
    if (nav) nav.style.pointerEvents = "none";

    // 3. Attach the picker logic
    deactivateCurrent = activatePointPicker(instance.params.points, {
        uiKey: instance.id,
        onUpdate: () => {
            /** * THE FIX:
             * We call the redrawHandler directly. This triggers:
             * 1. your update(params) which converts coords to Point classes.
             * 2. your draw() which paints the star on the main canvas.
             */
            if (instance.redrawHandler) {
                instance.redrawHandler();
            } else {
                // Fallback for scripts that don't have a handler
                if (instance.update) instance.update(instance.params);
                if (instance.draw) instance.draw();
            }
        }
    });
}

/**
 * disarmInteractor()
 * Public API to shut down interaction and clean the overlay.
 */
export function disarmInteractor() {
    if (deactivateCurrent) {
        deactivateCurrent();
        deactivateCurrent = null;
    }
}

function activatePointPicker(points, config = {}) {
    const settings = { ...PointPickerPresets, ...config };
    const canvas = overlayManager.getCanvasLayer("interaction");
    const ctx = canvas.getContext("2d");

    // Sync overlay size
    const mainCanvas = window.drawCanvas;
    if (mainCanvas) {
        canvas.width = mainCanvas.width;
        canvas.height = mainCanvas.height;
        canvas.style.display = "block";
    }

    let draggedIndex = null;
    let hoverIndex = null; // <--- Track which point the mouse is over

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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        points.forEach((pt, i) => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, settings.handleRadius, 0, Math.PI * 2);

            // Logic: Orange if we are hovering OR dragging
            const isActive = (i === draggedIndex || i === hoverIndex);
            ctx.fillStyle = isActive ? settings.activeColor : settings.idleColor;

            ctx.fill();
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

        // 1. Update Hover State
        let currentHover = null;
        for (let i = 0; i < points.length; i++) {
            const pt = points[i];
            const dist = Math.sqrt((mouse.x - pt.x) ** 2 + (mouse.y - pt.y) ** 2);
            if (dist < settings.hitTolerance) {
                currentHover = i;
                break;
            }
        }

        // Only re-render if the hover target changed
        if (currentHover !== hoverIndex) {
            hoverIndex = currentHover;
            render();
        }

        // 2. Handle Dragging
        if (draggedIndex === null) return;

        points[draggedIndex].x = mouse.x;
        points[draggedIndex].y = mouse.y;

        render(); // Update handles
        if (settings.onUpdate) settings.onUpdate(); // Update the Star
    };

    const handleMouseUp = () => {
        if (draggedIndex !== null) {
            draggedIndex = null;
            render();
        }
    };

    // Using window listeners as we found this bypasses the "shield"
    window.addEventListener("mousedown", handleMouseDown, { signal });
    window.addEventListener("mousemove", handleMouseMove, { signal });
    window.addEventListener("mouseup", handleMouseUp, { signal });

    render();

    return () => {
        controller.abort();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = "none";
    };
}
/* ===========================================================
   CANVAS SIDE: Factory Logic
=========================================================== */


window.armInteractor = armInteractor;
