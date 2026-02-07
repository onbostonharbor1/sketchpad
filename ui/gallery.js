/* gallery.js
   ------------------------------------------------------------
   Gallery Tab
   ------------------------------------------------------------
*/
import { formatRebuildReportShared }       from "./uiUtilities.js";
import { drawState }                       from "/draw/drawState.js";
import { nodeRebuildAndValidateManifests } from "./nodeLayer.js";
import { renderCategories }       from "./categories.js";
import { setCaptionBar }          from "./caption.js";
import { getGalleryCaptionMenuItems } from "./galleryMenuCmds.js";
import { openHelpHomeOverlay } from "./help.js";
import { runScriptByPath } from "./scriptRunner.js";
import { syncSystemStateAfterRebuild } from "./uiUtilities.js";
import {
  clearDivs,
  renderThumbnailGrid,
  markSelectedThumbnail,
  setCommandsButtonLabel,
  setCommandsButton,
  showCommandsOffcanvas
} from "./uiUtilities.js";
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
};

/* ============================================================
   GalleryController
============================================================ */
export const GalleryController = {
  initGalleryTab,
  showPrev: showPrevGalleryItem,
  showNext: showNextGalleryItem
};

/* ============================================================
   ensureGalleryCacheLoaded()
   ------------------------------------------------------------
   Keeps timestamp to be safe against aggressive image/json caching.
============================================================ */
async function ensureGalleryCacheLoaded() {
  // 1. Return existing cache if present
  if (manifest.cache?.gallery) {
    galleryCache = manifest.cache.gallery;
    return;
  }

  const loadJSON = async (url) => {
    // Keep cache buster if your browser is stubborn, otherwise url is fine
    const resp = await fetch(`${url}?t=${Date.now()}`);
    if (!resp.ok) throw new Error(`Gallery cache failure: ${url}`);
    return resp.json();
  };

  const loadDomain = async (domain) => {
    const registry = await loadJSON(`/gallery/${domain}/directoryRegistry.json`);
    const domainData = {};

    // Parallel load: much faster than the sequential loop
    await Promise.all(registry.map(async (cat) => {
      domainData[cat] = await loadJSON(`/gallery/${domain}/${cat}/manifest.json`);
    }));

    return domainData;
  };

  // 2. Build the full gallery structure
  const domains = ["Ideabook", "Patterns", "Scripts"];
  const gallery = {};

  await Promise.all(domains.map(async (dom) => {
    gallery[dom] = await loadDomain(dom);
  }));

  // 3. Persist to memory
  if (!manifest.cache) manifest.cache = {};
  manifest.cache.gallery = gallery;
  galleryCache = gallery;
}
/* ============================================================
   initGalleryTab(restored)
============================================================ */
export async function initGalleryTab(restored) {
  if (!uiState.gallery) {
    throw new Error("initGalleryTab: uiState.gallery missing");
  }

  currentDomain   = null;
  currentCategory = null;
  currentList     = [];
  currentIndex    = 0;
  galleryCache    = null;

  // 1. Force reload from disk if cache was cleared (Refresh & Restore)
  await ensureGalleryCacheLoaded();

  buildGallerySubtabs();
  setCommandsButtonLabel(GALLERY_COMMAND);
  wireGalleryCommandsButton();

  if (restored && uiState.gallery.saved) {
    await restoreGalleryTab();
    return;
  }

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
}

/* ============================================================
   saveGalleryState()
============================================================ */
export function saveGalleryState() {
  return {
    domain: currentDomain,
    category: currentCategory,
    index: currentIndex
  };
}

/* ============================================================
   restoreGalleryTab()
============================================================ */
/* gallery.js */

