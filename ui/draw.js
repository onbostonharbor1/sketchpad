/* draw.js
   ------------------------------------------------------------
   Draw Tab Spec + Controller  (UPDATED FOR NEW ARCHITECTURE)
   ------------------------------------------------------------
   Responsibilities:
     - Manage Draw subtabs (Categories + object tabs)
     - Render drawRegistry objects into the shared canvas
     - Build parameter controls for the active object
     - Integrate with caption bar + menuManager
     - Provide save/restore for Draw state
   ------------------------------------------------------------ */

import { setCaptionBar }          from "./caption.js";
import { renderCategories }       from "./categories.js";
import { copyActiveDrawObject, resetActiveDrawObject }
                                  from "./drawMenuCmds.js";
import { menuManager }            from "./menuManager.js";
import { buildParameterControls } from "./parameterControls.js";
import { clearDivs, showScriptOffcanvas }              from "./ui_utilities.js";

const DEFAULT_DRAW_SUBTAB = "tab-categories";   // Categories is always the root
const TAB_NAME            = "draw";             // Used for help/menu lookups

/* ===========================================================
   DrawTabSpec
   -----------------------------------------------------------
   Declarative description of the Draw tab for setUI.
   This remains the structural contract: init, save, and the
   region builder functions.
=========================================================== */
export const DrawTabSpec = {
  name: TAB_NAME,
  theme: "theme-draw",

  regions: ["subtabs", "sketchpad", "caption", "text", "action"],

  // lifecycle hooks
  init: initDrawTab,
  restore() {
    restoreDrawTab();
  }, // end restore
  save: saveDrawState,

  // region builders
  buildSubtabs: setDrawSubtabs,
  clearCaption: clearDrawCaption,
  buildCaptionForObject: setDrawCaption,
  buildText: setDrawText,
  buildAction: setDrawAction,
  buildSketchpad: setDrawSketchpad
}; // end DrawTabSpec

/* ===========================================================
   DrawController
   -----------------------------------------------------------
   Organizational grouping.  No behavior change.
=========================================================== */
export const DrawController = {
  initDrawTab,
  drawActiveTab,
  saveDrawState,

  setDrawSubtabs,
  addDrawSubtab,
  deleteTab,
  switchTab,

  markTabDirty,
  markTabClean,

  clearCanvas,
  setDrawAction,
  clearDrawCaption,
  setDrawCaption,
  setDrawSketchpad,
  setDrawText,

  copyActiveDrawObject,

  buildDrawMenuItems,

  collectRegistryEntries,
  groupEntriesByCategory,
  renderDrawCategories
}; // end DrawController

/* ===========================================================
   initDrawTab(restored = false)
   -----------------------------------------------------------
   Called when Draw tab becomes active.
   - Ensures draw.tab structure exists
   - Clears shared regions
   - Builds subtabs
   - Restores previous active subtab or defaults to Categories
=========================================================== */
export function initDrawTab(restored = false) {
  // Ensure the tabs dictionary exists
  if (!uiState.draw.tabs) {

    uiState.draw.tabs = {}; // Initialize the tabs if not present
  }

  clearDivs();

  setDrawSubtabs();

  const activeId =
    uiState.draw.activeSubtab || DEFAULT_DRAW_SUBTAB;

  switchTab(activeId);
} // end initDrawTab

function restoreDrawTab() {

  // 1. Rebuild subtabs from uiState.draw.tabs
  setDrawSubtabs();

  // 2. Identify which tab was active last time
  const activeId = uiState.draw.activeSubtab || DEFAULT_DRAW_SUBTAB;

  // 3. If tab does not exist (edge case), fall back to Categories
  if (!uiState.draw.tabs[activeId]) {
    uiState.draw.activeSubtab = DEFAULT_DRAW_SUBTAB;
    clearDivs();
    renderDrawCategories();
    return;
  }

  // 4. Switch into the restored tab
  switchTab(activeId);
} // end restoreDrawTab



/* ===========================================================
   setDrawSubtabs()
   -----------------------------------------------------------
   Build / rebuild Draw subtabs:
     - Categories (always)
     - One tab per open draw object instance
=========================================================== */
function setDrawSubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setDrawSubtabs: #subtabs not found");

  el.innerHTML = "";

  // Subtab bar <ul>
  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs draw-subtabs";
  el.appendChild(bar);

  const existing = uiState.draw.tabs;
  const ids = existing ? Object.keys(existing) : [];

  // If no tabs exist, create only Categories
  if (!ids.length) {
    addDrawSubtab({ name: "Categories" });
    return;
  }

  // Otherwise recreate subtabs from uiState
  ids.forEach((id) => {
    const info = existing[id];
    if (!info) return;

    let name;
    if (info.type === "categories") {
      name = "Categories";
    } else if (info.drawRegistry && info.drawRegistry.name) {
      name = info.drawRegistry.name;
    } else {
      name = id.replace(/^tab-/, "");
    }

    addDrawSubtab({ name: name, entry: info.drawRegistry });
  });
} // end setDrawSubtabs

