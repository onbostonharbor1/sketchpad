/* ===========================================================
   interactor.js – Unified Interaction Manager
   =========================================================== */
import { canvasLayerManager } from "./canvasLayerManager.js";
import { uiState } from "/ui/uiState.js";
import { applyTransform, inverseTransform } from "/draw/drawTransform.js";

export const PointPickerPresets = {
    handleRadius: 5,        // Normal size
    hitTolerance: 10,       // Grab tolerance
    idleColor: "#C91A09",   // LEGO Bright Red
    activeColor: "#FE8A18"  // LEGO Bright Orange
};

let deactivateCurrent = null;
let renderCurrent     = null;   // redraws the armed object's handles, or null

/* ===========================================================
   DRAW SIDE: Coordination Logic
   =========================================================== */

export function armInteractor(instance) {
    // 1. Ensure any existing interactor is fully shut down
    disarmInteractor();

    const pts = instance?.params?.points;
    if (!pts) {
        // Not all objects have points, this is fine.
        return;
    }

    // Make sure the Prev / Next overlay does not take mouse events away from dragging.
    // (css/overlay.css already sets this; the line keeps it true if that CSS changes.)
    const nav = document.getElementById("overlay-nextprev");
    if (nav) nav.style.pointerEvents = "none";

    // 2. Activate the picker and store the cleanup function
    deactivateCurrent = activatePointPicker(instance.params.points, {
        uiKey: instance.id,
        // Figures: the layer's transform. Handles are stored in object space
        // and shown, hit and dragged in canvas space. Absent (the Draw tab)
        // means the identity.
        getTransform: instance.getTransform,
        // Figures: true when a press at (x, y) belongs to the centroid, which
        // wins over a handle sitting under it.
        yieldTo: instance.yieldTo,
        // Figures, Phase 8: snapshot the layer's welded discs just before a
        // handle moves, and let them follow just after. Undefined (the
        // Draw tab, or a layer with no welds) means moveHandle below does
        // nothing extra.
        beforeMove: instance.beforeMove,
        afterMove:  instance.afterMove,
        onUpdate: () => {
            // Safety: Only proceed if this instance is still the active one
            if (!deactivateCurrent) return;

            // Sync script-internal state
            if (instance.update) {
                instance.update(instance.params);
            }

            // Trigger engine redraw via uiState bridge OR instance callback
            // Priority:
            // 1. instance.redrawHandler (e.g. Figures tab)
            // 2. uiState.draw (Legacy Draw tab)
            // 3. instance.draw() (Fallback)

            if (typeof instance.redrawHandler === "function") {
                instance.redrawHandler();
            } else {
                const activeTabId = uiState.draw.activeSubtab;
                const activeTab = uiState.draw.tabs[activeTabId];

                if (activeTab && activeTab.redrawHandler) {
                    activeTab.redrawHandler();
                } else if (instance.draw) {
                    instance.draw();
                }
            }
        }
    });
}

// Redraws the handles of the armed object. For code that changes where they
// are without going through the interactor (the Figures centroid moving or
// turning a whole layer).
export function refreshInteractor() {
    if (renderCurrent) renderCurrent();
}

