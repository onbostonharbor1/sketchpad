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
  console.count("setupCanvas"); // TEMP

  const CANVAS_ID = "sharedCanvas";
  const canvasHostId = "sketchpad";

  let canvas = document.getElementById(CANVAS_ID);

  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = CANVAS_ID;
    canvas.width = 1000;
    canvas.height = 1000;
  }

  const host = document.getElementById(canvasHostId);
  if (!host) {
    throw new Error("setupCanvas: #" + canvasHostId + " not found");
  }

  host.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("setupCanvas: getContext('2d') returned null");

  window.drawCanvas = canvas;
  window.drawCtx = ctx;

  resetCanvas();
})(); // end setupCanvas


Object.defineProperty(window, "ctx", {
  get() {
    if (!window.drawCtx) {
      throw new Error("ctx getter: window.drawCtx is not initialized");
    }
    return window.drawCtx;
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
};
