/* gallery.js
   ------------------------------------------------------------
   Gallery Tab Controller
   Uses ManifestManager (manifests.js) for all manifest loading.
   Displays:
     - Ideabook: image collections
     - Patterns: saved/generated images
     - Scripts: executable gallery scripts
   ------------------------------------------------------------ */

import { uiState } from "./uiState.js";
import { renderCategories } from "./categories.js";
import { setCaptionBar } from "./caption.js";
import { showSharedOffcanvas, clearDivs } from "./ui_utilities.js";
import { manifest } from "./manifest.js";
import { printTitle } from "../draw/draw_utilities.js";
import { Line, Point, StringThing } from "../classes/classes.js";
import { menuManager } from "./menuManager.js";


// ============================================================
// Constants identifying Gallery domains
// ============================================================
const IDEABOOK = "Ideabook";
const PATTERNS = "Patterns";
const SCRIPTS = "Scripts";

/* ============================================================
   initGalleryTab()

   Purpose:
     Entry point for the Gallery tab:
       - Clears shared UI regions
       - Ensures the subtab bar exists
       - Loads gallery manifests via ManifestManager
       - Recreates subtabs for Ideabook / Patterns / Scripts
       - Restores previously active subtab and UI state

   Arguments:
     (none)

   Notes:
     - Must call manifest.load("gallery") before reading
       manifest.cache.gallery.
     - uiState.galleryTabs is populated dynamically by
       addGallerySubtab().
============================================================ */
export async function initGalleryTab() {
  // Clear any prior tab’s content
  clearDivs();

  // Ensure the subtab bar exists
  setGallerySubtabs();

  // Load all gallery manifest data into cache
  await manifest.load("gallery");

  // Rebuild previously created subtabs, or default to all three
  const created = Object.keys(uiState.galleryTabs || {});
  const bar = document.querySelector("#subtabs ul");

  if (created.length > 0) {
    // Restore previously created dynamic subtabs
    created.forEach((tabId) => {
      const item = uiState.galleryTabs[tabId];
      if (item) addGallerySubtab({ name: item.name });
    });
  } else {
      // Initial startup — only add Categories.
      uiState.galleryTabs = { "tab-categories": { name: "Categories" } };
  }

  const tabId = "tab-categories";   // Always start Gallery at Categories
  await switchGalleryTab(tabId);

  // Also update uiState so it matches
  uiState.activeGalleryTab = "tab-categories";


  console.log(`✅ initGalleryTab restored ${tabId}`);
} // end initGalleryTab

/* ============================================================
   setGallerySubtabs()

   Purpose:
     Create or rebuild the Gallery subtab bar. Always inserts
     a "Categories" tab as the first fixed tab. Dynamic tabs
     (Ideabook, Patterns, Scripts) are added separately via
     addGallerySubtab().

   Arguments:
     (none)

   Throws:
     Error if #subtabs element is missing.
============================================================ */
function setGallerySubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setGallerySubtabs: #subtabs not found");

  // Always rebuild — prevents ghost/inherited tabs
  el.innerHTML = "";

  // Base UL container
  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs gallery-subtabs";
  el.appendChild(bar);

  // Build Categories tab
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

/* ============================================================
   setGalleryCategories()

   Purpose:
     Populate the Categories panel (#text) with:
       - Ideabook category list
       - Patterns category list
       - Scripts list
     All manifest data is retrieved from
       manifest.cache.gallery.{ideabook,patterns,scripts}

   Arguments:
     (none)

   Throws:
     Error if #text missing or manifest cache incomplete.
============================================================ */
async function setGalleryCategories() {
  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("setGalleryCategories: #text not found");

  textDiv.innerHTML = "<p>Loading Gallery categories...</p>";

  // ManifestManager must have loaded gallery earlier in init
  const g = manifest.cache.gallery;
  if (!g) throw new Error("Gallery cache missing in ManifestManager");

  const data = {
    Ideabook: Object.keys(g.ideabook || {}),
    Patterns: Object.keys(g.patterns || {}),
    Scripts: g.scripts || [],
  };

  // Use shared category renderer
renderCategories(
  "text",
  [
    {
      title: IDEABOOK,
      items: data.Ideabook.map(name => ({
        name,
        hasSubitems: false,
        onClick: () => handleGalleryCategoryClick(IDEABOOK, name)
      }))
    },
    {
      title: PATTERNS,
      items: data.Patterns.map(name => ({
        name,
        hasSubitems: false,
        onClick: () => handleGalleryCategoryClick(PATTERNS, name)
      }))
    },
    {
      title: SCRIPTS,
      items: data.Scripts.map(entry => ({
        name: entry.title || entry.filename,
        hasSubitems: false,
        onClick: () => handleGalleryScriptClick(entry)
      }))
    }
  ],
  (item) => item.onClick()
);

function handleGalleryCategoryClick(tab, categoryName) {
  addGallerySubtab({ name: tab });

  // NEVER pass categoryName to setActiveItem here.
  // Only the fixed tab label is valid.
//  setActiveItem(tab, { filename: categoryName });

  renderGalleryThumbnails(tab, categoryName);
} // end handleGalleryCategoryClick


function handleGalleryScriptClick(entry) {
  addGallerySubtab({ name: SCRIPTS });
  renderGalleryScripts(entry.filename);
} // end handleGalleryScriptClick


  // Attach click handlers for the 3 frames
  addGalleryHandler(IDEABOOK, textDiv);
  addGalleryHandler(PATTERNS, textDiv);
  addGalleryHandler(SCRIPTS, textDiv);

  console.log("✅ Gallery categories displayed");
} // end setGalleryCategories

