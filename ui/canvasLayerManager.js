/* canvasLayerManager.js
   ============================================================
   Canvas Layer Manager
   ============================================================
   Role:
     Owns all canvas overlay layers (interaction, bbox, nodes,
     guides) that are composited on top of the main drawing
     canvas.

     These are <canvas> elements positioned absolutely over
     #sketchpad-wrapper. They are structurally unrelated to the
     panel overlays (help, forms, debug) managed by overlay.js.

   This module was split from overlay.js to separate two
   distinct concepts that were sharing one manager object:
     • Panel overlays  → overlay.js / overlayManager
     • Canvas layers   → this module / canvasLayerManager

   Canvas layers must NOT be managed by drawUtilities.js —
   they are UI infrastructure, not draw functions.

   Exports:
     canvasLayerManager          — the singleton manager object
     initCanvasLayers()          — call once in onDomContentLoaded
     syncLayerToCanvas(name, referenceCanvas)
                                 — size a layer to match a canvas
   ============================================================ */


/* ============================================================
   canvasLayerManager
   ============================================================
   Singleton that holds references to all registered canvas
   overlay layers and provides a simple get/clear API.
   ============================================================ */
export const canvasLayerManager = {

  /* Internal registry: name → <canvas> element */
  _layers: {},


  /* ----------------------------------------------------------
     register(name, element)
     ----------------------------------------------------------
     Stores a canvas layer element under the given name.
     Called once per layer during initCanvasLayers().

     Arguments:
       name    — e.g. "interaction", "bbox", "nodes", "guides"
       element — the <canvas> DOM element
  ---------------------------------------------------------- */
  register(name, element) {
    if (!name || !element) {
      throw new Error("canvasLayerManager.register: name and element required");
    }
    this._layers[name] = element;
  }, // end register


  /* ----------------------------------------------------------
     get(name)
     ----------------------------------------------------------
     Returns the canvas element for the given layer name.
     Throws if the layer has not been registered.

     Arguments:
       name — registered layer name
  ---------------------------------------------------------- */
  get(name) {
    const el = this._layers[name];
    if (!el) {
      throw new Error("canvasLayerManager.get: unknown layer \"" + name + "\"");
    }
    return el;
  }, // end get


  /* ----------------------------------------------------------
     clearAll()
     ----------------------------------------------------------
     Clears all registered canvas layers:
       • Empties any HTML child elements
       • Wipes canvas pixels via clearRect
     Called by clearDivs() in uiUtilities.js on every tab
     switch.
  ---------------------------------------------------------- */
  clearAll() {
    for (const name in this._layers) {
      const layer = this._layers[name];

      /* Clear HTML children (used for node overlays etc.) */
      layer.innerHTML = "";

      /* Clear canvas pixels */
      const ctx = layer.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, layer.width, layer.height);
      }
    }
  } // end clearAll

}; // end canvasLayerManager


/* ============================================================
   initCanvasLayers()
   ============================================================
   Registers the four canvas overlay layers from the DOM.
   Call once during onDomContentLoaded(), alongside initOverlay().

   Layers registered:
     "interaction"  — draggable point handles (interactor.js)
     "bbox"         — bounding box overlays
     "nodes"        — node graph overlays
     "guides"       — guide line overlays
   ============================================================ */
export function initCanvasLayers() {

  const inter  = document.getElementById("interaction-layer");
  const bbox   = document.getElementById("bbox-layer");
  const nodes  = document.getElementById("nodes-layer");
  const guides = document.getElementById("guides-layer");

  if (!inter || !bbox || !nodes || !guides) {
    throw new Error(
      "initCanvasLayers: missing one or more canvas overlay layer elements " +
      "(interaction-layer, bbox-layer, nodes-layer, guides-layer)"
    );
  }

  canvasLayerManager.register("interaction", inter);
  canvasLayerManager.register("bbox",        bbox);
  canvasLayerManager.register("nodes",       nodes);
  canvasLayerManager.register("guides",      guides);

} // end initCanvasLayers


/* ============================================================
   syncLayerToCanvas(name, referenceCanvas)
   ============================================================
   Sizes and positions the named canvas layer to exactly match
   the dimensions of referenceCanvas.

   Used when the main drawing canvas is resized, to keep all
   overlay layers aligned with it.

   Arguments:
     name            — registered layer name
     referenceCanvas — the <canvas> to match dimensions against
   ============================================================ */

   /* canvasLayerManager.js */

   export function syncLayerToCanvas(name, referenceCanvas) {

    const layer = canvasLayerManager.get(name);

    layer.innerHTML    = "";
    layer.style.position  = "absolute";
    layer.style.left      = "0px";
    layer.style.top       = "0px";
    layer.style.width     = referenceCanvas.width + "px";
    layer.style.height    = referenceCanvas.height + "px";
    layer.style.pointerEvents = "none";
    layer.style.display   = "block";

  } // end syncLayerToCanvas
