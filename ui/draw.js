/* draw.js
   ------------------------------------------------------------
   Draw Tab Spec + Controller
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
import { menuManager }            from "./menuManager.js";
import { showScriptOffcanvas }    from "./offcanvas.js";
import { buildParameterControls } from "./parameterControls.js";
import { uiState }                from "./uiState.js";
import { clearDivs }              from "./ui_utilities.js";

const DEFAULT_DRAW_SUBTAB = "tab-categories";

/* ===========================================================
   DrawTabSpec
   -----------------------------------------------------------
   Declarative description of the Draw tab. This is the
   architectural anchor for the new system, even if setUI
   is only partially using it today.
=========================================================== */
export const DrawTabSpec = {
  name: "draw",
  theme: "theme-draw",

  regions: ["subtabs", "sketchpad", "caption", "text", "buttons", "action"],

  // lifecycle hooks
  init: initDrawTab,
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
   Logical grouping of Draw operations. No behavior change,
   just structured access to the same functions.
=========================================================== */
export const DrawController = {
  // lifecycle
  initDrawTab,
  drawActiveTab,
  saveDrawState,

  // subtabs
  setDrawSubtabs,
  addDrawSubtab,
  deleteTab,
  switchTab,

  // state helpers
  markTabDirty,
  markTabClean,

  // canvas + regions
  clearCanvas,
  setDrawAction,
  setDrawButtons,
  clearDrawCaption,
  setDrawCaption,
  setDrawSketchpad,
  setDrawText,

  // object operations
  copyActiveDrawObject,

  // menu
  buildDrawMenuItems,

  // categories pipeline
  collectRegistryEntries,
  groupEntriesByCategory,
  renderDrawCategories
}; // end DrawController


/* ===========================================================
   initDrawTab(restored = false)
   -----------------------------------------------------------
   Called when the Draw tab becomes active.
   - Clears shared UI regions
   - Builds the subtab bar
   - Restores the active subtab if any, else Categories
=========================================================== */
export function initDrawTab(restored = false) {
  // Always ensure structure exists BEFORE anything renders subtabs
  if (!uiState.draw.tabs) {
    uiState.draw.tabs = {};
  }
  clearDivs();                    // clear shared UI areas
  setDrawSubtabs();               // build subtab bar

  const activeId =
    uiState.draw.activeSubtb ||      // restore saved tab if any
    DEFAULT_DRAW_SUBTAB;          // otherwise use Categories

  switchTab(activeId);            // activate that tab
} // end initDrawTab


/* ===========================================================
   setDrawSubtabs()
   -----------------------------------------------------------
   Build the subtab bar (#subtabs) for Draw:
     - "Categories" tab
     - One tab per open drawRegistry entry
=========================================================== */
function setDrawSubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setDrawSubtabs: #subtabs not found");

  el.innerHTML = "";                          // reset container

  // Build the <ul> bar that holds the tab buttons
  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs draw-subtabs";
  el.appendChild(bar);

  const existing = uiState.draw.tabs;
  const ids = existing ? Object.keys(existing) : [];

  // No existing tabs → create only the Categories tab
  if (!ids.length) {
    addDrawSubtab({ name: "Categories" });
    return;
  }

  // Rebuild subtabs from saved state
  ids.forEach((id) => {
    const info = existing[id];
    if (!info) return;

    let name;
    if (info.type === "categories") {
      name = "Categories";
    } else if (info.drawRegistry && info.drawRegistry.name) {
      name = info.drawRegistry.name;
    } else {
      // fallback to tab id without the "tab-" prefix
      name = id.replace(/^tab-/, "");
    }

    // Recreate the tab using the drawRegistry entry
    addDrawSubtab({ name: name, entry: info.drawRegistry });
  });
} // end setDrawSubtabs