/* ============================================================
   renderGalleryCategories(container, data)

   Purpose:
     Render the three Gallery category frames:
       - Ideabook
       - Patterns
       - Scripts
     Each frame lists its items (subfolders for images, or
     script entries for Scripts).

   Arguments:
     container (HTMLElement) – where to insert the layout
     data (object):
       {
         Ideabook: [category names...],
         Patterns: [category names...],
         Scripts:  [script entries...]
       }
============================================================ */
function renderGalleryCategories(container, data) {
  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.id = "categories";

  /* helper: addFrame(title, list)
     Renders a header and vertical list for each category frame */
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

    if (!itemsArray.length) {
      const empty = document.createElement("div");
      empty.className = "item";
      empty.textContent = "(empty)";
      content.appendChild(empty);
    } else {
      itemsArray.forEach((entry) => {
        const row = document.createElement("div");
        row.className = "item";

        // Scripts entries are objects; categories are strings
        if (typeof entry === "object" && entry !== null) {
          row.textContent = entry.title || entry.filename || "(untitled)";
          row.dataset.filename = entry.filename || "";
        } else {
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

/* ============================================================
   addGalleryHandler(tab, container)

   Purpose:
     Attach click handlers to the category-frame corresponding
     to the given tab:
       - IDEABOOK → frame 1
       - PATTERNS → frame 2
       - SCRIPTS  → frame 3

     When the user clicks an item:
       - For SCRIPTS: locate and run the chosen script.
       - For others: render thumbnails for the chosen category.

   Arguments:
     tab       (string) – IDEABOOK | PATTERNS | SCRIPTS
     container (HTMLElement) – the #text container holding
                               the three category frames.
============================================================ */
function addGalleryHandler(tab, container) {
  // Map tab name to frame index (1-based nth-child)
  const index = tab === IDEABOOK ? 1 : tab === PATTERNS ? 2 : 3;
  const frame = container.querySelector(`.category-frame:nth-child(${index})`);
  if (!frame) return;

  // Wire each row in the frame
  frame.querySelectorAll(".item").forEach((row) => {
    row.addEventListener("click", async () => {
      const cat = row.textContent.trim();
      if (!cat || cat === "(empty)") return;

      const textDiv = document.getElementById("text");
      if (textDiv) textDiv.innerHTML = "";

      // Ensure subtab exists and is active
      addGallerySubtab({ name: tab });

      if (tab === SCRIPTS) {
        // For scripts, we target a specific script by filename
        const scriptName = row.dataset.filename || row.textContent.trim();
        await renderGalleryScripts(scriptName);
      } else {
        // For Ideabook / Patterns, cat is the folder name
        await renderGalleryThumbnails(tab, cat);
      }
    });
  });
} // end addGalleryHandler

/* ============================================================
   addGallerySubtab(item)

   Purpose:
     Ensure a subtab exists for the given Gallery domain
     (Ideabook, Patterns, Scripts). If it does not exist,
     create it and wire click → switchGalleryTab(). Always
     mark the created or existing subtab as active.

   Arguments:
     item (object):
       {
         name: "Ideabook" | "Patterns" | "Scripts"
       }

   Throws:
     Error if subtab bar (#subtabs ul) is missing.
============================================================ */
function addGallerySubtab(item) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) throw new Error("addGallerySubtab: subtab bar not found");

  const tabId = "tab-" + item.name.toLowerCase();
  let btn = bar.querySelector(`[data-tab-id="${tabId}"], [data-tabId="${tabId}"]`);

  // Create button if it does not yet exist
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

    // Record in uiState for restoration on next visit
    uiState.galleryTabs = uiState.galleryTabs || {};
    uiState.galleryTabs[tabId] = { name: item.name };
  }

  // Make this subtab visually active
  bar.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  // Track active gallery tab in uiState
  uiState.activeGalleryTab = tabId;
} // end addGallerySubtab

/* ============================================================
   switchGalleryTab(tabId)

   Purpose:
     Main subtab switcher for the Gallery tab. Handles:
       - Categories view
       - Ideabook view (default category + thumbnails)
       - Patterns view (default category + thumbnails)
       - Scripts view (run selected/first script)

   Arguments:
     tabId (string) – one of:
       "tab-categories"
       "tab-ideabook"
       "tab-patterns"
       "tab-scripts"

   Notes:
     - Assumes manifest.load("gallery") has already run.
     - Uses manifest.cache.gallery for all data.
============================================================ */
async function switchGalleryTab(tabId) {
  uiState.activeGalleryTab = tabId;

  // Clear shared UI regions before drawing new content
  clearDivs();

  // Categories tab is special: just show the three frames
  if (tabId === "tab-categories") {
    await setGalleryCategories();
    return;
  }

  // Normalize tab key (e.g., "tab-ideabook" → "ideabook")
  const key = tabId.replace("tab-", "").toLowerCase();
  const g = manifest.cache.gallery;
  if (!g) throw new Error("switchGalleryTab: gallery cache missing");

  if (key === "ideabook") {
    // Ensure subtab and then show first Ideabook category
    addGallerySubtab({ name: IDEABOOK });

    const categories = Object.keys(g.ideabook || {});
    const firstCat = categories[0];
    if (firstCat) {
      await renderGalleryThumbnails(IDEABOOK, firstCat);
    }
  } else if (key === "patterns") {
    // Ensure subtab and then show first Patterns category
    addGallerySubtab({ name: PATTERNS });

    const categories = Object.keys(g.patterns || {});
    const firstCat = categories[0];
    if (firstCat) {
      await renderGalleryThumbnails(PATTERNS, firstCat);
    }
  } else if (key === "scripts") {
    // Ensure subtab and render scripts
    addGallerySubtab({ name: SCRIPTS });
    await renderGalleryScripts();
  } else {
    console.warn("switchGalleryTab: unknown key", key);
  }

  // Update button highlighting in the bar
  const bar = document.querySelector("#subtabs ul");
  if (bar) {
    bar.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));
    const activeBtn = bar.querySelector(
      `[data-tab-id="${tabId}"], [data-tabId="${tabId}"]`
    );
    if (activeBtn) activeBtn.classList.add("active");
  }
} // end switchGalleryTab

