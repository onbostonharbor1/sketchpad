/* gallery.js
   ------------------------------------------------------------
   Gallery Tab — New Architecture (Cold Init + Restore Model)
   ------------------------------------------------------------
   Structure:
     • ensureGalleryCacheLoaded() → builds manifest.cache.gallery
     • initGalleryTab(restoredFlag)  → cold-start only
     • restoreGalleryTab()           → rebuild from uiState.gallery.saved
     • GalleryController             → pure action functions
------------------------------------------------------------ */

import { renderCategories } from "./categories.js";
import { fileLayer } from "./fileLayer.js";
import { setCaptionBar }    from "./caption.js";
import {
  clearDivs,
  renderThumbnailGrid,
  showScriptOffcanvas
} from "./ui_utilities.js";
import { manifest }         from "./manifest.js";

import { menuManager }      from "./menuManager.js";

/* ============================================================
   Constants
============================================================ */

const DOMAIN_IDEABOOK = "Ideabook";
const DOMAIN_PATTERNS = "Patterns";
const DOMAIN_SCRIPTS  = "Scripts";

const SUBTAB_CATEGORIES = "gallery-categories";
const SUBTAB_IDEABOOK   = "gallery-ideabook";
const SUBTAB_PATTERNS   = "gallery-patterns";
const SUBTAB_SCRIPTS    = "gallery-scripts";

/* ============================================================
   Local module state
============================================================ */

let currentDomain   = null;
let currentCategory = null;
let currentList     = [];
let currentIndex    = 0;
let galleryCache    = null;

/* ============================================================
   GalleryTabSpec
============================================================ */

export const GalleryTabSpec = {
  name: "gallery",
  theme: "theme-gallery",
  regions: ["caption", "text", "sketchpad", "buttons", "action"],

  init: initGalleryTab,
  restore: restoreGalleryTab,
  save: saveGalleryState,

  buildCaption: () => {},
  buildText: () => {},
  buildSketchpad: () => {},
  buildButtons: () => {},
  buildAction: () => {}
}; // end GalleryTabSpec

/* ============================================================
   GalleryController (optional external API)
============================================================ */

export const GalleryController = {
  initGalleryTab,
  showGalleryCategories: setGalleryCategories,
  showPrev: showPrevGalleryItem,
  showNext: showNextGalleryItem
}; // end GalleryController


/* ============================================================
   ensureGalleryCacheLoaded()
============================================================ */
async function ensureGalleryCacheLoaded() {
  if (manifest.cache && manifest.cache.gallery) {
    galleryCache = manifest.cache.gallery;
    return;
  }

  const ideabookRaw      = await manifest.get("gallery/Ideabook");
  const patternsRaw      = await manifest.get("gallery/Patterns");
  const ideabookRegistry = manifest.getRegistry("gallery/Ideabook");
  const patternsRegistry = manifest.getRegistry("gallery/Patterns");

  if (!Array.isArray(ideabookRaw) ||
      !Array.isArray(patternsRaw) ||
      !Array.isArray(ideabookRegistry) ||
      !Array.isArray(patternsRegistry)) {
    throw new Error("ensureGalleryCacheLoaded: invalid gallery manifest data");
  }

  const scriptsPath = fileLayer.path.flatManifest("gallery/Scripts");
  const scriptsRaw  = await fileLayer.loadJSON(scriptsPath);
  if (!Array.isArray(scriptsRaw)) {
    throw new Error("ensureGalleryCacheLoaded: Scripts manifest must be an array");
  }

  if (!manifest.cache) manifest.cache = {};

  const gallery = {
    Ideabook: {},
    Patterns: {},
    Scripts: scriptsRaw
  };

  for (let i = 0; i < ideabookRegistry.length; i++) {
    const cat = ideabookRegistry[i];
    gallery.Ideabook[cat] = ideabookRaw[i] || [];
  }

  for (let j = 0; j < patternsRegistry.length; j++) {
    const cat = patternsRegistry[j];
    gallery.Patterns[cat] = patternsRaw[j] || [];
  }

  manifest.cache.gallery = gallery;
  galleryCache = gallery;
} // end ensureGalleryCacheLoaded

