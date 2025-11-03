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


/* ===========================================================
   initDrawTab()
   Called when the Draw top-level tab becomes active.
   Clears all draw divs, builds subtabs, and activates Categories.

   Arguments:
     (none)
=========================================================== */
function initDrawTab() {
  clearDivs();
  setDrawSubtabs();              // builds bar with a single Categories tab
  uiState.activeDrawTab = "tab-categories";
  // Display Categories immediately
  setDrawCategories();
} // end initDrawTab


/* ===========================================================
   setDrawSubtabs()
   Always rebuilds the subtab bar with a single tab: Categories.

   Arguments:
     (none)
=========================================================== */
function setDrawSubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setDrawSubtabs: #subtabs not found");

  el.innerHTML = "";
  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs draw-subtabs";
  bar.id = "drawSubtabBar";
  el.appendChild(bar);

  addDrawSubtab({ name: "Categories" });
} // end setDrawSubtabs


/* ===========================================================
   switchTab(tabId)
   Activates a subtab and redraws its content.

   Arguments:
     tabId – string identifier of the tab to activate
=========================================================== */
function switchTab(tabId) {
  const bar = document.getElementById("drawSubtabBar");
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
   Removes a tab, selects right neighbor else left,
   else rebuilds Categories.

   Arguments:
     tabId – string identifier of the tab to delete
=========================================================== */
function deleteTab(tabId) {
  const bar = document.getElementById("drawSubtabBar");
  if (!bar) return;

  const btns = Array.from(bar.querySelectorAll(".nav-link"));
  const idx = btns.findIndex(b => b.dataset.tabId === tabId);
  if (idx === -1) return;

  // Remove DOM button
  const li = btns[idx].parentElement;
  if (li) li.remove();

  // Remove state
  delete uiState.drawTabs[tabId];

  // Choose neighbor tab
  const neighbor = btns[idx + 1] || btns[idx - 1];
  if (neighbor) {
    switchTab(neighbor.dataset.tabId);
  } else {
    // None left → rebuild baseline Categories
    setDrawSubtabs();
  }
} // end deleteTab


/* ===========================================================
   markTabDirty(tabId)
   Marks a tab as modified by adding an asterisk.

   Arguments:
     tabId – string identifier of the tab to mark dirty
=========================================================== */
function markTabDirty(tabId) {
  const info = uiState.drawTabs[tabId];
  if (!info) return;
  if (info.dirty) return; // already marked

  info.dirty = true;
  const btn = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (!btn) return;

  // Add a small visual indicator
  btn.textContent = btn.textContent + " *";
} // end markTabDirty


/* ===========================================================
   markTabClean(tabId)
   Removes the dirty mark (“*”) from the tab label.
   (Currently unused, reserved for future.)

   Arguments:
     tabId – string identifier of the tab to clean
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
   Creates a new subtab for the selected draw object or category.
   For draw objects, stores all information in uiState.drawTabs
   and uses drawActiveTab() as the unified draw path.

   Arguments:
     item – object containing:
              name: display name for tab
              entry: drawRegistry entry (required for draw objects)
=========================================================== */
function addDrawSubtab(item) {
  const bar = document.getElementById("drawSubtabBar");
  if (!bar) throw new Error("addDrawSubtab: subtab bar not found");

  const tabId = "tab-" + item.name.replace(/\s+/g, "-").toLowerCase();

  // deactivate any current tab
  bar.querySelectorAll(".nav-link").forEach(btn => btn.classList.remove("active"));

  // build new tab button
  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className = "nav-link active";
  btn.dataset.tabId = tabId;

  btn.addEventListener("click", () => switchTab(tabId));

  // inner span to hold text + optional close button
  const labelSpan = document.createElement("span");
  labelSpan.textContent = item.name;
  labelSpan.className = "tab-label";
  btn.appendChild(labelSpan);
    
  // --- Add delete button only for draw object tabs ---
  if (item.name !== "Categories") {
    const closeBtn = document.createElement("span");
    closeBtn.textContent = "×";
    closeBtn.className = "tab-close";
    closeBtn.title = "Close tab";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();  // prevent tab switch
      deleteTab(tabId);
    });
    btn.appendChild(closeBtn);
  }   // end add delete button

  li.appendChild(btn);
  bar.appendChild(li);

  // --- Categories tab ---
  if (item.name === "Categories") {
    uiState.drawTabs[tabId] = { type: "categories" };
    uiState.activeDrawTab = tabId;
    clearDivs();
    setDrawCategories();
    return;
  }

  // --- Normal draw object tab ---
  const entry = item.entry;
  if (!entry) throw new Error(`addDrawSubtab: missing drawRegistry entry for ${item.name}`);

  uiState.drawTabs[tabId] = {
    type:         "object",
    drawRegistry: entry,
    dirty:        false,
    // ✅ use real numeric defaults
    parameters:   structuredClone(entry.params || {}) 
  };

  uiState.activeDrawTab = tabId;
  clearDivs();
  drawActiveTab(); // unified draw path

} // end addDrawSubtab

