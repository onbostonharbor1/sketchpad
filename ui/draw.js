/* draw.js
   ------------------------------------------------------------
   Clean orchestration for the Draw tab.
   Controls:
     - creation and management of Draw subtabs
     - switching and deleting tabs
     - rendering drawRegistry objects
     - wiring category selections
     - updating the canvas and parameter controls
   ------------------------------------------------------------ */

import { renderCategories } from "./categories.js";
import { clearDivs, showSharedOffcanvas } from "./ui_utilities.js";
import { buildParameterControls } from "./parameterControls.js";
import { uiState } from "./uiState.js";
import { setCaptionBar } from "./caption.js";
import { menuManager } from "./menuManager.js";

const DEFAULT_DRAW_SUBTAB = "tab-categories";

/* ===========================================================
   initDrawTab(restored = false)

   Purpose:
     Entry point when the Draw tab becomes active.
     Rebuilds the subtabs bar and restores (or defaults)
     the active Draw subtab.

   Arguments:
     restored (boolean) – ignored for now; placeholder
                          for future state restoration.
=========================================================== */
export function initDrawTab(restored = false) {
  clearDivs();                    // clear shared UI areas
  setDrawSubtabs();               // build subtab bar
  const activeId =
    uiState.activeDrawTab ||      // restore saved tab if any
    DEFAULT_DRAW_SUBTAB;         // otherwise use Categories
  switchTab(activeId);            // activate that tab
} // end initDrawTab


/* ===========================================================
   setDrawSubtabs()

   Purpose:
     Build the subtab bar (#subtabs) for the Draw tab.
     Draw subtabs represent user-opened shapes plus the
     default “Categories” tab.

   Arguments:
     (none)
=========================================================== */
function setDrawSubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setDrawSubtabs: #subtabs not found");

  el.innerHTML = "";                          // reset container

  // Build the <ul> bar that holds the tab buttons
  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs draw-subtabs";
  el.appendChild(bar);

  const existing = uiState.drawTabs;
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

   Purpose:
     Switch to the Draw subtab identified by tabId.
     Re-renders categories or an active drawRegistry entry.

   Arguments:
     tabId (string) – e.g. "tab-categories" or "tab-ellipse"
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

  uiState.activeDrawTab = tabId;   // track current tab
  clearDivs();                     // clear UI areas

  const info = uiState.drawTabs[tabId];
  if (!info) return;

  // Dispatch behavior by type of subtab
  if (info.type === "categories") {
    setDrawCategories();
  } else {
    drawActiveTab();
  }
} // end switchTab


/* ===========================================================
   deleteTab(tabId)

   Purpose:
     Remove a Draw subtab and switch to a neighbor.

   Arguments:
     tabId (string) – id of the tab to delete
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
  delete uiState.drawTabs[tabId];

  // Switch to next tab if possible, otherwise rebuild from scratch
  const neighbor = btns[idx + 1] || btns[idx - 1];
  if (neighbor) {
    switchTab(neighbor.dataset.tabId);
  } else {
    setDrawSubtabs();
  }
} // end deleteTab


/* ===========================================================
   markTabDirty(tabId)

   Purpose:
     Mark a tab as modified by appending an asterisk.
     Used when parameters change.

   Arguments:
     tabId (string)
=========================================================== */
function markTabDirty(tabId) {
  const info = uiState.drawTabs[tabId];
  if (!info || info.dirty) return;

  info.dirty = true;

  const btn = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (!btn) return;

  btn.textContent += " *";     // append dirtiness marker
} // end markTabDirty


/* ===========================================================
   markTabClean(tabId)

   Purpose:
     Remove the “dirty” marker from a tab.

   Arguments:
     tabId (string)
=========================================================== */
function markTabClean(tabId) {
  const info = uiState.drawTabs[tabId];
  if (!info) return;

  info.dirty = false;

  const btn = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (!btn) return;

  // Remove trailing " *"
  btn.textContent = btn.textContent.replace(/\s\*$/, "");
} // end markTabClean


/* ===========================================================
   addDrawSubtab(item)

   Purpose:
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
    uiState.drawTabs[tabId] = { type: "categories" };
    uiState.activeDrawTab = tabId;
    clearDivs();
    setDrawCategories();
    return;
  }

  // All other subtabs require a drawRegistry entry
  const entry = item.entry;
  if (!entry) {
    throw new Error(
      "addDrawSubtab: missing drawRegistry entry for " + item.name
    );
  }

  entry.init();       // Initialize default geometry & StringThing

  uiState.drawTabs[tabId] = {
    type: "object",
    drawRegistry: entry,
    dirty: false,
    parameters: entry.params,
  };

  uiState.activeDrawTab = tabId;
  clearDivs();
  drawActiveTab();
} // end addDrawSubtab

/* ===========================================================
   setDrawSketchpad(item)

   Purpose:
     Programmatically activate an existing Draw subtab matching
     the given item's name and immediately redraw it.

   Arguments:
     item (object):
       name (string) – used to derive the tab id
=========================================================== */
export function setDrawSketchpad(item) {
  const tabId = "tab-" + item.name.replace(/\s+/g, "-").toLowerCase();
  uiState.activeDrawTab = tabId;   // switch to the tab
  drawActiveTab();                 // redraw its object
} // end setDrawSketchpad


