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
  createPatternFromActiveDrawObject,
  saveActiveDrawObjectAsSecondary,
  saveActiveSecondaryObject,
  archiveActiveSecondaryObject
}                                    from "./drawMenuCmds.js";

import { getIDsWithSecondaries, listSecondaries, loadSecondary } from "./secondaryObjects.js";
import { showOffcanvasPanel, renderThumbnailGrid } from "./uiUtilities.js";

// Import moved execution logic
import {
  drawActiveTab,
  setDrawSketchpad,
  clearCanvas
}                                    from "./drawRunner.js";

const DEFAULT_DRAW_SUBTAB = "tab-categories";
let idsWithSecondaries = new Set();
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
} // end consumeLaunchIfForDraw

function clearLaunch() {
  uiState.launch.pending = false;
  uiState.launch.sourceTab = null;
  uiState.launch.targetTab = null;
  uiState.launch.sourceType = null;
  uiState.launch.registryKey = null;
} // end clearLaunch

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

  // Discovery (this updates idsWithSecondaries async)
  updateSecondariesDiscovery().then(() => {
    // If we're on Categories, refresh the list
    if (uiState.draw.activeSubtab === "tab-categories") {
      renderDrawCategories();
    }

    // If restored (Refresh & Restore), validate all open secondary tabs
    if (restored) {
      validateOpenSecondaryTabs();
    }
  });

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

  // Safety check: if active tab was removed during validation, fallback to categories
  if (!uiState.draw.tabs[activeId]) {
    uiState.draw.activeSubtab = DEFAULT_DRAW_SUBTAB;
    switchTab(DEFAULT_DRAW_SUBTAB);
  } else {
    switchTab(activeId);
  }
} // end initDrawTab

async function validateOpenSecondaryTabs() {
  const tabs = uiState.draw.tabs;
  const tabIds = Object.keys(tabs);

  for (const tabId of tabIds) {
    const info = tabs[tabId];
    if (info.secondary) {
      // Check if primary still has secondaries
      // Note: idsWithSecondaries is a Set populated by updateSecondariesDiscovery
      // We must await updateSecondariesDiscovery above before running this check?
      // Yes, validateOpenSecondaryTabs is called inside the .then() block.

      const primaryId = info.secondary.primaryId;
      const filename = info.secondary.filename;

      // 1. Check if primary still listed as having secondaries
      if (!idsWithSecondaries.has(primaryId)) {
        console.log(`Closing tab ${tabId}: Primary ${primaryId} has no secondaries.`);
        deleteTab(tabId);
        continue;
      }

      // 2. Check if the specific secondary file still exists
      try {
        const list = await listSecondaries(primaryId);
        const exists = list.some(item => item.path === filename);
        if (!exists) {
           console.log(`Closing tab ${tabId}: Secondary ${filename} not found.`);
           deleteTab(tabId);
        } else {
           // Update the list and index in the tab info
           info.secondary.list = list;
           info.secondary.index = list.findIndex(item => item.path === filename);
        }
      } catch (e) {
        console.warn(`Error verifying secondary tab ${tabId}`, e);
      }
    }
  }

  // Refresh subtabs UI after potential deletions
  setDrawSubtabs();

  // If active tab was deleted, switch to default
  if (!uiState.draw.tabs[uiState.draw.activeSubtab]) {
      switchTab(DEFAULT_DRAW_SUBTAB);
  }
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
} // end restoreDrawTab

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
} // end setDrawSubtabs

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
    clearDrawCaption();
    setDrawAction();
  } else {
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
      parameters: entry.params,
      showControls: false // NEW: Default to hidden for secondary objects
    };

    uiState.draw.activeSubtab = tabId;
    setDrawAction();
    drawActiveTab();
    setDrawCaption(entry);
  }
} // end addDrawSubtab

function deleteTab(tabId) {
  const bar = document.querySelector("#subtabs ul");
  const btns = Array.from(bar.querySelectorAll(".nav-link"));
  const idx = btns.findIndex((b) => b.dataset.tabId === tabId);
  if (idx === -1) return;

  btns[idx].parentElement.remove();
  delete uiState.draw.tabs[tabId];

  const neighbor = btns[idx + 1] || btns[idx - 1];
  neighbor ? switchTab(neighbor.dataset.tabId) : setDrawSubtabs();
} // end deleteTab

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
    clearDrawCaption();
    setDrawAction();
  } else {
    setDrawAction();
    drawActiveTab();
    const entry = info.drawRegistry;
    setDrawCaption(entry);
    if (entry?.interactive && entry.params?.points) {
      if (window.armInteractor) window.armInteractor(entry);
      if (window.interactor?.draw) window.interactor.draw();
    }
  }
} // end switchTab

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
} // end markTabDirty