/* ===========================================================
   switchTab(tabId)
   -----------------------------------------------------------
   Switch to a Draw subtab.
   - Marks it active
   - Clears shared regions
   - Dispatches to Categories or Object renderer
=========================================================== */
function switchTab(tabId) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) return;

  // Remove "active" from all subtabs
  bar.querySelectorAll(".nav-link").forEach((btn) =>
    btn.classList.remove("active")
  );

  // Mark this button active
  const btn = bar.querySelector(`[data-tab-id="${tabId}"]`);
  if (btn) btn.classList.add("active");

  // Track active tab
  uiState.draw.activeSubtab = tabId;

  // Clear UI regions
  clearDivs();

  const info = uiState.draw.tabs[tabId];
  if (!info) return;

  // Dispatch by type
  if (info.type === "categories") {
    renderDrawCategories();
  } else {
    drawActiveTab();
  }
} // end switchTab

/* ===========================================================
   deleteTab(tabId)
   -----------------------------------------------------------
   Remove a Draw subtab.
   - Remove button
   - Delete state
   - Switch to neighbor, or rebuild from scratch
=========================================================== */
function deleteTab(tabId) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) return;

  const btns = Array.from(bar.querySelectorAll(".nav-link"));
  const idx = btns.findIndex((b) => b.dataset.tabId === tabId);
  if (idx === -1) return;

  // Remove tab button
  const li = btns[idx].parentElement;
  if (li) li.remove();

  // Delete state
  delete uiState.draw.tabs[tabId];

  // Switch to neighbor if possible
  const neighbor = btns[idx + 1] || btns[idx - 1];
  if (neighbor) {
    switchTab(neighbor.dataset.tabId);
  } else {
    setDrawSubtabs();
  }
} // end deleteTab

/* ===========================================================
   markTabDirty / markTabClean
   -----------------------------------------------------------
   Add/remove the “ *” indicator on the tab label.
=========================================================== */
function markTabDirty(tabId) {
  const info = uiState.draw.tabs[tabId];
  if (!info || info.dirty) return;

  info.dirty = true;

  const btn = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (!btn) return;

  const label = btn.querySelector(".tab-label");
  if (!label) return;

  // Insert " *" BEFORE the close button
  if (!label.textContent.endsWith(" *")) {
    label.textContent = label.textContent + " *";
  }
} // end markTabDirty


export function markTabClean(tabId) {
  const info = uiState.draw.tabs[tabId];
  if (!info) return;

  info.dirty = false;

  const btn = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (!btn) return;

  const label = btn.querySelector(".tab-label");
  if (!label) return;

  // Remove trailing " *"
  label.textContent = label.textContent.replace(/\s\*$/, "");
} // end markTabClean


/*************************************************************
   addDrawSubtab(item)
   -----------------------------------------------------------
   Create a new Draw subtab:
     - Categories tab
     - or object tab (with a drawRegistry entry)
*************************************************************/
export function addDrawSubtab(item) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) throw new Error("addDrawSubtab: #subtabs ul not found");

  // Construct DOM-friendly id
  const tabId = "tab-" + item.name.replace(/\s+/g, "-").toLowerCase();

  // Clear active tab markers
  bar.querySelectorAll(".nav-link").forEach((b) =>
    b.classList.remove("active")
  );

  // Build <li><button>
  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className = "nav-link active";
  btn.dataset.tabId = tabId;

  // Clicking activates this subtab
  btn.addEventListener("click", () => switchTab(tabId));

  // Visible label
  const label = document.createElement("span");
  label.className = "tab-label";
  label.textContent = item.name;
  btn.appendChild(label);

  // Close button (not for Categories)
  if (item.name !== "Categories") {
    const closeBtn = document.createElement("span");
    closeBtn.textContent = "×";
    closeBtn.className = "tab-close";
    closeBtn.title = "Close tab";
    closeBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      deleteTab(tabId);
    });
    btn.appendChild(closeBtn);
  }

  li.appendChild(btn);
  bar.appendChild(li);

  // -------------------------------------------
  // Case 1: Categories tab
  // -------------------------------------------
  if (item.name === "Categories") {
    uiState.draw.tabs[tabId] = { type: "categories" };
    uiState.draw.activeSubtab = tabId;
    clearDivs();
    renderDrawCategories();
    return;
  }

  // -------------------------------------------
  // Case 2: Object tab — requires drawRegistry entry
  // -------------------------------------------
  const entry = item.entry;
  if (!entry) {
    throw new Error(
      "addDrawSubtab: missing drawRegistry entry for " + item.name
    );
  }

  // Initialize geometry + StringThing + params
  entry.init();

  uiState.draw.tabs[tabId] = {
    type: "object",
    drawRegistry: entry,
    dirty: false,
    parameters: entry.params
  };

  uiState.draw.activeSubtab = tabId;
  clearDivs();
  drawActiveTab();
} // end addDrawSubtab