/* ===========================================================
   switchTab(tabId)
   -----------------------------------------------------------
   Switch to the Draw subtab identified by tabId.
   - Updates active visual state
   - Clears UI regions
   - Renders categories or active object
=========================================================== */
function switchTab(tabId) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) return;

  // Remove "active" from all buttons
  bar.querySelectorAll(".nav-link").forEach((b) =>
    b.classList.remove("active")
  );

  // Mark the clicked tab active
  const btn = bar.querySelector(`[data-tab-id="${tabId}"]`);
  if (btn) btn.classList.add("active");

  uiState.draw.activeSubtb = tabId;   // track current tab
  clearDivs();                     // clear UI areas

  const info = uiState.draw.tabs[tabId];
  if (!info) return;

  // Dispatch behavior by type of subtab
  if (info.type === "categories") {
    renderDrawCategories();
  } else {
    drawActiveTab();
  }
} // end switchTab


/* ===========================================================
   deleteTab(tabId)
   -----------------------------------------------------------
   Remove a Draw subtab and switch to a neighbor if possible.
   - Deletes the tab button
   - Deletes the tab state
   - Switches to neighbor or rebuilds from scratch
=========================================================== */
function deleteTab(tabId) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) return;

  const btns = Array.from(bar.querySelectorAll(".nav-link"));
  const idx = btns.findIndex((b) => b.dataset.tabId === tabId);
  if (idx === -1) return;

  // Remove the tab button
  const li = btns[idx].parentElement;
  if (li) li.remove();

  // Drop tab state
  delete uiState.draw.tabs[tabId];

  // Switch to next tab if possible, otherwise rebuild from scratch
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
   Add / remove " *" to tab label when parameters change.
=========================================================== */
function markTabDirty(tabId) {
  const info = uiState.draw.tabs[tabId];
  if (!info || info.dirty) return;

  info.dirty = true;

  const btn = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (!btn) return;

  btn.textContent += " *";     // append dirtiness marker
} // end markTabDirty


function markTabClean(tabId) {
  const info = uiState.draw.tabs[tabId];
  if (!info) return;

  info.dirty = false;

  const btn = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (!btn) return;

  // Remove trailing " *"
  btn.textContent = btn.textContent.replace(/\s\*$/, "");
} // end markTabClean


/* ===========================================================
   addDrawSubtab(item)
   -----------------------------------------------------------
   Create a new Draw subtab for either:
     - Categories, or
     - a specific drawRegistry entry

   Arguments:
     item (object):
       name  (string) – label for the tab
       entry (object) – drawRegistry entry (required unless name=="Categories")
=========================================================== */
export function addDrawSubtab(item) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) throw new Error("addDrawSubtab: subtab bar not found");

  // Convert tab label → DOM-friendly id
  const tabId = "tab-" + item.name.replace(/\s+/g, "-").toLowerCase();

  // Make this new tab active by clearing active classes
  bar.querySelectorAll(".nav-link").forEach((btn) =>
    btn.classList.remove("active")
  );

  // Build <li><button> for the new tab
  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className = "nav-link active";
  btn.dataset.tabId = tabId;

  // Clicking the tab switches to it
  btn.addEventListener("click", () => switchTab(tabId));

  // Visible label
  const labelSpan = document.createElement("span");
  labelSpan.textContent = item.name;
  labelSpan.className = "tab-label";
  btn.appendChild(labelSpan);

  // Add close button (except for Categories)
  if (item.name !== "Categories") {
    const closeBtn = document.createElement("span");
    closeBtn.textContent = "×";
    closeBtn.className = "tab-close";
    closeBtn.title = "Close tab";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteTab(tabId);
    });
    btn.appendChild(closeBtn);
  }

  li.appendChild(btn);
  bar.appendChild(li);

  // Categories tab has no drawRegistry entry
  if (item.name === "Categories") {
    uiState.draw.tabs[tabId] = { type: "categories" };
    uiState.draw.activeSubtb = tabId;
    clearDivs();
    renderDrawCategories();
    return;
  }

  // All other subtabs require a drawRegistry entry
  const entry = item.entry;
  if (!entry) {
    throw new Error(
      "addDrawSubtab: missing drawRegistry entry for " + item.name
    );
  }

  // Initialize default geometry & StringThing
  entry.init();

  uiState.draw.tabs[tabId] = {
    type: "object",
    drawRegistry: entry,
    dirty: false,
    parameters: entry.params
  };

  uiState.draw.activeSubtb = tabId;
  clearDivs();
  drawActiveTab();
} // end addDrawSubtab


