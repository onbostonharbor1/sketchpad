/* patterns.js
   ------------------------------------------------------------
   Patterns tab controller.
   Mirrors Draw tab architecture but loads prebuilt scripts
   from ./patterns/<category> directories using directoryRegistry.json.
   ------------------------------------------------------------ */

// addPatternsSubtab(item)        – create new subtab for category or script
// initPatternsTab()              – initialize Patterns tab and show Categories
// loadAndRunPattern(path)        – fetch and execute a pattern script file
// loadPatternsManifest()         – load and cache manifests for pattern dirs
// restorePatternsState(saved)    – rebuild Patterns tab from saved state
// savePatternsState()            – serialize current Patterns tab state
// setPatternsAction()            – clear #action div
// setPatternsButtons()           – clear #buttons div
// setPatternsCategories()        – display all pattern categories
// setPatternsCaption()           – clear #caption div
// setPatternsSketchpad()         – clear #sketchpad div
// setPatternsSubtabs()           – rebuild subtab bar with "Categories"
// setPatternsText()              – clear #text div
// setPatternsThumbnails(category)– display thumbnails for category
// showNextPattern()              – load next pattern in same category
// showPrevPattern()              – load previous pattern in same category
// switchPatternsTab(tabId)       – activate existing subtab and redraw
// updatePatternsCaption()        – display title and navigation buttons


const CATEGORIES_ID = "tab-patterns-categories";
const PATTERNS_ID   = "tab-patterns-patterns";

/* ------------------------------------------------------------
   setPatternsButtons()
   Clears #buttons div.

   Arguments:
     (none)
------------------------------------------------------------ */
function setPatternsButtons() {
  const el = document.getElementById("buttons");
  if (el) el.innerHTML = "";
} // end setPatternsButtons

/* ------------------------------------------------------------
   setPatternsAction()
   Clears #action div.

   Arguments:
     (none)
------------------------------------------------------------ */
function setPatternsAction() {
  const el = document.getElementById("action");
  if (el) el.innerHTML = "";
} // end setPatternsAction

/* ------------------------------------------------------------
   setPatternsCaption()
   Clears #caption div.

   Arguments:
     (none)
------------------------------------------------------------ */
function setPatternsCaption() {
  const el = document.getElementById("caption");
  if (el) el.innerHTML = "";
} // end setPatternsCaption

/* ------------------------------------------------------------
   setPatternsText()
   Clears #text div.

   Arguments:
     (none)
------------------------------------------------------------ */
function setPatternsText() {
  const el = document.getElementById("text");
  if (el) el.innerHTML = "";
} // end setPatternsText

/* ------------------------------------------------------------
   setPatternsSketchpad()
   Clears #sketchpad div.

   Arguments:
     (none)
------------------------------------------------------------ */
function setPatternsSketchpad() {
  const el = document.getElementById("sketchpad");
  if (el) el.innerHTML = "";
} // end setPatternsSketchpad


/* ===========================================================
   setPatternsSubtabs()
   Rebuilds subtab bar with a single "Categories" tab.

   Arguments:
     (none)
=========================================================== */
function setPatternsSubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setPatternsSubtabs: #subtabs not found");

  el.innerHTML = "";
  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs patterns-subtabs";
  bar.id = "patternsSubtabBar";
  el.appendChild(bar);

  addPatternsSubtab({ name: "Categories" });
} // end setPatternsSubtabs


/* ===========================================================
   initPatternsTab()
   Called when Patterns top-level tab becomes active.
   Builds subtabs and activates Categories.

   Arguments:
     (none)
=========================================================== */
function initPatternsTab() {
  clearDivs();
  setPatternsSubtabs(); // this calls addPatternsSubtab("Categories")
  uiState.activePatternsTab = "CATEGORIES_ID";
} // end initPatternsTab


