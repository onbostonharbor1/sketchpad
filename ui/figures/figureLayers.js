/* figureLayers.js
   ============================================================
   Figures Tab -- Layers: Insert, Draw, Select, Show/Hide
   ============================================================
   Role:
     Turns the layer data in a figure into pictures and controls.

   A layer (data, in figure.layers[i]):
     { kind: "draw", id: "<registry key>", visible: true, color: "#rrggbb",
       params: {...} }

   color is the layer's identity color: it fills the layer's number in the
   strip and the layer's discs. It is not the color of the drawing. A new
   layer takes the next color of LAYER_COLORS; right-click the number of
   a layer in the strip to pick another.

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
   editing, and so are its discs (DISC_DIM_ALPHA in figurePoints.js).
   Dimming is skipped, and hidden layers are drawn, when
   drawState.final is set or the tab is in preview (Show All), or
   when redrawFigure is called with { dim: false }. Points mode obeys
   the same rules; it only changes what each layer draws (just its
   points) and what a click does.

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
import { refreshPoints, drawFigurePoints } from "./figurePoints.js";
import { activatePointsInput, deactivatePointsInput } from "./figurePointer.js";

// Experiment switch: true = the last layer clicked goes on top.
const MOVE_TO_FRONT_ON_SELECT = true;
// Alpha for layers that are not the active one.
const DIM_ALPHA   = 0.2;
// Identity colors handed out to layers in turn (dark enough for white text).
const LAYER_COLORS = [
  "#c0392b", "#2471a3", "#1e8449", "#d68910",
  "#7d3c98", "#117a8b", "#a04000", "#566573"
];
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
  const color  = LAYER_COLORS[figure.layers.length % LAYER_COLORS.length];

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
    color:   color,
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
  // Preview (the Show All checkbox, not saved) and final mode draw every
  // layer at full strength, hidden ones included. Layers of kind "template"
  // (guides, a later phase) are left out of both. Points mode sets
  // drawState.final while the layers draw, so they show only their points
  // (one flag, set here, restored below), but it follows the same
  // visibility and dimming rules as lines mode.
  const pointsMode = tabState.mode === "points";
  const showAll    = drawState.final || !!tabState.preview;
  const dimming    = dim && !showAll;
  const wasFinal   = drawState.final;
  if (pointsMode) drawState.final = true;

  // drawOrder is top first; paint bottom to top.
  for (let k = figure.drawOrder.length - 1; k >= 0; k--) {
    const i = figure.drawOrder[k];
    if (showAll && figure.layers[i].kind === "template") continue;
    if (!figure.layers[i].visible && !showAll) continue;

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

  drawState.final = wasFinal;

  // Discs are always shown, in both modes, by the same visibility and dimming
  // rules as the layers. Anchored ones follow their layers, so refresh first.
  refreshPoints(tabState);
  drawFigurePoints(tabState, { showAll, dimming });

} // end redrawFigure


/* ============================================================
   renderLayerPanel(tabId)
   ------------------------------------------------------------
   Layer numbers go in the gray strip
   left of the canvas (#figure-sidebar); a hidden layer's number is
   grayed and struck through. The action panel gets the active
   layer's controls. The subtab bar item for the active layer
   (name and Show checkbox) is refreshed. Arms the point
   interactor (the object's handles) on the active layer when it is
   visible, or always in points mode, and the points-mode mouse
   input as well in points mode.
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
        "display:flex; align-items:center; justify-content:center; width:100%; padding:1px 4px; cursor:pointer;" +
        (i === figure.activeLayer ? " background:rgba(0,0,0,0.18); font-weight:bold;" : "");

      // The number sits on a chip in the layer's color, the same color as the
      // layer's discs. Right-click it to choose another color.
      if (!layer.color) layer.color = LAYER_COLORS[i % LAYER_COLORS.length];

      const num = document.createElement("span");
      num.textContent = String(i + 1);
      num.style.cssText =
        "display:inline-block; min-width:22px; padding:1px 0; border-radius:11px; text-align:center;" +
        " background:" + layer.color + "; color:" + textColorOn(layer.color) + ";";
      num.title = "Right-click to change this layer's color";

      // Hidden native color picker, opened by the right-click.
      const picker = document.createElement("input");
      picker.type  = "color";
      picker.value = layer.color;
      picker.style.cssText = "position:absolute; width:0; height:0; opacity:0; pointer-events:none;";
      picker.oninput = () => {
        layer.color = picker.value;
        num.style.background = layer.color;
        num.style.color      = textColorOn(layer.color);
        redrawFigure(tabId);
      };
      num.oncontextmenu = (e) => {
        e.preventDefault();
        picker.click();
      };

      if (!layer.visible) {
        row.style.opacity = "0.4";
        num.style.textDecoration = "line-through";
        row.title += " (hidden)";
      }

      row.onclick = () => selectLayer(tabId, i);
      row.appendChild(num);
      row.appendChild(picker);
      strip.appendChild(row);
    });
  }

  // ---- heading and controls for the active layer ---------------------
  action.innerHTML = "";
  const active = instances[figure.activeLayer];

  if (!active) {
    action.textContent = "Use Insert Object, Line or Parabola to begin.";
  } else {
    const info = {
      drawRegistry:  active,           // controls come from the registry entry
      parameters:    active.params,
      redrawHandler: () => redrawFigure(tabId),
      onParamChange: () => {}          // dirty tracking arrives with Save As
    };
    buildParameterControls(info, "tab-draw", true);
  }

  updateLayerInfo(tabId);

  // ---- interactor (drag handles) ------------------------------------
  const canvas = window.drawCanvas;
  if (canvas) {
    syncOverlayToCanvas("interaction", canvas);
    syncOverlayToCanvas("guides", canvas);
  }

  // The active object's own handles are the only draggable points, in both
  // modes. In points mode figurePointer.js also takes clicks (place, select,
  // delete) and must be set up first: it sizes the interaction layer that
  // the interactor then draws the handles on. Points mode draws hidden
  // layers, so their handles are live too.
  if (window.disarmInteractor) window.disarmInteractor();
  deactivatePointsInput();

  const pointsMode = tabState.mode === "points";
  if (pointsMode) activatePointsInput(tabId, () => redrawFigure(tabId));

  if (active && (pointsMode || figure.layers[figure.activeLayer].visible)) {
    if (window.armInteractor) window.armInteractor(active);
  }

} // end renderLayerPanel


/* ------------------------------------------------------------
   textColorOn(hex)
   Black or white, whichever reads better on the given background.
   ------------------------------------------------------------ */