/* ===========================================================
   setDrawSketchpad(item)
   -----------------------------------------------------------
   Programmatically activate an existing Draw subtab matching
   the given item's name and immediately redraw it.
=========================================================== */
export function setDrawSketchpad(item) {
  const tabId = "tab-" + item.name.replace(/\s+/g, "-").toLowerCase();
  uiState.draw.activeSubtb = tabId;   // switch to the tab
  drawActiveTab();                 // redraw its object
} // end setDrawSketchpad


/* ===========================================================
   drawActiveTab()
   -----------------------------------------------------------
   Core Draw logic — rebuilds the canvas area, loads the
   drawRegistry entry for the active tab, constructs parameter
   controls, and performs an actual redraw.
=========================================================== */
export function drawActiveTab() {
  const tabId = uiState.draw.activeSubtb;
  const info = uiState.draw.tabs[tabId];

  // Only object tabs have drawRegistry entries
  if (!info || info.type !== "object" || !info.drawRegistry) return;

  const entry = info.drawRegistry;

  // Update caption and buttons for this entry
  setDrawCaption(entry);
  setDrawButtons();

  // ---------------------------------------------------------
  // Canvas setup
  // ---------------------------------------------------------
  const sketchpadDiv = document.getElementById("sketchpad");
  if (!sketchpadDiv)
    throw new Error("drawActiveTab: #sketchpad div not found");
  sketchpadDiv.innerHTML = "";

  const canvas = window.drawCanvas;
  if (!canvas)
    throw new Error("drawActiveTab: window.drawCanvas not initialized");

  // Reinsert the shared canvas into the sketchpad area
  sketchpadDiv.appendChild(canvas);

  const localCtx = window.ctx;
  if (!localCtx)
    throw new Error("drawActiveTab: window.ctx not found");

  // Clear the drawing region
  localCtx.clearRect(0, 0, canvas.width, canvas.height);

  // ---------------------------------------------------------
  // Parameter updating and drawing
  // ---------------------------------------------------------
  const state = uiState.draw.tabs[tabId];
  if (!state) throw new Error("drawActiveTab: tab state missing");

  // Register the redraw handler — lets parameter UI re-invoke us
  state.redrawHandler = drawActiveTab;

  // Build the parameter controls for this object
  buildParameterControls(state, "tab-draw", true);

  try {
    // Update parameters from registry
    const params = (state.parameters = entry.params);

    // Registry-driven update() and draw()
    entry.update(params);
    entry.draw();

    console.log("✅ Redrew " + entry.name);
  } catch (err) {
    console.error("❌ Error redrawing " + entry.name + ":", err);
  }
} // end drawActiveTab


/* ===========================================================
   clearCanvas()
   -----------------------------------------------------------
   Clear the entire shared canvas. Usually called implicitly
   through drawActiveTab; rarely needed elsewhere.
=========================================================== */
function clearCanvas() {
  const canvas = window.drawCanvas;
  if (!canvas) return;

  const localCtx = window.ctx;
  if (!localCtx) return;

  localCtx.clearRect(0, 0, canvas.width, canvas.height);
} // end clearCanvas


/* ===========================================================
   setDrawAction()
   -----------------------------------------------------------
   Clear the #action region for Draw. Draw does not use this
   area heavily yet, but the function preserves consistency
   with other tabs.
=========================================================== */
function setDrawAction() {
  const el = document.getElementById("action");
  if (el) el.innerHTML = "";
} // end setDrawAction


/* ===========================================================
   setDrawButtons()
   -----------------------------------------------------------
   Draw tab: now controlled entirely by caption-menu.
   Keep region clean, no local buttons.
=========================================================== */
function setDrawButtons() {
  const el = document.getElementById("buttons");
  if (!el) throw new Error("setDrawButtons: #buttons not found");

  el.innerHTML = "";   // keep region clean, no local buttons
} // end setDrawButtons


/* ===========================================================
   clearDrawCaption()
   -----------------------------------------------------------
   Empty the #caption area when switching into the Draw tab.
=========================================================== */
function clearDrawCaption() {
  const el = document.getElementById("caption");
  if (el) el.innerHTML = "";
} // end clearDrawCaption

