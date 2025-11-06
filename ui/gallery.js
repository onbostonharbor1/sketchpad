/* gallery.js
   ------------------------------------------------------------
   Gallery tab controller.
   Displays visual collections: Ideabook, Patterns, and Scripts.
   Each category loads images and manifests from ./gallery/<type>
   directories defined by directoryRegistry.json.
   ------------------------------------------------------------ */

// addGalleryHandler(tab, container)       – attach click handlers for category frames
// addGallerySubtab(item)                  – create new Gallery subtab button
// drawGalleryThumbnails(tab, category, manifest) – build unified thumbnail panel
// initGalleryTab()                        – initialize Gallery tab and restore subtabs
// loadManifestGroup(basePath)             – load all manifests for one gallery type
// renderGalleryCategories(container, data)– display Ideabook/Patterns/Scripts frames
// renderGalleryThumbnails(tab, category)  – load thumbnails for given tab/category
// renderGalleryScripts()                  – list executable scripts, no thumbnails
// showGalleryScript(entry)                – execute selected script and display output
// setActiveItem(category, entry)   – record active gallery item in uiState
// setGalleryCategories()                  – populate Categories view for Gallery tab
// setGallerySubtabs()                     – create or reuse subtab bar with "Categories"
// showGalleryImage(tab, category, path)   – display selected image in #sketchpad
// showNextGalleryItem(tab)                – show next image for given subtab
// showPrevGalleryItem(tab)                – show previous image for given subtab
// switchGalleryTab(tabId)                 – switch between Gallery subtabs
// updateGalleryCaption(tab)               – render caption + navigation + Show Script
// setGalleryAction(), setGalleryButtons(), setGalleryCaption(),
// setGallerySketchpad(), setGallerySubtabs(), setGalleryText()
//                                          – clear corresponding divs

const IDEABOOK = "Ideabook";
const PATTERNS = "Patterns";
const SCRIPTS  = "Scripts";

/* ------------------------------------------------------------
   initGalleryTab()
   Initializes the Gallery tab when activated.
   Rebuilds the subtab bar and restores any previously
   created subtabs (Ideabook, Patterns, Scripts) from cache.

   Arguments:
     (none)
------------------------------------------------------------ */
/* ------------------------------------------------------------
   initGalleryTab()
   Initializes the Gallery tab when activated.
   Rebuilds any previously created subtabs (Ideabook, Patterns,
   Scripts) from uiState.galleryTabs.
------------------------------------------------------------ */
async function initGalleryTab() {
  clearDivs();
  setGallerySubtabs();

  // --- Recreate previously created subtabs ---
  const createdTabs = Object.keys(uiState.galleryTabs);
  if (createdTabs.length > 0) {
    createdTabs.forEach(tabId => {
      const item = uiState.galleryTabs[tabId];
      addGallerySubtab({ name: item.name });
    });
  } else {
    // default to all three available types
    [IDEABOOK, PATTERNS, SCRIPTS].forEach(key => {
      const data = uiState.manifests.gallery[key];
      if (data) addGallerySubtab({ name: key });
    });
  }

  // --- Restore last active subtab or fallback to Categories ---
  const tabId = uiState.activeGalleryTab || "tab-categories";
  await switchGalleryTab(tabId);

  console.log(`✅ initGalleryTab restored ${tabId}`);
} // end initGalleryTab


/* ------------------------------------------------------------
   setGallerySubtabs()
   Creates the Gallery subtab bar if missing.
   Adds the "Categories" button and binds its click handler.

   Arguments:
     (none)
------------------------------------------------------------ */
function setGallerySubtabs() {
  let el = document.getElementById("subtabs");
  if (!el) throw new Error("setGallerySubtabs: #subtabs not found");

  // reuse existing subtab bar if it already exists
  let bar = document.getElementById("gallerySubtabBar");
  if (bar) return;

  // otherwise create new subtab bar
  el.innerHTML = "";
  bar = document.createElement("ul");
  bar.className = "nav nav-tabs gallery-subtabs";
  bar.id = "gallerySubtabBar";
  el.appendChild(bar);

  // create and attach the Categories button
  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className = "nav-link active";
  btn.dataset.tabId = "tab-categories";
  btn.textContent = "Categories";
  btn.addEventListener("click", () => switchGalleryTab("tab-categories"));

  li.appendChild(btn);
  bar.appendChild(li);
} // end setGallerySubtabs


