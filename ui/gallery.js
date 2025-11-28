/* gallery.js — REWRITE (BLOCK #1)
   ------------------------------------------------------------
   Architecture rules for this rewrite:

   • uiState.gallery is FIXED and MUST NOT be extended.
     uiState.gallery = {
       activeCategory : null,
       activeItem     : null,
       index          : { ideabook:0, patterns:0, scripts:0 },
       saved          : null
     }

   • All other state lives here as LOCAL MODULE VARIABLES.
     These are reset whenever Gallery tab is activated.

       let currentDomain       = null;      // "Ideabook" | "Patterns" | "Scripts"
       let currentCategory     = null;      // subfolder name
       let currentList         = [];        // list of image/script entries
       let currentIndex        = 0;         // local index for Prev/Next
       let galleryCache        = null;      // shorthand to manifest.cache.gallery

   • No duplication of functions.
   • No invented fields in uiState.
   ------------------------------------------------------------
*/

import { uiState } from "./uiState.js";
import { renderCategories } from "./categories.js";
import { setCaptionBar } from "./caption.js";
import { clearDivs, renderThumbnailGrid, showScriptOffcanvas } from "./ui_utilities.js";
import { manifest } from "./manifest.js";
import { fileLayer } from "./fileLayer.js";
import { loadScriptModule, executeScriptToCanvas } from "./scriptRunner.js";
import { menuManager } from "./menuManager.js";

/* ============================================================
   Constants
============================================================ */

const TAB_GALLERY     = "gallery";
const DOMAIN_IDEABOOK = "Ideabook";
const DOMAIN_PATTERNS = "Patterns";
const DOMAIN_SCRIPTS  = "Scripts";

export const GallerySubtabs = {
  CATEGORIES : "gallery-categories",
  IDEABOOK   : "gallery-ideabook",
  PATTERNS   : "gallery-patterns",
  SCRIPTS    : "gallery-scripts"
};

/* ============================================================
   LOCAL MODULE STATE  (NOT STORED IN uiState)
============================================================ */

let currentDomain   = null;   // "Ideabook" | "Patterns" | "Scripts"
let currentCategory = null;   // subfolder name for images
let currentList     = [];     // manifest list for current view
let currentIndex    = 0;      // index into currentList
let galleryCache    = null;   // manifest.cache.gallery reference

/* ============================================================
   GalleryTabSpec — used by setUI.js
============================================================ */

export const GalleryTabSpec = {
  name: TAB_GALLERY,
  theme: "theme-gallery",
  regions: ["caption", "text", "sketchpad", "buttons", "action"],

  init: initGalleryTab,
  save: saveGalleryState,

  buildCaption: () => {},
  buildText: () => {},
  buildSketchpad: () => {},
  buildButtons: () => {},
  buildAction: () => {}
};

/* ============================================================
   Controller (external entry points)
============================================================ */

export const GalleryController = {
  initGalleryTab,
  showCategoryList: setGalleryCategories,
  showPrev: showPrevGalleryItem,
  showNext: showNextGalleryItem
};

/* ============================================================
   initGalleryTab(restored)
   ------------------------------------------------------------
   ONLY this function touches manifest.get().

   Steps:
     1. Clear UI
     2. Reset local module state
     3. Load all three domains
     4. Build galleryCache
     5. Build subtabs
     6. Restore previous state OR show categories
============================================================ */