/* ============================================================
   renderGalleryThumbnails(tab, category)

   Purpose:
     Render a thumbnail panel for a specific Gallery domain
     and category (e.g., Ideabook → "curve-stitch"). Uses the
     manifest cache (ManifestManager) and wires thumbnails to
     showGalleryImage() + caption updates.

   Arguments:
     tab      (string) – IDEABOOK | PATTERNS
     category (string) – folder name within the chosen domain

   Throws:
     Error if #action is missing or manifest data is absent.
============================================================ */
async function renderGalleryThumbnails(tab, category) {
  const actDiv = document.getElementById("action");
  if (!actDiv) throw new Error("renderGalleryThumbnails: #action not found");

  actDiv.innerHTML = "<p>Loading thumbnails...</p>";

  const g = manifest.cache.gallery;
  if (!g) throw new Error("renderGalleryThumbnails: gallery cache missing");

  let list = [];
  if (tab === IDEABOOK) {
    list = g.ideabook?.[category] || [];
  } else if (tab === PATTERNS) {
    list = g.patterns?.[category] || [];
  }

  if (!Array.isArray(list) || list.length === 0) {
    actDiv.innerHTML = `<p>No images found for ${category}</p>`;
    return;
  }

  // Track current manifest + category in uiState
  uiState.activeManifest = list;
  uiState.activeCategory = category;

  // Delegate to the thumbnail drawer
  drawGalleryThumbnails(tab, category, list);
} // end renderGalleryThumbnails