function textColorOn(hex) {

  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8)  & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#000000" : "#ffffff";

} // end textColorOn


/* ============================================================
   updateLayerInfo(tabId)
   ------------------------------------------------------------
   Fills the "Layer N . Name  [x] Show" item in the subtab bar
   (built by figuresNav.js) for the active layer.
   ============================================================ */
function updateLayerInfo(tabId) {

  const label = document.getElementById("figureLayerLabel");
  const box   = document.getElementById("figureLayerShow");
  if (!label || !box) return;

  const figure = uiState.figures.tabs[tabId].figure;
  const layer  = figure.layers[figure.activeLayer];

  if (!layer) {
    label.textContent = "";
    box.checked  = true;
    box.disabled = true;
    return;
  }

  const reg = window.drawRegistry?.[layer.id];
  label.textContent = "Layer " + (figure.activeLayer + 1) + " \u00b7 " + (reg?.name || layer.id);
  box.checked  = layer.visible;
  box.disabled = false;

} // end updateLayerInfo


/* ============================================================
   selectLayer(tabId, index)
   ============================================================ */
export function selectLayer(tabId, index) {

  const tabState = uiState.figures.tabs[tabId];
  if (!tabState) return;

  const figure = tabState.figure;
  figure.activeLayer = index;
  tabState.selectedPoint = null;   // only the active layer's points can be selected

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
