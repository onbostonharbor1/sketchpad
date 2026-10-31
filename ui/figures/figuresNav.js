/* figuresNav.js
   ============================================================
   Figures Tab -- Subtab Construction and Navigation
   ============================================================
   Role:
     Owns everything related to building the Figures subtab bar,
     switching between tabs, and managing tab lifecycle (open/close).

   Architectural rules:
     * Does NOT own the TabSpec, init(), restore(), or save().
       Those live in figures.js.
     * Does NOT load categories. That lives in figuresDisplay.js.
     * Does NOT build caption bars or menu items.
       Those live in figuresCommands.js.
     * Reads figuresRegistry via getters from figuresState.js.

   The subtab bar:
     [Categories] [Untitled 1 x] [Untitled 2 x] ...
     Categories is always first and cannot be closed. Each figure
     subtab shows its figure's name and a close mark. The data for
     each subtab is uiState.figures.tabs[tabId]; the active one is
     uiState.figures.activeSubtab.

   What one figure subtab holds (tabState, uiState.figures.tabs[tabId]):
     type              "figure"
     figure            the plain data (figureModel.js)
     instances         one live drawing object per layer, same index
                       as figure.layers (figureLayers.js)
     mode              "lines" or "points"
     selectedPoint     the number of the selected disc, or null
     centroidSelected  true while the active layer's diamond is selected
     preview           true while Show All is ticked
   All but figure are view state: they would not be saved with the
   figure.

   Exports:
     setFiguresSubtabs()
     renderSubtabs()
     updateFigureButtons()
     switchToCategories()
     switchToFigureTab(tabId)
     openNewFigureTab()
     closeTab(tabId)
   ============================================================ */

import { setCurrentTabId }     from "./figuresState.js";
import { setFiguresCaption }   from "./figuresCommands.js";
import {
  listInsertableObjects,
  insertLayer,
  setLayerVisible,
  redrawFigure,
  renderLayerPanel
}                             from "./figureLayers.js";
import { deactivatePointsInput } from "./figurePointer.js";
import { deactivateCentroid }    from "./figureCentroid.js";
import {
  createEmptyFigure,
  nextUntitledName,
  nextFigureTabId
}                             from "./figureModel.js";
import { disarmInteractor } from "/ui/interactor.js";


/* ============================================================
   setFiguresSubtabs()
   ------------------------------------------------------------
   Puts an empty tab bar (a Bootstrap "nav-tabs" list) into #subtabs.
   renderSubtabs() fills it.
   ============================================================ */
export function setFiguresSubtabs() {

  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setFiguresSubtabs: #subtabs not found");

  el.innerHTML = "";

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs figure-subtabs";
  el.appendChild(bar);

} // end setFiguresSubtabs


/* ============================================================
   renderSubtabs()
   ------------------------------------------------------------
   Rebuilds the whole bar from uiState.figures.tabs. Called on every
   switch, open and close; rebuilding is simpler than patching and
   the bar is small.
   ============================================================ */
export function renderSubtabs() {

  const bar = document.querySelector("#subtabs ul");
  if (!bar) return;

  bar.innerHTML = "";

  const activeTabId = uiState.figures.activeSubtab;

  // Categories tab (always present)
  const catLi  = document.createElement("li");
  catLi.className = "nav-item";

  const catBtn = document.createElement("button");
  catBtn.className  = "nav-link";
  if (activeTabId === "tab-categories") catBtn.classList.add("active");
  catBtn.textContent = "Categories";
  catBtn.onclick     = () => switchToCategories();

  catLi.appendChild(catBtn);
  bar.appendChild(catLi);

  // Figure tabs
  for (const tabId in uiState.figures.tabs) {
    if (tabId === "tab-categories") continue;

    const tab = uiState.figures.tabs[tabId];

    const li  = document.createElement("li");
    li.className = "nav-item";

    const btn = document.createElement("button");
    btn.className = "nav-link";
    if (activeTabId === tabId) btn.classList.add("active");

    // "a?.b" reads b only if a exists (otherwise gives undefined instead
    // of an error); "x || y" gives y when x is empty. So: the figure's
    // name, else a title, else the tab id without its "tab-" prefix.
    const label = document.createElement("span");
    label.textContent = tab.figure?.name || tab.title || tabId.replace("tab-", "");
    btn.appendChild(label);

    const close = document.createElement("span");
    close.textContent   = " ×";
    close.style.cursor  = "pointer";
    close.style.marginLeft = "5px";
    close.onclick = (e) => {
      // The close mark sits inside the tab button. Without this the click
      // would also reach the button and switch to the tab being closed.
      e.stopPropagation();
      closeTab(tabId);
    };
    btn.appendChild(close);

    btn.onclick = () => switchToFigureTab(tabId);

    li.appendChild(btn);
    bar.appendChild(li);
  }

  updateFigureButtons();

} // end renderSubtabs