/* ============================================================
   renderGalleryScripts(scriptName = null)

   Purpose:
     Select and execute a script from the gallery Scripts
     manifest using the ManifestManager cache. Also updates
     uiState indexes and caption.

   Arguments:
     scriptName (string | null) –
       - If provided: tries to select script with matching
         entry.filename.
       - If null: uses uiState.galleryIndex.scripts or 0.

   Throws:
     Error if manifest cache for Scripts is missing or invalid.
============================================================ */
async function renderGalleryScripts(scriptName = null) {
  const actDiv = document.getElementById("action");
  if (!actDiv) throw new Error("renderGalleryScripts: #action not found");
  actDiv.innerHTML = "";

  try {
    const g = manifest.cache.gallery;
    if (!g) throw new Error("renderGalleryScripts: gallery cache missing");

    const list = g.scripts;
    if (!Array.isArray(list) || list.length === 0) {
      console.warn("renderGalleryScripts: no script entries defined");
      return;
    }

    uiState.activeManifest = list;
    uiState.activeCategory = "Scripts";

    // Decide which script index to use
    let idx = 0;

    if (scriptName) {
      idx = list.findIndex((e) => e.filename === scriptName);
      if (idx < 0) idx = 0;
    } else {
      idx = uiState.galleryIndex?.scripts ?? 0;
    }

    const entry = list[idx] ?? list[0];
    if (!entry) {
      console.warn("renderGalleryScripts: no script entry available");
      return;
    }

    // Update active item + indexes
 //   setActiveItem("Scripts", entry);
    uiState.activeGalleryItem = entry;

    if (!uiState.galleryIndex) {
      uiState.galleryIndex = { ideabook: 0, patterns: 0, scripts: 0 };
    }
    uiState.galleryIndex.scripts = idx;

    // Execute and show caption
    await showGalleryScript(entry);
    updateGalleryCaption(SCRIPTS);
  } catch (err) {
    console.error("renderGalleryScripts failed:", err);
    actDiv.innerHTML = `<p style="color:red;">
                        Error loading or executing Scripts manifest</p>`;
  }
} // end renderGalleryScripts

/* ============================================================
   drawGalleryThumbnails(tab, category, manifest)

   Purpose:
     Build a unified thumbnail panel for a given Gallery domain
     (Ideabook or Patterns) and its category. Wires each
     thumbnail’s click handler to:

       - Update uiState.galleryIndex[...] with the clicked index
       - Show the full-size image in #sketchpad
       - Update caption and active item metadata

   Arguments:
     tab       (string) – IDEABOOK | PATTERNS
     category  (string) – folder name inside the gallery domain
     manifest  (array)  – list of manifest entries for images:
         {
           filename: "foo",
           path:     "category/foo.png",
           title:    optional
         }

   Throws:
     Error if #action is not found.
============================================================ */
function drawGalleryThumbnails(tab, category, manifest) {
  const actDiv = document.getElementById("action");
  if (!actDiv) throw new Error("drawGalleryThumbnails: #action not found");

  const panel = document.createElement("div");
  panel.className = "thumb-panel";

  // Build all thumbnails in a single panel
  manifest.forEach((entry, i) => {
    const { filename, path } = entry;

    const thumbBox = document.createElement("div");
    thumbBox.className = "thumb-box";

    const img = document.createElement("img");
    img.className = "thumb-image";

    // Thumbnail image path is *always* under:
    //   ./gallery/<tab>/<category>/images/thumb_<filename>.png
    img.src = `./gallery/${tab}/${category}/images/thumb_${filename}.png`;
    img.alt = filename;
    img.title = filename;

    img.addEventListener("click", () => {
      // Initialize galleryIndex if not present
      if (!uiState.galleryIndex) {
        uiState.galleryIndex = { ideabook: 0, patterns: 0, scripts: 0 };
      }

      const key = tab.toLowerCase();
      uiState.galleryIndex[key] = i;

      // Display the full-size image
      showGalleryImage(tab, category, path);

      // Mark item as active in uiState and shared category state
 //     setActiveItem(category, entry);
      uiState.activeGalleryItem = entry;

      // Refresh caption bar (Prev/Next/etc.)
      updateGalleryCaption(tab);
    });

    thumbBox.appendChild(img);
    panel.appendChild(thumbBox);
  });

  // Replace existing content with the new panel
  actDiv.innerHTML = "";
  actDiv.appendChild(panel);

  // Auto-display the currently selected or first item
  const key = tab.toLowerCase();
  if (!uiState.galleryIndex)
    uiState.galleryIndex = { ideabook: 0, patterns: 0, scripts: 0 };

  const idx = uiState.galleryIndex[key] ?? 0;
  const entry = manifest[idx] ?? manifest[0];
  if (entry?.path) {
    showGalleryImage(tab, category, entry.path);
 //   setActiveItem(category, entry);
    uiState.activeGalleryItem = entry;
  }

  // Refresh caption bar
  updateGalleryCaption(tab);
} // end drawGalleryThumbnails

/* ============================================================
   showGalleryImage(tab, category, path)

   Purpose:
     Display a full-size image in the central #sketchpad div.

   Arguments:
     tab      (string) – IDEABOOK | PATTERNS
     category (string) – the folder in this tab
     path     (string) – manifest path for an image file:
                         e.g. "circle/foo.png"

   Throws:
     Error if #sketchpad is missing.
============================================================ */
function showGalleryImage(tab, category, path) {
  const sketch = document.getElementById("sketchpad");
  if (!sketch) throw new Error("showGalleryImage: #sketchpad not found");

  sketch.innerHTML = "";

  // Full-size image path is under: ./gallery/<tab>/<path>
  const img = document.createElement("img");
  img.src = `./gallery/${tab}/${path}`;
  img.alt = path;

  // Scaling to fit container but preserve natural resolution
  img.style.display = "block";
  img.style.maxWidth = "100%";
  img.style.maxHeight = "100%";
  img.style.margin = "0 auto";

  sketch.appendChild(img);
} // end showGalleryImage

