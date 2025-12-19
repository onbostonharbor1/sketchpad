/* ui/ui_canvasManager.js
   ------------------------------------------------------------
   Shared canvas management + state snapshots per tab.
   Each visual tab (draw, patterns, figures, gallery) gets its
   own saved image snapshot that restores automatically when
   switching back.
   ------------------------------------------------------------ */

(function () {
  let canvas = null;
  let ctx = null;
  let layer = null;
  const CANVAS_ID = "sharedCanvas";

  // per-tab memory (stored as ImageData)
  const snapshots = {};

  // ------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------
  window.CanvasManager = {
    ensureCanvas(mainAreaId = "drawMain") {
      const host = document.getElementById(mainAreaId);
      if (!host) {
        console.warn("CanvasManager: missing host area", mainAreaId);
        return null;
      }

      // Create or move the shared canvas
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = CANVAS_ID;
        canvas.width = 600;
        canvas.height = 600;
        canvas.style.border = "1px solid #ccc";
//        canvas.style.display = "block";
        canvas.style.margin = "0 auto";
        host.appendChild(canvas);
        ctx = canvas.getContext("2d");
        layer = makeCanvasLayer(canvas);
        uiState.canvasLayer = layer;
      } else if (!host.contains(canvas)) {
        host.appendChild(canvas);
      }

      this.restore(uiState.currentTab); // restore last state for that tab
      return layer;
    },

    getCanvas() { return canvas; },
    getContext() { return ctx; },
    getLayer() { return layer; },

    clear(bg = "#ffffff") {
      if (!ctx || !canvas) return;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },

    save(tabId) {
      if (!ctx || !canvas) return;
      try {
        snapshots[tabId] = ctx.getImageData(0, 0, canvas.width, canvas.height);
        console.log(`CanvasManager: saved state for ${tabId}`);
      } catch (err) {
        console.warn("CanvasManager.save error:", err);
      }
    },

    restore(tabId) {
      if (!ctx || !canvas || !tabId) return;
      const snap = snapshots[tabId];
      if (snap) {
        ctx.putImageData(snap, 0, 0);
        console.log(`CanvasManager: restored state for ${tabId}`);
      } else {
        this.clear();
      }
    },

    resize(width, height) {
      if (!canvas) return;
      canvas.width = width;
      canvas.height = height;
      this.clear();
    }
  };
})();
