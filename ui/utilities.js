/* utilities.js
   ------------------------------------------------------------
   Utilities Tab Controller — NEW ARCHITECTURE (Patterns/Gallery model)
   ------------------------------------------------------------
*/

// ADD to imports at top of utilities.js

import { nodeRebuildAndValidateManifests } from "./nodeLayer.js";
import { showScriptOffcanvas } from "./menuCmds.js";
import { getUtilitiesCaptionMenuItems } from "./utilitiesMenuCmds.js";

import { setCaptionBar }    from "./caption.js";
import { renderCategories } from "./categories.js";
import { manifest }         from "./manifest.js";
import {
  clearDivs,
  setCommandsButtonLabel,
  setCommandsButton,
  showCommandsOffcanvas
} from "./ui_utilities.js";

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
  setCommandsButtonLabel("Utilities Commands");
  wireUtilitiesCommandsButton();
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
  setCommandsButtonLabel("Utilities Commands");
  wireUtilitiesCommandsButton();

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
   updateUtilitiesCaption()
   ------------------------------------------------------------
   ROLE (MULTI-RESPONSIBILITY — BY DESIGN)
   ------------------------------------------------------------
   This function does MORE than send data to utilitiesMenuCmds.
   It performs three distinct jobs:

   1) Caption rendering
      - Computes and sets the visible caption title.
      - Wires Prev/Next behavior (currently null for Utilities).

   2) Execution context derivation
      - Computes scriptPath used to run or display the utility.
      - This reflects how Utilities actually executes entries.

   3) Menu-context bundling (CRITICAL)
      - Builds a canonical `info` object for utilitiesMenuCmds.
      - This MUST mirror the Gallery/Patterns contract:
        • one canonical identifier
        • no display-derived fallbacks
        • no filename/path guessing
============================================================ */
function updateUtilitiesCaption({ title, path, subtab, category, manifestPath, entryPath, status }) {

  /* ----------------------------------------------------------
     1) Caption rendering
     -------------------------------------------------------- */
  const finalTitle =
    (category && category.trim() !== "")
      ? (category + ": " + (title || "(untitled)"))
      : (title || "(untitled)");

  /* ----------------------------------------------------------
     2) Execution context derivation
     -------------------------------------------------------- */
  const scriptPath =
    (subtab && category && entryPath)
      ? `/utilities/${subtab}/${category}/${entryPath}`
      : "";

  setCaptionBar({
    targetId: "caption",
    title: finalTitle,
    onPrev: null,
    onNext: null,

    /* --------------------------------------------------------
       3) Menu-context bundling (Gallery-conformant)
       ------------------------------------------------------ */
    onMenu: async (anchor) => {

      if (!manifestPath) {
        throw new Error("updateUtilitiesCaption: manifestPath missing");
      }
      if (!entryPath) {
        throw new Error("updateUtilitiesCaption: entryPath missing");
      }

      // Canonical identifier:
      // Utilities use entry.path as the true manifest key
      const info = {
        // Help / identification
        helpKey: `utilities/${subtab}/${category}/${entryPath}`,

        // Script viewing / execution
        isScript: true,
        scriptPath: scriptPath,

        // Manifest operations (Edit, future Archive)
        manifestPath: manifestPath,
        matchField: "path",
        matchValue: entryPath,

        // Canonical file identifier (DO NOT DERIVE)
        filename: entryPath,

        // Display metadata only
        title: title || "",
        status: status || ""
      };

      const items = await getUtilitiesCaptionMenuItems(info);
      menuManager.open(items, anchor);

    } // end onMenu
  });

} // end updateUtilitiesCaption




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
   setUtilitySubtabs()
   ------------------------------------------------------------
   FIXES
   1) Generate class name that matches tabs.css: "utilities-subtabs"
   2) Use data-tab-id consistently (dataset.tabId => attribute data-tab-id)
   3) Fail-fast if #subtabs missing
   4) Click handler correctly awaits async tab switch
