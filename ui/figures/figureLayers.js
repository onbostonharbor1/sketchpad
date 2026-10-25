/* figureLayers.js
   ============================================================
   Figures Tab -- Layers: Insert, Draw, Select, Show/Hide
   ============================================================
   Role:
     Turns the layer data in a figure into pictures and controls.

   A layer (data, in figure.layers[i]):
     { kind: "draw", id: "<registry key>", visible: true, params: {...} }

   Each layer also has a live instance, kept in
   uiState.figures.tabs[tabId].instances[i] (same index). The instance
   is Object.create(<registry entry>) with its own params and
   elements, so two layers of the same object (two parabolas) do not
   share state. The instance is not part of the figure data.

   Drawing: all visible layers, bottom to top (array order is
   z-order). The active layer is drawn like the others; there is no
   dimming. Registry draw code draws lines through drawLine only.

   Controls: the active layer's controls are built with the same
   buildParameterControls() the Draw tab uses.

   Architectural rules:
     * Does NOT build subtabs or switch them. That is figuresNav.js.
     * Never reorders or deletes layers (not in this phase).

   Exports:
     listInsertableObjects()
     insertLayer(tabId, registryKey)
     redrawFigure(tabId)
     renderLayerPanel(tabId)
     selectLayer(tabId, index)
     setLayerVisible(tabId, index, visible)
   ============================================================ */

import { resetCanvas }              from "/draw/drawState.js";
import { buildParameterControls }   from "/ui/parameterControls.js";
import { syncOverlayToCanvas }      from "/ui/uiUtilities.js";


/* ============================================================
   listInsertableObjects()
   ------------------------------------------------------------
   Registry objects for the Insert pulldown: [{ key, name }],
   sorted by name.
   ============================================================ */
export function listInsertableObjects() {

  const reg = window.drawRegistry || {};

  return Object.keys(reg)
    .filter((key) => reg[key])
    .map((key) => ({ key, name: reg[key].name || key }))
    .sort((a, b) => a.name.localeCompare(b.name));

} // end listInsertableObjects


/* ============================================================
   insertLayer(tabId, registryKey)
   ------------------------------------------------------------
   Appends a new layer at the top of the stack with the object's
   default parameters, makes it active, and redraws.
   ============================================================ */
export function insertLayer(tabId, registryKey) {

  const tabState = uiState.figures.tabs[tabId];
  if (!tabState || !tabState.figure) throw new Error("insertLayer: no figure for " + tabId);

  const entry = window.drawRegistry?.[registryKey];
  if (!entry) throw new Error("insertLayer: registry object not found: " + registryKey);

  // The registry entry is a shared singleton. Make a private instance.
  const instance    = Object.create(entry);
  instance.params   = structuredClone(entry.params);
  instance.elements = null;

  instance.init();

  const figure = tabState.figure;
  if (!tabState.instances) tabState.instances = [];

  figure.layers.push({
    kind:    "draw",
    id:      registryKey,
    visible: true,
    params:  instance.params
  });
  tabState.instances.push(instance);

  const index = figure.layers.length - 1;
  instance.redrawHandler = () => redrawFigure(tabId);
  figure.activeLayer = index;

  renderLayerPanel(tabId);
  redrawFigure(tabId);

} // end insertLayer


/* ============================================================
   redrawFigure(tabId)
   ------------------------------------------------------------
   Clears the canvas and draws every visible layer, bottom to top.
   A layer that throws is reported with its index and skipped.
   ============================================================ */
export function redrawFigure(tabId) {

  const tabState = uiState.figures.tabs[tabId];
  if (!tabState || !tabState.figure) return;

  resetCanvas();

  const layers    = tabState.figure.layers;
  const instances = tabState.instances || [];

  for (let i = 0; i < layers.length; i++) {
    if (!layers[i].visible) continue;

    const inst = instances[i];
    ctx.save();
    try {
      inst.update(inst.params);
      inst.draw();
    } catch (err) {
      console.error(`Figure layer ${i + 1} (${layers[i].id}) failed to draw:`, err);
    }
    ctx.restore();
  }

} // end redrawFigure


/* ============================================================
   renderLayerPanel(tabId)
   ------------------------------------------------------------
   Rebuilds the left panel: the layer list on top, then the active
   layer's controls. Arms the point interactor on the active layer
   when it is visible.
   ============================================================ */
export function renderLayerPanel(tabId) {

  const tabState = uiState.figures.tabs[tabId];
  const action   = document.getElementById("action");
  if (!tabState || !tabState.figure || !action) return;

  const figure    = tabState.figure;
  const instances = tabState.instances || [];

  action.innerHTML = "";

  // ---- layer list ------------------------------------------------
  const list = document.createElement("div");
  list.id = "figureLayers";
  list.style.cssText = "margin-bottom:10px";

  if (figure.layers.length === 0) {
    list.textContent = "Insert an object to begin.";
  }

  figure.layers.forEach((layer, i) => {

    const row = document.createElement("div");
    row.className = "figure-layer-row";
    row.style.cssText =
      "display:flex; align-items:center; gap:6px; padding:2px 4px; cursor:pointer;" +
      (i === figure.activeLayer ? " background:rgba(0,0,0,0.12); font-weight:bold;" : "");

    const box = document.createElement("input");
    box.type    = "checkbox";
    box.checked = layer.visible;
    box.title   = "Show or hide this layer";
    box.onclick = (e) => {
      e.stopPropagation();
      setLayerVisible(tabId, i, box.checked);
    };

    const name = document.createElement("span");
    const reg  = window.drawRegistry?.[layer.id];
    name.textContent = (i + 1) + "  " + (reg?.name || layer.id);
    name.style.flexGrow = "1";

    row.onclick = () => selectLayer(tabId, i);
    row.appendChild(box);
    row.appendChild(name);
    list.appendChild(row);
  });

  action.appendChild(list);

  // ---- controls for the active layer -----------------------------
  const active = instances[figure.activeLayer];

  if (active) {
    const info = {
      drawRegistry:  active,           // controls come from the registry entry
      parameters:    active.params,
      redrawHandler: () => redrawFigure(tabId),
      onParamChange: () => {}          // dirty tracking arrives with Save As
    };
    buildParameterControls(info, "tab-draw", true);
  }

  // ---- interactor (drag handles) ------------------------------------
  const canvas = window.drawCanvas;
  if (canvas) {
    syncOverlayToCanvas("interaction", canvas);
    syncOverlayToCanvas("guides", canvas);
  }

  if (active && figure.layers[figure.activeLayer].visible) {
    if (window.armInteractor) window.armInteractor(active);
  } else if (window.disarmInteractor) {
    window.disarmInteractor();
  }

} // end renderLayerPanel


/* ============================================================
   selectLayer(tabId, index)
   ============================================================ */
export function selectLayer(tabId, index) {

  const tabState = uiState.figures.tabs[tabId];
  if (!tabState) return;

  tabState.figure.activeLayer = index;
  renderLayerPanel(tabId);

} // end selectLayer


/* ============================================================
   setLayerVisible(tabId, index, visible)
   ============================================================ */
export function setLayerVisible(tabId, index, visible) {

  const tabState = uiState.figures.tabs[tabId];
  if (!tabState) return;

  tabState.figure.layers[index].visible = !!visible;

  // Hiding the active layer also removes its drag handles.
  renderLayerPanel(tabId);
  redrawFigure(tabId);

} // end setLayerVisible

// end figureLayers.js
