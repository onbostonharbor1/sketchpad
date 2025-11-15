/* patterns.js
   ------------------------------------------------------------
   Patterns tab controller (ES-module version).
   Loads pattern scripts via dynamic import(), not eval().
   Integrates drawState for captions.
   ------------------------------------------------------------ */
import { renderCategories, showSharedOffcanvas, clearDivs,
         loadDirectoryRegistry, loadManifest } from "./ui_utilities.js";
import { drawState } from "../draw/drawState.js";
import { uiState }   from "./uiState.js";

/* ===========================================================
   CONSTANTS
=========================================================== */
const CATEGORIES_ID = "tab-patterns-categories";
const PATTERNS_ID   = "tab-patterns-patterns";

/* ===========================================================
   Basic div cleaners
=========================================================== */
function setPatternsButtons()   { const el = document.getElementById("buttons");   if (el) el.innerHTML = ""; }
function setPatternsAction()    { const el = document.getElementById("action");    if (el) el.innerHTML = ""; }
function setPatternsCaption()   { const el = document.getElementById("caption");   if (el) el.innerHTML = ""; }
function setPatternsText()      { const el = document.getElementById("text");      if (el) el.innerHTML = ""; }
function setPatternsSketchpad() { const el = document.getElementById("sketchpad"); if (el) el.innerHTML = ""; }

/* ===========================================================
   setPatternsSubtabs()
=========================================================== */
function setPatternsSubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setPatternsSubtabs: #subtabs not found");

  el.innerHTML = "";
  const bar = document.createElement("ul");  // no id assigned
  bar.className = "nav nav-tabs patterns-subtabs";
  el.appendChild(bar);

  addPatternsSubtab({ name: "Categories" });
} // end setPatternsSubtabs

/* ===========================================================
   initPatternsTab()
=========================================================== */
export function initPatternsTab() {

  clearDivs();

  if (uiState.patternsTabs && uiState.activePatternsTab) {
    restorePatternsState({
      activeTabId: uiState.activePatternsTab,
      activeTabInfo: uiState.patternsTabs[uiState.activePatternsTab]
    });
    return;
  }

  setPatternsSubtabs();
  uiState.activePatternsTab = CATEGORIES_ID;
  switchPatternsTab(CATEGORIES_ID);
} // end initPatternsTab

function restorePatternsState(saved) {
  if (!saved || !saved.activeTabId) {
    setPatternsSubtabs();
    return;
  }

  uiState.activePatternsTab = saved.activeTabId;
  uiState.patternsTabs = uiState.patternsTabs || {};

  if (saved.activeTabInfo) {
    uiState.patternsTabs[saved.activeTabId] = saved.activeTabInfo;
  }

  setPatternsSubtabs();

  if (saved.activeTabInfo?.type === "script") {
    addPatternsSubtab({
      name: saved.activeTabInfo.title || saved.activeTabInfo.filename,
      type: "script",
      category: saved.activeTabInfo.category,
      filename: saved.activeTabInfo.filename,
      path: saved.activeTabInfo.path,
      title: saved.activeTabInfo.title
    });
  }

  switchPatternsTab(saved.activeTabId);
} // end restorePatternsState

/* ===========================================================
   addPatternsSubtab(item)
=========================================================== */
function addPatternsSubtab(item) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) throw new Error("addPatternsSubtab: subtab bar not found");

  /* ---- CATEGORIES TAB ---- */
  if (item.name === "Categories") {
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

    bar.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
    bar.querySelector(`[data-tab-id="${CATEGORIES_ID}"]`).classList.add("active");

    uiState.patternsTabs[CATEGORIES_ID] = { type: "categories" };
    uiState.activePatternsTab = CATEGORIES_ID;

    clearDivs();
    setPatternsCategories();
    return;
  }

  /* ---- PATTERN TAB ---- */
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

  bar.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
  bar.querySelector(`[data-tab-id="${PATTERNS_ID}"]`).classList.add("active");

  uiState.patternsTabs[PATTERNS_ID] = {
    type: "script",
    category: item.category,
    filename: item.filename,
    path: item.path,
    title: item.title
  };

  uiState.activePatternsTab = PATTERNS_ID;

  clearDivs();
  loadAndRunPattern(item.path);
} // end addPatternsSubtab

/* ===========================================================
   switchPatternsTab(tabId)
=========================================================== */
function switchPatternsTab(tabId) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) return;

  bar.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
  const btn = bar.querySelector(`[data-tab-id="${tabId}"]`);
  if (btn) btn.classList.add("active");

  const info = uiState.patternsTabs[tabId];
  uiState.activePatternsTab = tabId;

  clearDivs();

  if (!info) return;

  if (info.type === "categories") {
    setPatternsCategories();
  } else {
    loadAndRunPattern(info.path);
  }
} // end switchPatternsTab