/* ============================================================
   initGalleryTab(restored)
   ------------------------------------------------------------
   Cold-start initializer.
============================================================ */
export async function initGalleryTab(restored) {
  // Ensure uiState.gallery exists
  if (!uiState.gallery) {
    uiState.gallery = {
      activeCategory: null,
      activeItem: null,
      activeSubtab: SUBTAB_CATEGORIES,
      saved: null,
      perDomain: {
        Ideabook: { category: null, index: 0 },
        Patterns: { category: null, index: 0 },
        Scripts:  { category: null, index: 0 }
      }
    };
  }

  // If perDomain is missing for any reason, patch it
  if (!uiState.gallery.perDomain) {
    uiState.gallery.perDomain = {
      Ideabook: { category: null, index: 0 },
      Patterns: { category: null, index: 0 },
      Scripts:  { category: null, index: 0 }
    };
  }

  // Reset local state
  currentDomain   = null;
  currentCategory = null;
  currentList     = [];
  currentIndex    = 0;
  galleryCache    = null;

  // Load manifests and build cache
  await ensureGalleryCacheLoaded();

  // Build the fixed "Categories" subtab
  setGallerySubtabs();

  // Default view: top-level categories
  uiState.gallery.activeCategory = null;
  uiState.gallery.activeItem     = null;
  uiState.gallery.activeSubtab   = SUBTAB_CATEGORIES;
  uiState.gallery.saved = {
    view: "categories",
    domain: null,
    category: null,
    index: null
  };

  await setGalleryCategories();
} // end initGalleryTab



/* ============================================================
   saveGalleryState()
============================================================ */
export function saveGalleryState() {
  return {
    domain: currentDomain,
    category: currentCategory,
    index: currentIndex
  };
} // end saveGalleryState

/* ============================================================
   addGallerySubtab(domain)
   ------------------------------------------------------------
   Ensure a subtab exists for Ideabook / Patterns / Scripts.
   Clicking the subtab ALWAYS restores that domain view, never
   the Categories list.
============================================================ */
function addGallerySubtab(domain) {
  const container = document.getElementById("subtabs");
  if (!container) throw new Error("addGallerySubtab: #subtabs missing");

  const bar = container.querySelector("ul.gallery-subtabs");
  if (!bar) throw new Error("addGallerySubtab: .gallery-subtabs missing");

  let id;
  if (domain === DOMAIN_IDEABOOK) {
    id = SUBTAB_IDEABOOK;
  } else if (domain === DOMAIN_PATTERNS) {
    id = SUBTAB_PATTERNS;
  } else if (domain === DOMAIN_SCRIPTS) {
    id = SUBTAB_SCRIPTS;
  } else {
    throw new Error("addGallerySubtab: invalid domain " + domain);
  }

  if (bar.querySelector(`[data-tab-id="${id}"]`)) {
    return;
  }

  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className = "nav-link";
  btn.dataset.tabId = id;
  btn.textContent =
    domain === DOMAIN_IDEABOOK ? "Ideabook" :
    domain === DOMAIN_PATTERNS ? "Patterns" :
    "Scripts";

  btn.addEventListener("click", () => {
    switchGallerySubtab(domain);
  });

  li.appendChild(btn);
  bar.appendChild(li);
} // end addGallerySubtab