/*************************************************************
   setDrawSketchpad(item)
   -----------------------------------------------------------
   Activate an existing object subtab by name and redraw it.
*************************************************************/
export function setDrawSketchpad(item) {
  const tabId = "tab-" + item.name.replace(/\s+/g, "-").toLowerCase();
  uiState.draw.activeSubtab = tabId;
  drawActiveTab();
} // end setDrawSketchpad

/*************************************************************
   drawActiveTab()
   -----------------------------------------------------------
   Core logic:
     - Identify active tab
     - Build caption bar
     - Insert shared canvas
     - Apply updated parameters
     - Run entry.update() and entry.draw()
*************************************************************/
export function drawActiveTab() {
  const tabId = uiState.draw.activeSubtab;
  const info = uiState.draw.tabs[tabId];

  // Only object tabs are drawable
  if (!info || info.type !== "object" || !info.drawRegistry) return;

  const entry = info.drawRegistry;

  // --------------------------
  // Caption bar
  // --------------------------
  setDrawCaption(entry);

  // --------------------------
  // Prepare sketchpad
  // --------------------------
  const sketchpad = document.getElementById("sketchpad");
  if (!sketchpad) throw new Error("drawActiveTab: #sketchpad not found");
  sketchpad.innerHTML = "";

  const canvas = window.drawCanvas;
  if (!canvas) throw new Error("drawActiveTab: window.drawCanvas missing");

  // Put the shared canvas inside #sketchpad
  sketchpad.appendChild(canvas);

  const c = window.ctx;
  if (!c) throw new Error("drawActiveTab: window.ctx missing");

  c.clearRect(0, 0, canvas.width, canvas.height);

  // --------------------------
  // Sync interaction overlay with canvas
  // NOTE: now that canvasOverlayLayers lives INSIDE #sketchpad,
  //       we treat coordinates as LOCAL to #sketchpad / canvas.
  // --------------------------
  const inter = overlayManager.getCanvasLayer("interaction");

  // Clear all old point-picker dots
  inter.innerHTML = "";

  // Make interaction layer sit exactly over the canvas area
  inter.style.position = "absolute";
  inter.style.left = "0px";
  inter.style.top = "0px";
  inter.style.width = canvas.width + "px";
  inter.style.height = canvas.height + "px";
  inter.style.pointerEvents = "none";   // dots themselves will re-enable
  inter.style.display = "block";

  // --------------------------
  // Parameter UI
  // --------------------------
  const state = uiState.draw.tabs[tabId];
  if (!state) throw new Error("drawActiveTab: missing tab state");

  state.redrawHandler = drawActiveTab;
  state.onParamChange = () => markTabDirty(tabId);

  buildParameterControls(state, "tab-draw", true);

  // --------------------------
  // update() + draw()
  // --------------------------
  try {
    const params = (state.parameters = entry.params);
    entry.update(params);
    entry.draw();
  } catch (err) {
    console.error("✗ Error redrawing " + entry.name, err);
  }
} // end drawActiveTab


/*************************************************************
   clearCanvas()
*************************************************************/
function clearCanvas() {
  const canvas = window.drawCanvas;
  if (!canvas) return;

  const c = window.ctx;
  if (!c) return;

  c.clearRect(0, 0, canvas.width, canvas.height);
} // end clearCanvas

/*************************************************************
   setDrawAction()
   -----------------------------------------------------------
   Draw tab does not currently use the #action area except for
   hosting parameter controls (built in drawActiveTab).
*************************************************************/
function setDrawAction() {
  const el = document.getElementById("action");
  if (el) el.innerHTML = "";
} // end setDrawAction

/*************************************************************
   clearDrawCaption()
*************************************************************/
function clearDrawCaption() {
  const el = document.getElementById("caption");
  if (el) el.innerHTML = "";
} // end clearDrawCaption