export async function initGalleryTab(restored = false) {
  clearDivs();

  /* ---------------------------------------------------------
     STEP 1: Reset ALL LOCAL STATE (not uiState)
  --------------------------------------------------------- */
  currentDomain   = null;
  currentCategory = null;
  currentList     = [];
  currentIndex    = 0;
  galleryCache    = null;

  /* ---------------------------------------------------------
     STEP 2: Load manifests
     Ideabook & Patterns have directoryRegistry.json
     Scripts does NOT.
  --------------------------------------------------------- */
  const ideabookRaw   = await manifest.get("gallery/Ideabook");
  const patternsRaw   = await manifest.get("gallery/Patterns");
  const scriptsRaw    = await fileLayer.loadJSON("../gallery/Scripts/manifest.json");

  const ideabookRegistry = manifest.getRegistry("gallery/Ideabook");
  const patternsRegistry = manifest.getRegistry("gallery/Patterns");

  /* ---------------------------------------------------------
     STEP 3: Build galleryCache (same shape as patternsCache)
  --------------------------------------------------------- */
  manifest.cache.gallery = {
    Ideabook : {},
    Patterns : {},
    Scripts  : Array.isArray(scriptsRaw) ? scriptsRaw : []
  };

  ideabookRegistry.forEach((cat, i) => {
    manifest.cache.gallery.Ideabook[cat] = ideabookRaw[i] || [];
  });

  patternsRegistry.forEach((cat, i) => {
    manifest.cache.gallery.Patterns[cat] = patternsRaw[i] || [];
  });

  galleryCache = manifest.cache.gallery;

  /* ---------------------------------------------------------
     STEP 4: Build the fixed "Categories" subtab
  --------------------------------------------------------- */
  setGallerySubtabs();

  /* ---------------------------------------------------------
     STEP 5: Restore OR Show categories
  --------------------------------------------------------- */
  const saved = uiState.gallery.saved;

  if (restored && saved && saved.domain) {
    // Restore domain
    currentDomain = saved.domain;

    if (currentDomain === DOMAIN_SCRIPTS) {
      currentList  = galleryCache.Scripts;
      currentIndex = uiState.gallery.index.scripts;
      await showGalleryScript(currentList[currentIndex]);
      return;
    }

    // Restore image domains
    currentCategory = saved.category;
    currentList     = galleryCache[currentDomain]?.[currentCategory] || [];
    currentIndex    = uiState.gallery.index[currentDomain.toLowerCase()];

    await showGalleryImageByIndex(currentDomain, currentCategory, currentIndex);
    return;
  }

  // Default
  await setGalleryCategories();
} // end initGalleryTab


/* ============================================================
   setGallerySubtabs()
   ------------------------------------------------------------
   Creates only the fixed "Categories" subtab.
   Dynamic subtabs are gone under this architecture.
============================================================ */
function setGallerySubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setGallerySubtabs: #subtabs not found");

  el.innerHTML = "";

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs gallery-subtabs";
  el.appendChild(bar);

  // ----- Categories (fixed) -----
  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className = "nav-link active";
  btn.dataset.tabId = GallerySubtabs.CATEGORIES;
  btn.textContent = "Categories";

  btn.addEventListener("click", () => {
    clearDivs();
    setGalleryCategories();
  });

  li.appendChild(btn);
  bar.appendChild(li);
} // end setGallerySubtabs



/* ============================================================
   setGalleryCategories()
   ------------------------------------------------------------
   Displays three category frames:
       • Ideabook
       • Patterns
       • Scripts
   Data comes from galleryCache (module local).
============================================================ */
async function setGalleryCategories() {
  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("setGalleryCategories: #text missing");

  textDiv.innerHTML = "<p>Loading Gallery categories...</p>";

  if (!galleryCache) {
    textDiv.innerHTML = "<p style='color:red;'>Gallery not initialized.</p>";
    return;
  }

  const frames = [];

  /* ------------------ Ideabook ------------------ */
  const ideabookCategories = Object.keys(galleryCache.Ideabook || {});
  frames.push({
    title: "Ideabook",
    items: ideabookCategories.map((cat) => ({
      name: cat,
      hasSubitems: false,
      onClick: () => {
        currentDomain   = DOMAIN_IDEABOOK;
        currentCategory = cat;
        currentList     = galleryCache.Ideabook[cat] || [];
        currentIndex    = 0;

        uiState.gallery.index.ideabook = 0;

        showGalleryCategory(currentDomain, currentCategory);
      }
    }))
  });

  /* ------------------ Patterns ------------------ */
  const patternsCategories = Object.keys(galleryCache.Patterns || {});
  frames.push({
    title: "Patterns",
    items: patternsCategories.map((cat) => ({
      name: cat,
      hasSubitems: false,
      onClick: () => {
        currentDomain   = DOMAIN_PATTERNS;
        currentCategory = cat;
        currentList     = galleryCache.Patterns[cat] || [];
        currentIndex    = 0;

        uiState.gallery.index.patterns = 0;

        showGalleryCategory(currentDomain, currentCategory);
      }
    }))
  });

  /* ------------------ Scripts ------------------- */
  const scripts = galleryCache.Scripts || [];
  frames.push({
    title: "Scripts",
    items: scripts.map((entry, idx) => ({
      name: entry.title || entry.filename,
      hasSubitems: false,
      onClick: () => {
        currentDomain   = DOMAIN_SCRIPTS;
        currentCategory = null;
        currentList     = scripts;
        currentIndex    = idx;

        // FIX: clear categories view and switch tab
       addGallerySubtab(DOMAIN_SCRIPTS);
       switchGallerySubtab(DOMAIN_SCRIPTS);
        uiState.gallery.index.scripts = idx;

        renderGalleryScripts(entry.filename);
      }
    }))
  });

  /* ------------------ Render frames ------------- */
  textDiv.innerHTML = "";
  renderCategories("text", frames);

  const a = document.getElementById("action");
  if (a) a.innerHTML = "";
  const sp = document.getElementById("sketchpad");
  if (sp) sp.innerHTML = "";

  const caption = document.getElementById("caption");
  if (caption) caption.innerHTML = "";
} // end setGalleryCategories

