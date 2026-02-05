/* draw.js
   ------------------------------------------------------------
   Draw Tab Spec + Controller (REFACTORED)
   ------------------------------------------------------------
   Responsibilities:
     - Manage Draw subtabs (Categories + object tabs)
     - Integrate with caption bar + menuManager
     - Provide save/restore for Draw state
     - Coordinate with drawRunner.js for actual rendering
   ------------------------------------------------------------ */

import { uiState }                  from "./uiState.js";
import { formatRebuildReportShared } from "./uiUtilities.js";
import { setCaptionBar }             from "./caption.js";
import { renderCategories }          from "./categories.js";
import { menuManager }               from "./menuManager.js";
import {
  clearDivs,
  setCommandsButtonLabel,
  setCommandsButton,
  showCommandsOffcanvas
}                                    from "./uiUtilities.js";
import { nodeRebuildAndValidateManifests } from "./nodeLayer.js";
import { showScriptOffcanvas }       from "./menuCmds.js";
import {
  copyActiveDrawObject,
  resetActiveDrawObject,
  createPngFromActiveDrawObject,
  createPatternFromActiveDrawObject
}                                    from "./drawMenuCmds.js";

// Import moved execution logic
import {
  drawActiveTab,
  setDrawSketchpad,
  clearCanvas
}                                    from "./drawRunner.js";

const DEFAULT_DRAW_SUBTAB = "tab-categories";
const TAB_NAME            = "draw";

/**
 * consumeLaunchIfForDraw()
 * Handles incoming intent from other tabs (like Gallery).
 */
function consumeLaunchIfForDraw() {
  if (!uiState.launch) throw new Error("consumeLaunchIfForDraw: uiState.launch missing");
  if (!uiState.launch.pending) return null;
  if (uiState.launch.targetTab !== "draw") return null;

  const intent = {
    sourceTab: uiState.launch.sourceTab,
    sourceType: uiState.launch.sourceType,
    registryKey: uiState.launch.registryKey
  };

  clearLaunch();
  return intent;
}

function clearLaunch() {
  uiState.launch.pending = false;
  uiState.launch.sourceTab = null;
  uiState.launch.targetTab = null;
  uiState.launch.sourceType = null;
  uiState.launch.registryKey = null;
}

/* ===========================================================
   DrawTabSpec
   -----------------------------------------------------------
   Declarative description for setUI system.
=========================================================== */
export const DrawTabSpec = {
  name: TAB_NAME,
  theme: "theme-draw",
  regions: ["subtabs", "sketchpad", "caption", "text", "action"],

  init: initDrawTab,
  restore() { restoreDrawTab(); },
  save: saveDrawState,

  buildSubtabs: setDrawSubtabs,
  clearCaption: clearDrawCaption,
  buildCaptionForObject: setDrawCaption,
  buildText: setDrawText,
  buildAction: setDrawAction,
  buildSketchpad: setDrawSketchpad // Now from drawRunner
};

/* ===========================================================
   DrawController
   -----------------------------------------------------------
   Main interface for external callers.
=========================================================== */
export const DrawController = {
  initDrawTab,
  drawActiveTab, // From drawRunner
  saveDrawState,
  setDrawSubtabs,
  addDrawSubtab,
  deleteTab,
  switchTab,
  markTabDirty,
  markTabClean,
  clearCanvas, // From drawRunner
  setDrawAction,
  clearDrawCaption,
  setDrawCaption,
  setDrawSketchpad, // From drawRunner
  setDrawText,
  copyActiveDrawObject,
  buildDrawMenuItems,
  collectRegistryEntries,
  groupEntriesByCategory,
  renderDrawCategories
};

/* ===========================================================
   init/restore logic
=========================================================== */
export function initDrawTab(restored = false) {
  if (!uiState.draw.tabs) uiState.draw.tabs = {};

  clearDivs();
  setCommandsButtonLabel("Draw Commands");
  wireDrawCommandsButton();
  setDrawSubtabs();

  const intent = consumeLaunchIfForDraw();
  if (intent && intent.sourceType === "drawRegistry") {
    const entry = window.drawRegistry[intent.registryKey];
    addDrawSubtab({ name: entry.name || intent.registryKey, entry: entry });
    return;
  }

  const activeId = uiState.draw.activeSubtab || DEFAULT_DRAW_SUBTAB;
  switchTab(activeId);
}