/* ============================================================
   showGalleryScript(entry)

   Purpose:
     Execute a gallery script located in:
       ./gallery/Scripts/<entry.path>
     Display result on the shared canvas. Supports two formats:

       1) Legacy script:
            { runPattern: function }

       2) Parameterized script:
            {
              patternMeta,
              initPattern(),
              drawPattern(params)
            }

   Arguments:
     entry (object) – manifest entry:
         {
           filename: string,
           path:     string,
           title:    optional
         }

   Throws:
     Error if #sketchpad or #action is missing.
============================================================ */
async function showGalleryScript(entry) {
  const sketchDiv = document.getElementById("sketchpad");
  if (!sketchDiv) throw new Error("showGalleryScript: #sketchpad not found");

  // Replace content with our shared drawing canvas
  sketchDiv.innerHTML = "";
  sketchDiv.appendChild(window.drawCanvas);

  // Clear canvas to white
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);

  try {
    // Load ES module
    const moduleUrl = `/gallery/Scripts/${entry.path}`;
    const mod = await import(moduleUrl);

    // ---------------------------------------------
    // PARAMETERIZED SCRIPT
    // ---------------------------------------------
    if (mod.patternMeta && mod.initPattern && mod.drawPattern) {
      printTitle(mod.patternMeta.title || entry.title || entry.filename);

      // Initialize script parameters
      const params = mod.initPattern();

      // Build control panel
      const actionDiv = document.getElementById("action");
      if (!actionDiv) throw new Error("showGalleryScript: #action not found");

      actionDiv.innerHTML = "";
      buildScriptControls(mod.patternMeta, params, actionDiv, () => {
        // Redraw on any parameter change
        mod.drawPattern(params);
      });

      // Initial render
      mod.drawPattern(params);
    }

    // ---------------------------------------------
    // LEGACY SCRIPT
    // ---------------------------------------------
    else {
      if (!mod.runPattern) {
        throw new Error(`runPattern() not found in ${moduleUrl}`);
      }

      await mod.runPattern();
    }
  } catch (err) {
    console.error("Script execution error:", err);
    sketchDiv.innerHTML = `<p style="color:red;">
                 Error executing ${entry.filename}: ${err.message}</p>`;
    return;
  }

  // Update script tracking state
  uiState.activeScript = {
    filename: entry.filename,
    path: entry.path,
    title: entry.title || entry.filename,
  };

  updateGalleryCaption(SCRIPTS);
} // end showGalleryScript

/* ============================================================
   buildScriptControls(meta, params, panel, onChange)

   Purpose:
     Construct a lightweight parameter UI (sliders, checkboxes,
     selects, text boxes) for a parameterized Gallery script.

   Arguments:
     meta     (object) – contains parameter definitions:
         {
           parameters: [
             {
               key: "size",
               label: "Size",
               widget: "range" | "checkbox" | "select" | (other),
               min, max, step, options...
             },
             ...
           ]
         }
     params   (object) – the parameter object controlled by UI
     panel    (HTMLElement) – usually #action
     onChange (function) – callback invoked after each change

   Notes:
     - Matches the control system used in utilities.js
       parameterized scripts.
============================================================ */
function buildScriptControls(meta, params, panel, onChange) {
  const box = document.createElement("div");
  box.className = "script-controls";

  meta.parameters.forEach((def) => {
    const row = document.createElement("div");
    row.className = "script-control-row";

    const label = document.createElement("label");
    label.textContent = def.label;

    let input = null;

    // -----------------------------------------
    // RANGE WIDGET
    // -----------------------------------------
    if (def.widget === "range") {
      input = document.createElement("input");
      input.type = "range";
      input.min = def.min;
      input.max = def.max;
      input.step = def.step;
      input.value = params[def.key];

      const readout = document.createElement("span");
      readout.className = "script-control-readout";
      readout.textContent = params[def.key];

      input.addEventListener("input", () => {
        params[def.key] = Number(input.value);
        readout.textContent = input.value;
        onChange();
      });

      row.appendChild(label);
      row.appendChild(input);
      row.appendChild(readout);
      box.appendChild(row);
      return;
    }

    // -----------------------------------------
    // CHECKBOX WIDGET
    // -----------------------------------------
    if (def.widget === "checkbox") {
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = params[def.key];

      input.addEventListener("input", () => {
        params[def.key] = input.checked;
        onChange();
      });

      row.appendChild(label);
      row.appendChild(input);
      box.appendChild(row);
      return;
    }

    // -----------------------------------------
    // SELECT WIDGET
    // -----------------------------------------
    if (def.widget === "select") {
      input = document.createElement("select");

      def.options.forEach((value) => {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = value;
        if (value === params[def.key]) opt.selected = true;
        input.appendChild(opt);
      });

      input.addEventListener("input", () => {
        params[def.key] = input.value;
        onChange();
      });

      row.appendChild(label);
      row.appendChild(input);
      box.appendChild(row);
      return;
    }

    // -----------------------------------------
    // DEFAULT: TEXT FIELD
    // -----------------------------------------
    input = document.createElement("input");
    input.type = "text";
    input.value = params[def.key];

    input.addEventListener("input", () => {
      params[def.key] = input.value;
      onChange();
    });

    row.appendChild(label);
    row.appendChild(input);
    box.appendChild(row);
  });

  panel.appendChild(box);
} // end buildScriptControls