/* ============================================================
   showGalleryCategory(domain, category)
   ------------------------------------------------------------
   Enter a category (Ideabook or Patterns), load thumbnails,
   and display the first image.
============================================================ */
async function showGalleryCategory(domain, category) {
  // set view state
  currentDomain   = domain;
  currentCategory = category;
  currentList     = galleryCache[domain]?.[category] || [];
  currentIndex    = 0;

  // fail-fast: no empty categories allowed here
  if (!currentList.length) {
    throw new Error(
      "showGalleryCategory: empty category '" + category + "' in domain " + domain
    );
  }

  // ----- Create / switch the subtab -----
  addGallerySubtab(domain);        // adds "Ideabook", "Patterns"
  switchGallerySubtab(domain);     // activates it

  // ----- Select first item -----
  const firstItem = currentList[0];
  currentIndex    = 0;
  uiState.gallery.activeItem     = firstItem;

  // persist index by domain
  const indexKey =
    domain === DOMAIN_IDEABOOK  ? "ideabook" :
    domain === DOMAIN_PATTERNS  ? "patterns" :
    "scripts";

  uiState.gallery.index[indexKey] = 0;
  uiState.gallery.activeCategory  = category;
  uiState.gallery.activeItem      = firstItem;

  // ----- Build thumbnails panel -----
  renderThumbnailGrid(
    "action",
    currentList,
    (item) => `./gallery/${domain}/${category}/images/thumb_${item.filename}.png`,
    (_, idx) => {
      currentIndex = idx;
      uiState.gallery.activeItem  = currentList[idx];

      uiState.gallery.index[indexKey] = idx;
      uiState.gallery.activeCategory  = category;
      uiState.gallery.activeItem      = uiState.gallery.activeItem;

      showGalleryImage(domain, category, uiState.gallery.activeItem.path);
      updateGalleryCaption(domain);
    }
  );

  // ----- Draw first image -----
  showGalleryImage(domain, category, firstItem.path);

  // ----- Update caption bar -----
  updateGalleryCaption(domain);
} // end showGalleryCategory



/* ============================================================
   addGallerySubtab(domain)
   ------------------------------------------------------------
   Ensures a subtab exists for Ideabook / Patterns / Scripts.
   Does nothing if already present.
   ============================================================ */
function addGallerySubtab(domain) {
  const bar = document.querySelector(".gallery-subtabs");
  if (!bar) throw new Error("addGallerySubtab: .gallery-subtabs missing");

  const id = (function () {
    if (domain === DOMAIN_IDEABOOK)  return "gallery-ideabook";
    if (domain === DOMAIN_PATTERNS)  return "gallery-patterns";
    if (domain === DOMAIN_SCRIPTS)   return "gallery-scripts";
    throw new Error("addGallerySubtab: invalid domain " + domain);
  })();

  // already exists?
  if (document.querySelector(`button[data-tab-id="${id}"]`)) {
    return;
  }

  // create
  const li  = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className = "nav-link";
  btn.dataset.tabId = id;
  btn.textContent = domain;

  btn.addEventListener("click", () => {
    switchGallerySubtab(domain);
  });

  li.appendChild(btn);
  bar.appendChild(li);
} // end addGallerySubtab



/* ============================================================
   switchGallerySubtab(domain)
   ------------------------------------------------------------
   Activates the appropriate subtab and clears regions.
   ============================================================ */
