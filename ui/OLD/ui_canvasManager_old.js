(function () {
  const CANVAS_ID = "sharedCanvas";
  let canvas = null;
  let ctx = null;

  /**
   * Create a new canvas element (used only if it doesn't exist in the DOM).
   */
  function makeCanvas() {
    const c = document.createElement("canvas");
    c.id = CANVAS_ID;
    c.width = 600;
    c.height = 600;
    c.style.display = "block";
    c.className = "border rounded";
    return c;
  }

  /**
   * Initialize references to the shared canvas.
   * This looks for #sharedCanvas in the DOM (which should already be in canvasContainer).
   */
  function init() {
    canvas = document.getElementById(CANVAS_ID) || makeCanvas();
    ctx = canvas.getContext("2d");

    // Expose to global if other code expects window.ctx, window.canvas, etc.
    window.drawCanvas = canvas;
    window.drawCtx = ctx;
    window.ctx = ctx;
  }

  init();

  /**
   * Ensure the shared canvas is inside the specified container.
   * NOTE: pane must be a real DOM element (like the #canvasContainer).
   * We no longer absolutely position or move the canvas around the layout.
   */
  function ensureInContainer(pane) {
    if (!pane) return canvas;

    // If canvas doesn't exist, build it
    if (!canvas) {
      canvas = document.getElementById(CANVAS_ID) || makeCanvas();
    }

    // If not already in the correct container, append it
    if (canvas.parentElement !== pane) {
      pane.appendChild(canvas);
    }

    // Refresh context reference (in case of re-attachment or refresh)
    ctx = canvas.getContext("2d");
    window.drawCanvas = canvas;
    window.drawCtx = ctx;
    window.ctx = ctx;

    return canvas;
  }

  window.CanvasManager = {
    /**
     * Ensure the canvas is placed in the given container.
     * If 'pane' is a string, treat it as an element ID.
     */
    ensureCanvas(pane) {
      if (typeof pane === "string") {
        pane = document.getElementById(pane);
      }
      return ensureInContainer(pane);
    },

    /**
     * Get the shared canvas element.
     */
    getCanvas() {
      return canvas;
    },

    /**
     * Get the 2D context.
     */
    getContext() {
      return ctx;
    },

    /**
     * Clear the entire canvas.
     */
    clear() {
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };
})();