/* ============================================================
   updateGalleryCaption(tab)

   Purpose:
     Build the caption bar for the current Gallery item using
     the unified caption-bar system (setCaptionBar).

     This replaces the old inline button creation. The caption
     bar system now handles:
       - Prev/Next arrows
       - Title display
       - Dropdown menu (if needed)
------------------------------------------------------------ */
function updateGalleryCaption(tab) {
  const item = uiState.activeGalleryItem;
  if (!item) return;

  const title =
    item.title ||
    item.filename ||
    item.path ||
    "(untitled)";

  // Dropdown menu callback (optional)
  const menuHandler = () => {
    menuManager.openMenu("gallery", {
      tab,
      entry: item,
      index: uiState.galleryIndex?.[tab.toLowerCase()] ?? 0
    });
  };

  buildGalleryCaption(title, tab, menuHandler);
} // end updateGalleryCaption


/* ============================================================
   showPrevGalleryItem(tab)

   Purpose:
     Navigate to the previous item in the activeManifest for
     the given Gallery tab (Ideabook, Patterns, Scripts).
     Automatically wraps around. Then rebuild caption bar.
------------------------------------------------------------ */
async function showPrevGalleryItem(tab) {

  const list = uiState.activeManifest;
  if (!list || list.length === 0) return;

  const current = uiState.activeGalleryItem;
  const idx = list.findIndex((e) => e.path === current?.path);
  const prevIdx = (idx <= 0) ? list.length - 1 : idx - 1;

  const entry = list[prevIdx];
  uiState.activeGalleryItem = entry;

  // Ensure galleryIndex exists
  if (!uiState.galleryIndex) {
    uiState.galleryIndex = { ideabook: 0, patterns: 0, scripts: 0 };
  }

  const key = tab.toLowerCase();

  // Update index and show
  if (key === "scripts") {
    uiState.galleryIndex.scripts = prevIdx;
    await showGalleryScript(entry);
  } else {
    if (key === "ideabook") uiState.galleryIndex.ideabook = prevIdx;
    if (key === "patterns") uiState.galleryIndex.patterns = prevIdx;
    showGalleryImage(tab, uiState.activeCategory, entry.path);
  }

  updateGalleryCaption(tab);
} // end showPrevGalleryItem


/* ============================================================
   showNextGalleryItem(tab)

   Purpose:
     Navigate to the next item in the activeManifest for
     the given Gallery tab (Ideabook, Patterns, Scripts).
     Automatically wraps around. Then rebuild caption bar.
------------------------------------------------------------ */
async function showNextGalleryItem(tab) {

  const list = uiState.activeManifest;
  if (!list || list.length === 0) return;

  const current = uiState.activeGalleryItem;
  const idx = list.findIndex((e) => e.path === current?.path);
  const nextIdx = (idx >= list.length - 1) ? 0 : idx + 1;

  const entry = list[nextIdx];
  uiState.activeGalleryItem = entry;

  // Ensure galleryIndex exists
  if (!uiState.galleryIndex) {
    uiState.galleryIndex = { ideabook: 0, patterns: 0, scripts: 0 };
  }

  const key = tab.toLowerCase();

  // Update index and show
  if (key === "scripts") {
    uiState.galleryIndex.scripts = nextIdx;
    await showGalleryScript(entry);
  } else {
    if (key === "ideabook") uiState.galleryIndex.ideabook = nextIdx;
    if (key === "patterns") uiState.galleryIndex.patterns = nextIdx;
    showGalleryImage(tab, uiState.activeCategory, entry.path);
  }

  updateGalleryCaption(tab);
} // end showNextGalleryItem