/* ===========================================================
   setDrawSketchpad(item)
   Dispatcher used only for first-time activation of a tab.
   Delegates drawing to drawActiveTab() so there is a
   single source of truth for rendering logic.

   Arguments:
     item – object containing:
              name: tab name
              entry: reference to drawRegistry entry
=========================================================== */
function setDrawSketchpad(item) {
  const tabId = "tab-" + item.name.replace(/\s+/g, "-").toLowerCase();
  uiState.activeDrawTab = tabId;
  drawActiveTab(); // single unified drawing path
} // end setDrawSketchpad


/* ===========================================================
   drawActiveTab()
   Handles drawing for the currently active draw object tab.
   Retrieves its parameters, builds its controls, clears canvas,
   and executes the drawRegistry entry’s create() and draw().

   Arguments:
     (none)
=========================================================== */
function drawActiveTab() {
  const tabId = uiState.activeDrawTab;
  const info = uiState.drawTabs[tabId];
  if (!info || info.type !== "object" || !info.drawRegistry) return;

  const entry = info.drawRegistry;
  const params = info.parameters || {};

  // --- Set caption title ---
  setDrawCaptionContent(entry);

  // --- Set buttons
  setDrawButtons();    

  // make sure the canvas is visible before building controls
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

  // --- Single authoritative source ---
  const state = uiState.drawTabs[tabId];
  if (!state) throw new Error("buildParameterControls: tab state missing");

  // attach redraw handler so generic controls can trigger drawActiveTab()
  state.redrawHandler = drawActiveTab;

  // build unified parameter controls
  buildParameterControls(state, "tab-draw", true);

  // draw after controls exist
  try {
    const thing = entry.create(params);
    entry.draw(thing);
    console.log(`✅ Redrew ${entry.name}`);
  } catch (err) {
    console.error(`❌ Error redrawing ${entry.name}:`, err);
  }
} // end drawActiveTab


/* ===========================================================
   clearCanvas()
   Clears the global canvas using window.ctx.

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
   Clears #action div to prevent undefined reference errors.

   Arguments:
     (none)
=========================================================== */
function setDrawAction() {
  const el = document.getElementById("action");
  if (el) el.innerHTML = "";
} // end setDrawAction


/* ===========================================================
   setDrawButtons()
   Displays contextual buttons for the Draw tab.
   Shows "Dup" only when a draw object tab is active.

   Arguments:
     (none)
=========================================================== */
function setDrawButtons() {
  const el = document.getElementById("buttons");
  if (!el) throw new Error("setDrawButtons: #buttons not found");
  el.innerHTML = "";

  const tabId = uiState.activeDrawTab;
  const info = uiState.drawTabs[tabId];
  if (!info || info.type !== "object") return; // nothing for Categories

  const dupBtn = document.createElement("button");
  dupBtn.textContent = "Dup";
  dupBtn.className = "btn btn-sm btn-outline-primary";
  dupBtn.addEventListener("click", () => copyActiveDrawObject());
  el.appendChild(dupBtn);
} // end setDrawButtons


