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

   Exports:
     setFiguresSubtabs()
     renderSubtabs()
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
import {
  createEmptyFigure,
  nextUntitledName,
  nextFigureTabId
}                             from "./figureModel.js";


/* ============================================================
   setFiguresSubtabs()
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

    const label = document.createElement("span");
    label.textContent = tab.figure?.name || tab.title || tabId.replace("tab-", "");
    btn.appendChild(label);

    const close = document.createElement("span");
    close.textContent   = " ×";
    close.style.cursor  = "pointer";
    close.style.marginLeft = "5px";
    close.onclick = (e) => {
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

  const tools = [
    ["Line",     "drawLine", "Insert a line as a new layer"],
    ["Parabola", "parabola", "Insert a parabola (curve-stitch between two arms) as a new layer"]
  ];

  for (const [label, key, tip] of tools) {
    const b = document.createElement("button");
    b.type = "button";
    b.id = "figureInsert_" + key;
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
  label.id = "figureLayerLabel";
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
   ============================================================ */
export function updateFigureButtons() {

  const tabId = uiState.figures.activeSubtab;
  const live  = !!uiState.figures.tabs[tabId]?.figure;

  const show = (id, on) => {
    const el = document.getElementById(id);
    if (el) el.style.display = on ? "" : "none";
  };
  show("createFigureButton", !live);
  show("figureBr1",          !live);
  show("figureInsertSelect", live);
  show("figureBr2",          live);
  show("figurePreviewButton", live);
  show("figureBrPreview",     live);

  const prev = document.getElementById("figurePreviewButton");
  if (prev) {
    const on = !!uiState.figures.tabs[tabId]?.preview;
    prev.style.fontWeight = on ? "bold" : "";
    prev.style.boxShadow  = on ? "inset 0 0 0 2px #060" : "";
    prev.onclick = () => {
      const t = uiState.figures.tabs[uiState.figures.activeSubtab];
      if (!t || !t.figure) return;
      t.preview = !t.preview;
      updateFigureButtons();
      redrawFigure(uiState.figures.activeSubtab);
    };
  }

  const select = document.getElementById("figureInsertSelect");
  if (!select) return;

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

  select.onchange = () => {
    const key = select.value;
    select.value = "";
    if (key && live) insertLayer(tabId, key);
  };

} // end updateFigureButtons


/* ============================================================
   switchToCategories()
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

  if (uiState.figures.needsUpdate) {
    uiState.figures.needsUpdate = false;
    import("/ui/figures/figuresDisplay.js").then(m => m.loadFiguresCategories());
  }

} // end switchToCategories


/* ============================================================
   switchToFigureTab(tabId)
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

  tabs[tabId] = {
    type:   "figure",
    figure: createEmptyFigure(nextUntitledName(tabs))
  };

  switchToFigureTab(tabId);

} // end openNewFigureTab


/* ============================================================
   closeTab(tabId)
   ============================================================ */
export function closeTab(tabId) {

  delete uiState.figures.tabs[tabId];
  if (window.disarmInteractor) window.disarmInteractor();

  if (uiState.figures.activeSubtab === tabId) {
    switchToCategories();
  } else {
    renderSubtabs();
  }

} // end closeTab