/* ============================================================
   galleryDivs

   Purpose:
     Div-controller registration object for the Gallery tab.
     Tells the shared UI controller which functions own which
     shared divs when the Gallery tab is active.

   Properties:
     activeDivs – div ids initially considered active
     theme      – CSS theme class
     action     – clears/builds #action
     buttons    – clears/builds #buttons
     caption    – clears/builds #caption
     sketchpad  – clears/builds #sketchpad
     subtabs    – builds subtabs
     text       – clears/builds #text
============================================================ */
export const galleryDivs = {
  activeDivs: ["subtabs"],
  theme: "theme-gallery",
  action: setGalleryAction,
  buttons: setGalleryButtons,
  caption: setGalleryCaption,
  sketchpad: setGallerySketchpad,
  subtabs: setGallerySubtabs,
  text: setGalleryText,
}; // end galleryDivs

/* ============================================================
   Minimal placeholder setters for div regions
============================================================ */

/* ------------------------------------------------------------
   setGalleryAction()

   Purpose:
     Clear the #action region. Thumbnail and script control
     panels are rebuilt as needed by other functions.

   Arguments:
     (none)
------------------------------------------------------------ */
function setGalleryAction() {
  const el = document.getElementById("action");
  if (el) el.innerHTML = "";
} // end setGalleryAction

/* ------------------------------------------------------------
   setGalleryButtons()

   Purpose:
     Clear the #buttons region. Gallery currently uses the
     caption bar for navigation instead of #buttons.

   Arguments:
     (none)
------------------------------------------------------------ */
function setGalleryButtons() {
  const el = document.getElementById("buttons");
  if (el) el.innerHTML = "";
} // end setGalleryButtons

/* ------------------------------------------------------------
   setGalleryCaption()

   Purpose:
     Reset the caption bar when switching away from Gallery.
     The activeGallery caption is fully rebuilt by
     updateGalleryCaption() when needed.

   Arguments:
     (none)
------------------------------------------------------------ */
function setGalleryCaption() {
  const el = document.getElementById("caption");
  if (el) el.innerHTML = "";
} // end setGalleryCaption

/* ------------------------------------------------------------
   setGallerySketchpad()

   Purpose:
     Clear the #sketchpad region. New images or canvas content
     are provided by showGalleryImage() or showGalleryScript().

   Arguments:
     (none)
------------------------------------------------------------ */
function setGallerySketchpad() {
  const el = document.getElementById("sketchpad");
  if (el) el.innerHTML = "";
} // end setGallerySketchpad

/* ------------------------------------------------------------
   setGalleryText()

   Purpose:
     Clear the #text region. Category lists or textual output
     are written here via setGalleryCategories() and others.

   Arguments:
     (none)
------------------------------------------------------------ */
function setGalleryText() {
  const el = document.getElementById("text");
  if (el) el.innerHTML = "";
} // end setGalleryText

/* ============================================================
   PUBLIC API FOR ui_callbacks

   - saveGalleryState()
   - loadCategory(categoryName)
   - showImage(itemName)
   - showPrevImage()
   - showNextImage()
============================================================ */

/* ------------------------------------------------------------
   saveGalleryState()

   Purpose:
     Produce a serializable snapshot of current Gallery state.

   Arguments:
     (none)

   Returns:
     state (object):
       {
         activeGalleryTab,
         galleryTabs,
         activeGalleryItem,
         activeManifest,
         galleryIndex
       }
------------------------------------------------------------ */
export function saveGalleryState() {
  const state = {
    activeGalleryTab: uiState.activeGalleryTab || null,
    galleryTabs: uiState.galleryTabs || {},
    activeGalleryItem: uiState.activeGalleryItem || null,
    activeManifest: uiState.activeManifest || null,
    galleryIndex: uiState.galleryIndex || null,
  };

  console.log("💾 Saved Gallery state (serializable):", state);
  return state;
} // end saveGalleryState

/* ------------------------------------------------------------
   loadCategory(categoryName)

   Purpose:
     External helper to select a Gallery sub-domain by name.
     It ensures the corresponding subtab exists and then
     switches to it.

   Arguments:
     categoryName (string | null | undefined) –
       "ideabook"  → tab-ideabook
       "patterns"  → tab-patterns
       "scripts"   → tab-scripts
       null/empty  → tab-categories
------------------------------------------------------------ */
export async function loadCategory(categoryName) {
  if (!categoryName) {
    await switchGalleryTab("tab-categories");
    return;
  }

  const name = categoryName.toLowerCase();

  if (name === IDEABOOK.toLowerCase()) {
    addGallerySubtab({ name: IDEABOOK });
    await switchGalleryTab("tab-ideabook");
    return;
  }

  if (name === PATTERNS.toLowerCase()) {
    addGallerySubtab({ name: PATTERNS });
    await switchGalleryTab("tab-patterns");
    return;
  }

  if (name === SCRIPTS.toLowerCase()) {
    addGallerySubtab({ name: SCRIPTS });
    await switchGalleryTab("tab-scripts");
    return;
  }

  // Fallback to Categories
  await switchGalleryTab("tab-categories");
} // end loadCategory