export function markTabClean(tabId) {
  const info = uiState.draw.tabs[tabId];
  if (!info) return;
  info.dirty = false;
  const btn = document.querySelector(`[data-tab-id="${tabId}"]`);
  const label = btn?.querySelector(".tab-label");
  if (label) label.textContent = label.textContent.replace(/\s\*$/, "");
} // end markTabClean

export function saveDrawState() {
  const shallowTabs = {};
  for (const [id, info] of Object.entries(uiState.draw.tabs || {})) {
    let key = null;
    let savedParams = {};

    if (info.drawRegistry) {
      key = Object.keys(window.drawRegistry).find(k => window.drawRegistry[k] === info.drawRegistry);

      // Filter out interface controls (marked by 'control' property in schema)
      const allParams = info.parameters || {};
      const controls = info.drawRegistry.controls || {};

      for (const pKey in allParams) {
          const def = controls[pKey];
          if (def && def.control) continue;
          savedParams[pKey] = allParams[pKey];
      }
    } else {
        savedParams = info.parameters || {};
    }

    shallowTabs[id] = {
      type: info.type,
      dirty: info.dirty,
      parameters: structuredClone(savedParams),
      drawRegistry: key,
      showControls: info.showControls ?? false // NEW: Persist checkbox state
    };
  }
  return {
    activeDrawTab: uiState.draw.activeSubtab || null,
    drawTabs: shallowTabs
  };
} // end saveDrawState

/* ===========================================================
   Caption / Menu Builders
=========================================================== */

export function setDrawAction() {
  const tabId = uiState.draw.activeSubtab;
  const state = uiState.draw.tabs[tabId];

  if (state && state.type === "object") {
    const actionDiv = document.getElementById("action");
    if (!actionDiv) return;

    const isSecondary = !!(state.secondary);

    // First, call drawActiveTab() to let it create/populate #drawControls normally
    drawActiveTab();

    if (isSecondary) {
      // Now find the drawControls that was just created
      const drawControls = document.getElementById("drawControls");
      if (!drawControls) return;

      // Check if we already added the checkbox
      let checkboxRow = document.getElementById("showControlsRow");
      if (!checkboxRow) {
        // Create the checkbox row
        checkboxRow = document.createElement("div");
        checkboxRow.id = "showControlsRow";

        const checkboxLabel = document.createElement("label");
        checkboxLabel.textContent = "Show Controls";
        checkboxLabel.htmlFor = "showControlsToggle";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = "showControlsToggle";
        checkbox.checked = state.showControls ?? true;

        checkbox.addEventListener("change", () => {
          state.showControls = checkbox.checked;
          toggleControlsVisibility(state.showControls);
        });

        checkboxRow.appendChild(checkboxLabel);
        checkboxRow.appendChild(checkbox);

        // Insert at the very beginning of drawControls
        drawControls.insertBefore(checkboxRow, drawControls.firstChild);
      } else {
        // Update existing checkbox state
        const checkbox = document.getElementById("showControlsToggle");
        if (checkbox) {
          checkbox.checked = state.showControls ?? true;
        }
      }

      // Set initial visibility
      toggleControlsVisibility(state.showControls ?? true);
    }
  }
}

function toggleControlsVisibility(show) {
  const controlsDiv = document.getElementById("drawControls");
  if (!controlsDiv) return;

  // Hide/show all ctrl-field children (the actual parameter controls)
  Array.from(controlsDiv.children).forEach(child => {
    if (child.classList.contains("ctrl-field")) {
      child.style.display = show ? "" : "none";
    }
  });
}




function clearDrawCaption() {
  const el = document.getElementById("caption");
  if (el) el.innerHTML = "";
} // end clearDrawCaption

function setDrawCaption(entry) {
  const tabId = uiState.draw.activeSubtab;
  const info = uiState.draw.tabs[tabId];

  const isSecondary = !!(info && info.secondary);

  const onMenu = async (anchor) => {
    const registryKey = isSecondary
      ? info.secondary.primaryId
      : Object.keys(window.drawRegistry).find(k => window.drawRegistry[k] === entry);

    // For secondary objects, use the secondary's name as the ID (for file naming)
    // For primary objects, use the entry ID or registry key as before
    const effectiveId = isSecondary
      ? info.secondary.name
      : (entry.id || registryKey);

    const menuContext = {
        category: entry.category || "uncategorized",
        id: effectiveId,
        registryKey
    };

    // Always show full menu access
    const items = await buildDrawMenuItems("draw", registryKey, `/drawRegistry/${registryKey}.js`, menuContext, isSecondary, true);
    menuManager.open(items, anchor);
  };

  const config = {
      targetId: "caption",
      title: entry.name || "(untitled)",
      onMenu
  };

  // Standard Secondary Navigation (Prev/Next/Reset)
  if (isSecondary) {
      const sec = info.secondary;
      const list = sec.list || [];
      const idx = sec.index;

      config.onPrimary = () => {
          delete info.secondary;
          resetActiveDrawObject();
      };

      if (list.length > 1) {
          config.onPrev = () => {
              const newIdx = (idx - 1 + list.length) % list.length;
              loadSecondaryObjectInTab(sec.primaryId, list[newIdx], list, newIdx);
          };
          config.onNext = () => {
              const newIdx = (idx + 1) % list.length;
              loadSecondaryObjectInTab(sec.primaryId, list[newIdx], list, newIdx);
          };
      }
  }

  setCaptionBar(config);
} // end setDrawCaption

