/* gallery.js
   ------------------------------------------------------------
   Gallery Tab
   ------------------------------------------------------------
*/
import { formatRebuildReportShared } from "./ui_utilities.js";

import { nodeRebuildAndValidateManifests } from "./nodeLayer.js";
import { renderCategories }       from "./categories.js";
// import { fileLayer }              from "./fileLayer.js";
import { setCaptionBar }          from "./caption.js";
import { getGalleryCaptionMenuItems } from "./galleryMenuCmds.js";
import { openHelpHomeOverlay } from "./help.js";
import { runScriptByPath } from "./scriptRunner.js";

import {
  clearDivs,
  renderThumbnailGrid,
  markSelectedThumbnail,
  setCommandsButtonLabel,
  setCommandsButton,
  showCommandsOffcanvas
} from "./ui_utilities.js";
import { showScriptOffcanvas } from "./menuCmds.js";
import { manifest }         from "./manifest.js";
import { menuManager }      from "./menuManager.js";

/* ============================================================
   Constants
============================================================ */

const DOMAIN_IDEABOOK = "Ideabook";
const DOMAIN_PATTERNS = "Patterns";
const DOMAIN_SCRIPTS  = "Scripts";

const GALLERY_COMMAND = "Gallery Commands";

const SUBTAB_IDEABOOK = "gallery-ideabook";
const SUBTAB_PATTERNS = "gallery-patterns";
const SUBTAB_SCRIPTS  = "gallery-scripts";
const SUBTAB_RESULTS  = "gallery-results";

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
  regions: ["caption", "text", "sketchpad", "action"],

  init: initGalleryTab,
  restore: restoreGalleryTab,
  save: saveGalleryState,

  buildCaption: () => {},
  buildText: () => {},
  buildSketchpad: () => {},
  buildAction: () => {}
}; // end GalleryTabSpec

/* ============================================================
   GalleryController (optional external API)
============================================================ */

export const GalleryController = {
  initGalleryTab,
  showPrev: showPrevGalleryItem,
  showNext: showNextGalleryItem
}; // end GalleryController

/* ============================================================
   ensureGalleryCacheLoaded()
============================================================ */
/* ============================================================
   ensureGalleryCacheLoaded()
   ------------------------------------------------------------
   NEW GALLERY DIRECTORY MODEL (Change 1 correction)
   ------------------------------------------------------------
   /gallery/<Domain>/directoryRegistry.json
   /gallery/<Domain>/<Category>/manifest.json
============================================================ */
async function ensureGalleryCacheLoaded() {
  if (manifest.cache && manifest.cache.gallery) {
    galleryCache = manifest.cache.gallery;
    return;
  }

  const loadJSON = async (url) => {
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error("ensureGalleryCacheLoaded: missing or unreadable " + url);
    }
    const data = await resp.json();
    return data;
  }; // end loadJSON

  //   const loadJSON = async (url) => {
  //   const resp = await fetch(url);
  //   if (!resp.ok) {
  //     // This catches 404 returning HTML as well.
  //     const text = await resp.text();
  //     console.error("HTTP ERROR:", resp.status, url);
  //     console.error("FIRST 200 CHARS:\n" + text.slice(0, 200));
  //     throw new Error("loadJSON: HTTP " + resp.status + " for " + url);
  //   }

  //   const text = await resp.text();

  //   // show the first bytes so we can see BOM / garbage
  //   const head = text.slice(0, 60);
  //   const codes = [];
  //   for (let i = 0; i < Math.min(10, text.length); i++) {
  //     codes.push(text.charCodeAt(i));
  //   }

  //   try {
  //     return JSON.parse(text);
  //   } catch (err) {
  //     console.error("BAD JSON FILE:", url);
  //     console.error("FIRST 60 CHARS:\n" + head);
  //     console.error("FIRST 10 CHAR CODES:", codes);
  //     throw err;
  //   }
  // }; // end loadJSON



  const loadDomain = async (domain) => {
    const registryUrl = `/gallery/${domain}/directoryRegistry.json`;
    const registry = await loadJSON(registryUrl);

    if (!Array.isArray(registry)) {
      throw new Error("ensureGalleryCacheLoaded: registry must be an array: " + registryUrl);
    }

    const out = {};

    for (let i = 0; i < registry.length; i++) {
      const cat = registry[i];

      if (typeof cat !== "string" || cat.trim() === "") {
        throw new Error("ensureGalleryCacheLoaded: invalid category name in " + registryUrl);
      }

      const manifestUrl = `/gallery/${domain}/${cat}/manifest.json`;
      const list = await loadJSON(manifestUrl);

      if (!Array.isArray(list)) {
        throw new Error("ensureGalleryCacheLoaded: manifest must be an array: " + manifestUrl);
      }

      out[cat] = list;
    }

    return out;
  }; // end loadDomain

  const gallery = {
    Ideabook: await loadDomain("Ideabook"),
    Patterns: await loadDomain("Patterns"),
    Scripts:  await loadDomain("Scripts")
  };

  if (!manifest.cache) manifest.cache = {};
  manifest.cache.gallery = gallery;
  galleryCache = gallery;
} // end ensureGalleryCacheLoaded