function switchGallerySubtab(domain) {
  const id = (function () {
    if (domain === DOMAIN_IDEABOOK)  return "gallery-ideabook";
    if (domain === DOMAIN_PATTERNS)  return "gallery-patterns";
    if (domain === DOMAIN_SCRIPTS)   return "gallery-scripts";
    throw new Error("switchGallerySubtab: invalid domain " + domain);
  })();

  // activate buttons
  const buttons = document.querySelectorAll(".gallery-subtabs .nav-link");
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tabId === id);
  });

  // clear the right-side regions
  const caption = document.getElementById("caption");
  if (caption) caption.innerHTML = "";

  const action = document.getElementById("action");
  if (action) action.innerHTML = "";

  const text = document.getElementById("text");
  if (text) text.innerHTML = "";

  const sp = document.getElementById("sketchpad");
  if (sp) sp.innerHTML = "";

  uiState.gallery.activeSubtab = domain;
} // end switchGallerySubtab


/* ============================================================
   showGalleryImage(domain, category, path)
   ------------------------------------------------------------
   Render a full-size image inside #sketchpad.
============================================================ */
function showGalleryImage(domain, category, path) {
  const sketch = document.getElementById("sketchpad");
  if (!sketch) throw new Error("showGalleryImage: #sketchpad not found");

  sketch.innerHTML = "";

  const img = document.createElement("img");
  img.src = `./gallery/${domain}/${path}`;
  img.alt = path;
  img.style.display   = "block";
  img.style.maxWidth  = "100%";
  img.style.maxHeight = "100%";
  img.style.margin    = "0 auto";

  sketch.appendChild(img);
} // end showGalleryImage



/* ============================================================
   showGalleryImageByIndex(domain, category, index)
   ------------------------------------------------------------
   Standardized helper for Prev/Next logic.
============================================================ */
function showGalleryImageByIndex(domain, category, index) {
  const list = galleryCache[domain]?.[category] || [];
  if (!list.length) return;

  currentIndex = index;
  uiState.gallery.index[domain.toLowerCase()] = index;

  showGalleryImage(domain, category, list[index].path);
  updateGalleryCaption(domain);
} // end showGalleryImageByIndex


/* ============================================================
   renderGalleryScripts(scriptName = null)
   ------------------------------------------------------------
   Select and run a script from the Scripts manifest.

   • If scriptName supplied → choose by filename
   • Else → use saved index for Scripts
   • Always sets:
        currentDomain   = "Scripts"
        currentList     = scripts array
        currentIndex    = chosen index
============================================================ */
async function renderGalleryScripts(scriptName = null) {
  const list = galleryCache[DOMAIN_SCRIPTS];
  if (!Array.isArray(list) || list.length === 0) {
    console.warn("renderGalleryScripts: empty Scripts manifest");
    return;
  }

  currentDomain   = DOMAIN_SCRIPTS;
  currentCategory = null;
  currentList     = list;

  let idx = 0;

  if (scriptName) {
    idx = list.findIndex((e) => e.filename === scriptName);
    if (idx < 0) idx = 0;
  } else {
    idx = uiState.gallery.index.scripts ?? 0;
    if (idx < 0 || idx >= list.length) idx = 0;
  }

  currentIndex = idx;
  uiState.gallery.index.scripts = idx;

  const entry = list[idx];
  await showGalleryScript(entry);
  updateGalleryCaption(DOMAIN_SCRIPTS);
} // end renderGalleryScripts



/* ============================================================
   showGalleryScript(entry)
   ------------------------------------------------------------
   Execute a script located at:
       ./gallery/Scripts/<entry.path>

   Supports two formats:
     (1) Legacy:      export function runPattern(ctx)
     (2) Parametric:  patternMeta + initPattern + drawPattern
============================================================ */
async function showGalleryScript(entry) {
  const sketch = document.getElementById("sketchpad");
  if (!sketch) throw new Error("showGalleryScript: #sketchpad not found");

  const action = document.getElementById("action");
  if (!action) throw new Error("showGalleryScript: #action missing");

  sketch.innerHTML = "";
  action.innerHTML = "";

  sketch.appendChild(window.drawCanvas);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);

  let mod = null;
  const moduleUrl = `/gallery/Scripts/${entry.path}`;

  try {
    mod = await import(moduleUrl);
  } catch (err) {
    sketch.innerHTML = `<p style="color:red;">Load error: ${err.message}</p>`;
    return;
  }

  // PARAMETRIC SCRIPT
  if (mod.patternMeta && mod.initPattern && mod.drawPattern) {
    const meta   = mod.patternMeta;
    const params = mod.initPattern();

    buildScriptControls(meta, params, action, () => {
      try { mod.drawPattern(params); }
      catch (err) { console.error("drawPattern error:", err); }
    });

    try {
      mod.drawPattern(params);
    } catch (err) {
      sketch.innerHTML = `<p style="color:red;">Draw error: ${err.message}</p>`;
      return;
    }

    uiState.gallery.activeItem = entry;
    return;
  }

  // LEGACY SCRIPT
  if (mod.runPattern) {
    try {
      await mod.runPattern(ctx);
    } catch (err) {
      sketch.innerHTML = `<p style="color:red;">runPattern error: ${err.message}</p>`;
      return;
    }

    uiState.gallery.activeItem = entry;
    return;
  }

  // INVALID
  sketch.innerHTML = `<p style="color:red;">Invalid script format</p>`;
} // end showGalleryScript



