/* utilities.js
   ------------------------------------------------------------
   Utilities Tab Controller — NEW ARCHITECTURE (Patterns/Gallery model)
   ------------------------------------------------------------
*/

import { uiState }          from "./uiState.js";
import { setCaptionBar }    from "./caption.js";
import { renderCategories } from "./categories.js";
import { manifest }         from "./manifest.js";
import { clearDivs }        from "./ui_utilities.js";
import { menuManager }      from "./menuManager.js";

/* ============================================================
   Internal module-level vars (NO uiState additions)
============================================================ */
let utilitiesCache = null;       // { tools:{}, lab:{} }
let currentDomain  = null;       // "Tools" | "Lab"
let currentCategory = null;      // string
let currentList     = [];        // manifest entries
let currentIndex    = 0;         // numeric index

/* ============================================================
   Domain constants
============================================================ */
const DOMAIN_TOOLS = "Tools";
const DOMAIN_LAB   = "Lab";
const DOMAIN_RESULT = "Result";

/* ============================================================
   Exported TabSpec for setUI.js
============================================================ */
export const UtilityTabSpec = {
  theme: "theme-utilities",

  init: initUtilityTab,
  save: saveUtilityState,

  // region handlers (TabSpec architecture)
  action:    () => {},   // Utilities uses no action panel
  buttons:   () => {},   // no buttons panel
  caption:   () => {},   // caption set per-item
  sketchpad: () => {},   // sketchpad cleared dynamically
  subtabs:   setUtilitySubtabs,
  text:      () => {}
};


/* ============================================================
   initUtilityTab — NEW ARCHITECTURE
============================================================ */
export async function initUtilityTab(restored = false) {
  clearDivs();

  /* --------------------------------------------
     Load manifests using the Patterns/Gallery model
     Tools and Lab ONLY.  Result has NO directory.
  -------------------------------------------- */
  const toolsRaw = await manifest.get("utilities/Tools");
  const labRaw   = await manifest.get("utilities/Lab");

  const toolsRegistry = manifest.getRegistry("utilities/Tools");
  const labRegistry   = manifest.getRegistry("utilities/Lab");

  /* --------------------------------------------
     Normalize → utilitiesCache
  -------------------------------------------- */
  utilitiesCache = {
    Tools: {},
    Lab:   {}
  };

  toolsRegistry.forEach((cat, i) => {
    utilitiesCache.Tools[cat] = toolsRaw[i] || [];
  });

  labRegistry.forEach((cat, i) => {
    utilitiesCache.Lab[cat] = labRaw[i] || [];
  });

  /* --------------------------------------------
     Build subtabs bar
  -------------------------------------------- */
  setUtilitySubtabs();

  /* --------------------------------------------
     Determine starting subtab
  -------------------------------------------- */
  let tabId = uiState.utilities.activeUtilityTab || "tab-tools";

  if (restored && uiState.utilities.saved) {
    const saved = uiState.utilities.saved.activeUtilityTab;
    if (saved) tabId = saved;
  }

  uiState.utilities.activeUtilityTab = tabId;

  /* --------------------------------------------
     Switch to selected subtab
  -------------------------------------------- */
  await switchUtilityTab(tabId);
} // end initUtilityTab

function setUtilitySubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setUtilitySubtabs: #subtabs not found");

  el.innerHTML = "";

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs utility-subtabs";
  el.appendChild(bar);

  function makeSubtab(name, id, active = false) {
    const li = document.createElement("li");
    li.className = "nav-item";

    const btn = document.createElement("button");
    btn.className = "nav-link" + (active ? " active" : "");
    btn.dataset.tabId = id;
    btn.textContent = name;

    btn.addEventListener("click", () => switchUtilityTab(id));

    li.appendChild(btn);
    bar.appendChild(li);
  } // end makeSubtab

  makeSubtab("Tools", "tab-tools", true);
  makeSubtab("Lab",   "tab-lab");
  makeSubtab("Result","tab-result");
} // end setUtilitySubtabs