async function restoreGalleryTab() {
  if (!uiState.gallery?.saved) {
    // If state is missing, fallback to home-level init
    return initGalleryTab(false);
  }

  // 1. Setup Environment (Cache is fresh due to reload)
  await ensureGalleryCacheLoaded();
  buildGallerySubtabs();
  setCommandsButtonLabel(GALLERY_COMMAND);
  wireGalleryCommandsButton();

  const saved = uiState.gallery.saved;

  // 2. Restore Categories View
  if (saved.view === "categories") {
    if (saved.domain === DOMAIN_IDEABOOK) await showIdeabookCategories();
    else if (saved.domain === DOMAIN_PATTERNS) await showPatternsCategories();
    else if (saved.domain === DOMAIN_SCRIPTS) await showScriptsCategories();

    activateGallerySubtab(`gallery-${saved.domain.toLowerCase()}`);
    clearCaption();
    return;
  }

  // 3. Restore Results View
  if (saved.view === "results") {
    ensureResultsSubtab(saved.domain);
    activateGallerySubtab(SUBTAB_RESULTS);
    uiState.gallery.activeSubtab = "results";

    const list = galleryCache[saved.domain]?.[saved.category] || [];

    // If category is gone or empty, bounce to category list
    if (list.length === 0) {
      uiState.gallery.saved = { ...saved, view: "categories", index: null };
      if (saved.domain === DOMAIN_IDEABOOK) return showIdeabookCategories();
      if (saved.domain === DOMAIN_PATTERNS) return showPatternsCategories();
      return showScriptsCategories();
    }

    // Index safety
    let idx = (typeof saved.index === "number") ? saved.index : 0;
    if (idx >= list.length) idx = list.length - 1;
    if (idx < 0) idx = 0;

    uiState.gallery.saved.index = idx;
    uiState.gallery.activeItem = list[idx];

    if (saved.domain === DOMAIN_SCRIPTS) {
      await showGalleryResultsScripts(saved.category, idx);
    } else {
      await showGalleryResultsImages(saved.domain, saved.category, idx);
    }
  }
}