/* ------------------------------------------------------------
   setGalleryCategories()
   Populates the Categories view.
   Loads Ideabook and Patterns directories and builds category frames.

   Arguments:
     (none)
------------------------------------------------------------ */
async function setGalleryCategories() {
  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("setGalleryCategories: #text not found");

  textDiv.innerHTML = "<p>Loading Gallery categories...</p>";

  // --- load manifests for Ideabook and Patterns ---
  const ideabookData = await loadManifestGroup(`./gallery/${IDEABOOK}`);
  const patternsData = await loadManifestGroup(`./gallery/${PATTERNS}`);

  // --- load Scripts manifest (single manifest file) ---
  const scriptsList = await loadManifest("./gallery", "Scripts") || [];

  // --- combine all data sets ---
  const data = {
    Ideabook: Object.keys(ideabookData),
    Patterns: Object.keys(patternsData),
    Scripts: scriptsList
  };

  // --- render and hook up UI ---
  renderGalleryCategories(textDiv, data);
  addGalleryHandler(IDEABOOK, textDiv);
  addGalleryHandler(PATTERNS, textDiv);
  addGalleryHandler(SCRIPTS, textDiv);

  console.log("✅ Gallery categories displayed");
} // end setGalleryCategories


/* ------------------------------------------------------------
   renderGalleryCategories(container, data)
   Builds the category frames for Ideabook, Patterns, and Scripts.

   Arguments:
     container – parent element for category display
     data      – object containing category names and lists
------------------------------------------------------------ */
function renderGalleryCategories(container, data) {
  container.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.id = "categories";

  // helper for each category section
  function addFrame(title, list) {
    const frame = document.createElement("div");
    frame.className = "category-frame";

    const header = document.createElement("div");
    header.className = "category-header";
    header.textContent = title;
    frame.appendChild(header);

    const content = document.createElement("div");
    content.className = "category-content";

    const itemsArray = Array.isArray(list) ? list : Object.keys(list || {});
    if (!itemsArray || itemsArray.length === 0) {
      const empty = document.createElement("div");
      empty.className = "item";
      empty.textContent = "(empty)";
      content.appendChild(empty);
    } else {
      itemsArray.forEach(entry => {
        const row = document.createElement("div");
        row.className = "item";

        // if manifest entry is an object, prefer title over filename
        if (typeof entry === "object" && entry !== null) {
          row.textContent = entry.title || entry.filename || "(untitled)";
          row.dataset.filename = entry.filename || "";
        } else {
          // legacy case: entry is a plain string
          row.textContent = entry;
          row.dataset.filename = entry;
        }

        content.appendChild(row);
      });
    }

    frame.appendChild(content);
    wrapper.appendChild(frame);
  } // end addFrame

  addFrame(IDEABOOK, data.Ideabook);
  addFrame(PATTERNS, data.Patterns);
  addFrame(SCRIPTS, data.Scripts);

  container.appendChild(wrapper);
} // end renderGalleryCategories

/* ------------------------------------------------------------
   addGalleryHandler(tab, container)
   Attaches click handlers for category items.
   When an item is clicked, its thumbnails (or script list) are rendered.

   Arguments:
     tab        – one of IDEABOOK or PATTERNS or SCRIPTS
     container  – DOM element containing category frames
------------------------------------------------------------ */
function addGalleryHandler(tab, container) {
  // determine which frame to target
  const index = (tab === IDEABOOK) ? 1 : (tab === PATTERNS) ? 2 : 3;
  const frame = container.querySelector(`.category-frame:nth-child(${index})`);
  if (!frame) return;

  // attach listeners to each category row
    frame.querySelectorAll(".item").forEach(row => {
	row.addEventListener("click", async () => {
	    const cat = row.textContent.trim();
	    if (!cat || cat === "(empty)") return;
	    
	    const textDiv = document.getElementById("text");
	    if (textDiv) textDiv.innerHTML = "";
	    
	    addGallerySubtab({ name: tab });
	    
	    if (tab === SCRIPTS) {
		const scriptName = row.dataset.filename || row.textContent.trim();
		await renderGalleryScripts(scriptName);
	    } else {
		renderGalleryThumbnails(tab, cat);
	    }
	});
    });

} // end addGalleryHandler