/* ============================================================
   buildScriptControls(meta, params, panel, onChange)
   ------------------------------------------------------------
   Lightweight builder for parameter controls in Scripts.
============================================================ */
function buildScriptControls(meta, params, panel, onChange) {
  const box = document.createElement("div");
  box.className = "script-controls";

  meta.parameters.forEach((def) => {
    const row = document.createElement("div");
    row.className = "script-control-row";

    const label = document.createElement("label");
    label.textContent = def.label;
    row.appendChild(label);

    let input = null;

    /* ----- RANGE ----- */
    if (def.widget === "range") {
      input = document.createElement("input");
      input.type  = "range";
      input.min   = def.min;
      input.max   = def.max;
      input.step  = def.step;
      input.value = params[def.key];

      const out = document.createElement("span");
      out.className = "script-control-readout";
      out.textContent = input.value;

      input.addEventListener("input", () => {
        params[def.key] = Number(input.value);
        out.textContent = input.value;
        onChange();
      });

      row.appendChild(input);
      row.appendChild(out);
      box.appendChild(row);
      return;
    }

    /* ----- CHECKBOX ----- */
    if (def.widget === "checkbox") {
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = params[def.key];

      input.addEventListener("input", () => {
        params[def.key] = input.checked;
        onChange();
      });

      row.appendChild(input);
      box.appendChild(row);
      return;
    }

    /* ----- SELECT ----- */
    if (def.widget === "select") {
      input = document.createElement("select");

      def.options.forEach((optValue) => {
        const opt = document.createElement("option");
        opt.value = optValue;
        opt.textContent = optValue;
        if (optValue === params[def.key]) opt.selected = true;
        input.appendChild(opt);
      });

      input.addEventListener("input", () => {
        params[def.key] = input.value;
        onChange();
      });

      row.appendChild(input);
      box.appendChild(row);
      return;
    }

    /* ----- TEXT fallback ----- */
    input = document.createElement("input");
    input.type = "text";
    input.value = params[def.key];

    input.addEventListener("input", () => {
      params[def.key] = input.value;
      onChange();
    });

    row.appendChild(input);
    box.appendChild(row);
  });

  panel.appendChild(box);
} // end buildScriptControls

/* ============================================================
   showPrevGalleryItem(domain)
   ------------------------------------------------------------
   Move to previous item within the current gallery list.
============================================================ */
async function showPrevGalleryItem(domain) {
  const list = currentList;
  if (!list || list.length === 0) return;

  const idx = currentIndex;
  const prev = (idx <= 0) ? list.length - 1 : idx - 1;

  currentIndex = prev;
  uiState.gallery.activeItem  = list[prev];

  // Persist index by domain
  if (domain === DOMAIN_IDEABOOK) {
    uiState.gallery.index.ideabook = prev;
  } else if (domain === DOMAIN_PATTERNS) {
    uiState.gallery.index.patterns = prev;
  } else if (domain === DOMAIN_SCRIPTS) {
    uiState.gallery.index.scripts = prev;
  }

  if (domain === DOMAIN_SCRIPTS) {
    await showGalleryScript(list[prev]);
  } else {
    showGalleryImage(domain, currentCategory, list[prev].path);
  }

  updateGalleryCaption(domain);
} // end showPrevGalleryItem