/* ===========================================================
   addPatternsSubtab(item)
   Creates a new subtab for the selected category or script item.

   Arguments:
     item – object with at least { name }, plus
             for scripts: { category, filename, path, type }
=========================================================== */
function addPatternsSubtab(item) {
  const bar = document.getElementById("patternsSubtabBar");

  // ------------------------------------------------------------
  // CASE 1: Categories (the left/grid view)
  // ------------------------------------------------------------
  if (item.name === "Categories") {
    // if Categories tab doesn't exist yet, create it
    if (!bar.querySelector(`[data-tab-id="${CATEGORIES_ID}"]`)) {
      const li = document.createElement("li");
      li.className = "nav-item";

      const btn = document.createElement("button");
      btn.className = "nav-link active";
      btn.dataset.tabId = CATEGORIES_ID;
      btn.textContent = "Categories";

      btn.addEventListener("click", () => switchPatternsTab(CATEGORIES_ID));

      li.appendChild(btn);
      bar.appendChild(li);
    }

    // deactivate all tabs, activate Categories
    bar.querySelectorAll(".nav-link").forEach(btn => btn.classList.remove("active"));
    const catBtn = bar.querySelector(`[data-tab-id="${CATEGORIES_ID}"]`);
    if (catBtn) catBtn.classList.add("active");

    // record state
    uiState.patternsTabs[CATEGORIES_ID] = { type: "categories" };
    uiState.activePatternsTab = CATEGORIES_ID;

    clearDivs();
    setPatternsCategories();
    return;
  } // end Categories case


  // ------------------------------------------------------------
  // CASE 2: script click ("draw this pattern")
  // This should ALWAYS reuse the same single drawing tab "Patterns".
  // ------------------------------------------------------------
  // create "Patterns" tab if it doesn't exist yet
  if (!bar.querySelector(`[data-tab-id="${PATTERNS_ID}"]`)) {
    const li = document.createElement("li");
    li.className = "nav-item";

    const btn = document.createElement("button");
    btn.className = "nav-link";
    btn.dataset.tabId = PATTERNS_ID;
    btn.textContent = "Patterns";

    btn.addEventListener("click", () => switchPatternsTab(PATTERNS_ID));

    li.appendChild(btn);
    bar.appendChild(li);
  }

  // deactivate all tabs, then activate Patterns
  bar.querySelectorAll(".nav-link").forEach(btn => btn.classList.remove("active"));
  const patBtn = bar.querySelector(`[data-tab-id="${PATTERNS_ID}"]`);
  if (patBtn) patBtn.classList.add("active");

  // update stored info for the single Patterns tab
  uiState.patternsTabs[PATTERNS_ID] = {
    type: "script",
    category: item.category,
    filename: item.filename,
    path: item.path
  };

  uiState.activePatternsTab = PATTERNS_ID;

  clearDivs();

  // load and run the newly selected pattern into shared canvas
  loadAndRunPattern(item.path);
} // end addPatternsSubtab


/* ===========================================================
   switchPatternsTab(tabId)
   Activates an existing tab and redraws its content.

   Arguments:
     tabId – string ID of the subtab to activate
=========================================================== */
function switchPatternsTab(tabId) {
  const bar = document.getElementById("patternsSubtabBar");

  // toggle active class on buttons
  bar.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
  const btn = bar.querySelector(`[data-tab-id="${tabId}"]`);
  if (btn) btn.classList.add("active");

  const info = uiState.patternsTabs[tabId];

  uiState.activePatternsTab = tabId;
  clearDivs();

  if (info.type === "categories") {
    setPatternsCategories();
  } else {
    loadAndRunPattern(info.path);
  }
} // end switchPatternsTab