/* ===========================================================
   setDrawCaption()
   Clears the caption area before new content is added.

   Arguments:
     (none)
=========================================================== */
function setDrawCaption() {
  const el = document.getElementById("caption");
  if (el) el.innerHTML = "";
} // end setDrawCaption


/* ===========================================================
   setDrawCaptionContent(entry)
   Displays the draw object's title in the caption div.
   Called only for draw object tabs.

   Arguments:
     entry – drawRegistry entry containing a “name” property
=========================================================== */
function setDrawCaptionContent(entry) {
  const captionDiv = document.getElementById("caption");
  if (!captionDiv) throw new Error("setDrawCaptionContent: #caption not found");
  captionDiv.textContent = entry.name || "(untitled)";
} // end setDrawCaptionContent


/* ===========================================================
   setDrawText()
   Default view for Draw tab is Categories in #text.

   Arguments:
     (none)
=========================================================== */
function setDrawText() {
  // Default view for Draw tab is Categories in #text
  setDrawCategories();
} // end setDrawText


/* ===========================================================
   copyActiveDrawObject()
   Duplicates the active draw object tab and its current parameters.
   The new tab title gets "(Copy)" or "(Copy n)" appended.

   Arguments:
     (none)
=========================================================== */
function copyActiveDrawObject() {
  const tabId = uiState.activeDrawTab;
  const info = uiState.drawTabs[tabId];
  if (!info || info.type !== "object") return;

  const entry = info.drawRegistry;
  const newParams = structuredClone(info.parameters);

  // --- Determine base name and next available copy number ---
  const baseName = entry.name.replace(/\s*\(Copy.*\)$/i, "").trim();
  const existingNames = Object.values(uiState.drawTabs)
    .filter(t => t.type === "object" && t.drawRegistry?.name?.startsWith(baseName))
    .map(t => t.drawRegistry.name);

  // Find the highest existing copy number
  let nextNumber = 1;
  existingNames.forEach(name => {
    const match = name.match(/\(Copy\s*(\d*)\)$/i);
    if (match) {
      const num = parseInt(match[1] || "1");
      if (num >= nextNumber) nextNumber = num + 1;
    }
  });

  const newName = nextNumber === 1 ? `${baseName} (Copy)` : `${baseName} (Copy ${nextNumber})`;

  // --- Create the new item and tab ---
  const newItem = {
    name: newName,
    entry: { ...entry, name: newName, params: newParams }
  };

  addDrawSubtab(newItem);
} // end copyActiveDrawObject


/* ===========================================================
   setDrawCategories()
   Populates the Draw tab categories using drawRegistry data.
   Clicking an item opens a new subtab and displays its name
   in the sketchpad div. Also confirms ctx existence.

   Arguments:
     (none)
=========================================================== */
function setDrawCategories() {

  // --- Build category data from registry ---
  const raw = grabDrawData();
  const organized = organizeDrawCategories(raw);

  // --- Bind click handlers ---
  const bound = bindDrawCategoryItems(organized, item => () => {
    // Create a new subtab for the selected item
    addDrawSubtab({ name: item.name, entry: item.entry });

  }); // end clickFactory

  // --- Convert bound object into array for renderer ---
  const categoriesArray = Object.entries(bound).map(([key, items]) => ({
    title: key,
    items: items.map(it => ({
      name: it.name,
      hasSubitems: false, // or true later when you add sub-options
      onClick: it.onClick
    }))
  }));

  // --- Render categories ---
  renderCategories("text", categoriesArray, 
                   (item) => item.onClick?.(),  // use stored handler
                   null                          // no expand handler yet
                  );

} // end setDrawCategories