/* ------------------------------------------------------------
   addGallerySubtab(item)
   Creates a subtab button (Ideabook, Patterns, or Scripts).

   Arguments:
     item – object with { name } property
------------------------------------------------------------ */
/* ------------------------------------------------------------
   addGallerySubtab(item)
   Creates a subtab button (Ideabook, Patterns, or Scripts)
   and records it in uiState.galleryTabs for restoration.
------------------------------------------------------------ */
function addGallerySubtab(item) {
  const bar = document.getElementById("gallerySubtabBar");
  if (!bar) throw new Error("addGallerySubtab: subtab bar not found");

  const tabId = "tab-" + item.name.toLowerCase();
  let btn = bar.querySelector(`[data-tab-id="${tabId}"]`);

  // create if missing
  if (!btn) {
    const li = document.createElement("li");
    li.className = "nav-item";
    btn = document.createElement("button");
    btn.className = "nav-link";
    btn.dataset.tabId = tabId;
    btn.textContent = item.name;
    btn.addEventListener("click", () => switchGalleryTab(tabId));
    li.appendChild(btn);
    bar.appendChild(li);

    // record created subtab for restoration
    uiState.galleryTabs[tabId] = { name: item.name };
  }

  // highlight active button
  bar.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  uiState.activeGalleryTab = tabId;
} // end addGallerySubtab


/* ------------------------------------------------------------
   switchGalleryTab(tabId)
   Switches between Gallery subtabs and restores cached data.

   Arguments:
     tabId – string (e.g., "tab-ideabook")
------------------------------------------------------------ */
async function switchGalleryTab(tabId) {
  uiState.activeGalleryTab = tabId;
  clearDivs();

  // --- Handle Categories tab separately ---
  if (tabId === "tab-categories") {
    await setGalleryCategories();
    return;
  }

  // --- Derive subtab key ---
  const key = tabId.replace("tab-", "");

  // --- Fetch or reuse cached manifest ---
  let manifestInfo = uiState.manifests.gallery[key];
  if (!manifestInfo) {
    console.log("Loading new manifest for", key);

    switch (key) {
      case "ideabook":
        manifestInfo = await loadManifestGroup(`./gallery/${IDEABOOK}`);
        break;

      case "patterns":
        manifestInfo = await loadManifestGroup(`./gallery/${PATTERNS}`);
        break;

      case "scripts":
        manifestInfo = await loadManifest("./gallery", "Scripts") || [];
        break;

      default:
        console.warn("Unknown gallery key:", key);
        manifestInfo = [];
        break;
    }

    uiState.manifests.gallery[key] = manifestInfo;
  } else {
    console.log("Using cached manifest for", key);
  }

  // --- Redisplay based on selected subtab ---
  if (key === "ideabook") {
    addGallerySubtab({ name: IDEABOOK });
    renderGalleryThumbnails(IDEABOOK, Object.keys(manifestInfo)[0]);
  } else if (key === "patterns") {
    addGallerySubtab({ name: PATTERNS });
    renderGalleryThumbnails(PATTERNS, Object.keys(manifestInfo)[0]);
  } else if (key === "scripts") {
    addGallerySubtab({ name: SCRIPTS });
    await renderGalleryScripts();
  }

  // --- Update button highlighting ---
  const buttons = document.querySelectorAll("#gallerySubtabBar .nav-link");
  buttons.forEach(b => b.classList.remove("active"));
  const activeBtn = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (activeBtn) activeBtn.classList.add("active");
} // end switchGalleryTab


/* ------------------------------------------------------------
   renderGalleryThumbnails(tab, category)
   Displays thumbnails for a given Gallery subtab and category.
   Uses cached manifest if available, otherwise fetches from disk.

   Arguments:
     tab       – one of IDEABOOK or PATTERNS
     category  – name of the category folder
------------------------------------------------------------ */
async function renderGalleryThumbnails(tab, category) {
  const actDiv = document.getElementById("action");
  actDiv.innerHTML = "<p>Loading thumbnails...</p>";

  // --- Check cache first ---
  let cached;
  if (tab === IDEABOOK)
    cached = uiState.manifests.gallery.ideabook?.[category];
  else
    cached = uiState.manifests.gallery.patterns?.[category];

  if (cached) {
    console.log("Using cached manifest for", category);
    uiState.activeManifest = cached;
    drawGalleryThumbnails(tab, category, cached);
    return;
  }

  // --- Otherwise load manifest via helper ---
  try {
    const manifest = await loadManifest(`./gallery/${tab}`, category);
    if (!Array.isArray(manifest) || manifest.length === 0) {
      actDiv.innerHTML = `<p>No images found for ${category}</p>`;
      return;
    }

    // --- Cache manifest ---
    if (tab === IDEABOOK) {
      uiState.manifests.gallery.ideabook ??= {};
      uiState.manifests.gallery.ideabook[category] = manifest;
    } else {
      uiState.manifests.gallery.patterns ??= {};
      uiState.manifests.gallery.patterns[category] = manifest;
    }

    uiState.activeManifest = manifest;
    drawGalleryThumbnails(tab, category, manifest);

  } catch (err) {
    actDiv.innerHTML = `<p style="color:red;">Error loading thumbnails for ${category}</p>`;
    console.error("renderGalleryThumbnails failed:", err);
  }
} // end renderGalleryThumbnails