/* ============================================================
   switchGallerySubtab(domain)
============================================================ */
function switchGallerySubtab(domain) {
  activateGallerySubtab(domain);

  // IDEABOOK
  if (domain === DOMAIN_IDEABOOK) {
    const mem = uiState.gallery.perDomain.Ideabook;
    if (mem.category && galleryCache.Ideabook[mem.category]) {
      currentDomain   = DOMAIN_IDEABOOK;
      currentCategory = mem.category;
      currentList     = galleryCache.Ideabook[mem.category];
      currentIndex    = mem.index || 0;

      // FIX: ensure correct index restored
      uiState.gallery.saved.index = currentIndex;

      showGalleryCategory(DOMAIN_IDEABOOK, mem.category, currentIndex);
    } else {
      setGalleryCategories();
    }
    return;
  }

  // PATTERNS
  if (domain === DOMAIN_PATTERNS) {
    const mem = uiState.gallery.perDomain.Patterns;
    if (mem.category && galleryCache.Patterns[mem.category]) {
      currentDomain   = DOMAIN_PATTERNS;
      currentCategory = mem.category;
      currentList     = galleryCache.Patterns[mem.category];
      currentIndex    = mem.index || 0;

      // FIX
      uiState.gallery.saved.index = currentIndex;

      showGalleryCategory(DOMAIN_PATTERNS, mem.category, currentIndex);
    } else {
      setGalleryCategories();
    }
    return;
  }

  // SCRIPTS
  if (domain === DOMAIN_SCRIPTS) {
    const mem = uiState.gallery.perDomain.Scripts;
    if (galleryCache.Scripts[mem.index]) {
      currentDomain   = DOMAIN_SCRIPTS;
      currentCategory = null;
      currentList     = galleryCache.Scripts;
      currentIndex    = mem.index;

      // FIX
      uiState.gallery.saved.index = currentIndex;

      showGalleryScript(currentList[currentIndex]);
    } else {
      setGalleryCategories();
    }
    return;
  }

  setGalleryCategories();
} // end switchGallerySubtab




/* ============================================================
   restoreGalleryTab()
============================================================ */
async function restoreGalleryTab() {
  if (!uiState.gallery || !uiState.gallery.saved) {
    throw new Error("restoreGalleryTab: no saved Gallery state found");
  }

  const saved = uiState.gallery.saved;

  await ensureGalleryCacheLoaded();
  setGallerySubtabs();

  const opened = uiState.gallery.openedSubtabs || {};
  for (const key of Object.keys(opened)) {
    ensureDomainSubtab(key);
  }

  const domain   = saved.domain;
  const category = saved.category;
  let   index    = typeof saved.index === "number" ? saved.index : 0;

  if (saved.view === "categories" || !domain) {
    currentDomain   = null;
    currentCategory = null;
    currentList     = [];
    currentIndex    = 0;
    uiState.gallery.activeSubtab = SUBTAB_CATEGORIES;
    await setGalleryCategories();
    return;
  }

  if (domain === DOMAIN_SCRIPTS) {
    const list = galleryCache.Scripts;

    if (!Array.isArray(list) || !list.length) {
      throw new Error("restoreGalleryTab: empty Scripts manifest");
    }

    if (index < 0 || index >= list.length) index = 0;

    currentDomain   = DOMAIN_SCRIPTS;
    currentCategory = null;
    currentList     = list;
    currentIndex    = index;

    uiState.gallery.activeItem   = list[index];
    uiState.gallery.activeSubtab = SUBTAB_SCRIPTS;

    // FIX: retain correct index
    uiState.gallery.perDomain.Scripts.index = index;

    await showGalleryScript(list[index]);
    activateGallerySubtab(SUBTAB_SCRIPTS);
    updateGalleryCaption(DOMAIN_SCRIPTS);
    return;
  }

  if (!category) {
    throw new Error("restoreGalleryTab: missing category for " + domain);
  }

  const domainMap = galleryCache[domain];
  const list = domainMap[category];
  if (!list || !list.length) {
    throw new Error("restoreGalleryTab: missing or empty category '" + category + "'");
  }

  if (index < 0 || index >= list.length) index = 0;

  currentDomain   = domain;
  currentCategory = category;
  currentList     = list;
  currentIndex    = index;

  uiState.gallery.activeCategory = category;
  uiState.gallery.activeItem     = list[index];
  uiState.gallery.activeSubtab   =
    domain === DOMAIN_IDEABOOK ? SUBTAB_IDEABOOK : SUBTAB_PATTERNS;

  // FIX: retain correct index
  uiState.gallery.perDomain[domain].index = index;

  await showGalleryCategory(domain, category, index);
  activateGallerySubtab(uiState.gallery.activeSubtab);
  updateGalleryCaption(domain);
} // end restoreGalleryTab