/* ===========================================================
   loadAndRunPattern(path)
   Fetches and executes the specified pattern script.
   Uses the shared canvas and drawState.

   Arguments:
     path – relative path to .js script file under ./patterns/
=========================================================== */
async function loadAndRunPattern(path) {
  const sketchDiv = document.getElementById("sketchpad");

  // === STEP 1: Attach shared canvas to the visible area ===
  sketchDiv.innerHTML = "";
  sketchDiv.appendChild(window.drawCanvas);

  const localCtx = ctx;

  // === STEP 2: Clear the drawing area ===
  localCtx.fillStyle = "#ffffff";
  localCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);

  // === STEP 3: Load and execute pattern ===
  try {
    const resp = await fetch(`./patterns/${path}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const code = await resp.text();

    eval(code); // executes drawing code on shared canvas

  } catch (err) {
    console.error("Pattern load or execution failed:", err);
    sketchDiv.innerHTML = `<p style="color:red;">Error loading pattern.</p>`;
    return;
  }

  // === STEP 4: Update state and UI ===
  uiState.activePattern = {
    category: path.split("/")[0],
    filename: path.split("/").pop().replace(/\.js$/i, "")
  };

  updatePatternsCaption();
  setPatternsThumbnails(uiState.activePattern.category);
    setPatternsCaptionContent({
	filename: uiState.activePattern.filename,
	path
    });

} // end loadAndRunPattern


/* ===========================================================
   loadPatternsManifest()
   Loads and caches directory and manifest data.
   Returns structured manifest info.

   Arguments:
     (none)
   Returns:
     Object mapping category → array of pattern items
=========================================================== */
async function loadPatternsManifest() {
  try {
    const cache = uiState.manifests.patterns;
    if (cache && cache.main) {
      console.log("Using cached Patterns manifest");
      uiState.activeManifest = cache.main;
      return cache.main;
    }

    // --- Step 1: load directory list ---
    const dirs = await loadDirectoryRegistry("./patterns");
    if (!dirs) throw new Error("Missing or invalid directoryRegistry.json");

    // --- Step 2: read each category manifest ---
    const allData = await Promise.all(
      dirs.map(async cat => {
        const manifest = await loadManifest("./patterns", cat);
        return { category: cat, items: manifest || [] };
      })
    );

    // --- Step 3: structure + cache results ---
    const organized = {};
    allData.forEach(group => {
      organized[group.category] = group.items;
    });

    uiState.manifests.patterns ??= {};
    uiState.manifests.patterns.main = organized;
    uiState.activeManifest = organized;

    return organized;

  } catch (err) {
    console.error("Failed to load pattern manifests:", err);
    return null;
  }
} // end loadPatternsManifest



/* ===========================================================
   setPatternsCategories()
   Uses cached or freshly loaded manifest info to
   render all pattern categories.

   Arguments:
     (none)
=========================================================== */
let lastCategoriesRequest = 0;

async function setPatternsCategories() {
  const requestId = ++lastCategoriesRequest; // unique id for this invocation

  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("setPatternsCategories: #text not found");
  textDiv.innerHTML = "<p>Loading pattern categories...</p>";

  const manifestInfo = await loadPatternsManifest();

  // If another call started while this one was awaiting, abort this draw
  if (requestId !== lastCategoriesRequest) {
    console.log("⏸ Stale categories load aborted");
    return;
  }

  if (!manifestInfo) {
    textDiv.innerHTML = `<p style="color:red;">Error loading pattern manifests.</p>`;
    return;
  }

  // If we're currently on the Patterns subtab, skip rendering the categories grid
  if (uiState.activePatternsTab === PATTERNS_ID) {
    console.log("⏸ Skipping categories draw (Patterns tab active)");
    return;
  }

  // --- Build the categories grid normally ---
  const categoriesArray = Object.entries(manifestInfo).map(([key, items]) => ({
    title: key,
    items: items.map(it => ({
      name: it.filename,
      hasSubitems: false,
      onClick: () => {
        addPatternsSubtab({
          name: it.filename,
          type: "script",
          category: key,
          filename: it.filename,
          path: it.path
        });
      }
    }))
  }));

  renderCategories("text", categoriesArray, item => item.onClick?.(), null);
  console.log("✅ Finished rendering patterns");
} // end setPatternsCategories


/* ===========================================================
   updatePatternsCaption()
   Builds the caption area with current title and
   Prev / Next / Save buttons.

   Arguments:
     (none)
=========================================================== */
function updatePatternsCaption() {
  const capDiv = document.getElementById("caption");
  capDiv.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "caption-wrapper";

  // title text
  const title = document.createElement("span");
  title.className = "caption-title";
  const t = drawState.currentTitle && drawState.currentTitle.trim()
    ? drawState.currentTitle
    : drawState.currentFileName || "Untitled Pattern";
  title.textContent = t;

  // button group
  const btnGroup = document.createElement("div");
  btnGroup.className = "caption-buttons";

  const makeBtn = (label) => {
    const b = document.createElement("button");
    b.textContent = label;
    return b;
  };

  const btnPrev = makeBtn("Prev");
  const btnNext = makeBtn("Next");
  const btnSave = makeBtn("Save");
  btnPrev.onclick = showPrevPattern;
  btnNext.onclick = showNextPattern;
  btnSave.onclick = () => alert("Save pressed");

  btnGroup.appendChild(btnPrev);
  btnGroup.appendChild(btnNext);
  btnGroup.appendChild(btnSave);

  capDiv.appendChild(title);
  capDiv.appendChild(btnGroup);
} // end updatePatternsCaption

/* ===========================================================
   setPatternsCaptionContent(entry)
   Displays the pattern’s title and adds a "Show Script" button
   that opens the script source in the shared offcanvas.
=========================================================== */
function setPatternsCaptionContent(entry) {
  const captionDiv = document.getElementById("caption");
  if (!captionDiv) throw new Error("setPatternsCaptionContent: #caption not found");
  captionDiv.innerHTML = `
    <span class="caption-title">${entry.filename || "(untitled pattern)"}</span>
    <div class="caption-buttons">
      <button class="btn btn-sm btn-outline-secondary">Show Script</button>
    </div>
  `;

  const btn = captionDiv.querySelector("button");
  btn.addEventListener("click", async () => {
    try {
      const resp = await fetch(`./patterns/${entry.path}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${entry.path}`);
      const code = await resp.text();
      showSharedOffcanvas(entry.filename, code);
    } catch (err) {
      showSharedOffcanvas("Error", `Failed to load ${entry.path}: ${err.message}`);
    }
  });
} // end setPatternsCaptionContent


/* ===========================================================
   showNextPattern()
   Loads the next pattern within the current category.

   Arguments:
     (none)
=========================================================== */
function showNextPattern() {
  const info = uiState.activePattern;
  const manifestRoot = uiState.manifests.patterns?.main;
  if (!info || !manifestRoot) return;

  const list = manifestRoot[info.category];
  if (!list || list.length === 0) return;

  const idx = list.findIndex(item => item.filename === info.filename);
  const nextIdx = (idx + 1) % list.length;
  const nextItem = list[nextIdx];

  uiState.activePattern = { category: info.category, filename: nextItem.filename };

  addPatternsSubtab({
    name: nextItem.filename,
    type: "script",
    category: info.category,
    filename: nextItem.filename,
    path: nextItem.path
  });
} // end showNextPattern


/* ===========================================================
   showPrevPattern()
   Loads the previous pattern within the current category.

   Arguments:
     (none)
=========================================================== */
function showPrevPattern() {
  const info = uiState.activePattern;
  const manifestRoot = uiState.manifests.patterns?.main;
  if (!info || !manifestRoot) return;

  const list = manifestRoot[info.category];
  if (!list || list.length === 0) return;

  const idx = list.findIndex(item => item.filename === info.filename);
  const prevIdx = (idx - 1 + list.length) % list.length;
  const prevItem = list[prevIdx];

  uiState.activePattern = { category: info.category, filename: prevItem.filename };

  addPatternsSubtab({
    name: prevItem.filename,
    type: "script",
    category: info.category,
    filename: prevItem.filename,
    path: prevItem.path
  });
} // end showPrevPattern


/* ===========================================================
   setPatternsThumbnails(category)
   Displays thumbnails for all items in a category.

   Arguments:
     category – string name of the pattern category
=========================================================== */
function setPatternsThumbnails(category) {
  const actDiv = document.getElementById("action");
  if (!actDiv) throw new Error("setPatternsThumbnails: #action not found");
  actDiv.innerHTML = "";

  const manifest = uiState.manifests.patterns?.main;
  if (!manifest || !manifest[category]) {
    actDiv.innerHTML = `<p>No thumbnails available for ${category}</p>`;
    return;
  }

  const items = manifest[category];
  if (!items.length) {
    actDiv.innerHTML = `<p>No items found for ${category}</p>`;
    return;
  }

  const panel = document.createElement("div");
  panel.className = "thumb-panel";

  items.forEach(item => {
    const thumbBox = document.createElement("div");
    thumbBox.className = "thumb-box";

    // image path convention: ./patterns/<category>/images/<filename>.png
    const img = document.createElement("img");
    img.src = `./patterns/${category}/images/${item.filename}.png`;
    img.alt = item.filename;
    img.title = item.filename;   // hover text
    img.className = "thumb-image";

    // --- phase 2: click loads the pattern ---
    img.onclick = () => {
      addPatternsSubtab({
        name: item.filename,
        type: "script",
        category: category,
        filename: item.filename,
        path: item.path
      });
    };

    thumbBox.appendChild(img);
    panel.appendChild(thumbBox);
  });

  actDiv.appendChild(panel);
} // end setPatternsThumbnails



/* ===========================================================
   savePatternsState()
   Serializes current Patterns tab state for persistence.

   Arguments:
     (none)
   Returns:
     Object describing current subtab and active item
=========================================================== */
function savePatternsState() {
  const activeTabId = uiState.activePatternsTab || null;
  const activeTabInfo = activeTabId ? uiState.patternsTabs?.[activeTabId] : null;

  const state = {
    activeTabId,
    activeTabInfo: structuredClone(activeTabInfo),
  };

  console.log("💾 Saved Patterns state:", state);
  return state;
} // end savePatternsState


/* ===========================================================
   restorePatternsState(saved)
   Restores previous Patterns tab state after reload or switch.

   Arguments:
     saved – previously saved state object
=========================================================== */
function restorePatternsState(saved) {
  if (!saved || !saved.activeTabId) {
    if (typeof initPatternsTab === "function") initPatternsTab();
    return;
  }

  // restore base state
  uiState.activePatternsTab = saved.activeTabId;
  uiState.patternsTabs = {};

  if (saved.activeTabInfo) {
    uiState.patternsTabs[saved.activeTabId] = structuredClone(saved.activeTabInfo);
  }

  const info = saved.activeTabInfo || {};
  const targetTab = saved.activeTabId;

  // --- Step 1: ensure subtab bar exists
  let bar = document.getElementById("patternsSubtabBar");
  if (!bar) setPatternsSubtabs();
  else bar.innerHTML = "";

  // --- Step 2: always recreate the Categories subtab
  addPatternsSubtab({ name: "Categories" });

  // --- Step 3: if the saved tab was a script, recreate the Patterns subtab too
  if (info.type === "script" && info.path) {
    addPatternsSubtab({
      name: info.filename || "Patterns",
      type: "script",
      category: info.category,
      filename: info.filename,
      path: info.path
    });
  }

  // --- Step 4: switch to the restored tab
  if (targetTab && typeof switchPatternsTab === "function") {
    console.log("🔄 Restoring Patterns tab:", targetTab);
    switchPatternsTab(targetTab);
  } else if (typeof initPatternsTab === "function") {
    console.warn("⚠️ Fallback to initPatternsTab");
    initPatternsTab();
  }

  console.log("✅ Restored Patterns state:", saved);
} // end restorePatternsState


/* ------------------------------------------------------------
   patternsDivs registration
   Defines the div handlers and theme used by the Patterns tab.

   Arguments:
     (none)
------------------------------------------------------------ */
const patternsDivs = {
  activeDivs: ["subtabs"],
  theme: "theme-patterns",
  action: setPatternsAction,
  buttons: setPatternsButtons,
  caption: setPatternsCaption,
  sketchpad: setPatternsSketchpad,
  subtabs: setPatternsSubtabs,
  text: setPatternsText
}; // end patternsDivs