export async function buildDrawMenuItems(tabName, itemName, scriptPath, menuContext, isSecondary, showControls) {
  const items = [
    await menuManager.buildHelpItem(tabName, itemName),
    { label: "Show Script", onClick: () => showScriptOffcanvas(scriptPath, itemName) }
  ];

  if (isSecondary) {
      items.push({
          label: "Save",
          onClick: () => saveActiveSecondaryObject(menuContext),
          disabled: !showControls
      });
      items.push({
          label: "Save As",
          onClick: () => saveActiveDrawObjectAsSecondary(menuContext),
          disabled: !showControls
      });
      items.push({
          label: "Archive",
          onClick: () => archiveActiveSecondaryObject(menuContext)
      });
  } else {
      items.push({
          label: "Save As Secondary",
          onClick: () => saveActiveDrawObjectAsSecondary(menuContext),
          disabled: !showControls
      });
  }

  items.push({ label: "Create Pattern", onClick: () => createPatternFromActiveDrawObject(menuContext) });
  items.push({ label: "Create PNG", onClick: () => createPngFromActiveDrawObject(menuContext) });
  items.push({ label: "Duplicate", onClick: () => copyActiveDrawObject() });
  items.push({ label: "Reset", onClick: () => resetActiveDrawObject() });

  return items;
} // end buildDrawMenuItems

/* ===========================================================
   Categories & Discovery
=========================================================== */
export function setDrawText() { renderDrawCategories(); }

function collectRegistryEntries() {
  return Object.entries(window.drawRegistry || {}).map(([key, entry]) => ({
    key, name: entry.name || key, category: entry.category || "uncategorized", entry
  }));
} // end collectRegistryEntries

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
} // end groupEntriesByCategory

function renderDrawCategories() {
  const grouped = groupEntriesByCategory(collectRegistryEntries());
  const descriptor = Object.entries(grouped).map(([cat, items]) => ({
    title: cat,
    items: items.map(it => ({
      name: it.name,
      hasSubitems: false,
      onClick: () => addDrawSubtab({ name: it.name, entry: it.entry }),
      secondaryAction: idsWithSecondaries.has(it.key) ? () => showSecondaryOffcanvas(it.key) : null
    }))
  }));
  renderCategories("text", descriptor);
} // end renderDrawCategories

async function updateSecondariesDiscovery() {
  try {
    const list = await getIDsWithSecondaries();
    idsWithSecondaries = new Set(list);
  } catch (e) {
    console.warn("updateSecondariesDiscovery failed", e);
  }
} // end updateSecondariesDiscovery

export async function showSecondaryOffcanvas(primaryId) {
  try {
    const list = await listSecondaries(primaryId);

    if (!list || list.length === 0) {
      alert("No secondary objects found.");
      return;
    }

    showOffcanvasPanel({
      title: "Secondary Objects (" + primaryId + ")",
      bodyHtml: `<div id="secondaryThumbGrid">Loading thumbnails...</div>`
    });

    const buildSrc = (item) => `/drawRegistry/${primaryId}/${item.thumb}`;

    const onClick = async (item, idx) => {
      await loadSecondaryObjectInTab(primaryId, item, list, idx);

      const btn = document.querySelector('[data-bs-dismiss="offcanvas"]');
      if (btn) btn.click();
    };

    renderThumbnailGrid("secondaryThumbGrid", list, buildSrc, onClick);

  } catch (e) {
    console.error("showSecondaryOffcanvas error", e);
    alert("Error loading secondaries.");
  }
} // end showSecondaryOffcanvas

export async function loadSecondaryObjectInTab(primaryId, item, list, index) {
  const content = await loadSecondary(primaryId, item.path);

  if (!content) {
    alert("Failed to load object data.");
    return;
  }

  const primaryEntry = window.drawRegistry[primaryId];
  if (!primaryEntry) throw new Error("Primary object not found: " + primaryId);

  const mergedEntry = Object.assign({}, primaryEntry);
  mergedEntry.params = Object.assign({}, primaryEntry.params, content.params);
  mergedEntry.name = content.name;

  addDrawSubtab({ name: content.name, entry: mergedEntry });

  const activeId = uiState.draw.activeSubtab;
  const info = uiState.draw.tabs[activeId];

  info.secondary = {
    primaryId: primaryId,
    filename: item.path,
    name: content.name,
    list: list,
    index: index
  };

  setDrawAction();
  setDrawCaption(mergedEntry);
} // end loadSecondaryObjectInTab

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
} // end wireDrawCommandsButton