/* ------------------------------------------------------------
   renderGalleryScripts()
   For the Scripts subtab, nothing is displayed in #action.
   Execution happens immediately when switching to Scripts.
------------------------------------------------------------ */

async function renderGalleryScripts(scriptName = null) {
  const actDiv = document.getElementById("action");
  actDiv.innerHTML = "";

  try {
      // --- Fetch or reuse cached manifest ---
      let manifest = uiState.manifests.gallery.scripts;
      if (!manifest) {
	  manifest = await loadManifest("./gallery", "Scripts");
	  if (!manifest) throw new Error("Missing or invalid Scripts manifest");
	  uiState.manifests.gallery.scripts = manifest;
      }

      uiState.activeManifest = manifest;

      // --- Determine which entry to show ---
      let idx = 0;
      if (scriptName) {
	  idx = manifest.findIndex(e => e.filename === scriptName);
	  if (idx < 0) idx = 0;
      } else {
	  idx = uiState.galleryIndex?.scripts ?? 0;
      }

      const entry = manifest[idx] ?? manifest[0];
      if (!entry) {
	  console.warn("No script entries found in manifest.");
	  return;
      }

      // --- Display selected script ---
      setActiveItem("Scripts", entry);
      await showGalleryScript(entry);
      updateGalleryCaption(SCRIPTS);
      
      // --- Show parameter controls if defined ---
      if (window.scriptInfo) {
	  window.scriptInfo.redrawHandler = redrawActiveScript;
	  buildParameterControls(window.scriptInfo, "tab-scripts", true);
      }
  } catch (err) {
      console.error("renderGalleryScripts failed:", err);
      actDiv.innerHTML = `<p style="color:red;">
                        Error loading or executing Scripts manifest</p>`;
  }
} // end renderGalleryScripts


/* ------------------------------------------------------------
   drawGalleryThumbnails(tab, category, manifest)
   Builds a unified thumbnail panel for any Gallery subtab.
   Restores previously viewed image using stored galleryIndex.

   Arguments:
     tab       – IDEABOOK or PATTERNS
     category  – current category name
     manifest  – array of manifest entries
------------------------------------------------------------ */
function drawGalleryThumbnails(tab, category, manifest) {
  const actDiv = document.getElementById("action");
  const panel = document.createElement("div");
  panel.className = "thumb-panel";

  // create thumbnails
  manifest.forEach((entry, i) => {
    const { filename, path } = entry;
    const thumbBox = document.createElement("div");
    thumbBox.className = "thumb-box";

    const img = document.createElement("img");
    img.className = "thumb-image";
    img.src = `./gallery/${tab}/${category}/images/thumb_${filename}.png`;
    img.alt = filename;
    img.title = filename;

    img.addEventListener("click", () => {
      if (!uiState.galleryIndex)
        uiState.galleryIndex = { ideabook: 0, patterns: 0, scripts: 0 };
      uiState.galleryIndex[tab.toLowerCase()] = i;
      showGalleryImage(tab, category, path);
      setActiveItem(category, entry);
      updateGalleryCaption(tab);
    });

    thumbBox.appendChild(img);
    panel.appendChild(thumbBox);
  });

  actDiv.innerHTML = "";
  actDiv.appendChild(panel);

  // restore previously viewed image
  const key = tab.toLowerCase();
  const idx = uiState.galleryIndex[key] ?? 0;
  const entry = manifest[idx] ?? manifest[0];
  if (entry?.path) {
    showGalleryImage(tab, category, entry.path);
    setActiveItem(category, entry);
  }

  updateGalleryCaption(tab);
} // end drawGalleryThumbnails