/* ===========================================================
   setDrawCaption(entry)
   -----------------------------------------------------------
   Populate the caption bar with the title of the active
   drawRegistry entry, plus the menu button.
=========================================================== */
function setDrawCaption(entry) {
  const title = entry.name || "(untitled)";

  // Draw has no Prev/Next
  const onPrev = null;
  const onNext = null;

  const onMenu = async (anchor, ev) => {
    if (!(anchor instanceof HTMLElement)) {
      throw new Error("setDrawCaption: anchor is not a DOM element");
    }

    // Find registry key for this entry
    const registryKey = Object.keys(window.drawRegistry).find(
      (k) => window.drawRegistry[k] === entry
    );
    if (!registryKey)
      throw new Error(
        "setDrawCaption: registry key not found for " + entry.name
      );

    // Script path for Show Script
    const scriptPath = `../draw/${registryKey}.js`;

    // Build menu item array
    const items = await buildDrawMenuItems("draw", registryKey, scriptPath);

    // Open menu
    menuManager.open(items, anchor);
  };

  setCaptionBar({
    targetId: "caption",
    title: title,
    onPrev: onPrev,
    onNext: onNext,
    onMenu: onMenu
  });
} // end setDrawCaption


/* ===========================================================
   setDrawText()
   -----------------------------------------------------------
   Populate the #text region for the Draw tab.
   Currently shows the same content as Categories.
=========================================================== */
export function setDrawText() {
  renderDrawCategories();
} // end setDrawText


/* ===========================================================
   copyActiveDrawObject()
   -----------------------------------------------------------
   Duplicate the currently active drawRegistry entry into
   a new subtab, with "(Copy)" or "(Copy n)" appended.
=========================================================== */
export function copyActiveDrawObject() {
  const tabId = uiState.draw.activeSubtb;
  const info = uiState.draw.tabs[tabId];
  if (!info || info.type !== "object") return;

  const entry = info.drawRegistry;

  // Deep clone the parameters
  const newParams = structuredClone(info.parameters);

  // Build a unique new name based on existing copies
  const baseName = entry.name.replace(/\s*\(Copy.*\)$/i, "").trim();

  const existingNames = Object.values(uiState.draw.tabs)
    .filter(
      (t) =>
        t.type === "object" &&
        t.drawRegistry &&
        t.drawRegistry.name &&
        t.drawRegistry.name.startsWith(baseName)
    )
    .map((t) => t.drawRegistry.name);

  let nextNumber = 1;
  existingNames.forEach((name) => {
    const match = name.match(/\(Copy\s*(\d*)\)$/i);
    if (match) {
      const num = parseInt(match[1] || "1", 10);
      if (num >= nextNumber) nextNumber = num + 1;
    }
  });

  const newName =
    nextNumber === 1
      ? baseName + " (Copy)"
      : baseName + " (Copy " + nextNumber + ")";

  // Construct the new entry
  const newItem = {
    name: newName,
    entry: { ...entry, name: newName, params: newParams }
  };

  addDrawSubtab(newItem);
} // end copyActiveDrawObject


/* ===========================================================
   extractCategoryNames(organized)
   -----------------------------------------------------------
   Helper: return sorted category names from grouped registry.
=========================================================== */
function extractCategoryNames(organized) {
  return Object.keys(organized).sort();
} // end extractCategoryNames


/* ===========================================================
   saveDrawState()
   -----------------------------------------------------------
   Serialize the Draw tab’s state so it can be restored later:
   - activeDrawTab
   - per-subtab parameters and dirty flags
   - drawRegistry key for each tab
=========================================================== */
export function saveDrawState() {
  const shallowTabs = {};

  for (const [id, info] of Object.entries(uiState.draw.tabs || {})) {
    let key = null;

    // Determine the key of the drawRegistry entry
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
    activeDrawTab: uiState.draw.activeSubtb || null,
    drawTabs: shallowTabs
  };

  console.log("💾 Saved Draw state (serializable):", state);
  return state;
} // end saveDrawState