/* ============================================================
   setGallerySubtabs()
============================================================ */
function setGallerySubtabs() {
  const container = document.getElementById("subtabs");
  if (!container) throw new Error("setGallerySubtabs: #subtabs not found");

  // ABSOLUTELY CLEAR everything including stray ULs
  container.replaceChildren();

  // Create the correct UL INSIDE #subtabs
  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs gallery-subtabs";
  container.appendChild(bar);

  // Build Categories tab
  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className = "nav-link active";
  btn.dataset.tabId = SUBTAB_CATEGORIES;
  btn.textContent = "Categories";

  btn.onclick = () => {
    activateGallerySubtab(SUBTAB_CATEGORIES);
    setGalleryCategories();
  };

  li.appendChild(btn);
  bar.appendChild(li);
} // end setGallerySubtabs




/* ============================================================
   activateGallerySubtab()
============================================================ */
function activateGallerySubtab(subtabId) {
  const buttons = document.querySelectorAll(".gallery-subtabs .nav-link");

  buttons.forEach((btn) => {
    if (btn.dataset.tabId === subtabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  uiState.gallery.activeSubtab = subtabId;
} // end activateGallerySubtab


async function setGalleryCategories() {
  const textDiv   = document.getElementById("text");
  const actionDiv = document.getElementById("action");
  const sketchDiv = document.getElementById("sketchpad");

  if (!textDiv || !actionDiv || !sketchDiv) {
    throw new Error("setGalleryCategories: required region missing");
  }

  textDiv.innerHTML   = "Loading Gallery categories...";
  actionDiv.innerHTML = "";
  sketchDiv.innerHTML = "";

  await ensureGalleryCacheLoaded();

  const frames = [];

  const ideabookCats = Object.keys(galleryCache.Ideabook || {});
  frames.push({
    title: "Ideabook",
    items: ideabookCats.map((cat) => ({
      name: cat,
      hasSubitems: false,
      onClick: () => {
        currentDomain   = DOMAIN_IDEABOOK;
        currentCategory = cat;
        currentList     = galleryCache.Ideabook[cat] || [];
        currentIndex    = 0;

        uiState.gallery.saved = {
          view: "domain",
          domain: DOMAIN_IDEABOOK,
          category: cat,
          index: 0
        };

        uiState.gallery.openedSubtabs = uiState.gallery.openedSubtabs || {};
        uiState.gallery.openedSubtabs[DOMAIN_IDEABOOK] = true;

        addGallerySubtab(DOMAIN_IDEABOOK);
        activateGallerySubtab(SUBTAB_IDEABOOK);
        showGalleryCategory(DOMAIN_IDEABOOK, cat);
      }
    }))
  });

  const patternCats = Object.keys(galleryCache.Patterns || {});
  frames.push({
    title: "Patterns",
    items: patternCats.map((cat) => ({
      name: cat,
      hasSubitems: false,
      onClick: () => {
        currentDomain   = DOMAIN_PATTERNS;
        currentCategory = cat;
        currentList     = galleryCache.Patterns[cat] || [];
        currentIndex    = 0;

        uiState.gallery.saved = {
          view: "domain",
          domain: DOMAIN_PATTERNS,
          category: cat,
          index: 0
        };

        uiState.gallery.openedSubtabs = uiState.gallery.openedSubtabs || {};
        uiState.gallery.openedSubtabs[DOMAIN_PATTERNS] = true;

        addGallerySubtab(DOMAIN_PATTERNS);
        activateGallerySubtab(SUBTAB_PATTERNS);
        showGalleryCategory(DOMAIN_PATTERNS, cat);
      }
    }))
  });

  const scripts = galleryCache.Scripts || [];
  frames.push({
    title: "Scripts",
    items: scripts.map((entry, idx) => ({
      name: entry.title || entry.filename || "(untitled script)",
      hasSubitems: false,
      onClick: () => {
        currentDomain   = DOMAIN_SCRIPTS;
        currentCategory = null;
        currentList     = scripts;
        currentIndex    = idx;

        uiState.gallery.saved = {
          view: "scripts",
          domain: DOMAIN_SCRIPTS,
          category: null,
          index: idx
        };

        uiState.gallery.openedSubtabs = uiState.gallery.openedSubtabs || {};
        uiState.gallery.openedSubtabs[DOMAIN_SCRIPTS] = true;

        addGallerySubtab(DOMAIN_SCRIPTS);
        activateGallerySubtab(SUBTAB_SCRIPTS);
        showGalleryScript(entry);
      }
    }))
  });

  textDiv.innerHTML = "";
  renderCategories("text", frames);

  const captionDiv = document.getElementById("caption");
  if (captionDiv) captionDiv.innerHTML = "";
} // end setGalleryCategories



/* ============================================================
   setGalleryCategories()
   ------------------------------------------------------------
   Shows the three top-level frames:
     • Ideabook
     • Patterns
     • Scripts
   No caption bar in this view; caption is cleared.
============================================================ */




/* ============================================================
   ensureDomainSubtab()
   ------------------------------------------------------------
   (Kept for compatibility; used by older flows if any remain)
============================================================ */
function ensureDomainSubtab(domain) {
  const container = document.getElementById("subtabs");
  if (!container) throw new Error("ensureDomainSubtab: #subtabs missing");

  const bar = container.querySelector("ul.gallery-subtabs");
  if (!bar) throw new Error("ensureDomainSubtab: .gallery-subtabs missing");

  // if already exists, do nothing
  if (bar.querySelector(`#subtab-${domain}`)) return;

  const li  = document.createElement("li");
  li.className = "nav-item";
  li.id = `subtab-${domain}`;

  const btn = document.createElement("button");
  btn.className = "nav-link";
  btn.dataset.tabId =
    domain === DOMAIN_IDEABOOK ? SUBTAB_IDEABOOK :
    domain === DOMAIN_PATTERNS ? SUBTAB_PATTERNS :
    SUBTAB_SCRIPTS;

  btn.textContent =
    domain === DOMAIN_IDEABOOK ? "Ideabook" :
    domain === DOMAIN_PATTERNS ? "Patterns" :
    "Scripts";

  btn.onclick = () => {
    activateGallerySubtab(btn.dataset.tabId);

    if (domain === DOMAIN_IDEABOOK) {
      const mem = uiState.gallery.perDomain.Ideabook;
      if (mem.category && galleryCache.Ideabook[mem.category]) {
        showGalleryCategory(DOMAIN_IDEABOOK, mem.category, mem.index);
      } else {
        setGalleryCategories();
      }
      return;
    }

    if (domain === DOMAIN_PATTERNS) {
      const mem = uiState.gallery.perDomain.Patterns;
      if (mem.category && galleryCache.Patterns[mem.category]) {
        showGalleryCategory(DOMAIN_PATTERNS, mem.category, mem.index);
      } else {
        setGalleryCategories();
      }
      return;
    }

    if (domain === DOMAIN_SCRIPTS) {
      const mem = uiState.gallery.perDomain.Scripts;
      if (galleryCache.Scripts[mem.index]) {
        showGalleryScript(galleryCache.Scripts[mem.index]);
      } else {
        setGalleryCategories();
      }
      return;
    }

    setGalleryCategories();
  };

  li.appendChild(btn);
  bar.appendChild(li);
} // end ensureDomainSubtab



/* ============================================================
   showGalleryCategory(domain, category, startIndex = 0)
============================================================ */
async function showGalleryCategory(domain, category, startIndex = 0) {
  const sketch = document.getElementById("sketchpad");
  if (sketch) sketch.innerHTML = "";

  currentDomain   = domain;
  currentCategory = category;
  currentList     = galleryCache[domain][category];

  if (!Array.isArray(currentList) || !currentList.length) {
    throw new Error("showGalleryCategory: empty category '" + category + "'");
  }

  let idx = startIndex;
  if (idx < 0 || idx >= currentList.length) idx = 0;

  currentIndex = idx;

  uiState.gallery.activeCategory = category;
  uiState.gallery.activeItem     = currentList[idx];
  uiState.gallery.saved = {
    view: "domain",
    domain,
    category,
    index: idx
  };

  // FIX: remember correct index for this domain
  if (uiState.gallery.perDomain && uiState.gallery.perDomain[domain]) {
    uiState.gallery.perDomain[domain].category = category;
    uiState.gallery.perDomain[domain].index    = idx;
  }

  renderThumbnailGrid(
    "action",
    currentList,
    (entry) => `./gallery/${domain}/${category}/images/thumb_${entry.filename}.png`,
    (_, i) => {
      currentIndex = i;
      uiState.gallery.activeItem = currentList[i];
      uiState.gallery.saved.index = i;

      // FIX
      uiState.gallery.perDomain[domain].index = i;

      showGalleryImage(domain, category, currentList[i]);
      updateGalleryCaption(domain);
    }
  );

  showGalleryImage(domain, category, currentList[idx]);
  updateGalleryCaption(domain);
} // end showGalleryCategory






/* ============================================================
   showGalleryImage()
============================================================ */
/* ============================================================
   showGalleryImage(domain, category, entry)
   ------------------------------------------------------------
   Uses entry.path exactly as provided by the manifest.
   For Ideabook/Patterns, entry.path is like "3D/400.jpg".
============================================================ */
function showGalleryImage(domain, category, entry) {
  const text = document.getElementById("text");
  if (!text) throw new Error("showGalleryImage: #text not found");

  text.innerHTML = "";

  const img = document.createElement("img");

  // Build the full image path using entry.path from the manifest
  // e.g., ./gallery/Ideabook/3D/400.jpg
  const fullPath = `./gallery/${domain}/${entry.path}`;

  img.src = fullPath;
  img.alt =
    entry.title ||
    entry.filename ||
    entry.path ||
    "(image)";

  img.style.display   = "block";
  img.style.maxWidth  = "100%";
  img.style.maxHeight = "100%";
  img.style.margin    = "0 auto";

  text.appendChild(img);
} // end showGalleryImage


/* ============================================================
   showGalleryImageByIndex()
============================================================ */
function showGalleryImageByIndex(domain, category, index) {
  const list =
    galleryCache[domain] &&
    galleryCache[domain][category]
      ? galleryCache[domain][category]
      : [];

  if (!list.length) return;
  if (index < 0 || index >= list.length) index = 0;

  currentIndex = index;
  uiState.gallery.activeItem = list[index];

  uiState.gallery.saved = {
    view: "domain",
    domain,
    category,
    index
  };

  showGalleryImage(domain, category, list[index]);
  updateGalleryCaption(domain);
} // end showGalleryImageByIndex

/* ============================================================
   showGalleryScript(entry) — WITH CAPTION RESTORED
============================================================ */
async function showGalleryScript(entry) {
  const textDiv   = document.getElementById("text");
  const actionDiv = document.getElementById("action");
  const sketchDiv = document.getElementById("sketchpad");

  textDiv.innerHTML   = "";
  actionDiv.innerHTML = "";
  sketchDiv.innerHTML = "";

  currentDomain   = DOMAIN_SCRIPTS;
  currentCategory = null;
  currentList     = galleryCache.Scripts;

  const idx = currentList.indexOf(entry);
  currentIndex = idx >= 0 ? idx : 0;

  uiState.gallery.activeItem = entry;
  uiState.gallery.saved = {
    view: "scripts",
    domain: DOMAIN_SCRIPTS,
    category: null,
    index: currentIndex
  };

  // FIX: remember correct index for scripts
  uiState.gallery.perDomain.Scripts.index = currentIndex;

  // existing logic unchanged...
  sketchDiv.appendChild(window.drawCanvas);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);

  const moduleUrl = `/gallery/Scripts/${entry.filename}`;
  let mod = await import(moduleUrl);

  if (mod.patternMeta && mod.initPattern && mod.drawPattern) {
    const meta   = mod.patternMeta;
    const params = mod.initPattern();
    buildScriptControls(meta, params, actionDiv, () => mod.drawPattern(params));
    mod.drawPattern(params);
    updateGalleryCaption(DOMAIN_SCRIPTS);
    return;
  }

  if (mod.runPattern) {
    await mod.runPattern(ctx);
    updateGalleryCaption(DOMAIN_SCRIPTS);
    return;
  }
} // end showGalleryScript




/* ============================================================
   buildScriptControls()
============================================================ */
function buildScriptControls(meta, params, panel, onChange) {
  const box = document.createElement("div");
  box.className = "script-controls";

  (meta.parameters || []).forEach((def) => {
    const row = document.createElement("div");
    row.className = "script-control-row";

    const label = document.createElement("label");
    label.textContent = def.label || def.key;
    row.appendChild(label);

    let input = null;

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

    if (def.widget === "checkbox") {
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!params[def.key];

      input.addEventListener("input", () => {
        params[def.key] = input.checked;
        onChange();
      });

      row.appendChild(input);
      box.appendChild(row);
      return;
    }

    if (def.widget === "select") {
      input = document.createElement("select");

      (def.options || []).forEach((optValue) => {
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
   showPrevGalleryItem()
============================================================ */
async function showPrevGalleryItem(domain) {
  if (!currentList || !currentList.length) return;

  const newIndex =
    currentIndex <= 0 ? currentList.length - 1 : currentIndex - 1;

  currentIndex = newIndex;
  uiState.gallery.activeItem = currentList[newIndex];

  if (domain === DOMAIN_SCRIPTS) {
    await showGalleryScript(currentList[newIndex]);
  } else {
    showGalleryImage(domain, currentCategory, currentList[newIndex]);
  }

  uiState.gallery.saved = {
    view: domain === DOMAIN_SCRIPTS ? "scripts" : "domain",
    domain,
    category: currentCategory,
    index: newIndex
  };

  updateGalleryCaption(domain);
} // end showPrevGalleryItem


/* ============================================================
   showNextGalleryItem()
============================================================ */
async function showNextGalleryItem(domain) {
  if (!currentList || !currentList.length) return;

  const newIndex =
    currentIndex >= currentList.length - 1 ? 0 : currentIndex + 1;

  currentIndex = newIndex;
  uiState.gallery.activeItem = currentList[newIndex];

  if (domain === DOMAIN_SCRIPTS) {
    await showGalleryScript(currentList[newIndex]);
  } else {
    showGalleryImage(domain, currentCategory, currentList[newIndex]);
  }

  uiState.gallery.saved = {
    view: domain === DOMAIN_SCRIPTS ? "scripts" : "domain",
    domain,
    category: currentCategory,
    index: newIndex
  };

  updateGalleryCaption(domain);
} // end showNextGalleryItem


/* ============================================================
   updateGalleryCaption()
============================================================ */
function updateGalleryCaption(domain) {
  const item = uiState.gallery.activeItem;
  if (!item) return;

  const title =
    item.title ||
    item.filename ||
    "(untitled)";

  const onPrev = () => showPrevGalleryItem(domain);
  const onNext = () => showNextGalleryItem(domain);

  const onMenu = (anchor) => {
    const items = [];

    if (domain === DOMAIN_SCRIPTS) {
      items.push({
        label: "Show Script",
        onClick: () =>
          showScriptOffcanvas(
            `/gallery/Scripts/${item.path}`,
            item.filename
          )
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