/* ============================================================
   buildGallerySubtabs()
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
    await showIdeabookCategories();
    activateGallerySubtab(SUBTAB_IDEABOOK);
    clearCaption();
  }));

  bar.appendChild(buildSubtabButton(SUBTAB_PATTERNS, "Patterns", async () => {
    setCommandsButtonLabel(GALLERY_COMMAND);
    uiState.gallery.activeDomain = DOMAIN_PATTERNS;
    uiState.gallery.activeSubtab = "patterns";
    await showPatternsCategories();
    activateGallerySubtab(SUBTAB_PATTERNS);
    clearCaption();
  }));

  bar.appendChild(buildSubtabButton(SUBTAB_SCRIPTS, "Scripts", async () => {
    setCommandsButtonLabel(GALLERY_COMMAND);
    uiState.gallery.activeDomain = DOMAIN_SCRIPTS;
    uiState.gallery.activeSubtab = "scripts";
    await showScriptsCategories();
    activateGallerySubtab(SUBTAB_SCRIPTS);
    clearCaption();
  }));
}

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
}

function ensureResultsSubtab(domain) {
  const container = document.getElementById("subtabs");
  const bar = container.querySelector("ul.gallery-subtabs");
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
    const saved = uiState.gallery.saved;
    activateGallerySubtab(SUBTAB_RESULTS);
    uiState.gallery.activeSubtab = "results";

    const idx = (typeof saved.index === "number") ? saved.index : 0;
    if (saved.domain === DOMAIN_SCRIPTS) {
      await showGalleryResultsScripts(saved.category, idx);
    } else {
      await showGalleryResultsImages(saved.domain, saved.category, idx);
    }
  });
  li.appendChild(btn);
  bar.appendChild(li);
}

function activateGallerySubtab(subtabId) {
  const buttons = document.querySelectorAll(".gallery-subtabs .nav-link");
  buttons.forEach((btn) => {
    if (btn.dataset.tabId === subtabId) btn.classList.add("active");
    else btn.classList.remove("active");
  });
}

function clearCaption() {
  const captionDiv = document.getElementById("caption");
  if (captionDiv) captionDiv.innerHTML = "";
}

/* ============================================================
   Categories Helpers
============================================================ */
async function showIdeabookCategories() {
  clearDivs();
  await ensureGalleryCacheLoaded();
  const domainMap = galleryCache.Ideabook;
  const cats = Object.keys(domainMap);

  const frames = cats.map((cat) => {
    const list = domainMap[cat];
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
}

async function showPatternsCategories() {
  clearDivs();
  await ensureGalleryCacheLoaded();
  const domainMap = galleryCache.Patterns;
  const cats = Object.keys(domainMap);

  const frames = cats.map((cat) => {
    const list = domainMap[cat];
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
}

async function showScriptsCategories() {
  clearDivs();
  await ensureGalleryCacheLoaded();
  const domainMap = galleryCache.Scripts;
  const cats = Object.keys(domainMap);

  const frames = cats.map((cat) => {
    const list = domainMap[cat];
    return {
      title: cat,
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
}

/* ============================================================
   Result Viewers
============================================================ */
async function showGalleryResultsImages(domain, category, startIndex) {
  clearDivs();
  await ensureGalleryCacheLoaded();

  const domainMap = galleryCache[domain];
  const list = domainMap[category];
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
  sessionStorage.setItem("sketchpad.gallery.saved", JSON.stringify(uiState.gallery.saved));

  renderThumbnailGrid(
    "action",
    list,
    (entry) => `./gallery/${domain}/${category}/images/thumb_${entry.filename}.png`,
    async (_, i) => {
      currentIndex = i;
      uiState.gallery.activeItem = list[i];
      uiState.gallery.saved.index = i;
      sessionStorage.setItem("sketchpad.gallery.saved", JSON.stringify(uiState.gallery.saved));

      showGalleryImage(domain, category, list[i]);
      updateGalleryCaption(domain, category);
      markSelectedThumbnail("action", i);
    }
  );

  markSelectedThumbnail("action", idx);
  showGalleryImage(domain, category, list[idx]);
  updateGalleryCaption(domain, category);
}

async function showGalleryResultsScripts(category, index) {
  clearDivs();
  await ensureGalleryCacheLoaded();

  const list = galleryCache.Scripts[category];
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
  sessionStorage.setItem("sketchpad.gallery.saved", JSON.stringify(uiState.gallery.saved));

  await showGalleryScript(category, list[idx]);
  updateGalleryCaption(DOMAIN_SCRIPTS, category);
}

function normalizeGalleryEntryPath(category, entry) {
  let p = entry.path || entry.filename;
  if (!p) throw new Error("normalizeGalleryEntryPath: entry missing path/filename");
  if (p.startsWith("./")) p = p.slice(2);
  const prefix = category + "/";
  if (p.startsWith(prefix)) p = p.slice(prefix.length);
  return p;
}

function showGalleryImage(domain, category, entry) {
  const text = document.getElementById("text");
  if (!text) throw new Error("showGalleryImage: #text not found");

  text.innerHTML = "";
  if (!entry) return;

  const img = document.createElement("img");
  const relPath  = normalizeGalleryEntryPath(category, entry);
  const fullPath = `/gallery/${domain}/${category}/${relPath}`;

  img.src = fullPath;
  img.alt = entry.title || entry.filename || entry.path || "(image)";
  img.style.display   = "block";
  img.style.maxWidth  = drawState.canvasWidth + "px";
  img.style.maxHeight = drawState.canvasHeight + "px";
  img.style.margin    = "0 auto";

  text.appendChild(img);
}

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
}

async function showPrevGalleryItem(domain) {
  if (!currentList || !currentList.length) throw new Error("showPrevGalleryItem: currentList is empty");

  const newIndex = (currentIndex <= 0) ? currentList.length - 1 : currentIndex - 1;
  currentIndex = newIndex;

  uiState.gallery.activeItem = currentList[newIndex];
  uiState.gallery.saved.index = newIndex;
  sessionStorage.setItem("sketchpad.gallery.saved", JSON.stringify(uiState.gallery.saved));

  if (domain === DOMAIN_SCRIPTS) {
    await showGalleryResultsScripts(currentCategory, newIndex);
    updateGalleryCaption(domain, currentCategory);
    return;
  }

  showGalleryImage(domain, currentCategory, currentList[newIndex]);
  updateGalleryCaption(domain, currentCategory);
  markSelectedThumbnail("action", newIndex);
}

async function showNextGalleryItem(domain) {
  if (!currentList || !currentList.length) return;

  const newIndex = (currentIndex >= currentList.length - 1) ? 0 : currentIndex + 1;
  currentIndex = newIndex;

  uiState.gallery.activeItem = currentList[newIndex];
  uiState.gallery.saved.index = newIndex;
  sessionStorage.setItem("sketchpad.gallery.saved", JSON.stringify(uiState.gallery.saved));

  if (domain === DOMAIN_SCRIPTS) {
    await showGalleryResultsScripts(currentCategory, newIndex);
  } else {
    showGalleryImage(domain, currentCategory, currentList[newIndex]);
    markSelectedThumbnail("action", newIndex);
  }
  updateGalleryCaption(domain, currentCategory);
}

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
      filename: fileId,
      title: item.title || "",
      status: item.status || "",
      isScript: isScript,
      scriptPath: isScript ? `/gallery/Scripts/${currentCategory}/${fileId}` : "",
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
}

/* ============================================================
   rehydrateGalleryState()
============================================================ */
export function rehydrateGalleryState() {
  const savedStr  = sessionStorage.getItem("sketchpad.gallery.saved");

  if (!uiState.gallery) uiState.gallery = {};

  if (savedStr) {
    const saved = JSON.parse(savedStr);
    uiState.gallery.saved = saved;
    currentDomain   = saved.domain;
    currentCategory = saved.category;
    currentIndex    = saved.index;
  }
}

// // Invoke immediately
// rehydrateGalleryState();

/* ============================================================
   rebuild/commands wiring
============================================================ */
export function formatRebuildReport(report) {
  return formatRebuildReportShared(report);
}

export async function refreshGalleryFromManifestEdit() {
  if (manifest && typeof manifest.clearCache === "function") {
    manifest.clearCache();
  }
  if (manifest.cache) delete manifest.cache.gallery;

  galleryCache = null;
  await ensureGalleryCacheLoaded();

  const domain   = uiState.gallery.activeDomain;
  const category = uiState.gallery.activeCategory;
  const item     = uiState.gallery.activeItem;

  if (domain && category && item) {
    const list = galleryCache[domain][category];
    const matchValue = (domain === DOMAIN_SCRIPTS)
       ? String(item.path)
       : String(normalizeGalleryEntryPath(category, item));

    let found = list.find(entry => {
      const entryMatch = (domain === DOMAIN_SCRIPTS)
        ? String(entry.path)
        : String(normalizeGalleryEntryPath(category, entry));
      return entryMatch === matchValue;
    });

    if (!found) {
      uiState.gallery.activeItem = null;
      if (uiState.gallery.saved?.view === "results") {
        if (list.length > 0) {
          let idx = uiState.gallery.saved.index;
          if (idx >= list.length) idx = list.length - 1;
          uiState.gallery.saved.index = idx;
          uiState.gallery.activeItem = list[idx];
          sessionStorage.setItem("sketchpad.gallery.saved", JSON.stringify(uiState.gallery.saved));
        }
      }
      await restoreGalleryTab();
      return;
    }
    uiState.gallery.activeItem = found;
  }
  await restoreGalleryTab();
}

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
}

export function wireGalleryCommandsButton() {
  setCommandsButton("Commands", () => {
    showCommandsOffcanvas({
      title: "Gallery Maintenance",
      buildBody(container) {
        if (!container) return;
        container.innerHTML = buildGalleryOffcanvasHtml();

        const btn = document.getElementById("galleryRebuildValidateButton");
        const out = document.getElementById("galleryRebuildReport");
        const helpBtn = document.getElementById("galleryHelpButton");

        btn?.addEventListener("click", async () => {
          out.textContent = "Rebuilding...";

          // 1. Server-side heavy lifting
          const report = await nodeRebuildAndValidateManifests();

          // 2. Clear caches so the UI sees the new manifests
          if (manifest.cache) delete manifest.cache.gallery;

          // 3. Refresh the UI state without a full reload if possible,
          // or just re-init the current tab.
          await initGalleryTab(false);

          // 4. Report the results
          out.textContent = formatRebuildReport(report);
        });

        helpBtn?.addEventListener("click", () => {
          // Use a helper to close offcanvas to avoid repeating bootstrap boilerplate
          closeOffcanvas();
          openHelpHomeOverlay();
        });
      }
    });
  });
}
