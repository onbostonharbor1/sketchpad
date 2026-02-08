/* figuresRunner.js
   ------------------------------------------------------------
   Figures Execution Engine
   ------------------------------------------------------------
   Responsibilities:
     - Run "figure" scripts which return a list of drawRegistry objects.
     - Manage the "overlays" (active objects).
     - Handle drawing loop for overlays (active on top, others dimmed).
     - Handle interaction (hit testing).
   ------------------------------------------------------------ */

import { uiState } from "./uiState.js";
import { resetCanvas } from "/draw/drawState.js";
import { clearCanvas } from "./drawRunner.js";
import { buildParameterControls } from "./parameterControls.js";

export function getActiveOverlayIndex() {
    const tabState = getActiveTabState();
    return tabState ? (tabState.activeOverlayIndex || 0) : -1;
}

export function getActiveOverlays() {
    const tabState = getActiveTabState();
    return tabState ? (tabState.overlays || []) : [];
}

function getActiveTabState() {
    const activeSubtab = uiState.figures.activeSubtab;
    if (!activeSubtab || activeSubtab === "tab-categories") return null;
    return uiState.figures.tabs[activeSubtab];
}

export function setActiveOverlayIndex(index) {
    const tabState = getActiveTabState();
    if (!tabState) return;

    tabState.activeOverlayIndex = index;

    drawFigures();
    updateActionPanel();
    if (typeof window.updateFigureOverlayButtons === "function") {
        window.updateFigureOverlayButtons();
    }

    // Arm interactor for the new active overlay
    const overlays = tabState.overlays;
    if (index >= 0 && index < overlays.length) {
        if (window.armInteractor) {
            window.armInteractor(overlays[index]);
        }
    } else {
        if (window.disarmInteractor) window.disarmInteractor();
    }
}

export function moveOverlayToBack(index) {
    const tabState = getActiveTabState();
    if (!tabState) return;

    const overlays = tabState.overlays;
    if (index < 0 || index >= overlays.length) return;

    const item = overlays.splice(index, 1)[0];

    if (overlays.length === 0) {
        overlays.push(item);
        tabState.activeOverlayIndex = 0;
    } else {
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
        const registryEntry = window.drawRegistry[objData.id];
        if (!registryEntry) {
            console.warn(`DrawRegistry object '${objData.id}' not found.`);
            continue;
        }

        const overlay = Object.create(registryEntry);

        // --- FIXED PARAMETER MERGING ---
        // Start with a deep clone of the registry defaults
        const baseParams = structuredClone(registryEntry.params);

        // Merge provided params if any
        if (objData.params) {
            Object.assign(baseParams, objData.params);
        }

        // Merge saved params if available
        if (savedConfig && savedConfig.overlays) {
            // Find corresponding saved overlay by ID
            const savedOverlay = savedConfig.overlays.find(o => o.id === objData.id);
            if (savedOverlay && savedOverlay.params) {
                Object.assign(baseParams, savedOverlay.params);
            }
        }

        overlay.params = baseParams;
        // -------------------------------

        overlay.defaultParams = structuredClone(registryEntry.params);

        if (!overlay.params.points && registryEntry.params.points) {
             overlay.params.points = structuredClone(registryEntry.params.points);
        }

        // Attach redrawHandler for interactor compatibility
        overlay.redrawHandler = () => drawFigures();

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

    // Initialize state
    const activeIndex = overlays.length - 1;
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

export function updateActionPanel() {
    const actionDiv = document.getElementById("action");
    if (!actionDiv) return;

    actionDiv.innerHTML = "";

    const tabState = getActiveTabState();
    if (!tabState) {
         actionDiv.innerHTML = "<p class='p-2'>Select a figure.</p>";
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
    const wrapper = {
        drawRegistry: registryProxy,
        parameters: overlay.params,
        params: overlay.params,
        // FIX: Added redrawHandler to fix TypeError
        redrawHandler: () => {
             drawFigures();
        },
        onParamChange: () => {
             if (typeof window.updateFigureOverlayButtons === "function") {
                window.updateFigureOverlayButtons();
             }
        }
    };

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

    const rect = window.drawCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const hitIndex = performHitTest(x, y, tabState);

    if (hitIndex !== -1 && hitIndex !== tabState.activeOverlayIndex) {
        setActiveOverlayIndex(hitIndex);
    }
}

function performHitTest(x, y, tabState) {
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

    // Override both window.ctx and window.drawCtx to catch all drawing methods
    const originalDrawCtx = window.drawCtx;
    const originalCtx = window.ctx;

    window.drawCtx = hCtx;
    window.ctx = hCtx;

    const drawForHit = (overlay, index) => {
        const idColor = `rgb(${index + 1}, 0, 0)`;

        const originalStroke = hCtx.stroke;
        const originalFill = hCtx.fill;

        hCtx.stroke = function() {
            this.save();
            this.strokeStyle = idColor;
            this.lineWidth = 10;
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
            // ignore
        }

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

    others.forEach(({ o, i }) => drawForHit(o, i));
    if (activeItem) drawForHit(activeItem.o, activeItem.i);

    // Restore original contexts
    window.drawCtx = originalDrawCtx;
    window.ctx = originalCtx;

    const p = hCtx.getImageData(x, y, 1, 1).data;
    if (p[3] > 0) {
        return p[0] - 1;
    }

    return -1;
}
