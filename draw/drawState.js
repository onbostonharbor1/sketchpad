// drawState.js

// ===========================================================
// Canvas setup and global context getter
// ===========================================================

export function resetCanvas() {
  const canvas = window.drawCanvas;
  if (!canvas) throw new Error("resetCanvas: window.drawCanvas missing");

  const w = canvas.width;
  const h = canvas.height;

  // Absolute nuke: clears bitmap + resets ALL 2D state (clip, transform, styles)
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("resetCanvas: getContext('2d') returned null");

  window.drawCtx = ctx;

  // Known background
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
} // end resetCanvas


(function setupCanvas() {

  const CANVAS_ID = "sharedCanvas";
  const canvasHostId = "sketchpad";

  let canvas = document.getElementById(CANVAS_ID);

  // Create the canvas only if it doesn't exist (UI may already have one)
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = CANVAS_ID;
    canvas.width = 600;
    canvas.height = 600;

    // If Sketchpad UI exists, attach there; otherwise fall back to <body>
    const host = document.getElementById(canvasHostId);
    if (host) {
      host.appendChild(canvas);
    } else {
      document.body.appendChild(canvas);
    }
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("setupCanvas: getContext('2d') returned null");

  window.drawCanvas = canvas;
  window.drawCtx = ctx;

})(); // end setupCanvas


Object.defineProperty(window, "ctx", {
  get() {
    // if layer system exists, use it
    const layer = window.CanvasManager?.getLayer?.();
    if (layer?.ctx) return layer.ctx;

    // otherwise fall back to current draw context
    if (window.drawCtx) return window.drawCtx;
    if (typeof gl === "object" && gl.ctx) return gl.ctx;

    return null;
  },
  configurable: true
}); // end global ctx getter


export let drawState = {
  currentTitle:    "",
  currentFileName: "",
  debug:           false,
  dot:             false,
  final:           false,
  newLine:         10,
  pts:             [],
  ctr:             0
}; // end drawState
