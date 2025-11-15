/* draw.js
   ------------------------------------------------------------
   Clean orchestration for Draw tab.
   Initializes subtabs, handles tab creation/switching/deletion,
   and redraws from uiState.drawTabs.
   ------------------------------------------------------------ */

// addDrawSubtab(item)              – create and activate a new subtab
// clearCanvas()                    – clear the shared canvas area
// copyActiveDrawObject()           – duplicate the current draw object tab
// deleteTab(tabId)                 – close subtab and switch neighbor
// drawActiveTab()                  – render the active object with parameters
// initDrawTab()                    – initialize Draw tab and display categories
// markTabClean(tabId)              – clear dirty mark (future use)
// markTabDirty(tabId)              – mark tab as modified
// restoreDrawState()               – rebuild Draw tab state from saved data
// saveDrawState()                  – serialize Draw tab state for saving
// setDrawAction()                  – clear #action area (placeholder)
// setDrawButtons()                 – display context buttons (Dup etc.)
// setDrawCaption()                 – clear caption area
// setDrawCaptionContent(entry)     – display object title in caption
// setDrawCategories()              – build and display category grid
//    bindDrawCategoryItems()       – attach click handlers to category items
//    grabDrawData()                – gather registry entries
//    organizeDrawCategories()      – sort and group registry items
// setDrawSketchpad(item)           – initial dispatcher for object drawing
// setDrawText()                    – show default Categories view in #text
// switchTab(tabId)                 – activate selected subtab and redraw

import { clearDivs, renderCategories, showSharedOffcanvas }
                                  from "./ui_utilities.js";
import { buildParameterControls } from "./parameterControls.js";
import { drawInEllipse }          from "../draw/ellipse.js";
import { uiState }   from "./uiState.js";

const DEFAULT_DRAW_SUBTAB = "tab-categories";

/* ===========================================================
   initDrawTab()
=========================================================== */
/* ===========================================================
   initDrawTab()
=========================================================== */
export function initDrawTab(restored = false) {

  clearDivs();

  // Rebuild the subtab bar from existing uiState if available,
  // or create default Categories if this is the first time.
  setDrawSubtabs();

  const activeId = uiState.activeDrawTab || DEFAULT_DRAW_SUBTAB;
  switchTab(activeId);
} // end initDrawTab

/* ===========================================================
   setDrawSubtabs()
=========================================================== */
function setDrawSubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setDrawSubtabs: #subtabs not found");

  el.innerHTML = "";
  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs draw-subtabs";
  el.appendChild(bar);

  const existing = uiState.drawTabs;
  const ids = existing ? Object.keys(existing) : [];

  // If there is no existing state, start with Categories
  if (!ids.length) {
    addDrawSubtab({ name: "Categories" });
    return;
  }

  // Otherwise rebuild tabs from existing uiState.drawTabs
  ids.forEach(id => {
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
=========================================================== */
function switchTab(tabId) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) return;

  bar.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
  const btn = bar.querySelector(`[data-tab-id="${tabId}"]`);
  if (btn) btn.classList.add("active");

  uiState.activeDrawTab = tabId;
  clearDivs();

  const info = uiState.drawTabs[tabId];
  if (!info) return;

  if (info.type === "categories") {
    setDrawCategories();
  } else {
    drawActiveTab();
  }
} // end switchTab

/* ===========================================================
   deleteTab(tabId)
=========================================================== */
function deleteTab(tabId) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) return;

  const btns = Array.from(bar.querySelectorAll(".nav-link"));
  const idx = btns.findIndex(b => b.dataset.tabId === tabId);
  if (idx === -1) return;

  const li = btns[idx].parentElement;
  if (li) li.remove();

  delete uiState.drawTabs[tabId];

  const neighbor = btns[idx + 1] || btns[idx - 1];
  if (neighbor) {
    switchTab(neighbor.dataset.tabId);
  } else {
    setDrawSubtabs();
  }
} // end deleteTab

/* ===========================================================
   markTabDirty(tabId)
=========================================================== */
function markTabDirty(tabId) {
  const info = uiState.drawTabs[tabId];
  if (!info) return;
  if (info.dirty) return;

  info.dirty = true;
  const btn = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (!btn) return;

  btn.textContent = btn.textContent + " *";
} // end markTabDirty

/* ===========================================================
   markTabClean(tabId)
=========================================================== */
function markTabClean(tabId) {
  const info = uiState.drawTabs[tabId];
  if (!info) return;

  info.dirty = false;
  const btn = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (!btn) return;

  btn.textContent = btn.textContent.replace(/\s\*$/, "");
} // end markTabClean