function restoreDrawTab() {
  if (window.disarmInteractor) window.disarmInteractor();

  setCommandsButtonLabel("Draw Commands");
  wireDrawCommandsButton();
  setDrawSubtabs();

  const intent = consumeLaunchIfForDraw();
  if (intent?.sourceType === "drawRegistry") {
    const entry = window.drawRegistry[intent.registryKey];
    addDrawSubtab({ name: entry.name, entry: entry });
    return;
  }

  const activeId = uiState.draw.activeSubtab || DEFAULT_DRAW_SUBTAB;
  if (!uiState.draw.tabs[activeId]) {
    uiState.draw.activeSubtab = DEFAULT_DRAW_SUBTAB;
    clearDivs();
    renderDrawCategories();
    return;
  }

  switchTab(activeId);
}

/* ===========================================================
   Subtab Management
=========================================================== */
function setDrawSubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setDrawSubtabs: #subtabs not found");

  el.innerHTML = "";
  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs draw-subtabs";
  el.appendChild(bar);

  const ids = Object.keys(uiState.draw.tabs || {});
  if (!ids.length) {
    addDrawSubtab({ name: "Categories" });
    return;
  }

  ids.forEach((id) => {
    const info = uiState.draw.tabs[id];
    let name = (info.type === "categories") ? "Categories" : (info.drawRegistry?.name || id.replace(/^tab-/, ""));
    addDrawSubtab({ name, entry: info.drawRegistry });
  });
}

export function addDrawSubtab(item) {
  clearDivs();
  const bar = document.querySelector("#subtabs ul");
  const tabId = "tab-" + item.name.replace(/\s+/g, "-").toLowerCase();

  bar.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));

  const li = document.createElement("li");
  li.className = "nav-item";
  const btn = document.createElement("button");
  btn.className = "nav-link active";
  btn.dataset.tabId = tabId;
  btn.addEventListener("click", () => switchTab(tabId));

  const label = document.createElement("span");
  label.className = "tab-label";
  label.textContent = item.name;
  btn.appendChild(label);

  if (item.name !== "Categories") {
    const closeBtn = document.createElement("span");
    closeBtn.textContent = "×";
    closeBtn.className = "tab-close";
    closeBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      deleteTab(tabId);
    });
    btn.appendChild(closeBtn);
  }

  li.appendChild(btn);
  bar.appendChild(li);

  if (item.name === "Categories") {
    uiState.draw.tabs[tabId] = { type: "categories" };
    uiState.draw.activeSubtab = tabId;
    renderDrawCategories();
    return;
  }

  const entry = item.entry;
  entry.init();

  if (entry.interactive && entry.params.points) {
    if (window.armInteractor) window.armInteractor(entry);
    if (window.interactor?.draw) window.interactor.draw();
  }

  uiState.draw.tabs[tabId] = {
    type: "object",
    drawRegistry: entry,
    dirty: false,
    parameters: entry.params
  };

  uiState.draw.activeSubtab = tabId;
  drawActiveTab();
}

function deleteTab(tabId) {
  const bar = document.querySelector("#subtabs ul");
  const btns = Array.from(bar.querySelectorAll(".nav-link"));
  const idx = btns.findIndex((b) => b.dataset.tabId === tabId);
  if (idx === -1) return;

  btns[idx].parentElement.remove();
  delete uiState.draw.tabs[tabId];

  const neighbor = btns[idx + 1] || btns[idx - 1];
  neighbor ? switchTab(neighbor.dataset.tabId) : setDrawSubtabs();
}

function switchTab(tabId) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) return;

  bar.querySelectorAll(".nav-link").forEach((btn) => btn.classList.remove("active"));
  const btn = bar.querySelector(`[data-tab-id="${tabId}"]`);
  if (btn) btn.classList.add("active");

  uiState.draw.activeSubtab = tabId;
  if (window.disarmInteractor) window.disarmInteractor();
  if (window.interactor) window.interactor.target = null;

  clearDivs();
  const info = uiState.draw.tabs[tabId];
  if (!info) return;

  if (info.type === "categories") {
    renderDrawCategories();
  } else {
    drawActiveTab();
    const entry = info.drawRegistry;
    if (entry?.interactive && entry.params?.points) {
      if (window.armInteractor) window.armInteractor(entry);
      if (window.interactor?.draw) window.interactor.draw();
    }
  }
}

/* ===========================================================
   State / Dirty Tracking
=========================================================== */
export function markTabDirty(tabId) {
  const info = uiState.draw.tabs[tabId];
  if (!info || info.dirty) return;
  info.dirty = true;
  const btn = document.querySelector(`[data-tab-id="${tabId}"]`);
  const label = btn?.querySelector(".tab-label");
  if (label && !label.textContent.endsWith(" *")) {
    label.textContent += " *";
  }
}