async function switchUtilityTab(tabId) {
  uiState.utilities.activeUtilityTabId = tabId;

  clearDivs();

  if (tabId === "tab-tools") {
    await setUtilityCategories("Tools");
  } else if (tabId === "tab-lab") {
    await setUtilityCategories("Lab");
  } else if (tabId === "tab-result") {
    /* result: #text will be populated later by
       displayUtilityResult(), and we deliberately
       leave #text empty here. */
  }

  const bar = document.querySelector("#subtabs ul");
  if (bar) {
    bar.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));
    const btn = bar.querySelector(`[data-tabId="${tabId}"]`);
    if (btn) btn.classList.add("active");
  }
} // end switchUtilityTab

async function onUtilityItemClick(item) {
  uiState.utilities.lastUtilitySubtab = item.subtab;
  uiState.utilities.activeUtilityItem = item.entry;

  await switchUtilityTab("tab-result");

  const scriptPath = `/utilities/${item.subtab}/${item.entry.path}`;

  try {
    const mod = await import(scriptPath + `?t=${Date.now()}`);

    if (typeof mod.runPattern !== "function") {
      displayUtilityResult(`runPattern() not found in ${item.entry.filename}`);
      return;
    }

    if (item.subtab === "Lab") {
      const sketchDiv = document.getElementById("sketchpad");
      if (!sketchDiv)
        throw new Error("onUtilityItemClick: #sketchpad not found");

      sketchDiv.innerHTML = "";
      sketchDiv.appendChild(window.drawCanvas);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
    }

    const result = await mod.runPattern();

    setUtilityCaption({
      title: item.entry.title || item.entry.filename || "(untitled)",
      path: item.entry.path,
      subtab: item.subtab
    });

    if (item.subtab === "Lab") {
      /* nothing to display in text */
    } else {
      displayUtilityResult(result);
    }
  } catch (err) {
    console.error(`Error executing ${scriptPath}:`, err);
    displayUtilityResult(`Error executing ${scriptPath}: ${err.message}`);
  }
} // end onUtilityItemClick

async function setUtilityCategories(which) {
  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("setUtilityCategories: #text not found");

  textDiv.innerHTML = `<p>Loading ${which} categories...</p>`;

const sections =
  which === "Tools"
    ? utilitiesCache.Tools
    : which === "Lab"
    ? utilitiesCache.Lab
    : null;

  if (!sections || typeof sections !== "object") {
    textDiv.innerHTML =
      `<p style='color:red;'>No manifest data for ${which}</p>`;
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


    return {
      title: subdir,
      items
    };
  });

  renderCategories("text", frames, onUtilityItemClick, null);
} // end setUtilityCategories


export function saveUtilityState() {
  return {
    activeUtilityTabId: uiState.utilities.activeUtilityTabId || null,
    toolsIndex: uiState.utilities.toolsIndex || 0,
    labIndex: uiState.utilities.labIndex || 0,
    lastItem: uiState.utilities.lastItem || null
  };
} // end saveUtilityState



export async function loadCategory(categoryName) {
  if (!categoryName) {
    await switchUtilityTab("tab-tools");
    return;
  }

  const key = categoryName.toLowerCase();

  if (key === "tools") {
    await switchUtilityTab("tab-tools");
    return;
  }
  if (key === "lab") {
    await switchUtilityTab("tab-lab");
    return;
  }
  if (key === "result") {
    await switchUtilityTab("tab-result");
    return;
  }

  await switchUtilityTab("tab-tools");
} // end loadCategory



export async function runUtilityItem(name) {
  throw new Error(
    "runUtilityItem is not wired; items run via onUtilityItemClick."
  );
} // end runUtilityItem



export const utilityDivs = {
  activeDivs: ["subtabs"],
  theme: "theme-utilities",
  action: () => { const el = document.getElementById("action"); if (el) el.innerHTML = ""; },
  buttons: () => { const el = document.getElementById("buttons"); if (el) el.innerHTML = ""; },
  caption: () => {},
  sketchpad: () => { const el = document.getElementById("sketchpad"); if (el) el.innerHTML = ""; },
  subtabs: setUtilitySubtabs,
  text: () => { const el = document.getElementById("text"); if (el) el.innerHTML = ""; }
}; // end utilityDivs