/* ============================================================
   addCaptionTools(tabId)
   ------------------------------------------------------------
   Puts the figure's tools in the gray caption bar (same row as the
   title and the "v" menu button). Call after setFiguresCaption(),
   which rebuilds the bar.

     middle : Line and Parabola shortcut buttons
     right  : "Layer N . Name" and the Show checkbox (filled in by
              figureLayers.js), just left of the "v" button

   The full registry list is the Insert Object list in the left
   command area (see updateFigureButtons).
   ============================================================ */
function addCaptionTools(tabId) {

  const caption = document.getElementById("caption");
  const btnRow  = caption?.querySelector(".caption-buttons");
  if (!caption || !btnRow) return;

  // ---- middle: Line, Parabola ----------------------------------
  const mid = document.createElement("div");
  mid.id = "figureCaptionTools";
  mid.style.cssText = "display:flex; gap:8px; flex-grow:1; justify-content:center;";

  // [button text, registry key, tooltip]
  const tools = [
    ["Line",     "drawLine", "Insert a line as a new layer"],
    ["Parabola", "parabola", "Insert a parabola (curve-stitch between two arms) as a new layer"]
  ];

  // "const [a, b, c] of list" unpacks each three-element entry into names.
  for (const [label, key, tip] of tools) {
    const b = document.createElement("button");
    b.type = "button";
    b.id = "figureInsert_" + key;     // the tests find the buttons by these ids
    b.textContent = label;
    b.title = tip;
    b.onclick = () => insertLayer(tabId, key);
    mid.appendChild(b);
  }
  caption.insertBefore(mid, btnRow);

  // ---- right: active layer name and Show checkbox ----------------
  const info = document.createElement("span");
  info.style.cssText = "display:inline-flex; align-items:center; gap:8px; margin-right:10px;";

  const label = document.createElement("span");
  label.id = "figureLayerLabel";       // filled by updateLayerInfo() in figureLayers.js
  info.appendChild(label);

  const showLabel = document.createElement("label");
  showLabel.style.cssText = "display:inline-flex; align-items:center; gap:3px; margin:0;";
  showLabel.title = "Show or hide the active layer while editing. The final drawing always shows everything.";
  const box = document.createElement("input");
  box.type = "checkbox";
  box.id   = "figureLayerShow";
  box.onchange = () => {
    const fig = uiState.figures.tabs[tabId]?.figure;
    if (fig && fig.activeLayer >= 0) setLayerVisible(tabId, fig.activeLayer, box.checked);
  };
  showLabel.appendChild(box);
  showLabel.appendChild(document.createTextNode("Show"));
  info.appendChild(showLabel);

  btnRow.insertBefore(info, btnRow.firstChild);

} // end addCaptionTools


/* ============================================================
   updateFigureButtons()
   ------------------------------------------------------------
   The left command area. Create Figure shows only on the
   Categories tab; the Insert Object list shows only on a figure
   tab. Both are created by figures.js (setFiguresAction).

   Also wires the Points Mode and Show All checkboxes to the active
   figure, grays out the insert tools in points mode, and refills
   the Insert Object list. It runs on every subtab change, so the
   wiring always points at the figure on screen.
   ============================================================ */
export function updateFigureButtons() {

  const tabId = uiState.figures.activeSubtab;
  // "!!x" turns any value into a plain true or false. live: a figure
  // subtab is showing (not Categories).
  const live  = !!uiState.figures.tabs[tabId]?.figure;

  // Small helper: display "" means the element's normal display,
  // "none" hides it.
  const show = (id, on) => {
    const el = document.getElementById(id);
    if (el) el.style.display = on ? "" : "none";
  };
  show("createFigureButton", !live);
  show("figureBr1",          !live);
  show("figureInsertSelect", live);
  show("figureBr2",          live);
  show("figurePreviewLabel",  live);
  show("figureBrPreview",     live);
  show("figureModeLabel",     live);
  show("figureBrMode",        live);

  const ts = uiState.figures.tabs[tabId];
  const pointsMode = !!ts?.mode && ts.mode === "points";

  // Points Mode checkbox. Switching mode clears both selections (a disc
  // selected in points mode means nothing in lines mode, and the
  // centroid is hidden in points mode), then rebuilds the controls and
  // listeners for the new mode (renderLayerPanel) and redraws.
  const modeCheck = document.getElementById("figureModeCheck");
  if (modeCheck) {
    modeCheck.checked = pointsMode;
    modeCheck.onchange = () => {
      const t = uiState.figures.tabs[uiState.figures.activeSubtab];
      if (!t || !t.figure) return;
      t.mode = modeCheck.checked ? "points" : "lines";
      t.selectedPoint = null;
      t.centroidSelected = false;
      updateFigureButtons();
      renderLayerPanel(uiState.figures.activeSubtab);
      redrawFigure(uiState.figures.activeSubtab);
    };
  }

  // Show All checkbox: tabState.preview. redrawFigure reads it.
  const prev = document.getElementById("figurePreviewCheck");
  if (prev) {
    prev.checked = !!uiState.figures.tabs[tabId]?.preview;
    prev.onchange = () => {
      const t = uiState.figures.tabs[uiState.figures.activeSubtab];
      if (!t || !t.figure) return;
      t.preview = prev.checked;
      redrawFigure(uiState.figures.activeSubtab);
    };
  }

  // Points mode places discs on the active layer only, so the tools that
  // add layers are grayed out and inactive until it is turned off.
  for (const id of ["figureInsert_drawLine", "figureInsert_parabola", "figureInsertSelect"]) {
    const el = document.getElementById(id);
    if (el) el.disabled = pointsMode;
  }

  const select = document.getElementById("figureInsertSelect");
  if (!select) return;

  // Refill the list: a title entry, then every registry object by name.
  select.innerHTML = "";
  const first = document.createElement("option");
  first.value = "";
  first.textContent = "Insert Object";
  select.appendChild(first);

  for (const obj of listInsertableObjects()) {
    const opt = document.createElement("option");
    opt.value = obj.key;
    opt.textContent = obj.name;
    select.appendChild(opt);
  }

  // Choosing an object inserts it and puts the list back on its title
  // entry, so the same object can be chosen again right away.
  select.onchange = () => {
    const key = select.value;
    select.value = "";
    if (key && live) insertLayer(tabId, key);
  };

} // end updateFigureButtons