============================================================ */
async function setUtilitySubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setUtilitySubtabs: #subtabs not found");

  el.innerHTML = "";

  const bar = document.createElement("ul");

  // IMPORTANT: match tabs.css selectors
  bar.className = "nav nav-tabs utilities-subtabs";

  el.appendChild(bar);

  function makeSubtab(name, id) {
    const li = document.createElement("li");
    li.className = "nav-item";

    const btn = document.createElement("button");
    btn.className = "nav-link";
    btn.dataset.tabId = id;            // becomes data-tab-id in DOM
    btn.textContent = name;

    btn.addEventListener("click", async () => {
      setCommandsButtonLabel("Utilities Commands");
      await switchUtilityTab(id);
    });

    li.appendChild(btn);
    bar.appendChild(li);
  } // end makeSubtab

  makeSubtab("Tools",  "tab-tools");
  makeSubtab("Lab",    "tab-lab");
  makeSubtab("Result", "tab-result");
} // end setUtilitySubtabs


/* ============================================================
   switchUtilityTab(tabId)
   ------------------------------------------------------------
   FIX:
   - Uses stored category when switching to Result
   - Calls runUtilityEntry(subtab, category, entry)
   - No pathname logic elsewhere is changed
============================================================ */
async function switchUtilityTab(tabId) {

  if (!tabId) throw new Error("switchUtilityTab: tabId missing");
  uiState.utilities.activeUtilityTabId = tabId;
  clearDivs();

  if (tabId === "tab-tools") {
    await setUtilityCategories("Tools");
  } else if (tabId === "tab-lab") {
    await setUtilityCategories("Lab");
  } else if (tabId === "tab-result") {
    const subtab   = uiState.utilities.lastUtilitySubtab;
    const entry    = uiState.utilities.activeUtilityItem;
    const category = uiState.utilities.activeUtilityCategory;

    if (!subtab || !entry || !category) {
      throw new Error(
        "switchUtilityTab(tab-result): missing subtab/category/entry"
      );
    }

    await runUtilityEntry(subtab, category, entry);
  }

  // Activate the clicked subtab (fail-fast)
  activateUtilitySubtab(tabId);

} // end switchUtilityTab



/* ============================================================
   activateUtilitySubtab()
   ------------------------------------------------------------
   Small helper: reliable activation (fail-fast, correct selector)
============================================================ */
function activateUtilitySubtab(tabId) {
  const bar = document.querySelector("#subtabs ul.utilities-subtabs");
  if (!bar) throw new Error("activateUtilitySubtab: ul.utilities-subtabs not found");

  bar.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));

  // IMPORTANT: attribute is data-tab-id (kebab), not data-tabId
  const btn = bar.querySelector(`[data-tab-id="${tabId}"]`);
  if (!btn) throw new Error("activateUtilitySubtab: button not found for " + tabId);

  btn.classList.add("active");
} // end activateUtilitySubtab


/* ============================================================
   runUtilityEntry(subtab, category, entry)
   ------------------------------------------------------------
   FIX: entry.path no longer includes the category folder.
        So we MUST add category back into the import path:
          /utilities/<Tools|Lab>/<Category>/<file>.js
============================================================ */
async function runUtilityEntry(subtab, category, entry) {

  if (!subtab) throw new Error("runUtilityEntry: subtab missing");
  if (!category) throw new Error("runUtilityEntry: category missing");
  if (!entry) throw new Error("runUtilityEntry: entry missing");
  if (!entry.path) throw new Error("runUtilityEntry: entry.path missing");

  const scriptPath = `/utilities/${subtab}/${category}/${entry.path}`;

  try {
    const mod = await import(/* @vite-ignore */ scriptPath + `?t=${Date.now()}`);

    if (typeof mod.runPattern !== "function") {
      throw new Error("runUtilityEntry: runPattern() not found in " + scriptPath);
    }

    if (subtab === "Lab") {
      const sketchDiv = document.getElementById("sketchpad");
      if (!sketchDiv) throw new Error("runUtilityEntry: #sketchpad not found");

      sketchDiv.innerHTML = "";
      sketchDiv.appendChild(window.drawCanvas);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
    }

    const result = await mod.runPattern();

    updateUtilitiesCaption({
      title: entry.title || entry.filename || "(untitled)",
      path: category + "/" + entry.path,
      subtab,
      category,

      manifestPath: `/utilities/${subtab}/${category}/manifest.json`,
      entryPath: entry.path,
      status: entry.status || ""
    });

    // --------------------------------------------------------
    // CRITICAL BEHAVIOR:
    // If the tool returns a string (or any non-null value),
    // treat it as Result HTML and display it.
    //
    // If it returns null/undefined, assume the tool wrote directly
    // into #text (or managed its own UI) and DO NOT overwrite it.
    // --------------------------------------------------------
    if (subtab !== "Lab") {
      if (result !== null && result !== undefined) {
        displayUtilityResult(result);
        uiState.utilities.lastResult = result;
      }
    }

    return result;

  } catch (err) {
    console.error("Error executing " + scriptPath + ":", err);
    displayUtilityResult("Error executing " + scriptPath + ": " + err.message);
    throw err; // FAIL-FAST: bubble it up too
  }

} // end runUtilityEntry