/* ------------------------------------------------------------
   showGalleryImage(tab, category, path)
   Displays selected image in the main sketchpad area.

   Arguments:
     tab       – one of IDEABOOK / PATTERNS / SCRIPTS
     category  – folder name
     path      – image path relative to gallery/<tab>
------------------------------------------------------------ */
function showGalleryImage(tab, category, path) {
  const sketch = document.getElementById("sketchpad");
  sketch.innerHTML = "";

  const img = document.createElement("img");
  img.src = `./gallery/${tab}/${path}`;
  img.alt = path;
  img.style.display = "block";
  img.style.maxWidth = "100%";
  img.style.maxHeight = "100%";
  img.style.margin = "0 auto";

  sketch.appendChild(img);
} // end showGalleryImage


/* ------------------------------------------------------------
   showGalleryScript(entry)
   Executes a .js script from gallery/Scripts and displays its output.
   The script is dynamically loaded into the DOM.
   The offcanvas panel may be opened separately to show its source.

   Arguments:
     entry – manifest entry { filename, path, title? }
------------------------------------------------------------ */
async function showGalleryScript(entry) {
  const sketchDiv = document.getElementById("sketchpad");

  // === STEP 1: Attach shared canvas ===
  sketchDiv.innerHTML = "";
  sketchDiv.appendChild(window.drawCanvas);

  const localCtx = ctx;

  // === STEP 2: Clear the drawing area ===
  localCtx.fillStyle = "#ffffff";
  localCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);

  // === STEP 3: Load and execute script ===
  // === STEP 3: Load and execute script ===
    try {
	// add cache-buster so browser fetches a fresh copy
	const resp = await fetch(`./gallery/Scripts/${entry.path}?t=${Date.now()}`);
	if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
	
	const code = await resp.text();

	// clear old scriptInfo before running new script
	delete window.scriptInfo;
	
	// evaluate new script source
	eval(code);

	// draw using its registered function
	if (window.scriptInfo && typeof window.scriptInfo.draw === "function") {
	    window.scriptInfo.draw(window.scriptInfo.parameters);
	}

	// rebuild controls every time a script runs
	const actionDiv = document.getElementById("action");
	if (actionDiv) actionDiv.innerHTML = "";
	if (window.scriptInfo) {
	    window.scriptInfo.redrawHandler = redrawActiveScript;
	    buildParameterControls(window.scriptInfo, "tab-scripts", true);
	}
	console.log(`✅ Executed ${entry.filename}`);
    } catch (err) {
	console.error("Script execution error:", err);
	sketchDiv.innerHTML = `<p style="color:red;">
                 Error executing ${entry.filename}</p>`;
	return;
  }


  // === STEP 4: Update UI state ===
  uiState.activeScript = {
    filename: entry.filename,
    path: entry.path
  };

  updateGalleryCaption(SCRIPTS);

  // === STEP 5: Rebuild parameter controls if script defines them ===
  const actionDiv = document.getElementById("action");
  if (actionDiv) actionDiv.innerHTML = ""; // clear any prior controls

if (window.scriptInfo) {
  window.scriptInfo.redrawHandler = redrawActiveScript;
  buildParameterControls(window.scriptInfo, "tab-scripts", true);
}
    

} // end showGalleryScript



/* ------------------------------------------------------------
   updateGalleryCaption(tab)
   Builds the caption bar for a subtab.
   Displays current title and Prev/Next buttons.
   For Scripts, adds a "Show Script" button to open the offcanvas panel.

   Arguments:
     tab – name of subtab ("Ideabook", "Patterns", or "Scripts")
------------------------------------------------------------ */
function updateGalleryCaption(tab) {
  const capDiv = document.getElementById("caption");
  capDiv.innerHTML = "";
  capDiv.style.display = "flex";

  const info = uiState.activeGalleryItem;
  const title = document.createElement("span");
  title.className = "caption-title";
  title.textContent = info?.title || info?.filename || "(untitled)";
  capDiv.appendChild(title);

  const btnGroup = document.createElement("div");
  btnGroup.className = "caption-buttons";

  const makeBtn = (label, handler) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.addEventListener("click", handler);
    return b;
  };

  // unified navigation handlers
  btnGroup.appendChild(makeBtn("Prev", () => showPrevGalleryItem(tab)));
  btnGroup.appendChild(makeBtn("Next", () => showNextGalleryItem(tab)));

  // add Show Script only for Scripts subtab
  if (tab === SCRIPTS) {
    btnGroup.appendChild(makeBtn("Show Script", async () => {
      const entry = uiState.activeGalleryItem;
      if (!entry) return;
      try {
        const res = await fetch(`./gallery/Scripts/${entry.path}`);
        if (res.ok) {
          const text = await res.text();
          showOffcanvas(entry.title || entry.filename, text);
        } else {
          showOffcanvas(entry.title || entry.filename, `Unable to load script: HTTP ${res.status}`);
        }
      } catch (err) {
        showOffcanvas(entry.title || entry.filename, `Error: ${err.message}`);
      }
    }));
  }

  capDiv.appendChild(btnGroup);
} // end updateGalleryCaption