/* ============================================================
   initGalleryTab(restored)
============================================================ */
export async function initGalleryTab(restored) {

  // Ensure uiState.gallery exists (STRUCTURAL CHANGE applied in uiState.js)
  if (!uiState.gallery) {
    throw new Error("initGalleryTab: uiState.gallery missing");
  }

  // Reset local module state (this is fine on both paths)
  currentDomain   = null;
  currentCategory = null;
  currentList     = [];
  currentIndex    = 0;
  galleryCache    = null;

  await ensureGalleryCacheLoaded();

  buildGallerySubtabs();
  setCommandsButtonLabel(GALLERY_COMMAND);
  wireGalleryCommandsButton();

  // ==========================================================
  // CRITICAL FIX:
  // If we are restoring, DO NOT overwrite uiState.gallery.saved.
  // Let restoreGalleryTab() rebuild the correct view.
  // ==========================================================
  if (restored) {
    await restoreGalleryTab();
    return;
  }

  // ----------------------------------------------------------
  // Cold start ONLY (first time Gallery is entered)
  // ----------------------------------------------------------
  uiState.gallery.activeDomain   = DOMAIN_IDEABOOK;
  uiState.gallery.activeCategory = null;
  uiState.gallery.activeItem     = null;
  uiState.gallery.activeSubtab   = "ideabook";

  uiState.gallery.saved = {
    view: "categories",
    domain: DOMAIN_IDEABOOK,
    category: null,
    index: null
  };

  await showIdeabookCategories();
  activateGallerySubtab(SUBTAB_IDEABOOK);
  clearCaption();

} // end initGalleryTab

/* ============================================================
   saveGalleryState()
============================================================ */
export function saveGalleryState() {
  // One remembered results context only is stored in uiState.gallery.saved.
  // This return object is informational only (TabSpec.save contract).
  return {
    domain: currentDomain,
    category: currentCategory,
    index: currentIndex
  };
} // end saveGalleryState

/* ============================================================
   restoreGalleryTab()
============================================================ */
async function restoreGalleryTab() {
  if (!uiState.gallery || !uiState.gallery.saved) {
    throw new Error("restoreGalleryTab: no saved Gallery state found");
  }

  await ensureGalleryCacheLoaded();
  buildGallerySubtabs();
  setCommandsButtonLabel(GALLERY_COMMAND);
  wireGalleryCommandsButton();

  const saved = uiState.gallery.saved;

  // If saved says “categories”, restore the fixed domain categories view.
  if (saved.view === "categories") {
    if (saved.domain === DOMAIN_IDEABOOK) {
      uiState.gallery.activeDomain = DOMAIN_IDEABOOK;
      uiState.gallery.activeSubtab = "ideabook";
      await showIdeabookCategories();
      activateGallerySubtab(SUBTAB_IDEABOOK);
      clearCaption();
      return;
    }

    if (saved.domain === DOMAIN_PATTERNS) {
      uiState.gallery.activeDomain = DOMAIN_PATTERNS;
      uiState.gallery.activeSubtab = "patterns";
      await showPatternsCategories();
      activateGallerySubtab(SUBTAB_PATTERNS);
      clearCaption();
      return;
    }

    if (saved.domain === DOMAIN_SCRIPTS) {
      uiState.gallery.activeDomain = DOMAIN_SCRIPTS;
      uiState.gallery.activeSubtab = "scripts";
      await showScriptsCategories();
      activateGallerySubtab(SUBTAB_SCRIPTS);
      clearCaption();
      return;
    }

    throw new Error("restoreGalleryTab: invalid saved.domain for categories view");
  }

  // Results view restore (the only remembered results context).
  if (saved.view === "results") {

    if (!saved.domain) {
      throw new Error("restoreGalleryTab: results missing domain");
    }

    // Ensure Results tab exists and activate it
    ensureResultsSubtab(saved.domain);
    activateGallerySubtab(SUBTAB_RESULTS);
    uiState.gallery.activeSubtab = "results";

    // Restore results content
    const idx = typeof saved.index === "number" ? saved.index : 0;

    if (saved.domain === DOMAIN_SCRIPTS) {
      await showGalleryResultsScripts(saved.category, idx);
      return;
    }

    if (!saved.category) {
      throw new Error("restoreGalleryTab: results missing category for " + saved.domain);
    }

    await showGalleryResultsImages(saved.domain, saved.category, idx);
    return;
  }

  throw new Error("restoreGalleryTab: invalid saved.view");
} // end restoreGalleryTab