/* ============================================================
   onUtilityItemClick(item)
   ------------------------------------------------------------
   FIX: runUtilityEntry now requires category so it can build:
        /utilities/<subtab>/<category>/<entry.path>
============================================================ */
async function onUtilityItemClick(item) {

  if (!item) throw new Error("onUtilityItemClick: item missing");
  if (!item.subtab) throw new Error("onUtilityItemClick: item.subtab missing");
  if (!item.entry) throw new Error("onUtilityItemClick: item.entry missing");
  if (!item.category) throw new Error("onUtilityItemClick: item.category missing");

  uiState.utilities.lastUtilitySubtab  = item.subtab;
  uiState.utilities.activeUtilityItem  = item.entry;
  uiState.utilities.activeUtilityCategory = item.category;
  uiState.utilities.activeUtilityTabId = "tab-result";

  activateUtilitySubtab("tab-result");

  clearDivs();
  await runUtilityEntry(item.subtab, item.category, item.entry);

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
   ------------------------------------------------------------
   FIX:
   - Persist category as well as subtab + entry
   - Keeps Result reload deterministic
============================================================ */
export function saveUtilityState() {

  const s = {
    activeUtilityTabId: uiState.utilities.activeUtilityTabId,
    lastUtilitySubtab:  uiState.utilities.lastUtilitySubtab || null,
    lastUtilityCategory: uiState.utilities.activeUtilityCategory || null,
    lastUtilityItem:    uiState.utilities.activeUtilityItem || null,
    lastResult:         uiState.utilities.lastResult || ""
  };

  uiState.utilities.saved = s;
  return s;

} // end saveUtilityState


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

function buildUtilitiesOffcanvasHtml() {

  return `
    <div class="cmdButtonRow">
      <button id="utilitiesRebuildValidateButton" class="cmdButton" type="button">
        Rebuild &amp; Validate
      </button>
    </div>

    <div class="buttonSeparator"></div>

    <div id="utilitiesRebuildReport" class="utilitiesRebuildReport"></div>
  `;

} // end buildUtilitiesOffcanvasHtml

function formatRebuildReport(report) {

  if (!report) throw new Error("formatRebuildReport: report missing");

  if (report.request !== "manifestMaintenance") {
    throw new Error("formatRebuildReport: unexpected request: " + String(report.request));
  }

  const lines = [];

  lines.push("Log: " + (report.logName || "(none)"));
  lines.push("");

  const addedMap  = report.added  || {};
  const brokenMap = report.broken || {};

  const addedKeys  = Object.keys(addedMap).sort((a, b) => a.localeCompare(b));
  const brokenKeys = Object.keys(brokenMap).sort((a, b) => a.localeCompare(b));

  if (addedKeys.length) {
    lines.push("ADDED (status=new):");
    for (const group of addedKeys) {
      lines.push("  " + group);
      for (const item of (addedMap[group] || [])) {
        lines.push("    • " + item);
      }
    }
    lines.push("");
  }

  if (brokenKeys.length) {
    lines.push("BROKEN (virtual home items):");
    for (const group of brokenKeys) {
      lines.push("  " + group);
      for (const item of (brokenMap[group] || [])) {
        lines.push("    • " + (item && item.path ? item.path : String(item)));
      }
    }
    lines.push("");
  }

  if (!addedKeys.length && !brokenKeys.length) {
    lines.push("No Added or Broken items.");
  }

  return lines.join("\n");

} // end formatRebuildReport

async function refreshUtilitiesAfterRebuild() {

  // Force cache drop
  if (manifest && typeof manifest.clearCache === "function") {
    manifest.clearCache();
  }
  if (manifest.cache) delete manifest.cache.utilities;

  // Reload local cache (same logic as initUtilityTab)
  const toolsRaw = await manifest.get("utilities/Tools");
  const labRaw   = await manifest.get("utilities/Lab");

  const toolsRegistry = manifest.getRegistry("utilities/Tools");
  const labRegistry   = manifest.getRegistry("utilities/Lab");

  utilitiesCache = { Tools: {}, Lab: {} };

  toolsRegistry.forEach((cat, i) => utilitiesCache.Tools[cat] = toolsRaw[i] || []);
  labRegistry.forEach((cat, i) => utilitiesCache.Lab[cat] = labRaw[i] || []);

  // Re-render current subtab/view deterministically
  const tabId = uiState.utilities.activeUtilityTabId || "tab-tools";
  await setUtilitySubtabs();
  await switchUtilityTab(tabId);

} // end refreshUtilitiesAfterRebuild

export function wireUtilitiesCommandsButton() {

  setCommandsButton("Commands", () => {

    showCommandsOffcanvas({
      title: "Utilities Maintenance",
      buildBody(offcanvasBodyEl) {

        if (!offcanvasBodyEl) {
          throw new Error("Utilities Commands: offcanvasBodyEl missing");
        }

        offcanvasBodyEl.innerHTML = buildUtilitiesOffcanvasHtml();

        const btn = document.getElementById("utilitiesRebuildValidateButton");
        if (!btn) throw new Error("wireUtilitiesCommandsButton: button missing");

        btn.addEventListener("click", async () => {

          const out = document.getElementById("utilitiesRebuildReport");
          if (!out) throw new Error("wireUtilitiesCommandsButton: report div missing");

          out.textContent = "Running...";

          const report = await nodeRebuildAndValidateManifests();

          await refreshUtilitiesAfterRebuild();

          out.textContent = formatRebuildReport(report);

        }); // end click

      } // end buildBody
    });

  });

} // end wireUtilitiesCommandsButton

/* ============================================================
   refreshUtilitiesFromManifestEdit()
   ------------------------------------------------------------
   FIX:
   Make Utilities follow the SAME refresh→restore pattern
   as Gallery. No ad-hoc rendering. No tab switching.
=========================================================== */
export async function refreshUtilitiesFromManifestEdit() {

  // Drop manifest cache
  if (manifest && typeof manifest.clearCache === "function") {
    manifest.clearCache();
  }
  if (manifest.cache) delete manifest.cache.utilities;

  // Reload cache (same as init path)
  const toolsRaw = await manifest.get("utilities/Tools");
  const labRaw   = await manifest.get("utilities/Lab");

  const toolsRegistry = manifest.getRegistry("utilities/Tools");
  const labRegistry   = manifest.getRegistry("utilities/Lab");

  utilitiesCache = { Tools: {}, Lab: {} };

  toolsRegistry.forEach((cat, i) => utilitiesCache.Tools[cat] = toolsRaw[i] || []);
  labRegistry.forEach((cat, i) => utilitiesCache.Lab[cat] = labRaw[i] || []);

  // 🔑 CRITICAL: restore Utilities deterministically (Gallery model)
  await restoreUtilityTab();

} // end refreshUtilitiesFromManifestEdit





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
