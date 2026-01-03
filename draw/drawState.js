// ===========================================================
// Canvas setup and global context getter
// ===========================================================
// ===========================================================
// Canvas setup and docking into #sketchpad
// ===========================================================
(function setupCanvas() {
  const CANVAS_ID = "sharedCanvas";
  const canvasHostId = "sketchpad";

  let canvas = document.getElementById(CANVAS_ID);

  // Create canvas if needed
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = CANVAS_ID;
    canvas.width = 1000;
    canvas.height = 1000;
  }

  // ALWAYS dock canvas into the sketchpad host (moves it if elsewhere)
  const host = document.getElementById(canvasHostId);
  if (!host) {
    throw new Error("setupCanvas: #" + canvasHostId + " not found");
  }
  host.appendChild(canvas);

  // Context
  const ctx = canvas.getContext("2d");
  window.drawCanvas = canvas;
  window.drawCtx = ctx;
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
}
