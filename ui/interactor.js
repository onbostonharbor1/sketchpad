/* ===========================================================
   interactor.js – Canvas Side Manager
   -----------------------------------------------------------
   Handles mouse events, coordinate mapping, and point dragging.
   Supports a "Registry" model to allow for future overlays.
=========================================================== */

import { drawState } from "/draw/drawState.js";

let activeLayers = new Map(); // Key: ID, Value: { points, onUpdate }
let draggedPoint = null;      // { layerId, index }
const HIT_RADIUS = 15;        // Pick sensitivity in canvas pixels

/* ===========================================================
   registerLayer(id, points, onUpdate)
   -----------------------------------------------------------
   Called by the "Draw Side" (runPattern) to enable dragging.
=========================================================== */
export function registerLayer(id, points, onUpdate) {
  activeLayers.set(id, { points, onUpdate });
  setupListeners();
} // end registerLayer

/* ===========================================================
   clearInteractors()
   -----------------------------------------------------------
   Resets the engine when switching scripts or tabs.
=========================================================== */
export function clearInteractors() {
  activeLayers.clear();
  draggedPoint = null;
  // We keep listeners attached but they will do nothing if Map is empty
} // end clearInteractors

/* ------------------------------------------------------------
   getCanvasCoords(event)
   Maps screen mouse position to high-res canvas internal pixels.
------------------------------------------------------------ */
function getCanvasCoords(event) {
  const canvas = window.drawCanvas;
  if (!canvas) return { x: 0, y: 0 };

  const rect = canvas.getBoundingClientRect();

  // Calculate scale factor between physical display and internal resolution
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
} // end getCanvasCoords

/* ------------------------------------------------------------
   handleMouseDown(e)
------------------------------------------------------------ */
function handleMouseDown(e) {
  const mouse = getCanvasCoords(e);

  // Iterate through layers to find a hit
  for (let [id, layer] of activeLayers) {
    for (let i = 0; i < layer.points.length; i++) {
      const pt = layer.points[i];
      const dist = Math.sqrt((mouse.x - pt.x) ** 2 + (mouse.y - pt.y) ** 2);

      if (dist < HIT_RADIUS) {
        draggedPoint = { layerId: id, index: i };
        return;
      }
    }
  }
} // end handleMouseDown

/* ------------------------------------------------------------
   handleMouseMove(e)
------------------------------------------------------------ */
function handleMouseMove(e) {
  if (!draggedPoint) return;

  const mouse = getCanvasCoords(e);
  const layer = activeLayers.get(draggedPoint.layerId);

  if (layer) {
    // Update the "Draw Side" data directly
    const pt = layer.points[draggedPoint.index];
    pt.x = mouse.x;
    pt.y = mouse.y;

    // Trigger the script's redraw logic
    if (typeof layer.onUpdate === "function") {
      layer.onUpdate();
    }
  }
} // end handleMouseMove

/* ------------------------------------------------------------
   handleMouseUp()
------------------------------------------------------------ */
function handleMouseUp() {
  draggedPoint = null;
} // end handleMouseUp

/* ------------------------------------------------------------
   setupListeners()
   Ensures listeners are attached once to the window.drawCanvas.
------------------------------------------------------------ */
let listenersAttached = false;
function setupListeners() {
  if (listenersAttached) return;
  const canvas = window.drawCanvas;
  if (!canvas) return;

  canvas.addEventListener("mousedown", handleMouseDown);
  window.addEventListener("mousemove", handleMouseMove); // Window-level for smoother dragging
  window.addEventListener("mouseup", handleMouseUp);

  listenersAttached = true;
} // end setupListeners

// end interactor.js
