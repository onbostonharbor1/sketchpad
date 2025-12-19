/* utilities.js
   ------------------------------------------------------------
   Utilities Tab Controller — NEW ARCHITECTURE (Patterns/Gallery model)
   ------------------------------------------------------------
*/

import { setCaptionBar }    from "./caption.js";
import { renderCategories } from "./categories.js";
import { manifest }         from "./manifest.js";
import { clearDivs }        from "./ui_utilities.js";
import { menuManager }      from "./menuManager.js";

/* ============================================================
   Internal module-level vars (NO uiState additions)
============================================================ */
let utilitiesCache = null;
let currentDomain  = null;
let currentCategory = null;
let currentList     = [];
let currentIndex    = 0;

/* ============================================================
   Domain constants
============================================================ */
const DOMAIN_TOOLS  = "Tools";
const DOMAIN_LAB    = "Lab";
const DOMAIN_RESULT = "Result";

/* ============================================================
   Exported TabSpec for setUI.js
============================================================ */
export const UtilityTabSpec = {
  theme: "theme-utilities",
  init: initUtilityTab,
  save: saveUtilityState,
  restore: restoreUtilityTab,

  action:    () => {},

  caption:   () => {},
  sketchpad: () => {},
  subtabs:   setUtilitySubtabs,
  text:      () => {}
};

/* ============================================================
   restoreUtilityTab()
============================================================ */
async function restoreUtilityTab() {
  const saved = uiState.utilities.saved;

  if (!saved) {
    await initUtilityTab(false);
    return;
  }

  await setUtilitySubtabs();

  const tabId = saved.activeUtilityTabId || "tab-tools";
  uiState.utilities.activeUtilityTabId = tabId;

  await switchUtilityTab(tabId);

  if (tabId === "tab-result" && saved.lastResult) {
    displayUtilityResult(saved.lastResult);
  }
}

/* ============================================================
   initUtilityTab()
============================================================ */
export async function initUtilityTab(restored = false) {
  clearDivs();

  uiState.utilities = uiState.utilities || {
    activeUtilityTabId: "tab-tools",
    activeUtilityItem: null,
    lastResult: "",
    lastUtilitySubtab: null,
    saved: null
  };

  const toolsRaw = await manifest.get("utilities/Tools");
  const labRaw   = await manifest.get("utilities/Lab");

  const toolsRegistry = manifest.getRegistry("utilities/Tools");
  const labRegistry   = manifest.getRegistry("utilities/Lab");

  utilitiesCache = { Tools: {}, Lab: {} };

  toolsRegistry.forEach((cat, i) => utilitiesCache.Tools[cat] = toolsRaw[i] || []);
  labRegistry.forEach((cat, i) => utilitiesCache.Lab[cat] = labRaw[i] || []);

  await setUtilitySubtabs();

  let tabId = uiState.utilities.activeUtilityTabId || "tab-tools";

  if (restored && uiState.utilities.saved) {
    const s = uiState.utilities.saved.activeUtilityTabId;
    if (s) tabId = s;
  }

  uiState.utilities.activeUtilityTabId = tabId;

  await switchUtilityTab(tabId);
} // end initUtilityTab

/* ============================================================
   Caption + Result
============================================================ */
function setUtilityCaption({ title, path, subtab }) {
  setCaptionBar({
    targetId: "caption",
    title: title || "(untitled)",
    onPrev: null,
    onNext: null,
    onMenu: (anchor) => {
      const items = [
        {
          label: "Show Script",
          onClick: () => {
            menuManager.close();
            window.open(`/utilities/${subtab}/${path}`, "_blank");
          }
        }
      ];
      menuManager.open(items, anchor);
    }
  });
} // end setUtilityCaption

function displayUtilityResult(html) {
  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("displayUtilityResult: #text not found");

  textDiv.innerHTML = "";
  const box = document.createElement("div");
  box.className = "utility-result-box";
  box.innerHTML = html || "";

  textDiv.appendChild(box);
} // end displayUtilityResult

/* ============================================================
   Subtabs
============================================================ */
async function setUtilitySubtabs() {
  const el = document.getElementById("subtabs");
  el.innerHTML = "";

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs utility-subtabs";
  el.appendChild(bar);

  function makeSubtab(name, id) {
    const li = document.createElement("li");
    li.className = "nav-item";

    const btn = document.createElement("button");
    btn.className = "nav-link";
    btn.dataset.tabId = id;
    btn.textContent = name;

    btn.addEventListener("click", () => switchUtilityTab(id));

    li.appendChild(btn);
    bar.appendChild(li);
  }

  makeSubtab("Tools", "tab-tools");
  makeSubtab("Lab",   "tab-lab");
  makeSubtab("Result","tab-result");
} // end setUtilitySubtabs