/* ============================================================
   buildGallerySubtabs()
   ------------------------------------------------------------
   Fixed tabs: Ideabook, Patterns, Scripts.
   Results tab is created on-demand (ensureResultsSubtab).
============================================================ */
function buildGallerySubtabs() {
  const container = document.getElementById("subtabs");
  if (!container) throw new Error("buildGallerySubtabs: #subtabs not found");

  container.replaceChildren();

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs gallery-subtabs";
  container.appendChild(bar);

  bar.appendChild(buildSubtabButton(SUBTAB_IDEABOOK, "Ideabook", async () => {
    setCommandsButtonLabel(GALLERY_COMMAND);

    uiState.gallery.activeDomain = DOMAIN_IDEABOOK;
    uiState.gallery.activeSubtab = "ideabook";

    // IMPORTANT:
    // Do NOT overwrite uiState.gallery.saved here.
    // Results is global and persists across domain tabs.

    await showIdeabookCategories();
    activateGallerySubtab(SUBTAB_IDEABOOK);
    clearCaption();
  }));

  bar.appendChild(buildSubtabButton(SUBTAB_PATTERNS, "Patterns", async () => {
    setCommandsButtonLabel(GALLERY_COMMAND);

    uiState.gallery.activeDomain = DOMAIN_PATTERNS;
    uiState.gallery.activeSubtab = "patterns";

    // Do NOT overwrite uiState.gallery.saved here.

    await showPatternsCategories();
    activateGallerySubtab(SUBTAB_PATTERNS);
    clearCaption();
  }));

  bar.appendChild(buildSubtabButton(SUBTAB_SCRIPTS, "Scripts", async () => {
    setCommandsButtonLabel(GALLERY_COMMAND);

    uiState.gallery.activeDomain = DOMAIN_SCRIPTS;
    uiState.gallery.activeSubtab = "scripts";

    // Do NOT overwrite uiState.gallery.saved here.

    await showScriptsCategories();
    activateGallerySubtab(SUBTAB_SCRIPTS);
    clearCaption();
  }));

} // end buildGallerySubtabs


/* ============================================================
   buildSubtabButton(tabId, label, onClick)
============================================================ */
function buildSubtabButton(tabId, label, onClick) {
  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className = "nav-link";
  btn.dataset.tabId = tabId;
  btn.textContent = label;

  btn.addEventListener("click", () => { onClick(); });

  li.appendChild(btn);
  return li;
} // end buildSubtabButton

/* ============================================================
   ensureResultsSubtab(domain)
   ------------------------------------------------------------
   One shared Results tab, label depends on domain:
     - Images for Ideabook/Patterns
     - Drawings for Scripts
============================================================ */
function ensureResultsSubtab(domain) {
  const container = document.getElementById("subtabs");
  if (!container) throw new Error("ensureResultsSubtab: #subtabs not found");

  const bar = container.querySelector("ul.gallery-subtabs");
  if (!bar) throw new Error("ensureResultsSubtab: .gallery-subtabs missing");

  // If exists, update label only
  const existing = bar.querySelector(`[data-tab-id="${SUBTAB_RESULTS}"]`);
  const label = (domain === DOMAIN_SCRIPTS) ? "Drawings" : "Images";

  if (existing) {
    existing.textContent = label;
    return;
  }

  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className = "nav-link";
  btn.dataset.tabId = SUBTAB_RESULTS;
  btn.textContent = label;

  btn.addEventListener("click", async () => {
    // Clicking Results restores the one remembered results context.
    const saved = uiState.gallery.saved;
    if (!saved || saved.view !== "results") {
      throw new Error("Results tab clicked but no saved results context exists");
    }
    activateGallerySubtab(SUBTAB_RESULTS);
    uiState.gallery.activeSubtab = "results";

    if (saved.domain === DOMAIN_SCRIPTS) {
      const idx = typeof saved.index === "number" ? saved.index : 0;
      await showGalleryResultsScripts(saved.category, idx);
      return;
    }

    if (!saved.category) {
      throw new Error("Results tab clicked but saved.category missing");
    }

    const idx = typeof saved.index === "number" ? saved.index : 0;
    await showGalleryResultsImages(saved.domain, saved.category, idx);
  });

  li.appendChild(btn);
  bar.appendChild(li);
} // end ensureResultsSubtab

/* ============================================================
   activateGallerySubtab(subtabId)
============================================================ */
function activateGallerySubtab(subtabId) {
  const buttons = document.querySelectorAll(".gallery-subtabs .nav-link");
  buttons.forEach((btn) => {
    if (btn.dataset.tabId === subtabId) btn.classList.add("active");
    else btn.classList.remove("active");
  });
} // end activateGallerySubtab

/* ============================================================
   clearCaption()
============================================================ */
function clearCaption() {
  const captionDiv = document.getElementById("caption");
  if (!captionDiv) throw new Error("clearCaption: #caption missing");
  captionDiv.innerHTML = "";
} // end clearCaption


