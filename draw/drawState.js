// ===========================================================
// Canvas setup and global context getter
// ===========================================================
(function setupCanvas() {
  const CANVAS_ID = "sharedCanvas";
  let canvas = document.getElementById(CANVAS_ID);

  // Create the canvas only if it doesn't exist (UI may already have one)
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = CANVAS_ID;
    canvas.width = 600;
    canvas.height = 600;
    document.body.appendChild(canvas);
  }

  const ctx = canvas.getContext("2d");
  window.drawCanvas = canvas;
  window.drawCtx = ctx;
})(); // end setupCanvas

Object.defineProperty(window, "ctx", {
  get() {
    const layer = window.CanvasManager?.getLayer?.();
    if (layer?.ctx) return layer.ctx;
    if (window.drawCtx) return window.drawCtx;
    return null;
  },
  configurable: true
}); // end global ctx getter


let drawState = {
    currentTitle:    "", 
    currentFileName: "",
    dot:             false,
    final:           false,
    newLine:         10,
    pts:             [],
    ctr:             0
}
