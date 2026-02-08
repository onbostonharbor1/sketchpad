/* figuresRunner.js
   ============================================================
   Figures Execution Engine & Overlay Manager
   ============================================================

   Overview:
   ---------
   This module handles the execution, rendering, and interaction logic for "Figures".
   A Figure is a composite scene defined by a script (e.g., `figures/TestCategory/test.js`).

   Core Concepts:
   1. **Figure Script**: A module exporting `runFigure()`, which returns a list of
      objects to draw (references to `drawRegistry` entries).
   2. **Overlays**: Instances of `drawRegistry` objects that make up the figure.
      Multiple overlays can exist in one scene.
   3. **Active Overlay**: The overlay currently being edited (parameters shown in Action panel).
      Only one overlay is active at a time; others are drawn dimmed.
   4. **Tab State**: The runtime state is stored in `uiState.figures.tabs[tabId]`.
      It holds the list of overlays, the active index, and metadata.

   Responsibilities:
     - Loading and executing figure scripts.
     - Managing the lifecycle of overlays (creation, ordering, selection).
     - The "Render Loop" (`drawFigures`): Drawing active/inactive overlays to the canvas.
     - The "Interaction Loop" (`performHitTest`): Detecting clicks on overlays.
     - Interfacing with `parameterControls.js` to build UI for the active overlay.

   ============================================================ */

import { uiState } from "./uiState.js";
import { resetCanvas } from "/draw/drawState.js";
import { clearCanvas } from "./drawRunner.js";
import { buildParameterControls } from "./parameterControls.js";

/* ============================================================
   State Accessors
   ============================================================ */

/**
 * Returns the index of the currently active overlay for the visible tab.
 * Returns -1 if no tab is active or no overlay is selected.
 */
export function getActiveOverlayIndex() {
    const tabState = getActiveTabState();
    return tabState ? (tabState.activeOverlayIndex || 0) : -1;
}

/**
 * Returns the array of overlay objects for the visible tab.
 */
export function getActiveOverlays() {
    const tabState = getActiveTabState();
    return tabState ? (tabState.overlays || []) : [];
}

/**
 * Helper to retrieve the state object for the currently selected subtab in Figures.
 * Returns null if the "Categories" view is active.
 */
function getActiveTabState() {
    const activeSubtab = uiState.figures.activeSubtab;
    if (!activeSubtab || activeSubtab === "tab-categories") return null;
    return uiState.figures.tabs[activeSubtab];
}

/* ============================================================
   Overlay Management
   ============================================================ */

/**
 * Sets the active overlay by index.
 * - Updates the state.
 * - Redraws the canvas (to highlight the new active item).
 * - Rebuilds the Action Panel (controls).
 * - Updates the Sidebar buttons.
 * - Arms the "Interactor" (draggable points) for the active item.
 */
export function setActiveOverlayIndex(index) {
    const tabState = getActiveTabState();
    if (!tabState) return;

    tabState.activeOverlayIndex = index;

    drawFigures();
    updateActionPanel();

    // Update the sidebar UI (managed by figuresUI.js)
    if (typeof window.updateFigureOverlayButtons === "function") {
        window.updateFigureOverlayButtons();
    }

    // Arm interactor for the new active overlay
    // This allows the user to drag points defined in `overlay.params.points`
    const overlays = tabState.overlays;
    if (index >= 0 && index < overlays.length) {
        if (window.armInteractor) {
            window.armInteractor(overlays[index]);
        }
    } else {
        if (window.disarmInteractor) window.disarmInteractor();
    }
}

/**
 * Moves an overlay to the "back" of the stack (render order).
 * Technically, it moves the item to the beginning of the array (or near it).
 *
 * Logic:
 * - Removes item at `index`.
 * - Re-inserts it at the bottom of the stack (index 0) or swaps it.
 * - Updates selection to follow the moved item.
 */