export function markTabClean(tabId) {
  const info = uiState.draw.tabs[tabId];
  if (!info) return;
  info.dirty = false;
  const btn = document.querySelector(`[data-tab-id="${tabId}"]`);
  const label = btn?.querySelector(".tab-label");
  if (label) label.textContent = label.textContent.replace(/\s\*$/, "");
}

export function saveDrawState() {
  const shallowTabs = {};
  for (const [id, info] of Object.entries(uiState.draw.tabs || {})) {
    let key = null;
    if (info.drawRegistry) {
      key = Object.keys(window.drawRegistry).find(k => window.drawRegistry[k] === info.drawRegistry);
    }
    shallowTabs[id] = {
      type: info.type,
      dirty: info.dirty,
      parameters: structuredClone(info.parameters || {}),
      drawRegistry: key
    };
  }
  return {
    activeDrawTab: uiState.draw.activeSubtab || null,
    drawTabs: shallowTabs
  };
}

/* ===========================================================
   Caption / Menu Builders
=========================================================== */
function setDrawAction() {
  const el = document.getElementById("action");
  if (el) el.innerHTML = "";
}

function clearDrawCaption() {
  const el = document.getElementById("caption");
  if (el) el.innerHTML = "";
}

function setDrawCaption(entry) {
  const onMenu = async (anchor) => {
    const registryKey = Object.keys(window.drawRegistry).find(k => window.drawRegistry[k] === entry);
    const menuContext = { category: entry.category || "uncategorized", id: entry.id || registryKey, registryKey };
    const items = await buildDrawMenuItems("draw", registryKey, `/drawRegistry/${registryKey}.js`, menuContext);
    menuManager.open(items, anchor);
  };

  setCaptionBar({ targetId: "caption", title: entry.name || "(untitled)", onPrev: null, onNext: null, onMenu });
}

export async function buildDrawMenuItems(tabName, itemName, scriptPath, menuContext) {
  return [
    await menuManager.buildHelpItem(tabName, itemName),
    { label: "Show Script", onClick: () => showScriptOffcanvas(scriptPath, itemName) },
    { label: "Create Pattern", onClick: () => createPatternFromActiveDrawObject(menuContext) },
    { label: "Create PNG", onClick: () => createPngFromActiveDrawObject(menuContext) },
    { label: "Duplicate", onClick: () => copyActiveDrawObject() },
    { label: "Reset", onClick: () => resetActiveDrawObject() }
  ];
}

/* ===========================================================
   Categories & Discovery
=========================================================== */
export function setDrawText() { renderDrawCategories(); }

function collectRegistryEntries() {
  return Object.entries(window.drawRegistry || {}).map(([key, entry]) => ({
    key, name: entry.name || key, category: entry.category || "uncategorized", entry
  }));
}

function groupEntriesByCategory(list = []) {
  const grouped = {};
  list.forEach(it => {
    if (!grouped[it.category]) grouped[it.category] = [];
    grouped[it.category].push(it);
  });
  const sorted = {};
  Object.keys(grouped).sort().forEach(cat => {
    sorted[cat] = grouped[cat].sort((a, b) => a.name.localeCompare(b.name));
  });
  return sorted;
}

function renderDrawCategories() {
  const grouped = groupEntriesByCategory(collectRegistryEntries());
  const descriptor = Object.entries(grouped).map(([cat, items]) => ({
    title: cat,
    items: items.map(it => ({
      name: it.name,
      hasSubitems: false,
      onClick: () => addDrawSubtab({ name: it.name, entry: it.entry })
    }))
  }));
  renderCategories("text", descriptor);
}

/* ===========================================================
   Maintenance / Commands
=========================================================== */
export function wireDrawCommandsButton() {
  setCommandsButtonLabel("Draw Commands");
  setCommandsButton("Commands", () => {
    showCommandsOffcanvas({
      title: "Draw Maintenance",
      buildBody(el) {
        el.innerHTML = `
          <div class="cmdButtonRow"><button id="drawRebuildButton" class="cmdButton">Rebuild & Validate</button></div>
          <div class="buttonSeparator"></div>
          <div id="drawRebuildReport" class="drawRebuildReport"></div>`;

        document.getElementById("drawRebuildButton").addEventListener("click", async () => {
          const out = document.getElementById("drawRebuildReport");
          out.textContent = "Running...";
          const report = await nodeRebuildAndValidateManifests();
          out.textContent = formatRebuildReportShared(report);
        });
      }
    });
  });
}