/* ===========================================================
   loadAndRunPattern(path)
=========================================================== */
async function loadAndRunPattern(path) {
  const sketchDiv = document.getElementById("sketchpad");
  sketchDiv.innerHTML = "";
  sketchDiv.appendChild(window.drawCanvas);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);

  try {
    const moduleUrl = `/patterns/${path}`;
    const mod = await import(moduleUrl);

    if (!mod.runPattern)
      throw new Error(`runPattern() not found in ${moduleUrl}`);

    mod.runPattern();

  } catch (err) {
    console.error("Pattern load or execution failed:", err);
    sketchDiv.innerHTML =
      `<p style="color:red;">Error loading pattern: ${err.message}</p>`;
    return;
  }

  const category = path.split("/")[0];
  const file = path.split("/").pop().replace(/\.js$/i, "");

  uiState.activePattern = {
    category,
    filename: file,
    path,
    title: drawState.currentTitle || file
  };

  updatePatternsCaption();
  setPatternsThumbnails(category);

  const manifest = uiState.manifests.patterns?.main;
  const entry = manifest?.[category]?.find(it => it.path === path);

  setPatternsCaptionContent({
    title: entry?.title || uiState.activePattern.title,
    filename: file,
    path
  });
} // end loadAndRunPattern

/* ===========================================================
   loadPatternsManifest()
=========================================================== */
async function loadPatternsManifest() {
  try {
    const cache = uiState.manifests.patterns;
    if (cache && cache.main) {
      uiState.activeManifest = cache.main;
      return cache.main;
    }

    const dirs = await loadDirectoryRegistry("./patterns");
    if (!dirs) throw new Error("Missing directoryRegistry.json in /patterns");

    const allData = await Promise.all(
      dirs.map(async cat => {
        const manifest = await loadManifest("./patterns", cat);
        return { category: cat, items: manifest || [] };
      })
    );

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
=========================================================== */
let lastCategoriesRequest = 0;

async function setPatternsCategories() {
  const requestId = ++lastCategoriesRequest;

  const textDiv = document.getElementById("text");
  textDiv.innerHTML = "<p>Loading pattern categories...</p>";

  const manifestInfo = await loadPatternsManifest();
  if (requestId !== lastCategoriesRequest) return;
  if (!manifestInfo) {
    textDiv.innerHTML = `<p style="color:red;">Error loading manifest.</p>`;
    return;
  }

  if (uiState.activePatternsTab === PATTERNS_ID) return;

  const categoriesArray = Object.entries(manifestInfo).map(([key, items]) => {
    const sorted = [...items].sort((a, b) =>
      (a.title || a.filename).toLowerCase()
        .localeCompare((b.title || b.filename).toLowerCase())
    );

    return {
      title: key,
      items: sorted.map(it => ({
        name: it.title || it.filename,
        hasSubitems: false,
        onClick: () => {
          addPatternsSubtab({
            name: it.title || it.filename,
            type: "script",
            category: key,
            filename: it.filename,
            path: it.path,
            title: it.title
          });
        }
      }))
    };
  });

  renderCategories("text", categoriesArray, item => item.onClick?.(), null);
} // end setPatternsCategories

/* ===========================================================
   updatePatternsCaption()
=========================================================== */
function updatePatternsCaption() {
  const capDiv = document.getElementById("caption");
  capDiv.innerHTML = "";

  const info = uiState.activePattern;
  if (!info) {
    capDiv.textContent = "(no pattern loaded)";
    return;
  }

  const title = drawState.currentTitle ||
                info.title ||
                info.filename ||
                "Untitled Pattern";

  const wrapper = document.createElement("div");
  wrapper.className = "caption-wrapper";

  const titleSpan = document.createElement("span");
  titleSpan.className = "caption-title";
  titleSpan.textContent = title;

  const btnGroup = document.createElement("div");
  btnGroup.className = "caption-buttons";

  const mk = label => {
    const b = document.createElement("button");
    b.textContent = label;
    return b;
  };

  const btnPrev = mk("Prev");
  const btnNext = mk("Next");
  const btnSave = mk("Save");

  btnPrev.onclick = showPrevPattern;
  btnNext.onclick = showNextPattern;
  btnSave.onclick = () => alert("Save pressed");

  btnGroup.appendChild(btnPrev);
  btnGroup.appendChild(btnNext);
  btnGroup.appendChild(btnSave);

  capDiv.appendChild(titleSpan);
  capDiv.appendChild(btnGroup);
} // end updatePatternsCaption

/* ===========================================================
   setPatternsCaptionContent()
=========================================================== */
function setPatternsCaptionContent(entry) {
  const captionDiv = document.getElementById("caption");
  captionDiv.style.display = "flex";
  captionDiv.style.justifyContent = "space-between";
  captionDiv.style.alignItems = "center";
  captionDiv.innerHTML = "";

  const titleSpan = document.createElement("span");
  titleSpan.className = "caption-title";
  titleSpan.textContent = entry.title || entry.filename;

  const btnGroup = document.createElement("div");
  btnGroup.className = "caption-buttons";

  const makeBtn = (label, handler) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.addEventListener("click", handler);
    return b;
  };

  const btnPrev = makeBtn("Prev", showPrevPattern);
  const btnNext = makeBtn("Next", showNextPattern);
  const btnSave = makeBtn("Save", () => alert("Save pressed"));

  const btnShow = makeBtn("Show Script", async () => {
    const resp = await fetch(`/patterns/${entry.path}`);
    const code = await resp.text();
    showSharedOffcanvas(entry.title || entry.filename, code);
  });

  [btnPrev, btnNext, btnSave, btnShow].forEach(b => btnGroup.appendChild(b));

  captionDiv.appendChild(titleSpan);
  captionDiv.appendChild(btnGroup);
} // end setPatternsCaptionContent

/* ===========================================================
   showNextPattern()
=========================================================== */
function showNextPattern() {
  const info = uiState.activePattern;
  const root = uiState.manifests.patterns?.main;
  if (!info || !root) return;

  const list = root[info.category];
  if (!list || !list.length) return;

  const idx = list.findIndex(i => i.filename === info.filename);
  const nextIdx = (idx + 1) % list.length;
  const next = list[nextIdx];

  uiState.activePattern = {
    category: info.category,
    filename: next.filename,
    path: next.path,
    title: next.title
  };

  addPatternsSubtab({
    name: next.title || next.filename,
    type: "script",
    category: info.category,
    filename: next.filename,
    path: next.path,
    title: next.title
  });
} // end showNextPattern

/* ===========================================================
   showPrevPattern()
=========================================================== */
function showPrevPattern() {
  const info = uiState.activePattern;
  const root = uiState.manifests.patterns?.main;
  if (!info || !root) return;

  const list = root[info.category];
  if (!list || !list.length) return;

  const idx = list.findIndex(i => i.filename === info.filename);
  const prevIdx = (idx - 1 + list.length) % list.length;
  const prev = list[prevIdx];

  uiState.activePattern = {
    category: info.category,
    filename: prev.filename,
    path: prev.path,
    title: prev.title
  };

  addPatternsSubtab({
    name: prev.title || prev.filename,
    type: "script",
    category: info.category,
    filename: prev.filename,
    path: prev.path,
    title: prev.title
  });
} // end showPrevPattern

/* ===========================================================
   setPatternsThumbnails()
=========================================================== */
function setPatternsThumbnails(category) {
  const actDiv = document.getElementById("action");
  actDiv.innerHTML = "";

  const manifest = uiState.manifests.patterns?.main;
  if (!manifest || !manifest[category]) {
    actDiv.innerHTML = `<p>No thumbnails for ${category}</p>`;
    return;
  }

  const items = manifest[category];
  if (!items.length) {
    actDiv.innerHTML = `<p>No items found</p>`;
    return;
  }

  const panel = document.createElement("div");
  panel.className = "thumb-panel";

  items.forEach(item => {
    const box = document.createElement("div");
    box.className = "thumb-box";

    const img = document.createElement("img");
    img.src = `/patterns/${category}/images/${item.filename}.png`;
    img.alt = item.filename;
    img.title = item.filename;
    img.className = "thumb-image";

    img.onclick = () => {
      addPatternsSubtab({
        name: item.title || item.filename,
        type: "script",
        category,
        filename: item.filename,
        path: item.path,
        title: item.title
      });
    };

    box.appendChild(img);
    panel.appendChild(box);
  });

  actDiv.appendChild(panel);
} // end setPatternsThumbnails

/* ===========================================================
   patternsDivs
=========================================================== */
export const patternsDivs = {
  activeDivs: ["subtabs"],
  theme: "theme-patterns",
  action: setPatternsAction,
  buttons: setPatternsButtons,
  caption: setPatternsCaption,
  sketchpad: setPatternsSketchpad,
  subtabs: setPatternsSubtabs,
  text: setPatternsText
}; // end patternsDivs