export function disarmInteractor() {
    // 1. Shut down the listeners and clear the cleanup reference
    if (deactivateCurrent) {
        deactivateCurrent();
        deactivateCurrent = null;
    }

    // 2. Hard-reset the interaction canvas layer
    const canvas = canvasLayerManager.get("interaction");
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
    const canvas = canvasLayerManager.get("interaction");
    const ctx = canvas.getContext("2d");

    // Sync dimensions with the main drawing canvas
    const mainCanvas = window.drawCanvas;
    if (mainCanvas) {
        canvas.width = mainCanvas.width;
        canvas.height = mainCanvas.height;
        canvas.style.display = "block";
        canvas.style.pointerEvents = "auto";
    }

    let draggedIndex  = null;
    let hoverIndex    = null;
    let selectedIndex = null;   // the handle the arrow keys nudge

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

    // Handles live in object space. These two turn them into canvas space (to
    // show and hit them) and back (to store a move). With no transform both
    // return the point unchanged.
    function toCanvas(pt) {
        const t = settings.getTransform ? settings.getTransform() : null;
        return applyTransform(t, pt);
    }
    function toObject(x, y) {
        const t = settings.getTransform ? settings.getTransform() : null;
        return inverseTransform(t, x, y);
    }

    // The one place a handle is moved, by drag or by arrow key. (x, y) is a
    // canvas position. Anything that must follow a handle (welds, Phase 8)
    // hooks in here: beforeMove sees the layer's discs before the move,
    // afterMove after onUpdate has synced and redrawn it.
    function moveHandle(i, x, y) {
        if (settings.beforeMove) settings.beforeMove();
        const o = toObject(x, y);
        points[i].x = o.x;
        points[i].y = o.y;
        if (settings.onUpdate) settings.onUpdate();
        if (settings.afterMove) settings.afterMove();
    }

    function render() {
        // CRITICAL SAFETY: If the interactor is disarmed, the signal is aborted.
        // Returning here prevents the "ghost draw" when UI controls are touched.
        if (signal.aborted) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        points.forEach((objPt, i) => {
            const pt = toCanvas(objPt);
            const isActive = (i === draggedIndex || i === hoverIndex || i === selectedIndex);

            ctx.beginPath();
            ctx.arc(pt.x, pt.y, settings.handleRadius, 0, Math.PI * 2);

            // Red dot normally, Orange when active
            ctx.fillStyle = isActive ? settings.activeColor : settings.idleColor;
            ctx.fill();

            // High-contrast stroke for visibility against dark backgrounds
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // The selected handle (the one the arrow keys move) gets an outer ring.
            if (i === selectedIndex) {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, settings.handleRadius + 4, 0, Math.PI * 2);
                ctx.strokeStyle = "black";
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        });
    }

    const handleMouseDown = (e) => {
        // Left button only. A right-click (Figures: weld) must not grab a
        // handle, or the smallest hand jitter drags it to the cursor.
        if (e.button !== 0) return;

        const mouse = getCanvasCoords(e);

        // The centroid (Figures) outranks a handle under it. Let it have the press.
        if (settings.yieldTo && settings.yieldTo(mouse.x, mouse.y)) {
            draggedIndex  = null;
            if (selectedIndex !== null) {
                selectedIndex = null;
                render();
            }
            return;
        }

        for (let i = 0; i < points.length; i++) {
            const pt = toCanvas(points[i]);
            const dist = Math.sqrt((mouse.x - pt.x) ** 2 + (mouse.y - pt.y) ** 2);
            if (dist < settings.hitTolerance) {
                draggedIndex  = i;
                selectedIndex = i;
                render();
                return;
            }
        }
        // A press anywhere else clears the selection.
        if (selectedIndex !== null) {
            selectedIndex = null;
            render();
        }
    };

    const handleMouseMove = (e) => {
        const mouse = getCanvasCoords(e);
        let currentHover = null;

        for (let i = 0; i < points.length; i++) {
            const pt = toCanvas(points[i]);
            const dist = Math.sqrt((mouse.x - pt.x) ** 2 + (mouse.y - pt.y) ** 2);
            if (dist < settings.hitTolerance) {
                currentHover = i;
                break;
            }
        }

        if (currentHover !== hoverIndex || draggedIndex !== null) {
            hoverIndex = currentHover;
            if (draggedIndex !== null) {
                moveHandle(draggedIndex, mouse.x, mouse.y);
            }
            render();
        }
    };

    const handleMouseUp = () => {
        draggedIndex = null;
        render();
    };

    // Arrow keys nudge the selected handle 1 px, or 10 px with Shift. Ignored
    // while the keyboard is in a slider, list or text box.
    const handleKeyDown = (e) => {
        if (selectedIndex === null) return;

        const tag = (e.target && e.target.tagName) || "";
        if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        switch (e.key) {
            case "ArrowLeft":  dx = -step; break;
            case "ArrowRight": dx =  step; break;
            case "ArrowUp":    dy = -step; break;
            case "ArrowDown":  dy =  step; break;
            default: return;
        }

        e.preventDefault();
        const pt = toCanvas(points[selectedIndex]);
        moveHandle(selectedIndex, pt.x + dx, pt.y + dy);
        render();
    };

    // Attach listeners to window to ensure we don't lose the drag if mouse leaves canvas
    window.addEventListener("keydown",   handleKeyDown,   { signal });
    window.addEventListener("mousedown", handleMouseDown, { signal });
    window.addEventListener("mousemove", handleMouseMove, { signal });
    window.addEventListener("mouseup",   handleMouseUp,   { signal });

    // Initial render call to show dots immediately
    render();
    renderCurrent = render;

    // The cleanup function returned to 'deactivateCurrent'
    return () => {
        renderCurrent = null;
        controller.abort();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = "none";
    };
}

// Gallery scripts call armInteractor / disarmInteractor as bare names, so these two
// stay on window. Code in ui/ imports them from this file instead.
window.armInteractor = armInteractor;
window.disarmInteractor = disarmInteractor;