/* ============================================================
   showIdeabookCategories()
   ------------------------------------------------------------
   FIX: one frame per category (directoryRegistry entry)
   Items come from that category’s manifest.json
============================================================ */
async function showIdeabookCategories() {
  clearDivs();
  await ensureGalleryCacheLoaded();

  const domainMap = galleryCache.Ideabook;
  if (!domainMap) throw new Error("showIdeabookCategories: Ideabook cache missing");

  const cats = Object.keys(domainMap);

  const frames = cats.map((cat) => {
    const list = domainMap[cat];
    if (!Array.isArray(list)) {
      throw new Error("showIdeabookCategories: category list not an array: " + cat);
    }

    return {
      title: cat,
      items: list.map((entry, idx) => ({
        name: entry.title || entry.filename || entry.path || "(untitled)",
        hasSubitems: false,
        onClick: async () => {
          ensureResultsSubtab(DOMAIN_IDEABOOK);
          activateGallerySubtab(SUBTAB_RESULTS);
          uiState.gallery.activeSubtab = "results";
          await showGalleryResultsImages(DOMAIN_IDEABOOK, cat, idx);
        }
      }))
    };
  });

  renderCategories("text", frames);
} // end showIdeabookCategories


/* ============================================================
   showPatternsCategories()
   ------------------------------------------------------------
   FIX: one frame per category (directoryRegistry entry)
============================================================ */
async function showPatternsCategories() {
  clearDivs();
  await ensureGalleryCacheLoaded();

  const domainMap = galleryCache.Patterns;
  if (!domainMap) throw new Error("showPatternsCategories: Patterns cache missing");

  const cats = Object.keys(domainMap);

  const frames = cats.map((cat) => {
    const list = domainMap[cat];
    if (!Array.isArray(list)) {
      throw new Error("showPatternsCategories: category list not an array: " + cat);
    }

    return {
      title: cat,
      items: list.map((entry, idx) => ({
        name: entry.title || entry.filename || entry.path || "(untitled)",
        hasSubitems: false,
        onClick: async () => {
          ensureResultsSubtab(DOMAIN_PATTERNS);
          activateGallerySubtab(SUBTAB_RESULTS);
          uiState.gallery.activeSubtab = "results";
          await showGalleryResultsImages(DOMAIN_PATTERNS, cat, idx);
        }
      }))
    };
  });

  renderCategories("text", frames);
} // end showPatternsCategories


/* ============================================================
   showScriptsCategories()
   ------------------------------------------------------------
   FIX: one frame per Scripts category.
   IMPORTANT: we want manifest order for Scripts items.
   This requires categories.js to support per-frame sortItems:false
============================================================ */
async function showScriptsCategories() {
  clearDivs();
  await ensureGalleryCacheLoaded();

  const domainMap = galleryCache.Scripts;
  if (!domainMap) throw new Error("showScriptsCategories: Scripts cache missing");

  const cats = Object.keys(domainMap);

  const frames = cats.map((cat) => {
    const list = domainMap[cat];
    if (!Array.isArray(list)) {
      throw new Error("showScriptsCategories: category list not an array: " + cat);
    }

    return {
      title: cat,

      // This is the flag you asked for.
      // categories.js must honor it (I’ll give you that next).
      sortItems: false,

      items: list.map((entry, idx) => ({
        name: entry.title || entry.filename || "(untitled)",
        hasSubitems: false,
        onClick: async () => {
          ensureResultsSubtab(DOMAIN_SCRIPTS);
          activateGallerySubtab(SUBTAB_RESULTS);
          uiState.gallery.activeSubtab = "results";
          await showGalleryResultsScripts(cat, idx);
        }
      }))
    };
  });

  renderCategories("text", frames);
} // end showScriptsCategories


/* ============================================================
   showGalleryResultsImages(domain, category, startIndex)
============================================================ */
async function showGalleryResultsImages(domain, category, startIndex) {
  clearDivs();
  await ensureGalleryCacheLoaded();

  if (domain !== DOMAIN_IDEABOOK && domain !== DOMAIN_PATTERNS) {
    throw new Error("showGalleryResultsImages: invalid domain " + domain);
  }

  const domainMap = galleryCache[domain];
  if (!domainMap) throw new Error("showGalleryResultsImages: domain map missing");

  const list = domainMap[category];
  if (!Array.isArray(list) || !list.length) {
    throw new Error("showGalleryResultsImages: empty category '" + category + "'");
  }

  let idx = startIndex;
  if (idx < 0 || idx >= list.length) idx = 0;

  currentDomain   = domain;
  currentCategory = category;
  currentList     = list;
  currentIndex    = idx;

  uiState.gallery.activeDomain   = domain;
  uiState.gallery.activeCategory = category;
  uiState.gallery.activeItem     = list[idx];

  uiState.gallery.saved = {
    view: "results",
    domain: domain,
    category: category,
    index: idx
  };

 renderThumbnailGrid(
    "action",
    list,
    (entry) => `./gallery/${domain}/${category}/images/thumb_${entry.filename}.png`,
    async (_, i) => {
      currentIndex = i;
      uiState.gallery.activeItem = list[i];
      uiState.gallery.saved.index = i;

      showGalleryImage(domain, category, list[i]);
      updateGalleryCaption(domain, category);

      markSelectedThumbnail("action", i);
    }
  );

  markSelectedThumbnail("action", idx);

  showGalleryImage(domain, category, list[idx]);
  updateGalleryCaption(domain, category);
} // end showGalleryResultsImages