/* ------------------------------------------------------------
   showPrevGalleryItem(tab)
   Displays the previous item for the given subtab.
------------------------------------------------------------ */
async function showPrevGalleryItem(tab) {
  const manifest = uiState.activeManifest;
  if (!manifest) return;

  const current = uiState.activeGalleryItem;
  const idx = manifest.findIndex(e => e.path === current?.path);
  const prevIdx = (idx <= 0) ? manifest.length - 1 : idx - 1;

  const entry = manifest[prevIdx];
  uiState.activeGalleryItem = entry;

    if (!uiState.galleryIndex)
	uiState.galleryIndex = { ideabook: 0, patterns: 0, scripts: 0 };
    uiState.galleryIndex[tab.toLowerCase()] = prevIdx;

    if (tab === SCRIPTS) {
	await showGalleryScript(entry);
	if (window.scriptInfo) {
	    window.scriptInfo.redrawHandler = redrawActiveScript;
	    buildParameterControls(window.scriptInfo, "tab-scripts", true);
	}
    } else {
	showGalleryImage(tab, uiState.activeCategory, entry.path);
    }

    updateGalleryCaption(tab);
} // end showPrevGalleryItem


/* ------------------------------------------------------------
   showNextGalleryItem(tab)
   Displays the next item for the given subtab.
------------------------------------------------------------ */
async function showNextGalleryItem(tab) {
  const manifest = uiState.activeManifest;
  if (!manifest) return;

  const current = uiState.activeGalleryItem;
  const idx = manifest.findIndex(e => e.path === current?.path);
  const nextIdx = (idx >= manifest.length - 1) ? 0 : idx + 1;

  const entry = manifest[nextIdx];
  uiState.activeGalleryItem = entry;

  if (!uiState.galleryIndex) uiState.galleryIndex = { ideabook: 0, patterns: 0, scripts: 0 };
  uiState.galleryIndex[tab.toLowerCase()] = nextIdx;

    if (tab === SCRIPTS) {
	await showGalleryScript(entry);
	if (window.scriptInfo) {
	    buildScriptParameterControls(window.scriptInfo, "tab-scripts");
	}
    } else {
	showGalleryImage(tab, uiState.activeCategory, entry.path);
    }

  updateGalleryCaption(tab);
} // end showNextGalleryItem


function redrawActiveScript() {
  if (!window.scriptInfo || typeof window.scriptInfo.draw !== "function") return;
  try {
    window.scriptInfo.draw(window.scriptInfo.parameters);
  } catch (err) {
    console.error("redrawActiveScript failed:", err);
  }
} // end redrawActiveScript

/* ------------------------------------------------------------
   galleryDivs
   Div mapping for Gallery tab used by setUI().
------------------------------------------------------------ */
const galleryDivs = {
  activeDivs: ["subtabs"],
  theme: "theme-gallery",
  action: setGalleryAction,
  buttons: setGalleryButtons,
  caption: setGalleryCaption,
  sketchpad: setGallerySketchpad,
  subtabs: setGallerySubtabs,
  text: setGalleryText
}; // end galleryDivs


/* ------------------------------------------------------------
   Minimal placeholder setters
   Clears the corresponding divs when switching tabs.
------------------------------------------------------------ */
function setGalleryAction() {
  const el = document.getElementById("action");
  if (el) el.innerHTML = "";
} // end setGalleryAction

function setGalleryButtons() {
  const el = document.getElementById("buttons");
  if (el) el.innerHTML = "";
} // end setGalleryButtons

function setGalleryCaption() {
  const el = document.getElementById("caption");
  if (el) el.innerHTML = "";
} // end setGalleryCaption

function setGallerySketchpad() {
  const el = document.getElementById("sketchpad");
  if (el) el.innerHTML = "";
} // end setGallerySketchpad

function setGalleryText() {
  const el = document.getElementById("text");
  if (el) el.innerHTML = "";
} // end setGalleryText