export function moveOverlayToBack(index) {
    const tabState = getActiveTabState();
    if (!tabState) return;

    const overlays = tabState.overlays;
    if (index < 0 || index >= overlays.length) return;

    // Remove item
    const item = overlays.splice(index, 1)[0];

    // Move logic (simplified rotate)
    if (overlays.length === 0) {
        overlays.push(item);
        tabState.activeOverlayIndex = 0;
    } else {
        // Insert at the end? Or beginning?
        // The original logic here seems to cycle the item.
        overlays.splice(overlays.length - 1, 0, item);
        tabState.activeOverlayIndex = overlays.length - 2;
    }

    drawFigures();
    if (typeof window.updateFigureOverlayButtons === "function") {
        window.updateFigureOverlayButtons();
    }

    // Re-arm interactor for the (potentially new) active overlay
    const newIndex = tabState.activeOverlayIndex;
    if (newIndex >= 0 && newIndex < overlays.length) {
        if (window.armInteractor) {
            window.armInteractor(overlays[newIndex]);
        }
    }
}

/* ============================================================
   Execution Engine
   ============================================================ */

/**
 * Loads and executes a Figure Script.
 *
 * Steps:
 * 1. Checks if the figure is already loaded in `uiState`.
 * 2. Dynamically imports the script module.
 * 3. Calls `mod.runFigure()` to get the list of objects.
 * 4. Instantiates "overlays" by cloning `drawRegistry` entries.
 * 5. Merges parameters (Registry Defaults -> Script Params -> Saved Config).
 * 6. Initializes the state and first draw.
 *
 * @param {string} path - Path to the .js file.
 * @param {string} figureId - Unique ID for the figure.
 * @param {object} [savedConfig] - Optional saved state (params) to restore.
 */
export async function runFigureScript(path, figureId, savedConfig = null) {
  try {
    // Check if state already exists for this figure
    const tabId = `tab-${figureId}`;
    let tabState = uiState.figures.tabs[tabId];

    // If loading saved config, force reload
    if (!savedConfig && tabState && tabState.overlays && tabState.overlays.length > 0) {
        // Already loaded, just redraw
        drawFigures();
        updateActionPanel();
        if (typeof window.updateFigureOverlayButtons === "function") {
            window.updateFigureOverlayButtons();
        }

        // Arm interactor on restore
        const idx = tabState.activeOverlayIndex;
        if (idx >= 0 && idx < tabState.overlays.length) {
             if (window.armInteractor) window.armInteractor(tabState.overlays[idx]);
        }
        return;
    }

    // 1. Load module
    const mod = await import(/* @vite-ignore */ path + "?t=" + Date.now());

    if (!mod || typeof mod.runFigure !== "function") {
        throw new Error("Module must export runFigure function");
    }

    const objectsData = await mod.runFigure();

    // 2. Build overlays
    const overlays = [];
    for (const objData of objectsData) {
        // Look up the base object in the Registry
        const registryEntry = window.drawRegistry[objData.id];
        if (!registryEntry) {
            console.warn(`DrawRegistry object '${objData.id}' not found.`);
            continue;
        }

        // Create the overlay instance
        const overlay = Object.create(registryEntry);

        // --- PARAMETER MERGING STRATEGY ---
        // Priority: Saved Config > Script Params > Registry Defaults
        // ----------------------------------

        // A. Start with a deep clone of the registry defaults
        const baseParams = structuredClone(registryEntry.params);

        // B. Merge provided params from the script (objData.params)
        if (objData.params) {
            Object.assign(baseParams, objData.params);
        }

        // C. Merge saved params if available (from JSON file)
        if (savedConfig && savedConfig.overlays) {
            const savedOverlay = savedConfig.overlays.find(o => o.id === objData.id);
            if (savedOverlay && savedOverlay.params) {
                Object.assign(baseParams, savedOverlay.params);
            }
        }

        overlay.params = baseParams;
        overlay.defaultParams = structuredClone(registryEntry.params);

        // Ensure points array exists if required
        if (!overlay.params.points && registryEntry.params.points) {
             overlay.params.points = structuredClone(registryEntry.params.points);
        }

        // Attach redrawHandler for interactor compatibility
        // When points are dragged, this function is called.
        overlay.redrawHandler = () => drawFigures();

        // Run object initialization if defined
        if (overlay.init) {
            try {
                overlay.init();
            } catch (initErr) {
                console.error(`Error initializing overlay '${objData.id}':`, initErr);
            }
        }

        overlay.figureId = objData.id;
        overlays.push(overlay);
    }

    // Initialize state for the new tab
    const activeIndex = overlays.length - 1; // Default to last added (topmost)
    uiState.figures.tabs[tabId] = {
        type: "figure",
        figureId: figureId,
        path: path,
        overlays: overlays,
        activeOverlayIndex: activeIndex
    };

    drawFigures();
    updateActionPanel();

    if (typeof window.updateFigureOverlayButtons === "function") {
        window.updateFigureOverlayButtons();
    }

    // Arm interactor for initial active overlay
    if (activeIndex >= 0 && activeIndex < overlays.length) {
        if (window.armInteractor) window.armInteractor(overlays[activeIndex]);
    }

  } catch (e) {
    console.error("Error running figure script:", e);
  }
}