/* ===========================================================
   restoreDrawState(saved)
   -----------------------------------------------------------
   Restore a Draw-state snapshot created by saveDrawState().
   NOTE:
     This function is currently not wired to any caller.
     It remains available for future use or a restore button.
=========================================================== */
function restoreDrawState(saved) {
  if (!saved) return;

  uiState.draw.tabs = {};

  // Rebuild uiState.draw.tabs with real drawRegistry references
  for (const [id, info] of Object.entries(saved.drawTabs || {})) {
    const entry =
      typeof info.drawRegistry === "string"
        ? (window.drawRegistry || {})[info.drawRegistry]
        : info.drawRegistry;

    uiState.draw.tabs[id] = { ...info, drawRegistry: entry };
  }

  const targetTab = saved.activeDrawTab || null;
  uiState.draw.activeSubtb = targetTab;

  const el = document.getElementById("subtabs");
  if (!el) throw new Error("restoreDrawState: #subtabs not found");
  el.innerHTML = "";

  // Rebuild the <ul> bar
  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs draw-subtabs";
  el.appendChild(bar);

  // Recreate each subtab
  for (const [id, info] of Object.entries(uiState.draw.tabs)) {
    const name =
      info.type === "categories"
        ? "Categories"
        : (info.drawRegistry && info.drawRegistry.name) ||
          id.replace(/^tab-/, "");
    addDrawSubtab({ name: name, entry: info.drawRegistry });
  }

  // Switch to the saved active tab
  if (targetTab) {
    console.log("🔄 Restoring Draw tab:", targetTab);
    switchTab(targetTab);
  } else {
    console.warn("⚠️ Could not restore Draw tab — using default init");
    initDrawTab();
  }

  console.log("✅ Restored Draw state:", saved);
} // end restoreDrawState


/* ===========================================================
   buildDrawMenuItems()
   -----------------------------------------------------------
   Creates the menu array for the Draw tab.
   - Uses menuManager.buildHelpItem() to enable/disable Help
   - Always includes "Show Script" and "Duplicate"
=========================================================== */
export async function buildDrawMenuItems(tabName, itemName, scriptPath) {
  const items = [];

  // -------------------------------------------------------
  // HELP: defer existence check to menuManager.buildHelpItem
  // -------------------------------------------------------
  const helpItem = await menuManager.buildHelpItem(tabName, itemName);
  items.push(helpItem);

  // -------------------------------------------------------
  // SCRIPT  (unchanged — just push the path)
  // -------------------------------------------------------
  items.push({
    label: "Show Script",
    onClick: () => showScriptOffcanvas(scriptPath, itemName)
  });

  // -------------------------------------------------------
  // DUPLICATE
  // -------------------------------------------------------
  items.push({
    label: "Duplicate",
    onClick: () => {
      copyActiveDrawObject();
    }
  });

  return items;
} // end buildDrawMenuItems


/* ===========================================================
   DRAW → CATEGORY DATA PREPARATION
   -----------------------------------------------------------
   These helpers prepare drawRegistry entries for rendering
   with categories.js.  All UI-independent work happens here.
=========================================================== */

/* -----------------------------------------------------------
   collectRegistryEntries()
   Collects drawRegistry into a flat list of:
     { key, name, category, entry }
----------------------------------------------------------- */
function collectRegistryEntries() {
  const reg = window.drawRegistry || {};
  const out = [];

  for (const [key, entry] of Object.entries(reg)) {
    if (!entry || typeof entry !== "object") continue;

    out.push({
      key: key,
      name: entry.name || key,
      category: entry.category || "uncategorized",
      entry: entry
    });
  }

  return out;
} // end collectRegistryEntries


/* -----------------------------------------------------------
   groupEntriesByCategory(list)
   Groups entries into:
     { categoryName: [ {name, entry, …}, … ] }
   Sorted category names and sorted item names.
----------------------------------------------------------- */
function groupEntriesByCategory(list = []) {
  const grouped = {};

  list.forEach((it) => {
    const cat = it.category || "uncategorized";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(it);
  });

  // sort category names
  const sorted = {};
  const cats = Object.keys(grouped).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  // sort items within each category
  cats.forEach((cat) => {
    sorted[cat] = grouped[cat].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  });

  return sorted;
} // end groupEntriesByCategory


/* -----------------------------------------------------------
   renderDrawCategories()
   Pipeline:
     collectRegistryEntries →
     groupEntriesByCategory →
     categories.js:renderCategories()
----------------------------------------------------------- */
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