/* ===========================================================
   addDrawSubtab(item)
=========================================================== */
function addDrawSubtab(item) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) throw new Error("addDrawSubtab: subtab bar not found");

  const tabId = "tab-" + item.name.replace(/\s+/g, "-").toLowerCase();

  bar.querySelectorAll(".nav-link").forEach(btn => btn.classList.remove("active"));

  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className = "nav-link active";
  btn.dataset.tabId = tabId;

  btn.addEventListener("click", () => switchTab(tabId));

  const labelSpan = document.createElement("span");
  labelSpan.textContent = item.name;
  labelSpan.className = "tab-label";
  btn.appendChild(labelSpan);
    
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

  if (item.name === "Categories") {
    uiState.drawTabs[tabId] = { type: "categories" };
    uiState.activeDrawTab = tabId;
    clearDivs();
    setDrawCategories();
    return;
  }

  const entry = item.entry;
  if (!entry) throw new Error(`addDrawSubtab: missing drawRegistry entry for ${item.name}`);

  entry.init();
    
  uiState.drawTabs[tabId] = {
    type:         "object",
    drawRegistry: entry,
    dirty:        false,
    parameters:   entry.params
  };

  uiState.activeDrawTab = tabId;
  clearDivs();
  drawActiveTab();
} // end addDrawSubtab

/* ===========================================================
   setDrawSketchpad(item)
=========================================================== */
function setDrawSketchpad(item) {
  const tabId = "tab-" + item.name.replace(/\s+/g, "-").toLowerCase();
  uiState.activeDrawTab = tabId;
  drawActiveTab();
} // end setDrawSketchpad

/* ===========================================================
   drawActiveTab()
=========================================================== */
function drawActiveTab() {
  const tabId = uiState.activeDrawTab;
  const info = uiState.drawTabs[tabId];
  if (!info || info.type !== "object" || !info.drawRegistry) return;

  const entry = info.drawRegistry;

  setDrawCaptionContent(entry);
  setDrawButtons();

  const sketchpadDiv = document.getElementById("sketchpad");
  if (!sketchpadDiv)
    throw new Error("drawActiveTab: #sketchpad div not found");
  sketchpadDiv.innerHTML = "";
  const canvas = window.drawCanvas;
  if (!canvas)
    throw new Error("drawActiveTab: window.drawCanvas not initialized");    
  sketchpadDiv.appendChild(canvas);

  const localCtx = window.ctx;
  if (!localCtx)
    throw new Error("drawActiveTab: window.ctx not found");
  localCtx.clearRect(0, 0, canvas.width, canvas.height);

  const state = uiState.drawTabs[tabId];
  if (!state) throw new Error("buildParameterControls: tab state missing");

  state.redrawHandler = drawActiveTab;

  buildParameterControls(state, "tab-draw", true);

  try {
    const params = state.parameters = entry.params;
    entry.update(params);
    entry.draw();
    console.log(`✅ Redrew ${entry.name}`);
  } catch (err) {
    console.error(`❌ Error redrawing ${entry.name}:`, err);
  }
} // end drawActiveTab

/* ===========================================================
   clearCanvas()
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
=========================================================== */
function setDrawAction() {
  const el = document.getElementById("action");
  if (el) el.innerHTML = "";
} // end setDrawAction

/* ===========================================================
   setDrawButtons()
=========================================================== */
function setDrawButtons() {
  const el = document.getElementById("buttons");
  if (!el) throw new Error("setDrawButtons: #buttons not found");
  el.innerHTML = "";

  const tabId = uiState.activeDrawTab;
  const info = uiState.drawTabs[tabId];
  if (!info || info.type !== "object") return;

  const dupBtn = document.createElement("button");
  dupBtn.textContent = "Dup";
  dupBtn.className = "btn btn-sm btn-outline-primary";
  dupBtn.addEventListener("click", () => copyActiveDrawObject());
  el.appendChild(dupBtn);
} // end setDrawButtons

/* ===========================================================
   setDrawCaption()
=========================================================== */
function setDrawCaption() {
  const el = document.getElementById("caption");
  if (el) el.innerHTML = "";
} // end setDrawCaption

/* ===========================================================
   setDrawCaptionContent(entry)
=========================================================== */
function setDrawCaptionContent(entry) {
  const captionDiv = document.getElementById("caption");
  if (!captionDiv) throw new Error("setDrawCaptionContent: #caption not found");
    captionDiv.innerHTML = `
            <span class="caption-title">${entry.name || "(untitled)"}</span>
            <div class="caption-buttons">
               <button class="btn btn-sm btn-outline-secondary">Show Script</button>
            </div>
       `;

    const btn = captionDiv.querySelector("button");
    btn.addEventListener("click", () => {
	showSharedOffcanvas(
	    `Draw Registry: ${entry.name}`,
	    JSON.stringify(entry, null, 2)
	);
    });

} // end setDrawCaptionContent

/* ===========================================================
   setDrawText()
=========================================================== */
function setDrawText() {
  setDrawCategories();
} // end setDrawText