/* ============================================================
   Rendering Loop
   ============================================================ */

/**
 * Draws all overlays to the shared canvas.
 *
 * Rendering Order:
 * 1. Clear Canvas.
 * 2. Draw INACTIVE overlays first (Background).
 *    - Rendered with `globalAlpha = 0.2` (Dimmed).
 * 3. Draw ACTIVE overlay last (Foreground).
 *    - Rendered with `globalAlpha = 1.0` (Opaque).
 */
export function drawFigures() {
    const canvas = window.drawCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const tabState = getActiveTabState();
    if (!tabState) return;

    const overlays = tabState.overlays || [];
    const activeIndex = tabState.activeOverlayIndex;

    const overlaysToDraw = overlays.map((o, i) => ({ o, i }));

    const activeItem = (activeIndex >= 0 && activeIndex < overlays.length)
        ? overlaysToDraw[activeIndex]
        : null;

    const others = overlaysToDraw.filter((item, i) => i !== activeIndex);

    // Draw others (dimmed)
    others.forEach(({ o, i }) => {
        ctx.save();
        ctx.globalAlpha = 0.2; // Dimmed
        try {
            o.update(o.params);
            o.draw();
        } catch (e) {
            console.error(`Error drawing overlay ${i}:`, e);
        }
        ctx.restore();
    });

    // Draw active (normal)
    if (activeItem) {
        const { o, i } = activeItem;
        ctx.save();
        ctx.globalAlpha = 1.0;
        try {
            o.update(o.params);
            o.draw();
        } catch (e) {
             console.error(`Error drawing active overlay ${i}:`, e);
        }
        ctx.restore();
    }
}

/* ============================================================
   UI Integration
   ============================================================ */

/**
 * Builds the Parameter Controls (Action Panel) for the active overlay.
 * Uses `ui/parameterControls.js`.
 */
export function updateActionPanel() {
    const actionDiv = document.getElementById("action");
    if (!actionDiv) return;

    // If no active overlay, show placeholder
    const tabState = getActiveTabState();
    if (!tabState) {
         actionDiv.innerHTML = "<p class='p-2'>Select an overlay. </p>";
         return;
    }

    const overlays = tabState.overlays;
    const activeIndex = tabState.activeOverlayIndex;

    if (activeIndex === -1 || !overlays[activeIndex]) {
        actionDiv.innerHTML = "<p class='p-2'>Select an overlay.</p>";
        return;
    }

    const overlay = overlays[activeIndex];

    // Create a filtered schema that excludes 'points' so they don't appear as text fields
    // We clone the controls (or params if controls missing) to modify it
    const sourceSchema = overlay.controls || overlay.params || {};
    const filteredSchema = { ...sourceSchema };
    if (filteredSchema.points) delete filteredSchema.points;

    // Create a registry proxy that exposes this filtered schema
    const registryProxy = Object.create(overlay);
    registryProxy.controls = filteredSchema;

    // Wrapper for parameterControls
    // This wrapper mimics the structure expected by buildParameterControls
    const wrapper = {
        drawRegistry: registryProxy,
        parameters: overlay.params, // Live params reference
        params: overlay.params,

        // Handler called when a parameter changes (e.g. slider move)
        redrawHandler: () => {
             drawFigures();
        },

        // Handler called after value commit (optional hook)
        onParamChange: () => {
             if (typeof window.updateFigureOverlayButtons === "function") {
                window.updateFigureOverlayButtons();
             }
        }
    };

    // Build the controls.
    // "figParams" is used as the ID prefix for DOM elements.
    buildParameterControls(wrapper, "figParams", true);
}


/* ============================================================
   Interaction (Hit Testing)
   ============================================================ */

export function initFiguresInteraction() {
    const canvas = window.drawCanvas;
    // Also listen on interaction layer which might block the canvas
    const interactionLayer = document.getElementById("interaction-layer");

    if (canvas) {
        canvas.removeEventListener("click", handleCanvasClick);
        canvas.addEventListener("click", handleCanvasClick);
    }
    if (interactionLayer) {
        interactionLayer.removeEventListener("click", handleCanvasClick);
        interactionLayer.addEventListener("click", handleCanvasClick);
    }
}

