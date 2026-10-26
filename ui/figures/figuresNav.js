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

  // Insert tools, only while a figure tab is active
  if (activeTabId !== "tab-categories" && uiState.figures.tabs[activeTabId]?.figure) {
    appendInsertTools(bar, activeTabId);
  }

  updateInsertSelect();

} // end renderSubtabs


/* ============================================================
   appendInsertTools(bar, tabId)
   ------------------------------------------------------------
   Line and Parabola shortcut buttons, centered in the bar. The
   full registry list is the Insert Object button in the left
   command area (see updateInsertSelect).
   ============================================================ */
function appendInsertTools(bar, tabId) {

  const li = document.createElement("li");
  li.className = "nav-item ms-auto me-auto d-flex align-items-center gap-2";

  const tools = [
    ["Line",     "drawLine", "Insert a line as a new layer"],
    ["Parabola", "parabola", "Insert a parabola (curve-stitch between two arms) as a new layer"]
  ];

  for (const [label, key, tip] of tools) {
    const b = document.createElement("button");
    b.type = "button";
    b.id = "figureInsert_" + key;
    b.className = "btn btn-sm btn-outline-secondary";
    b.textContent = label;
    b.title = tip;
    b.onclick = () => insertLayer(tabId, key);
    li.appendChild(b);
  }

  bar.appendChild(li);

  // Active layer: name and a Show checkbox (filled in by figureLayers.js)
  const info = document.createElement("li");
  info.className = "nav-item d-flex align-items-center gap-2 ms-2";

  const label = document.createElement("span");
  label.id = "figureLayerLabel";
  info.appendChild(label);

  const showLabel = document.createElement("label");
  showLabel.className = "d-flex align-items-center gap-1";
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

  bar.appendChild(info);

} // end appendInsertTools


/* ============================================================
   updateInsertSelect()
   ------------------------------------------------------------
   The "Insert Object" list in the left command area. It is created
   by figures.js (setFiguresAction); this fills it and enables it
   only while a figure tab is active.
   ============================================================ */
export function updateInsertSelect() {

  const select = document.getElementById("figureInsertSelect");
  if (!select) return;

  const tabId = uiState.figures.activeSubtab;
  const live  = !!uiState.figures.tabs[tabId]?.figure;

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

  select.disabled = !live;
  select.onchange = () => {
    const key = select.value;
    select.value = "";
    if (key && live) insertLayer(tabId, key);
  };

} // end updateInsertSelect


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