/* ===========================================================
   copyActiveDrawObject()
=========================================================== */
function copyActiveDrawObject() {
  const tabId = uiState.activeDrawTab;
  const info = uiState.drawTabs[tabId];
  if (!info || info.type !== "object") return;

  const entry = info.drawRegistry;
  const newParams = structuredClone(info.parameters);

  const baseName = entry.name.replace(/\s*\(Copy.*\)$/i, "").trim();
  const existingNames = Object.values(uiState.drawTabs)
    .filter(t => t.type === "object" && t.drawRegistry?.name?.startsWith(baseName))
    .map(t => t.drawRegistry.name);

  let nextNumber = 1;
  existingNames.forEach(name => {
    const match = name.match(/\(Copy\s*(\d*)\)$/i);
    if (match) {
      const num = parseInt(match[1] || "1");
      if (num >= nextNumber) nextNumber = num + 1;
    }
  });

  const newName = nextNumber === 1 ? `${baseName} (Copy)` : `${baseName} (Copy ${nextNumber})`;

  const newItem = {
    name: newName,
    entry: { ...entry, name: newName, params: newParams }
  };

  addDrawSubtab(newItem);
} // end copyActiveDrawObject

/* ===========================================================
   setDrawCategories()
=========================================================== */
function setDrawCategories() {

  const raw = grabDrawData();
  const organized = organizeDrawCategories(raw);

  const bound = bindDrawCategoryItems(organized, item => () => {
    addDrawSubtab({ name: item.name, entry: item.entry });
  });

  const categoriesArray = Object.entries(bound).map(([key, items]) => ({
    title: key,
    items: items.map(it => ({
      name: it.name,
      hasSubitems: false,
      onClick: it.onClick
    }))
  }));

  renderCategories("text", categoriesArray, 
                   (item) => item.onClick?.(),
                   null
                  );

} // end setDrawCategories

/* ===========================================================
   grabDrawData()
=========================================================== */
function grabDrawData() {
  const registry = window.drawRegistry || {};
  const result = [];

  Object.entries(registry).forEach(([key, entry]) => {
    if (!entry || typeof entry !== "object") return;

    result.push({
      key,
      name: entry.name || key,
      category: entry.category || "uncategorized",
      entry
    });
  });

  return result;
} // end grabDrawData

/* ===========================================================
   organizeDrawCategories(rawData)
=========================================================== */
function organizeDrawCategories(rawData = []) {
  const grouped = {};

  rawData.forEach(item => {
    const cat = item.category || "uncategorized";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  const sortedCategories = Object.keys(grouped).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  const organized = {};
  sortedCategories.forEach(cat => {
    organized[cat] = grouped[cat].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  });

  return organized;
} // end organizeDrawCategories

/* ===========================================================
   bindDrawCategoryItems()
=========================================================== */
function bindDrawCategoryItems(data = {}, clickFactory = null) {
  const bound = {};

  Object.entries(data).forEach(([cat, items]) => {
    bound[cat] = items.map(item => {
      const newItem = { ...item };

      if (typeof clickFactory === "function") {
        newItem.onClick = clickFactory(item);
      } else {
        newItem.onClick = () => console.log(`Clicked: ${item.name}`);
      }

      return newItem;
    });
  });

  return bound;
} // end bindDrawCategoryItems

/* ===========================================================
   saveDrawState()
=========================================================== */
function saveDrawState() {
  const shallowTabs = {};

  for (const [id, info] of Object.entries(uiState.drawTabs || {})) {
    let key = null;
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
   restoreDrawState()
=========================================================== */
function restoreDrawState(saved) {
  if (!saved) return;

  uiState.drawTabs = {};
  for (const [id, info] of Object.entries(saved.drawTabs || {})) {
    const entry =
      typeof info.drawRegistry === "string"
        ? window.drawRegistry?.[info.drawRegistry]
        : info.drawRegistry;
    uiState.drawTabs[id] = { ...info, drawRegistry: entry };
  }

  const targetTab = saved.activeDrawTab || null;
  uiState.activeDrawTab = targetTab;

  const el = document.getElementById("subtabs");
  if (!el) throw new Error("restoreDrawState: #subtabs not found");
  el.innerHTML = "";

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs draw-subtabs";
  el.appendChild(bar);

  for (const [id, info] of Object.entries(uiState.drawTabs)) {
    const name =
      info.type === "categories"
        ? "Categories"
        : info.drawRegistry?.name || id.replace(/^tab-/, "");
    addDrawSubtab({ name, entry: info.drawRegistry });
  }

  if (targetTab && typeof switchTab === "function") {
    console.log("🔄 Restoring Draw tab:", targetTab);
    switchTab(targetTab);
  } else {
    console.warn("⚠️ Could not restore Draw tab — using default init");
    if (typeof initDrawTab === "function") initDrawTab();
  }

  console.log("✅ Restored Draw state:", saved);
} // end restoreDrawState

/* ------------------------------------------------------------
   Final drawDivs dispatcher (overwrites placeholder)
------------------------------------------------------------ */
export const drawDivs = {
  activeDivs: ["subtabs"],
  theme: "theme-draw",

  action: setDrawAction,
  buttons: setDrawButtons,
  caption: setDrawCaption,
  sketchpad: setDrawSketchpad,
  subtabs: setDrawSubtabs,
  text: setDrawText
}; // end drawDivs