/* ============================================================
   showGalleryResultsScripts(category, index)
   ------------------------------------------------------------
   Scripts results are now per-category.
============================================================ */
async function showGalleryResultsScripts(category, index) {
  clearDivs();
  await ensureGalleryCacheLoaded();

  const domainMap = galleryCache.Scripts;
  if (!domainMap) throw new Error("showGalleryResultsScripts: Scripts domain map missing");

  const list = domainMap[category];
  if (!Array.isArray(list) || !list.length) {
    throw new Error("showGalleryResultsScripts: empty Scripts category '" + category + "'");
  }

  let idx = index;
  if (idx < 0 || idx >= list.length) idx = 0;

  currentDomain   = DOMAIN_SCRIPTS;
  currentCategory = category;
  currentList     = list;
  currentIndex    = idx;

  uiState.gallery.activeDomain   = DOMAIN_SCRIPTS;
  uiState.gallery.activeCategory = category;
  uiState.gallery.activeItem     = list[idx];

  uiState.gallery.saved = {
    view: "results",
    domain: DOMAIN_SCRIPTS,
    category: category,
    index: idx
  };

  await showGalleryScript(category, list[idx]);
  updateGalleryCaption(DOMAIN_SCRIPTS, category);
} // end showGalleryResultsScripts



/* ============================================================
   normalizeGalleryEntryPath(category, entry)
   ------------------------------------------------------------
   Manifest rule: entry.path must be relative to the category folder.

   Reality today (Ideabook): some entries include "Category/filename".
   Example: category="3D", entry.path="3D/401.jpg"

   We normalize that to "401.jpg" so the final URL becomes:
     ./gallery/<Domain>/<Category>/<relativePath>
============================================================ */
function normalizeGalleryEntryPath(category, entry) {

  let p = entry.path || entry.filename;
  if (!p) {
    throw new Error("normalizeGalleryEntryPath: entry missing path/filename");
  }

  // Remove leading "./" if present
  if (p.startsWith("./")) {
    p = p.slice(2);
  }

  // If path redundantly includes the category prefix, strip it.
  const prefix = category + "/";
  if (p.startsWith(prefix)) {
    p = p.slice(prefix.length);
  }

  return p;
} // end normalizeGalleryEntryPath


