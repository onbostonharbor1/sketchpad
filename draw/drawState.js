// drawState.js
// ===========================================================
// Canvas setup and global context getter
// ===========================================================

export let drawState = {
  title: "",
  // Initial defaults; these will be updated by Tools or setup
  canvasWidth: 800,
  canvasHeight: 800,
  debug: false,
  final: false,
  pts: [],
  ctr: 0
};

/**
 * resetCanvas()
 * Clears the bitmap and resets the context state.
 * Uses drawState as the source of truth for dimensions.
 */
export function resetCanvas() {
  const canvas = window.drawCanvas;
  if (!canvas) throw new Error("resetCanvas: window.drawCanvas missing");

  // CRITICAL: Pull dimensions from drawState, NOT hardcoded values
  const w = drawState.canvasWidth;
  const h = drawState.canvasHeight;

  // Resizing the canvas object clears the bitmap and resets state
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("resetCanvas: getContext('2d') returned null");

  window.drawCtx = ctx;

  // Known background
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
}

/**
 * setupCanvas() - IIFE
 * Initializes or retrieves the shared canvas.
 */
(function setupCanvas() {
  const CANVAS_ID = "sharedCanvas";
  const canvasHostId = "sketchpad";

  let canvas = document.getElementById(CANVAS_ID);

  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = CANVAS_ID;

    // Set initial physical size from drawState defaults
    canvas.width = drawState.canvasWidth;
    canvas.height = drawState.canvasHeight;

    const host = document.getElementById(canvasHostId);
    if (host) {
      host.appendChild(canvas);
    } else {
      document.body.appendChild(canvas);
    }
  } else {
    // If canvas already exists, sync drawState to its current reality
    drawState.canvasWidth = canvas.width;
    drawState.canvasHeight = canvas.height;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("setupCanvas: getContext('2d') returned null");

  window.drawCanvas = canvas;
  window.drawCtx = ctx;
})();

// Global ctx getter logic remains the same
Object.defineProperty(window, "ctx", {
  get() {
    const layer = window.CanvasManager?.getLayer?.();
    if (layer?.ctx) return layer.ctx;
    if (window.drawCtx) return window.drawCtx;
    if (typeof gl === "object" && gl.ctx) return gl.ctx;
    return null;
  },
  configurable: true
});