/*************************************************************
   setDrawCaption(entry)
   -----------------------------------------------------------
   Build caption bar for active draw object:
     • Title
     • No Prev/Next
     • v-menu (help, show script, duplicate)
*************************************************************/
function setDrawCaption(entry) {
  const title = entry.name || "(untitled)";

  const onMenu = async (anchor, ev) => {
    if (!(anchor instanceof HTMLElement)) {
      throw new Error("setDrawCaption: anchor is not a DOM element");
    }

    // Find registry key in drawRegistry
    const registryKey = Object.keys(window.drawRegistry).find(
      (k) => window.drawRegistry[k] === entry
    );
    if (!registryKey) {
      throw new Error(
        "setDrawCaption: registry key not found for entry " + entry.name
      );
    }

    // Script path for Show Script
    const scriptPath = `/drawRegistry/${registryKey}.js`;

    // Build menu items
    const items = await buildDrawMenuItems("draw", registryKey, scriptPath);

    // Open menu
    menuManager.open(items, anchor);
  };

  setCaptionBar({
    targetId: "caption",
    title: title,
    onPrev: null,
    onNext: null,
    onMenu: onMenu
  });
} // end setDrawCaption

/*************************************************************
   setDrawText()
   -----------------------------------------------------------
   Draw tab uses the Categories listing in #text when
   Categories subtab is active.
*************************************************************/
export function setDrawText() {
  renderDrawCategories();
} // end setDrawText



/*************************************************************
   extractCategoryNames()
*************************************************************/
function extractCategoryNames(organized) {
  return Object.keys(organized).sort();
} // end extractCategoryNames

/*************************************************************
   saveDrawState()
   -----------------------------------------------------------
   Collect the serializable snapshot of Draw subtabs.
*************************************************************/
export function saveDrawState() {
  const shallowTabs = {};

  for (const [id, info] of Object.entries(uiState.draw.tabs || {})) {
    let key = null;

    // Determine registry key
    if (info.drawRegistry) {
      for (const [k, v] of Object.entries(window.drawRegistry || {})) {
        if (v === info.drawRegistry) {
          key = k;
          break;
        }
      }
    }

    shallowTabs[id] = {
      type: info.type,
      dirty: info.dirty,
      parameters: structuredClone(info.parameters || {}),
      drawRegistry: key
    };
  }

  const state = {
    activeDrawTab: uiState.draw.activeSubtab || null,
    drawTabs: shallowTabs
  };

  return state;
} // end saveDrawState

/*************************************************************
   buildDrawMenuItems()
   -----------------------------------------------------------
   Build menu array for Draw tab.
   Uses menuManager.buildHelpItem()
*************************************************************/
export async function buildDrawMenuItems(tabName, itemName, scriptPath) {
  const items = [];

  // HELP
  const helpItem = await menuManager.buildHelpItem(tabName, itemName);
  items.push(helpItem);

  // SCRIPT
  items.push({
    label: "Show Script",
    onClick: () => showScriptOffcanvas(scriptPath, itemName)
  });

  // DUPLICATE
  items.push({
    label: "Duplicate",
    onClick: () => {
      copyActiveDrawObject();
    }
  });

  // RESET
  items.push({
  label: "Reset",
  onClick: () => {
    resetActiveDrawObject();
  }
});

  return items;
} // end buildDrawMenuItems

/*************************************************************
   collectRegistryEntries()
   -----------------------------------------------------------
   Transform drawRegistry into a list of
     { key, name, category, entry }
*************************************************************/
function collectRegistryEntries() {
  const reg = window.drawRegistry || {};
  const out = [];

  for (const [key, entry] of Object.entries(reg)) {
    if (!entry || typeof entry !== "object") continue;

    out.push({
      key,
      name: entry.name || key,
      category: entry.category || "uncategorized",
      entry
    });
  }

  return out;
} // end collectRegistryEntries

/*************************************************************
   groupEntriesByCategory()
   -----------------------------------------------------------
   Produce:
     {
       CategoryName: [
         { name, entry, … }
       ]
     }
*************************************************************/
function groupEntriesByCategory(list = []) {
  const grouped = {};

  list.forEach((it) => {
    const cat = it.category || "uncategorized";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(it);
  });

  const sorted = {};
  const cats = Object.keys(grouped).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  cats.forEach((cat) => {
    sorted[cat] = grouped[cat].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  });

  return sorted;
} // end groupEntriesByCategory

/*************************************************************
   renderDrawCategories()
   -----------------------------------------------------------
   collectRegistryEntries()
   → groupEntriesByCategory()
   → categories.js:renderCategories()
*************************************************************/
function renderDrawCategories() {
  const list = collectRegistryEntries();
  const grouped = groupEntriesByCategory(list);

  const descriptor = Object.entries(grouped).map(([cat, items]) => ({
    title: cat,
    items: items.map((it) => ({
      name: it.name,
      hasSubitems: false,
      onClick: () => {
        addDrawSubtab({ name: it.name, entry: it.entry });
      }
    }))
  }));

  renderCategories("text", descriptor);
} // end renderDrawCategories