/* ===========================================================
   grabDrawData()
   Collects all draw objects from window.drawRegistry.
   Returns an array of entries with key, name, category, and reference.

   Arguments:
     (none)
=========================================================== */
function grabDrawData() {
  const registry = window.drawRegistry || {};
  const result = [];

  Object.entries(registry).forEach(([key, entry]) => {
    if (!entry || typeof entry !== "object") return;

    result.push({
      key,                            // e.g., "inverseStar"
      name: entry.name || key,        // human-readable label
      category: entry.category || "uncategorized",
      entry                           // full registry reference
    });
  });

  return result;
} // end grabDrawData


/* ===========================================================
   organizeDrawCategories(rawData)
   Groups registry entries into alphabetical categories,
   sorting both categories and items (case-insensitive).

   Arguments:
     rawData – array of registry entry objects (from grabDrawData)
=========================================================== */
function organizeDrawCategories(rawData = []) {
  const grouped = {};

  // --- Group entries by category ---
  rawData.forEach(item => {
    const cat = item.category || "uncategorized";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  // --- Sort categories alphabetically (case-insensitive) ---
  const sortedCategories = Object.keys(grouped).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  // --- Sort items within each category (case-insensitive) ---
  const organized = {};
  sortedCategories.forEach(cat => {
    organized[cat] = grouped[cat].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  });

  return organized;
} // end organizeDrawCategories


/* ===========================================================
   bindDrawCategoryItems(data, clickFactory)
   Attaches a click handler to each item using clickFactory.
   Returns a new structure ready for UI rendering.

   Arguments:
     data – object of {category: [items]} pairs
     clickFactory – optional function(item) returning a click handler
=========================================================== */
function bindDrawCategoryItems(data = {}, clickFactory = null) {
  const bound = {};

  Object.entries(data).forEach(([cat, items]) => {
    bound[cat] = items.map(item => {
      // Create a shallow copy so we don't modify originals
      const newItem = { ...item };

      // Attach handler if clickFactory provided
      if (typeof clickFactory === "function") {
        newItem.onClick = clickFactory(item);
      } else {
        // Default handler if none provided (for testing)
        newItem.onClick = () => console.log(`Clicked: ${item.name}`);
      }

      return newItem;
    });
  });

  return bound;
} // end bindDrawCategoryItems

/* ===========================================================
   saveDrawState()
   Serializes uiState.drawTabs and active tab info for saving.
   Returns a plain object suitable for storage.

   Arguments:
     (none)
=========================================================== */
function saveDrawState() {
  const shallowTabs = {};

  for (const [id, info] of Object.entries(uiState.drawTabs || {})) {
    // find the key in window.drawRegistry that matches this entry
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
      drawRegistry: key, // store the actual registry key, not name
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
   Restores previously saved Draw tab state.

   Arguments:
     saved – object returned from saveDrawState()
=========================================================== */
function restoreDrawState(saved) {
  if (!saved) return;

  // rebuild uiState.drawTabs from saved
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

  // clear any existing subtabs and rebuild them all
  const bar = document.getElementById("drawSubtabBar");
  if (bar) bar.innerHTML = "";
  else setDrawSubtabs(); // ensure container exists

  // recreate each subtab button
  for (const [id, info] of Object.entries(uiState.drawTabs)) {
    const name =
      info.type === "categories"
        ? "Categories"
        : info.drawRegistry?.name || id.replace(/^tab-/, "");
    addDrawSubtab({ name, entry: info.drawRegistry });
  }

  // now safely switch to the saved active tab
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
window.drawDivs = {
  activeDivs: ["subtabs"],
  theme: "theme-draw",

  action: setDrawAction,
  buttons: setDrawButtons,
  caption: setDrawCaption,
  sketchpad: setDrawSketchpad,
  subtabs: setDrawSubtabs,
  text: setDrawText
}; // end drawDivs