/* ============================================================
   showNextGalleryItem(domain)
   ------------------------------------------------------------
   Move to next item within the current gallery list.
============================================================ */
async function showNextGalleryItem(domain) {
  const list = currentList;
  if (!list || list.length === 0) return;

  const idx  = currentIndex;
  const next = (idx >= list.length - 1) ? 0 : idx + 1;

  currentIndex = next;
  uiState.gallery.activeItem  = list[next];

  // Persist index by domain
  if (domain === DOMAIN_IDEABOOK) {
    uiState.gallery.index.ideabook = next;
  } else if (domain === DOMAIN_PATTERNS) {
    uiState.gallery.index.patterns = next;
  } else if (domain === DOMAIN_SCRIPTS) {
    uiState.gallery.index.scripts = next;
  }

  if (domain === DOMAIN_SCRIPTS) {
    await showGalleryScript(list[next]);
  } else {
    showGalleryImage(domain, currentCategory, list[next].path);
  }

  updateGalleryCaption(domain);
} // end showNextGalleryItem



/* ============================================================
   updateGalleryCaption(domain)
   ------------------------------------------------------------
   Updates caption bar (Prev, Next, Menu). Works for all domains:
     • Ideabook (images)
     • Patterns (images)
     • Scripts  (script modules)
============================================================ */
function updateGalleryCaption(domain) {
   const item = uiState.gallery.activeItem;
  if (!item) return;

  const title =
    item.title || item.filename || item.path || "(untitled)";

  const onPrev = () => showPrevGalleryItem(domain);
  const onNext = () => showNextGalleryItem(domain);

  const onMenu = (anchor) => {
    // Only Scripts have a Show Script menu item.
    const items = [];

    if (domain === DOMAIN_SCRIPTS) {
      items.push({
        label: "Show Script",
        onClick: () => {
          const entry = uiState.gallery.activeItem;
          showScriptOffcanvas(
            `/gallery/Scripts/${entry.path}`,
            entry.filename
          );
        }
      });
    }

    menuManager.open(items, anchor);
  };

  setCaptionBar({
    targetId: "caption",
    title,
    onPrev,
    onNext,
    onMenu
  });
} // end updateGalleryCaption


/* ============================================================
   buildGalleryMenuItems
   ------------------------------------------------------------
   Shared menu builder for Gallery.
   (Currently only used for Scripts — other domains have no
    per-item menu actions.)
============================================================ */
async function buildGalleryMenuItems(tabName, helpKey, scriptPath) {
  const items = [];

  // HELP item
  const helpItem = await menuManager.buildHelpItem(tabName, helpKey);
  items.push(helpItem);

  // SCRIPT item (Scripts domain only)
  if (scriptPath) {
    items.push({
      label: "Show Script",
      onClick: () => showScriptOffcanvas(scriptPath, helpKey)
    });
  }

  return items;
} // end buildGalleryMenuItems



/**************************************************************
   saveGalleryState()
 --------------------------------------------------------------
   Stores the minimal Gallery state needed for restoration.
   Uses canonical uiState.gallery fields ONLY.
**************************************************************/
export function saveGalleryState() {
  const g = uiState.gallery;

  // Fallback default (should never be used)
  if (!g) {
    return {
      domain: null,
      category: null,
      index: null
    };
  }

  const out = {
    domain:   currentDomain ?? null,
    category: currentCategory ?? null,
    index:    currentIndex ?? null
  };

  console.log("💾 Saved Gallery state:", out);
  return out;
} // end saveGalleryState



/**************************************************************
   galleryDivs — required by setUI.js
 --------------------------------------------------------------
   Same model as patternsDivs, drawDivs, etc.
   Controls which divs are cleared/rebuilt on tab switch.
**************************************************************/
export const galleryDivs = {
  activeDivs: ["subtabs"],
  theme: "theme-gallery",

  action: () => {
    const el = document.getElementById("action");
    if (el) el.innerHTML = "";
  },

  buttons: () => {
    const el = document.getElementById("buttons");
    if (el) el.innerHTML = "";
  },

  caption: () => {
    const el = document.getElementById("caption");
    if (el) el.innerHTML = "";
  },

  sketchpad: () => {
    const el = document.getElementById("sketchpad");
    if (el) el.innerHTML = "";
  },

  subtabs: () => {
    setGallerySubtabs();
  },

  text: () => {
    const el = document.getElementById("text");
    if (el) el.innerHTML = "";
  }
}; // end galleryDivs