/* ------------------------------------------------------------
   showImage(itemName)

   Purpose:
     Display a specific image or script by name, based on the
     current activeManifest. Updates uiState.activeGalleryItem
     and galleryIndex.

   Arguments:
     itemName (string) – one of:
       - entry.title
       - entry.filename
       - entry.path
------------------------------------------------------------ */
export async function showImage(itemName) {
  const manifestList = uiState.activeManifest;
  if (!manifestList || !Array.isArray(manifestList) || !itemName) {
    console.warn("showImage: no active manifest or itemName missing");
    return;
  }

  const entry = manifestList.find(
    (e) =>
      e.title === itemName || e.filename === itemName || e.path === itemName
  );

  if (!entry) {
    console.warn("showImage: item not found in active manifest:", itemName);
    return;
  }

  uiState.activeGalleryItem = entry;

  const tabId = uiState.activeGalleryTab || "tab-ideabook";
  const key = tabId.replace("tab-", "").toLowerCase();

  let tabLabel = IDEABOOK;
  if (key === "patterns") tabLabel = PATTERNS;
  if (key === "scripts") tabLabel = SCRIPTS;

  if (!uiState.galleryIndex) {
    uiState.galleryIndex = { ideabook: 0, patterns: 0, scripts: 0 };
  }

  const idx = manifestList.indexOf(entry);
  if (idx >= 0) {
    if (key === "ideabook") uiState.galleryIndex.ideabook = idx;
    if (key === "patterns") uiState.galleryIndex.patterns = idx;
    if (key === "scripts") uiState.galleryIndex.scripts = idx;
  }

  if (tabLabel === SCRIPTS) {
    await showGalleryScript(entry);
  } else {
    const category = uiState.activeCategory;
    if (!category) {
      console.warn("showImage: activeCategory not set; showing image anyway");
    }
    showGalleryImage(tabLabel, category, entry.path);
  }

  updateGalleryCaption(tabLabel);
} // end showImage

/* ------------------------------------------------------------
   showPrevImage()

   Purpose:
     UI callback to move to previous gallery item based on
     current activeGalleryTab.

   Arguments:
     (none)
------------------------------------------------------------ */
export async function showPrevImage() {
  const tabId = uiState.activeGalleryTab;
  if (!tabId) return;

  const key = tabId.replace("tab-", "").toLowerCase();
  let tabLabel = null;

  if (key === "ideabook") tabLabel = IDEABOOK;
  if (key === "patterns") tabLabel = PATTERNS;
  if (key === "scripts") tabLabel = SCRIPTS;

  if (!tabLabel) {
    console.warn("showPrevImage: unknown gallery tab", tabId);
    return;
  }

  await showPrevGalleryItem(tabLabel);
} // end showPrevImage

/* ------------------------------------------------------------
   showNextImage()

   Purpose:
     UI callback to move to next gallery item based on
     current activeGalleryTab.

   Arguments:
     (none)
------------------------------------------------------------ */
export async function showNextImage() {
  const tabId = uiState.activeGalleryTab;
  if (!tabId) return;

  const key = tabId.replace("tab-", "").toLowerCase();
  let tabLabel = null;

  if (key === "ideabook") tabLabel = IDEABOOK;
  if (key === "patterns") tabLabel = PATTERNS;
  if (key === "scripts") tabLabel = SCRIPTS;

  if (!tabLabel) {
    console.warn("showNextImage: unknown gallery tab", tabId);
    return;
  }

  await showNextGalleryItem(tabLabel);
} // end showNextImage

/* ------------------------------------------------------------
   buildGalleryCaption
   Purpose:
     Central builder for the new caption bar system used by
     Gallery items (images or scripts).

     We delegate directly to setCaptionBar(), which applies
     the standard UI for:
       - optional Prev arrow
       - optional Next arrow
       - dropdown menu
       - title display
------------------------------------------------------------ */
function buildGalleryCaption(title, tabLabel, onMenu) {

  // Decide which navigation callbacks are valid for this tab
  let onPrev = null;
  let onNext = null;

  if (tabLabel === IDEABOOK) {
    onPrev = () => showPrevGalleryItem(IDEABOOK);
    onNext = () => showNextGalleryItem(IDEABOOK);
  }

  if (tabLabel === PATTERNS) {
    onPrev = () => showPrevGalleryItem(PATTERNS);
    onNext = () => showNextGalleryItem(PATTERNS);
  }

  if (tabLabel === SCRIPTS) {
    onPrev = () => showPrevGalleryItem(SCRIPTS);
    onNext = () => showNextGalleryItem(SCRIPTS);
  }

  setCaptionBar({
    targetId: "caption",     // your unified caption host
    title: title,
    onPrev: onPrev,
    onNext: onNext,
    onMenu: onMenu
  });
} // end buildGalleryCaption