/* ============================================================
   showGalleryImage(domain, category, entry)
   ------------------------------------------------------------
   With per-category manifests, entry.path must be relative to the
   category folder:
     /gallery/<Domain>/<Category>/<entry.path>
============================================================ */
function showGalleryImage(domain, category, entry) {
  const text = document.getElementById("text");
  if (!text) throw new Error("showGalleryImage: #text not found");

  text.innerHTML = "";

  const img = document.createElement("img");

  const relPath  = normalizeGalleryEntryPath(category, entry);
  const fullPath = `./gallery/${domain}/${category}/${relPath}`;

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
   showGalleryScript(category, entry)
   ------------------------------------------------------------
   Scripts are now located at:
     /gallery/Scripts/<Category>/<filename>

   Unified script execution (scriptRunner only).
   No legacy multi-export branching.
   No ctx argument passed to runPattern.
============================================================ */


async function showGalleryScript(category, entry) {

  if (!category) throw new Error("showGalleryScript: category missing");
  if (!entry) throw new Error("showGalleryScript: entry missing");
  if (!entry.filename) throw new Error("showGalleryScript: entry.filename missing");

  const textDiv   = document.getElementById("text");
  const actionDiv = document.getElementById("action");
  const sketchDiv = document.getElementById("sketchpad");

  if (!textDiv) throw new Error("showGalleryScript: #text not found");
  if (!actionDiv) throw new Error("showGalleryScript: #action not found");
  if (!sketchDiv) throw new Error("showGalleryScript: #sketchpad not found");

  textDiv.innerHTML   = "";
  actionDiv.innerHTML = "";
  sketchDiv.innerHTML = "";

  const scriptPath = `/gallery/Scripts/${category}/${entry.filename}`;

  try {
    await runScriptByPath(scriptPath, "canvas", {
      canvasRegionId: "sketchpad",
      enableControls: true
    });
  } catch (err) {
    throw new Error("showGalleryScript: execute error: " + err.message);
  }

} // end showGalleryScript





/* ============================================================
   buildScriptControls()
============================================================ */
// function buildScriptControls(meta, params, panel, onChange) {
//   const box = document.createElement("div");
//   box.className = "script-controls";

//   (meta.parameters || []).forEach((def) => {
//     const row = document.createElement("div");
//     row.className = "script-control-row";

//     const label = document.createElement("label");
//     label.textContent = def.label || def.key;
//     row.appendChild(label);

//     let input = null;

//     if (def.widget === "range") {
//       input = document.createElement("input");
//       input.type  = "range";
//       input.min   = def.min;
//       input.max   = def.max;
//       input.step  = def.step;
//       input.value = params[def.key];

//       const out = document.createElement("span");
//       out.className = "script-control-readout";
//       out.textContent = input.value;

//       input.addEventListener("input", () => {
//         params[def.key] = Number(input.value);
//         out.textContent = input.value;
//         onChange();
//       });

//       row.appendChild(input);
//       row.appendChild(out);
//       box.appendChild(row);
//       return;
//     }

//     if (def.widget === "checkbox") {
//       input = document.createElement("input");
//       input.type = "checkbox";
//       input.checked = !!params[def.key];

//       input.addEventListener("input", () => {
//         params[def.key] = input.checked;
//         onChange();
//       });

//       row.appendChild(input);
//       box.appendChild(row);
//       return;
//     }

//     if (def.widget === "select") {
//       input = document.createElement("select");

//       (def.options || []).forEach((optValue) => {
//         const opt = document.createElement("option");
//         opt.value = optValue;
//         opt.textContent = optValue;
//         if (optValue === params[def.key]) opt.selected = true;
//         input.appendChild(opt);
//       });

//       input.addEventListener("input", () => {
//         params[def.key] = input.value;
//         onChange();
//       });

//       row.appendChild(input);
//       box.appendChild(row);
//       return;
//     }

//     input = document.createElement("input");
//     input.type = "text";
//     input.value = params[def.key];

//     input.addEventListener("input", () => {
//       params[def.key] = input.value;
//       onChange();
//     });

//     row.appendChild(input);
//     box.appendChild(row);
//   });

//   panel.appendChild(box);
// } // end buildScriptControls

/* ============================================================
   showPrevGalleryItem()
============================================================ */
async function showPrevGalleryItem(domain) {
  if (!currentList || !currentList.length) {
    throw new Error("showPrevGalleryItem: currentList is empty");
  }

  const newIndex = (currentIndex <= 0) ? currentList.length - 1 : currentIndex - 1;
  currentIndex = newIndex;

  uiState.gallery.activeItem = currentList[newIndex];
  uiState.gallery.saved.index = newIndex;

  if (domain === DOMAIN_SCRIPTS) {
    await showGalleryResultsScripts(currentCategory, newIndex);
    updateGalleryCaption(domain, currentCategory);
    return;
  }

  showGalleryImage(domain, currentCategory, currentList[newIndex]);
  updateGalleryCaption(domain, currentCategory);

  markSelectedThumbnail("action", newIndex);
} // end showPrevGalleryItem


async function showNextGalleryItem(domain) {
  if (!currentList || !currentList.length) {
    throw new Error("showNextGalleryItem: currentList is empty");
  }

  const newIndex = (currentIndex >= currentList.length - 1) ? 0 : currentIndex + 1;
  currentIndex = newIndex;

  uiState.gallery.activeItem = currentList[newIndex];
  uiState.gallery.saved.index = newIndex;

  if (domain === DOMAIN_SCRIPTS) {
    await showGalleryResultsScripts(currentCategory, newIndex);
    updateGalleryCaption(domain, currentCategory);
    return;
  }

  showGalleryImage(domain, currentCategory, currentList[newIndex]);
  updateGalleryCaption(domain, currentCategory);

  markSelectedThumbnail("action", newIndex);
} // end showNextGalleryItem


/* ============================================================
   updateGalleryCaption(domain, categoryLabel)

============================================================ */
/* ============================================================
   updateGalleryCaption(domain, categoryLabel)

============================================================ */
export function updateGalleryCaption(domain, categoryLabel) {

  const item = uiState.gallery.activeItem;
  if (!item) {
    throw new Error("updateGalleryCaption: uiState.gallery.activeItem missing");
  }

  if (typeof categoryLabel !== "string" || categoryLabel.trim() === "") {
    throw new Error("updateGalleryCaption: categoryLabel missing");
  }

  const isScript = (domain === DOMAIN_SCRIPTS);

  // Overlay target:
  //   Images (Ideabook/Patterns) are displayed in #text
  //   Scripts are displayed in #sketchpad-wrapper (canvas host)
  const overlayTargetId = isScript ? "sketchpad-wrapper" : "text";

  // Title shown in caption bar
  const rawTitle = item.title || item.filename || item.path || "(untitled)";
  const title = categoryLabel + ": " + rawTitle;

  const onPrev = () => showPrevGalleryItem(domain);
  const onNext = () => showNextGalleryItem(domain);

  const onMenu = async (anchor) => {

    if (!currentCategory) {
      throw new Error("updateGalleryCaption: currentCategory missing");
    }

    // 🔑 FIX: always use canonical manifest identity
    // Scripts → entry.path
    // Images  → normalized entry.path
    const fileId = isScript
      ? String(item.path)
      : String(normalizeGalleryEntryPath(currentCategory, item));

    if (!fileId || !fileId.includes(".")) {
      throw new Error("updateGalleryCaption: invalid fileId: " + fileId);
    }

    const info = {
      domain: domain,
      category: currentCategory,

      manifestPath: `/gallery/${domain}/${currentCategory}/manifest.json`,
      matchField: "path",
      matchValue: fileId,

      filename: fileId,   // passed through verbatim
      title: item.title || "",
      status: item.status || "",

      isScript: isScript,
      scriptPath: isScript
        ? `/gallery/Scripts/${currentCategory}/${fileId}`
        : "",

      // FIX: help.js needs filename + recursive subdir context
      helpKey: fileId,
      helpSubdirs: [domain, currentCategory]
    };

    const menuItems = await getGalleryCaptionMenuItems(info);
    menuManager.open(menuItems, anchor);
  };

  setCaptionBar({
    targetId: "caption",
    title,
    onPrev,
    onNext,
    onMenu,
    overlayTargetId
  });

} // end updateGalleryCaption


function buildGalleryOffcanvasHtml() {

  return `
    <div class="cmdButtonRow">
      <button id="galleryRebuildValidateButton" class="cmdButton" type="button">
        Rebuild &amp; Validate
      </button>
    </div>

    <div class="cmdButtonRow">
      <button id="galleryHelpButton" class="cmdButton" type="button">
        Help
      </button>
    </div>

    <div class="buttonSeparator"></div>

    <div id="galleryRebuildReport" class="galleryRebuildReport"></div>
  `;

} // end buildGalleryOffcanvasHtml


/* ============================================================
   formatRebuildReport(report)
   ------------------------------------------------------------
   TAB-LOCAL WRAPPER.
   Calls the shared implementation in ui_utilities.js.
============================================================ */

export function formatRebuildReport(report) {
  return formatRebuildReportShared(report);
} // end formatRebuildReport



/* ============================================================
   refreshGalleryFromManifestEdit()
   ------------------------------------------------------------
   FIX (match Utilities pattern):
   After reloading manifests, rehydrate uiState.gallery.activeItem
   from the newly loaded galleryCache. Otherwise uiState still holds
   the old entry object (with stale status/title), so Edit Manifest
   reopens showing the previous values even though disk is updated.
============================================================ */


export async function refreshGalleryFromManifestEdit() {

  // Drop manifest cache
  if (manifest && typeof manifest.clearCache === "function") {
    manifest.clearCache();
  }
  if (manifest.cache) delete manifest.cache.gallery;

  // Reload cache
  galleryCache = null;
  await ensureGalleryCacheLoaded();

  // ----------------------------------------------------------
  // CRITICAL: rehydrate activeItem from refreshed cache
  // ----------------------------------------------------------
  const domain   = uiState.gallery.activeDomain;
  const category = uiState.gallery.activeCategory;
  const item     = uiState.gallery.activeItem;

  if (domain && category && item) {

    const domainMap = galleryCache[domain];
    if (!domainMap) {
      throw new Error("refreshGalleryFromManifestEdit: missing domain map '" + String(domain) + "'");
    }

    const list = domainMap[category];
    if (!Array.isArray(list)) {
      throw new Error("refreshGalleryFromManifestEdit: missing category '" + String(category) + "' in " + domain);
    }

    // Gallery canonical match is by path (same as caption info.matchField)
    const matchValue =
      (domain === DOMAIN_SCRIPTS)
        ? String(item.path)
        : String(normalizeGalleryEntryPath(category, item));

    let found = null;

    for (let i = 0; i < list.length; i++) {
      const entry = list[i];

      const entryMatch =
        (domain === DOMAIN_SCRIPTS)
          ? String(entry.path)
          : String(normalizeGalleryEntryPath(category, entry));

      if (entryMatch === matchValue) {
        found = entry;
        break;
      }
    }

    if (!found) {

      // This happens after Archive (the entry is removed from manifest).
      // It must NOT throw. We pick a safe fallback and continue.

      uiState.gallery.activeItem = null;

      // If we are in results view, clamp index to list bounds.
      if (uiState.gallery.saved && uiState.gallery.saved.view === "results") {

        // If list is empty, restore() will naturally go back to categories.
        if (list.length > 0) {

          let idx = uiState.gallery.saved.index;
          if (typeof idx !== "number") idx = 0;

          if (idx < 0) idx = 0;
          if (idx >= list.length) idx = list.length - 1;

          uiState.gallery.saved.index = idx;
          uiState.gallery.activeItem = list[idx];
        }
      }

      await restoreGalleryTab();
      return;
    }

    uiState.gallery.activeItem = found;
  }

  // Restore deterministically
  await restoreGalleryTab();

} // end refreshGalleryFromManifestEdit



async function refreshGalleryAfterRebuild() {

  // Force cache drop
  if (manifest && typeof manifest.clearCache === "function") {
    manifest.clearCache();
  }
  if (manifest.cache) delete manifest.cache.gallery;

  galleryCache = null;
  await ensureGalleryCacheLoaded();

  const saved = uiState.gallery.saved;
  if (!saved) throw new Error("refreshGalleryAfterRebuild: uiState.gallery.saved missing");

  if (saved.view === "categories") {

    if (saved.domain === DOMAIN_IDEABOOK) {
      uiState.gallery.activeDomain = DOMAIN_IDEABOOK;
      uiState.gallery.activeSubtab = "ideabook";
      await showIdeabookCategories();
      activateGallerySubtab(SUBTAB_IDEABOOK);
      clearCaption();
      return;
    }

    if (saved.domain === DOMAIN_PATTERNS) {
      uiState.gallery.activeDomain = DOMAIN_PATTERNS;
      uiState.gallery.activeSubtab = "patterns";
      await showPatternsCategories();
      activateGallerySubtab(SUBTAB_PATTERNS);
      clearCaption();
      return;
    }

    if (saved.domain === DOMAIN_SCRIPTS) {
      uiState.gallery.activeDomain = DOMAIN_SCRIPTS;
      uiState.gallery.activeSubtab = "scripts";
      await showScriptsCategories();
      activateGallerySubtab(SUBTAB_SCRIPTS);
      clearCaption();
      return;
    }

    throw new Error("refreshGalleryAfterRebuild: invalid saved.domain for categories view");
  }

  if (saved.view === "results") {

    if (!saved.domain) throw new Error("refreshGalleryAfterRebuild: results missing domain");

    ensureResultsSubtab(saved.domain);
    activateGallerySubtab(SUBTAB_RESULTS);
    uiState.gallery.activeSubtab = "results";

    const idx = (typeof saved.index === "number") ? saved.index : 0;

    if (saved.domain === DOMAIN_SCRIPTS) {
      await showGalleryResultsScripts(saved.category, idx);
      return;
    }

    if (!saved.category) {
      throw new Error("refreshGalleryAfterRebuild: results missing category for " + saved.domain);
    }

    await showGalleryResultsImages(saved.domain, saved.category, idx);
    return;
  }

  throw new Error("refreshGalleryAfterRebuild: invalid saved.view");

} // end refreshGalleryAfterRebuild

export function wireGalleryCommandsButton() {

  setCommandsButton("Commands", () => {

    showCommandsOffcanvas({
      title: "Gallery Maintenance",
      buildBody(offcanvasBodyEl) {

        if (!offcanvasBodyEl) {
          throw new Error("Gallery Commands: offcanvasBodyEl missing");
        }

        offcanvasBodyEl.innerHTML = buildGalleryOffcanvasHtml();

        const btn = document.getElementById("galleryRebuildValidateButton");
        if (!btn) throw new Error("wireGalleryCommandsButton: button missing");

        btn.addEventListener("click", async () => {

          const out = document.getElementById("galleryRebuildReport");
          if (!out) throw new Error("wireGalleryCommandsButton: report div missing");

          out.textContent = "Running...";

          const report = await nodeRebuildAndValidateManifests();

          await refreshGalleryAfterRebuild();

          out.textContent = formatRebuildReport(report);

        }); // end click

        const helpBtn = document.getElementById("galleryHelpButton");
        if (!helpBtn) throw new Error("wireGalleryCommandsButton: galleryHelpButton missing");

        helpBtn.addEventListener("click", () => {

          // Close/dismiss the Commands offcanvas
          const panel = document.getElementById("offcanvasPanel");
          if (!panel) throw new Error("wireGalleryCommandsButton: #offcanvasPanel missing");

          if (!window.bootstrap || !window.bootstrap.Offcanvas) {
            throw new Error("wireGalleryCommandsButton: bootstrap.Offcanvas not available");
          }

          const oc = window.bootstrap.Offcanvas.getOrCreateInstance(panel);
          oc.hide();

          // Open Help overlay (startup page)
          openHelpHomeOverlay();

        }); // end click

      } // end buildBody
    });

  });

} // end wireGalleryCommandsButton


function removeResultsSubtab() {
  const btn = document.querySelector(
    `.gallery-subtabs [data-tab-id="${SUBTAB_RESULTS}"]`
  );
  if (btn) {
    btn.parentElement.remove();
  }
} // end removeResultsSubtab