function handleCanvasClick(event) {
    const tabState = getActiveTabState();
    if (!tabState) return;
    if (tabState.overlays.length === 0) return;

    // Check if Figures tab is active
    if (uiState.figures.activeSubtab === "tab-categories") return;
    if (document.getElementById("sketchpad").style.display === "none") return;

    // Calculate click coordinates relative to canvas
    const rect = window.drawCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Perform hit test
    const hitIndex = performHitTest(x, y, tabState);

    // If an overlay was hit and it's not the current one, switch to it
    if (hitIndex !== -1 && hitIndex !== tabState.activeOverlayIndex) {
        setActiveOverlayIndex(hitIndex);
    }
}

/**
 * Pixel-based Hit Testing.
 *
 * Method:
 * 1. Creates an off-screen canvas (or reuses a hidden one).
 * 2. Draws each overlay in a unique color (Index -> Color).
 *    - e.g., Index 0 -> Red 1, Index 1 -> Red 2.
 * 3. Samples the pixel at the mouse location.
 * 4. Decodes the color back to the overlay index.
 *
 * This allows precise hit testing for complex shapes without
 * complex math, leveraging the existing `draw()` methods.
 */
function performHitTest(x, y, tabState) {
    // 1. Setup Hit Canvas
    let hitCanvas = document.getElementById("figure-hit-canvas");
    if (!hitCanvas) {
        hitCanvas = document.createElement("canvas");
        hitCanvas.id = "figure-hit-canvas";
        hitCanvas.width = window.drawCanvas.width;
        hitCanvas.height = window.drawCanvas.height;
    } else {
        if (hitCanvas.width !== window.drawCanvas.width) {
            hitCanvas.width = window.drawCanvas.width;
            hitCanvas.height = window.drawCanvas.height;
        }
    }

    const hCtx = hitCanvas.getContext("2d", { willReadFrequently: true });
    hCtx.clearRect(0, 0, hitCanvas.width, hitCanvas.height);

    // 2. Override Context
    // We temporarily replace `window.drawCtx` so that overlay.draw() writes to our hit canvas.
    const originalDrawCtx = window.drawCtx;
    window.drawCtx = hCtx;

    // Helper to draw an overlay with a unique ID color
    const drawForHit = (overlay, index) => {
        // Encode ID in Red channel (1-based to distinguish from empty 0)
        const idColor = `rgb(${index + 1}, 0, 0)`;

        // Monkey-patch stroke/fill to use ID color
        const originalStroke = hCtx.stroke;
        const originalFill = hCtx.fill;

        hCtx.stroke = function() {
            this.save();
            this.strokeStyle = idColor;
            this.lineWidth = 10; // Thicker line for easier hitting
            CanvasRenderingContext2D.prototype.stroke.call(this);
            this.restore();
        };
        hCtx.fill = function() {
             this.save();
             this.fillStyle = idColor;
             CanvasRenderingContext2D.prototype.fill.call(this);
             this.restore();
        };

        try {
            overlay.update(overlay.params);
            overlay.draw();
        } catch (e) {
            // Silently ignore drawing errors during hit test
        }

        // Restore methods
        hCtx.stroke = originalStroke;
        hCtx.fill = originalFill;
    };

    const overlays = tabState.overlays;
    const activeIndex = tabState.activeOverlayIndex;

    const overlaysToDraw = overlays.map((o, i) => ({ o, i }));
    const activeItem = (activeIndex >= 0 && activeIndex < overlays.length)
        ? overlaysToDraw[activeIndex]
        : null;
    const others = overlaysToDraw.filter((item, i) => i !== activeIndex);

    // 3. Draw All Overlays
    // We draw "others" first, then "active" on top, matching visual order.
    others.forEach(({ o, i }) => drawForHit(o, i));
    if (activeItem) drawForHit(activeItem.o, activeItem.i);

    // Restore original context
    window.drawCtx = originalDrawCtx;

    // 4. Sample Pixel
    const p = hCtx.getImageData(x, y, 1, 1).data;
    if (p[3] > 0) {  // If alpha > 0 (something was drawn)
        return p[0] - 1;  // Decode Red channel to index
    }

    return -1;  // No hit
}