/* ============================================================
   switchToCategories()
   ------------------------------------------------------------
   Shows the category list (#text) and hides the drawing area, the
   layer strip and the controls.
   ============================================================ */
export function switchToCategories() {

  setCurrentTabId("tab-categories");
  uiState.figures.activeSubtab = "tab-categories";
  renderSubtabs();

  document.getElementById("text").style.display = "block";

  const wrapper = document.getElementById("sketchpad-wrapper");
  if (wrapper) wrapper.style.display = "none";

  document.getElementById("action").style.display = "none";

  setFiguresCaption("Figures", false);

  const btnContainer = document.getElementById("figure-sidebar");
  if (btnContainer) {
    btnContainer.innerHTML  = "";
    btnContainer.style.display = "none";
  }

  // Set elsewhere when the saved-figure list has changed; reload it once.
  // import(...).then(...) loads the module and runs the function when ready.
  if (uiState.figures.needsUpdate) {
    uiState.figures.needsUpdate = false;
    import("/ui/figures/figuresDisplay.js").then(m => m.loadFiguresCategories());
  }

} // end switchToCategories


/* ============================================================
   switchToFigureTab(tabId)
   ------------------------------------------------------------
   Shows one figure: hides the category list, shows the drawing
   area and the layer strip, builds the caption bar and its tools,
   then the layer panel (which also arms the mouse handling) and
   the picture.
   ============================================================ */
export function switchToFigureTab(tabId) {

  const tabState = uiState.figures.tabs[tabId];
  if (!tabState) return;

  setCurrentTabId(tabId);
  uiState.figures.activeSubtab = tabId;
  renderSubtabs();

  document.getElementById("text").style.display = "none";

  const wrapper = document.getElementById("sketchpad-wrapper");
  if (wrapper) wrapper.style.display = "flex";

  const sidebar = document.getElementById("figure-sidebar");
  if (sidebar) sidebar.style.display = "flex";

  const action = document.getElementById("action");
  action.style.display = "block";

  setFiguresCaption(tabState.figure.name, true);
  addCaptionTools(tabId);
  updateFigureButtons();     // again: the caption tools exist only now

  // Layer list, controls of the active layer, and the picture.
  renderLayerPanel(tabId);
  redrawFigure(tabId);

} // end switchToFigureTab


/* ============================================================
   openNewFigureTab()
   ------------------------------------------------------------
   Creates an empty, unnamed figure in a new subtab and shows it.
   The figure lives in uiState.figures.tabs[tabId].figure, so it
   survives switching to another main tab and back.
   ============================================================ */
export function openNewFigureTab() {

  const tabs  = uiState.figures.tabs;
  const tabId = nextFigureTabId(tabs);

  // instances is not set here; insertLayer() creates the array with the
  // first layer. preview is not set either; undefined counts as false.
  tabs[tabId] = {
    type:        "figure",
    figure:      createEmptyFigure(nextUntitledName(tabs)),
    mode:        "lines",     // "lines" or "points" (view state, not saved)
    selectedPoint: null,
    centroidSelected: false   // the active layer's centroid is selected (view state)
  };

  switchToFigureTab(tabId);

} // end openNewFigureTab


/* ============================================================
   closeTab(tabId)
   ------------------------------------------------------------
   Throws the figure away (there is no Save yet, and no warning),
   stops every mouse listener that may belong to it, and shows
   another subtab.
   ============================================================ */
export function closeTab(tabId) {

  delete uiState.figures.tabs[tabId];
  disarmInteractor();
  deactivatePointsInput();
  deactivateCentroid();

  if (uiState.figures.activeSubtab === tabId) {
    switchToCategories();
  } else {
    renderSubtabs();
  }

} // end closeTab