/* ============================================================
   switchUtilityTab()
============================================================ */
async function switchUtilityTab(tabId) {
  uiState.utilities.activeUtilityTabId = tabId;

  clearDivs();

  if (tabId === "tab-tools") {
    await setUtilityCategories("Tools");

  } else if (tabId === "tab-lab") {
    await setUtilityCategories("Lab");

  } else if (tabId === "tab-result") {
    const subtab = uiState.utilities.lastUtilitySubtab;
    const entry  = uiState.utilities.activeUtilityItem;
    if (subtab && entry) {
      await runUtilityEntry(subtab, entry);
    }
  }

  const bar = document.querySelector("#subtabs ul.utility-subtabs");
  if (bar) {
    bar.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));
    const btn = bar.querySelector(`[data-tabId="${tabId}"]`);
    if (btn) btn.classList.add("active");
  }
} // end switchUtilityTab

/* ============================================================
   runUtilityEntry()
============================================================ */
async function runUtilityEntry(subtab, entry) {
  const scriptPath = `/utilities/${subtab}/${entry.path}`;

  try {
    const mod = await import(/* @vite-ignore */ scriptPath + `?t=${Date.now()}`);

    if (typeof mod.runPattern !== "function") {
      displayUtilityResult(`runPattern() not found in ${entry.filename}`);
      return;
    }

    if (subtab === "Lab") {
      const sketchDiv = document.getElementById("sketchpad");
      if (!sketchDiv)
        throw new Error("runUtilityEntry: #sketchpad not found");

      sketchDiv.innerHTML = "";
      sketchDiv.appendChild(window.drawCanvas);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
    }

    const result = await mod.runPattern();

    setUtilityCaption({
      title: entry.title || entry.filename || "(untitled)",
      path: entry.path,
      subtab
    });

    if (subtab !== "Lab") {
      displayUtilityResult(result);
    }

    uiState.utilities.lastResult = result;

  } catch (err) {
    console.error(`Error executing ${scriptPath}:`, err);
    displayUtilityResult(`Error executing ${scriptPath}: ${err.message}`);
  }
} // end runUtilityEntry

/* ============================================================
   onUtilityItemClick()
============================================================ */
async function onUtilityItemClick(item) {
  uiState.utilities.lastUtilitySubtab = item.subtab;
  uiState.utilities.activeUtilityItem = item.entry;
  uiState.utilities.activeUtilityTabId = "tab-result";

  const bar = document.querySelector("#subtabs ul.utility-subtabs");
  if (bar) {
    bar.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));
    const btn = bar.querySelector(`[data-tabId="tab-result"]`);
    if (btn) btn.classList.add("active");
  }

  clearDivs();
  await runUtilityEntry(item.subtab, item.entry);
} // end onUtilityItemClick

/* ============================================================
   Categories
============================================================ */
async function setUtilityCategories(which) {
  const textDiv = document.getElementById("text");
  textDiv.innerHTML = `<p>Loading ${which}...</p>`;

  const sections =
    which === "Tools" ? utilitiesCache.Tools :
    which === "Lab"   ? utilitiesCache.Lab   :
    null;

  if (!sections) {
    textDiv.innerHTML = `<p style='color:red;'>No manifest data for ${which}</p>`;
    return;
  }

  const frames = Object.keys(sections).map((subdir) => {
    const entries = sections[subdir] || [];

    const items = entries.map((entry) => ({
      name: entry.title || entry.filename || "(untitled)",
      onClick: () => onUtilityItemClick({ entry, subtab: which, category: subdir }),
      entry,
      subtab: which,
      category: subdir
    }));

    return { title: subdir, items };
  });

  textDiv.innerHTML = "";
  renderCategories("text", frames);
} // end setUtilityCategories

/* ============================================================
   saveUtilityState()
============================================================ */
export function saveUtilityState() {
  const s = {
    activeUtilityTabId: uiState.utilities.activeUtilityTabId,
    lastItem: uiState.utilities.activeUtilityItem || null,
    lastResult: uiState.utilities.lastResult || ""
  };

  uiState.utilities.saved = s;
  return s;
}

/* ============================================================
   Exposed helpers
============================================================ */
export async function loadCategory(categoryName) {
  if (!categoryName) {
    await switchUtilityTab("tab-tools");
    return;
  }

  const key = categoryName.toLowerCase();

  if (key === "tools")  return await switchUtilityTab("tab-tools");
  if (key === "lab")    return await switchUtilityTab("tab-lab");
  if (key === "result") return await switchUtilityTab("tab-result");

  await switchUtilityTab("tab-tools");
}

export async function runUtilityItem(name) {
  throw new Error("runUtilityItem is not wired; items run via onUtilityItemClick.");
}

/* ============================================================
   utilityDivs
============================================================ */
export const utilityDivs = {
  activeDivs: ["subtabs"],
  theme: "theme-utilities",
  action: () => { const el = document.getElementById("action"); if (el) el.innerHTML = ""; },
  caption: () => {},
  sketchpad: () => { const el = document.getElementById("sketchpad"); if (el) el.innerHTML = ""; },
  subtabs: setUtilitySubtabs,
  text: () => { const el = document.getElementById("text"); if (el) el.innerHTML = ""; }
}; // end utilityDivs
