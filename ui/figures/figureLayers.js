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

   Layer numbers are stable: layer N is figure.layers[N-1] for good.
   Stacking is separate: figure.drawOrder lists layer indices, top
   first. Selecting a layer moves it to the front of drawOrder
   (MOVE_TO_FRONT_ON_SELECT), so the last layer clicked is drawn last,
   on top. Example, layers 1,2,3 inserted: order 3 2 1; click 1 gives
   1 3 2; click 2 gives 2 1 3.

   Drawing: visible layers bottom to top, i.e. drawOrder backwards.
   Every layer except the active one is dimmed (DIM_ALPHA) while
   editing. Dimming is skipped when drawState.final is set or when
   redrawFigure is called with { dim: false }.

   Controls: the active layer's controls are built with the same
   buildParameterControls() the Draw tab uses.

   Architectural rules:
     * Does NOT build subtabs or switch them. That is figuresNav.js.
     * Never renumbers or deletes layers (not in this phase).

   Exports:
     listInsertableObjects()
     insertLayer(tabId, registryKey)
     redrawFigure(tabId)
     renderLayerPanel(tabId)  (layer numbers in the sidebar, heading and
                               controls in the action panel)
     selectLayer(tabId, index)
     setLayerVisible(tabId, index, visible)
   ============================================================ */

import { resetCanvas, drawState }    from "/draw/drawState.js";
import { buildParameterControls }   from "/ui/parameterControls.js";
import { syncOverlayToCanvas }      from "/ui/uiUtilities.js";

// Experiment switch: true = the last layer clicked goes on top.
const MOVE_TO_FRONT_ON_SELECT = true;
// Alpha for layers that are not the active one.
const DIM_ALPHA   = 0.2;
// Offset in canvas pixels per earlier layer of the same object.
const INSERT_STEP = 20;


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

  const figure = tabState.figure;

  instance.init();

  // Identical objects must not land on the same spot. init() fills in
  // the default positions, so the shift comes after it.
  const same = figure.layers.filter((l) => l.id === registryKey).length;
  if (same > 0) offsetParams(instance.params, same * INSERT_STEP);

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
  figure.drawOrder.unshift(index);      // new layer goes on top
  figure.activeLayer = index;

  renderLayerPanel(tabId);
  redrawFigure(tabId);

} // end insertLayer


/* ------------------------------------------------------------
   offsetParams(params, d)
   Shifts whatever positions a registry object keeps: its points,
   midpoint, center or start. Objects with none of these are
   not moved.
   ------------------------------------------------------------ */
function offsetParams(params, d) {

  if (Array.isArray(params.points)) {
    for (const pt of params.points) {
      if (typeof pt.x === "number") { pt.x += d; pt.y += d; }
    }
  }
  if (params.midpoint && typeof params.midpoint.x === "number") {
    params.midpoint.x += d;
    params.midpoint.y += d;
  }
  for (const [kx, ky] of [["centerX", "centerY"], ["startX", "startY"]]) {
    if (kx in params && ky in params) {
      params[kx] += d;
      params[ky] += d;
    }
  }

} // end offsetParams


/* ============================================================
   redrawFigure(tabId)
   ------------------------------------------------------------
   Clears the canvas and draws every visible layer, bottom to top.
   A layer that throws is reported with its index and skipped.
   ============================================================ */
export function redrawFigure(tabId, { dim = true } = {}) {

  const tabState = uiState.figures.tabs[tabId];
  if (!tabState || !tabState.figure) return;

  resetCanvas();

  const figure    = tabState.figure;
  const instances = tabState.instances || [];
  const dimming   = dim && !drawState.final;

  // drawOrder is top first; paint bottom to top.
  for (let k = figure.drawOrder.length - 1; k >= 0; k--) {
    const i = figure.drawOrder[k];
    if (!figure.layers[i].visible) continue;

    const inst = instances[i];
    ctx.save();
    if (dimming && i !== figure.activeLayer) ctx.globalAlpha = DIM_ALPHA;
    try {
      inst.update(inst.params);
      inst.draw();
    } catch (err) {
      console.error(`Figure layer ${i + 1} (${figure.layers[i].id}) failed to draw:`, err);
    }
    ctx.restore();
  }

} // end redrawFigure


/* ============================================================
   renderLayerPanel(tabId)
   ------------------------------------------------------------
   Layer numbers (with visibility checkboxes) go in the gray strip
   left of the canvas (#figure-sidebar). The action panel gets a
   one-line heading and the active layer's controls. Arms the point
   interactor on the active layer when it is visible.
   ============================================================ */
export function renderLayerPanel(tabId) {

  const tabState = uiState.figures.tabs[tabId];
  const action   = document.getElementById("action");
  const strip    = document.getElementById("figure-sidebar");
  if (!tabState || !tabState.figure || !action) return;

  const figure    = tabState.figure;
  const instances = tabState.instances || [];

  // ---- layer numbers in the strip ----------------------------------
  if (strip) {
    strip.innerHTML = "";

    figure.layers.forEach((layer, i) => {

      const reg = window.drawRegistry?.[layer.id];

      const row = document.createElement("div");
      row.className = "figure-layer-row";
      row.title = reg?.name || layer.id;
      row.style.cssText =
        "display:flex; align-items:center; gap:3px; padding:1px 4px; cursor:pointer;" +
        (i === figure.activeLayer ? " background:rgba(0,0,0,0.18); font-weight:bold;" : "");

      const box = document.createElement("input");
      box.type    = "checkbox";
      box.checked = layer.visible;
      box.title   = "Show or hide layer " + (i + 1);
      box.onclick = (e) => {
        e.stopPropagation();
        setLayerVisible(tabId, i, box.checked);
      };

      const num = document.createElement("span");
      num.textContent = String(i + 1);

      row.onclick = () => selectLayer(tabId, i);
      row.appendChild(box);
      row.appendChild(num);
      strip.appendChild(row);
    });
  }

  // ---- heading and controls for the active layer ---------------------
  action.innerHTML = "";
  const active = instances[figure.activeLayer];

  if (!active) {
    action.textContent = "Use Insert Object, Line or Parabola to begin.";
  } else {
    const reg = window.drawRegistry?.[figure.layers[figure.activeLayer].id];
    const heading = document.createElement("div");
    heading.id = "figureLayerHeading";
    heading.style.cssText = "font-weight:bold; margin-bottom:8px;";
    heading.textContent = "Layer " + (figure.activeLayer + 1) + " \u00b7 " + (reg?.name || "");
    action.appendChild(heading);

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

  const figure = tabState.figure;
  figure.activeLayer = index;

  if (MOVE_TO_FRONT_ON_SELECT) {
    figure.drawOrder = [index, ...figure.drawOrder.filter((n) => n !== index)];
  }

  renderLayerPanel(tabId);
  redrawFigure(tabId);

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