/* ===========================================================
   drawActiveTab()

   Purpose:
     Core Draw logic — rebuilds the canvas area, loads the
     drawRegistry entry for the active tab, constructs parameter
     controls, and performs an actual redraw.

   Arguments:
     (none) – operates on uiState.activeDrawTab
=========================================================== */
export function drawActiveTab() {
  const tabId = uiState.activeDrawTab;
  const info = uiState.drawTabs[tabId];

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
  const state = uiState.drawTabs[tabId];
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

   Purpose:
     Clear the entire shared canvas. Usually called implicitly
     through drawActiveTab; rarely needed elsewhere.

   Arguments:
     (none)
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

   Purpose:
     Clear the #action region for Draw. Draw does not use this
     area heavily yet, but the function preserves consistency
     with other tabs.

   Arguments:
     (none)
=========================================================== */
function setDrawAction() {
  const el = document.getElementById("action");
  if (el) el.innerHTML = "";
} // end setDrawAction


/* ===========================================================
   setDrawButtons()

   Purpose:
     Populate the #buttons area with Draw-specific buttons.

   Arguments:
     (none)
=========================================================== */
function setDrawButtons() {
  const el = document.getElementById("buttons");
  if (!el) throw new Error("setDrawButtons: #buttons not found");

  el.innerHTML = "";   // fresh start

  const tabId = uiState.activeDrawTab;
  const info = uiState.drawTabs[tabId];

  // Only object tabs have buttons (e.g., Dup)
  if (!info || info.type !== "object") return;

  const dupBtn = document.createElement("button");
  dupBtn.textContent = "Dup";
  dupBtn.className = "btn btn-sm btn-outline-primary";
  dupBtn.addEventListener("click", () => copyActiveDrawObject());
  el.appendChild(dupBtn);
} // end setDrawButtons


/* ===========================================================
   clearDrawCaption()

   Purpose:
     Empty the #caption area when switching into the Draw tab.
     (setUI always calls the "caption" function with no args.)

   Arguments:
     (none)
=========================================================== */
function clearDrawCaption() {
  const el = document.getElementById("caption");
  if (el) el.innerHTML = "";
} // end clearDrawCaption


/* ===========================================================
   setDrawCaption(entry)

   Purpose:
     Populate the caption bar with the title of the active
     drawRegistry entry, plus the menu button.

   Arguments:
     entry (object) – drawRegistry entry currently active
=========================================================== */
function setDrawCaption(entry) {
  const title = entry.name || "(untitled)";

  // Draw tab has no Prev/Next arrows
  const onPrev = null;
  const onNext = null;

  // Offcanvas viewer for registry JSON
  const onMenu = () => {
    showSharedOffcanvas(
      "Draw Registry: " + title,
      JSON.stringify(entry, null, 2)
    );
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

   Purpose:
     Populate the #text region for the Draw tab.
     Currently shows the same content as Categories.

   Arguments:
     (none)
=========================================================== */
export function setDrawText() {
  setDrawCategories();
} // end setDrawText


/* ===========================================================
   copyActiveDrawObject()

   Purpose:
     Duplicate the currently active drawRegistry entry into
     a new subtab, with "(Copy)" or "(Copy n)" appended.

   Arguments:
     (none)
=========================================================== */
function copyActiveDrawObject() {
  const tabId = uiState.activeDrawTab;
  const info = uiState.drawTabs[tabId];
  if (!info || info.type !== "object") return;

  const entry = info.drawRegistry;

  // Deep clone the parameters
  const newParams = structuredClone(info.parameters);

  // Build a unique new name based on existing copies
  const baseName = entry.name.replace(/\s*\(Copy.*\)$/i, "").trim();

  const existingNames = Object.values(uiState.drawTabs)
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
    entry: { ...entry, name: newName, params: newParams },
  };

  addDrawSubtab(newItem);
} // end copyActiveDrawObject


function setDrawCategories() {
  const raw = grabDrawData();
  const organized = organizeDrawCategories(raw);

  // Convert grouped structure into the format expected
  // by the backward-compatible categories renderer.
  const categoriesArray = Object.entries(organized).map(
    ([categoryName, items]) => ({
      title: categoryName,
      items: items.map((it) => ({
        name: it.name,
        hasSubitems: false,
        onClick: () => {
          addDrawSubtab({ name: it.name, entry: it.entry });
        }
      }))
    })
  );

  // Render using the original multi-frame CSS layout
  renderCategories("text", categoriesArray);
} // end setDrawCategories


/* ===========================================================
   grabDrawData()

   Purpose:
     Convert window.drawRegistry into a flat array of objects
     suitable for later grouping into categories.

   Arguments:
     (none)
=========================================================== */
function grabDrawData() {
  const registry = window.drawRegistry || {};
  const result = [];

  Object.entries(registry).forEach(([key, entry]) => {
    if (!entry || typeof entry !== "object") return;

    result.push({
      key: key,
      name: entry.name || key,
      category: entry.category || "uncategorized",
      entry: entry,
    });
  });

  return result;
} // end grabDrawData


/* ===========================================================
   organizeDrawCategories(rawData)

   Purpose:
     Group drawRegistry entries by their category property,
     sorting categories and items alphabetically.

   Arguments:
     rawData (array of objects)
=========================================================== */
function organizeDrawCategories(rawData = []) {
  const grouped = {};

  // Group by category
  rawData.forEach((item) => {
    const cat = item.category || "uncategorized";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  // Sort category names
  const sortedCategories = Object.keys(grouped).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  // Sort items within categories
  const organized = {};
  sortedCategories.forEach((cat) => {
    organized[cat] = grouped[cat].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  });

  return organized;
} // end organizeDrawCategories

function extractCategoryNames(organized) {
  return Object.keys(organized).sort();
} // end extractCategoryNames

/* ===========================================================
   bindDrawCategoryItems(data, clickFactory)

   Purpose:
     Attach click handlers to each item in a categorized list.

   Arguments:
     data (object) – { categoryName: [items...] }
     clickFactory (function(item) → function) –
        returns an onClick handler for each item
=========================================================== */
function bindDrawCategoryItems(data = {}, clickFactory = null) {
  const bound = {};

  Object.entries(data).forEach(([cat, items]) => {
    bound[cat] = items.map((item) => {
      const newItem = { ...item };

      if (typeof clickFactory === "function") {
        newItem.onClick = clickFactory(item);
      } else {
        newItem.onClick = function () {
          console.log("Clicked: " + item.name);
        };
      }

      return newItem;
    });
  });

  return bound;
} // end bindDrawCategoryItems


/* ===========================================================
   saveDrawState()

   Purpose:
     Serialize the Draw tab’s state so it can be restored
     later (subtabs, parameters, dirty flags, active tab).

   Arguments:
     (none)
=========================================================== */
export function saveDrawState() {
  const shallowTabs = {};

  for (const [id, info] of Object.entries(uiState.drawTabs || {})) {
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
      drawRegistry: key,
    };
  }

  const state = {
    activeDrawTab: uiState.activeDrawTab || null,
    drawTabs: shallowTabs,
  };

  console.log("💾 Saved Draw state (serializable):", state);
  return state;
} // end saveDrawState


/* ===========================================================
   restoreDrawState(saved)

   Purpose:
     Restore a Draw-state snapshot created by saveDrawState().
     Rebuilds the subtab bar and switches to the proper tab.

   Arguments:
     saved (object) – structure returned by saveDrawState()
=========================================================== */
function restoreDrawState(saved) {
  if (!saved) return;

  uiState.drawTabs = {};

  // Rebuild uiState.drawTabs with real drawRegistry references
  for (const [id, info] of Object.entries(saved.drawTabs || {})) {
    const entry =
      typeof info.drawRegistry === "string"
        ? (window.drawRegistry || {})[info.drawRegistry]
        : info.drawRegistry;

    uiState.drawTabs[id] = { ...info, drawRegistry: entry };
  }

  const targetTab = saved.activeDrawTab || null;
  uiState.activeDrawTab = targetTab;

  const el = document.getElementById("subtabs");
  if (!el) throw new Error("restoreDrawState: #subtabs not found");
  el.innerHTML = "";

  // Rebuild the <ul> bar
  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs draw-subtabs";
  el.appendChild(bar);

  // Recreate each subtab
  for (const [id, info] of Object.entries(uiState.drawTabs)) {
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


/* ------------------------------------------------------------
   drawDivs dispatcher
   Called by setUI to populate specific regions in page layout.
------------------------------------------------------------ */
export const drawDivs = {
  activeDivs: ["subtabs"],
  theme: "theme-draw",

  action: setDrawAction,
  buttons: setDrawButtons,
  caption: clearDrawCaption,     // captions cleared on tab activation
  sketchpad: setDrawSketchpad,
  subtabs: setDrawSubtabs,
  text: setDrawText,
}; // end drawDivs

