/* utilities.js
   ------------------------------------------------------------
   Utilities Tab Controller â€” NEW ARCHITECTURE (Patterns/Gallery model)
   ------------------------------------------------------------
*/

// ADD to imports at top of utilities.js

import { nodeRebuildAndValidateManifests } from "./nodeLayer.js";
import { runScriptByPath } from "./scriptRunner.js";
import { formatRebuildReportShared } from "./uiUtilities.js";
import { getUtilitiesCaptionMenuItems } from "./utilitiesMenuCmds.js";
import { openHelpHomeOverlay } from "./help.js";
import { syncSystemStateAfterRebuild } from "./uiUtilities.js";
import { setCaptionBar }    from "./caption.js";
import { renderCategories } from "./categories.js";
import { manifest }         from "./manifest.js";
import {
  clearDivs,
  setCommandsButtonLabel,
  setCommandsButton,
  showCommandsOffcanvas
} from "./uiUtilities.js";

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
  // 1. Wipe local module cache immediately on Cold Start
  utilitiesCache = null;

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

  // 2. Fetch from central manifest manager
  // (These will hit the disk because syncSystemStateAfterRebuild cleared the bucket)
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

    // Refresh active item if we're in Result
    if (tabId === "tab-result") {
      const subtab   = uiState.utilities.lastUtilitySubtab;
      const category = uiState.utilities.activeUtilityCategory;
      const entry    = uiState.utilities.activeUtilityItem;

      if (subtab && category && entry && entry.path) {
        // Find updated entry in cache
        const domain = (subtab === "Tools") ? utilitiesCache.Tools
                     : (subtab === "Lab")   ? utilitiesCache.Lab
                     : null;

        let found = null;
        if (domain && domain[category]) {
            found = domain[category].find(e => e.path === entry.path);
        }

        if (found) {
            uiState.utilities.activeUtilityItem = found;
        } else {
            // Fallback: active item gone, switch to Tools
            console.warn("Utility item not found after restore/refresh:", entry.path);
            tabId = "tab-tools";
            uiState.utilities.activeUtilityTabId = tabId;
        }
      }
    }
  }

  uiState.utilities.activeUtilityTabId = tabId;

  await switchUtilityTab(tabId);
} // end initUtilityTab


/* ============================================================
   updateUtilitiesCaption()
   ------------------------------------------------------------
   ROLE (MULTI-RESPONSIBILITY â€” BY DESIGN)
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
        â€¢ one canonical identifier
        â€¢ no display-derived fallbacks
        â€¢ no filename/path guessing
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




/* ============================================================
   ensureResultTab()
   ------------------------------------------------------------
   Creates the Result tab if it doesn't exist yet.
============================================================ */
function ensureResultTab() {
  // Check if Result tab already exists
  const existingTab = document.querySelector('[data-tab-id="tab-result"]');
  if (existingTab) return;

  // Create the Result tab using the same structure as setUtilitySubtabs
  const bar = document.querySelector("#subtabs ul");
  if (!bar) throw new Error("ensureResultTab: #subtabs ul not found");

  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className = "nav-link";
  btn.textContent = "Result";
  btn.setAttribute("data-tab-id", "tab-result");
  btn.onclick = () => switchUtilityTab("tab-result");

  li.appendChild(btn);
  bar.appendChild(li);
} // end ensureResultTab


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
   UPDATED:
   - Uses scriptRunner (same pipeline as Gallery/Patterns)
   - No direct dynamic import here
   - No ctx plumbing here
============================================================ */
async function runUtilityEntry(subtab, category, entry) {

  if (!subtab) throw new Error("runUtilityEntry: subtab missing");
  if (!category) throw new Error("runUtilityEntry: category missing");
  if (!entry) throw new Error("runUtilityEntry: entry missing");
  if (!entry.path) throw new Error("runUtilityEntry: entry.path missing");

  const scriptPath = `/utilities/${subtab}/${category}/${entry.path}`;

  try {

    // Clear regions (Utilities convention)
    const textDiv = document.getElementById("text");
    const actionDiv = document.getElementById("action");
    const sketchDiv = document.getElementById("sketchpad");

    if (!textDiv) throw new Error("runUtilityEntry: #text not found");
    if (!actionDiv) throw new Error("runUtilityEntry: #action not found");
    if (!sketchDiv) throw new Error("runUtilityEntry: #sketchpad not found");

    textDiv.innerHTML = "";
    actionDiv.innerHTML = "";
    sketchDiv.innerHTML = "";

    let result = null;

    if (subtab === "Lab") {

      // Canvas execution (controls optional, built only if scriptInfo exists)
      result = await runScriptByPath(scriptPath, "canvas", {
        canvasRegionId: "sketchpad",
        controlsRegionId: "action",
        enableControls: true
      });

    } else if (subtab === "Tools") {

      // Text execution
      result = await runScriptByPath(scriptPath, "text", {
        textRegionId: "text"
      });

      if (typeof result === "string") {
        uiState.utilities.lastResult = result;
      }

    } else {
      throw new Error("runUtilityEntry: invalid subtab '" + String(subtab) + "'");
    }

    updateUtilitiesCaption({
      title: entry.title || entry.filename || "(untitled)",
      path: category + "/" + entry.path,
      subtab,
      category,
      manifestPath: `/utilities/${subtab}/${category}/manifest.json`,
      entryPath: entry.path,
      status: entry.status || ""
    });

    // Tools: keep Result box behavior consistent with existing Utilities UX
    if (subtab === "Tools") {
      if (result !== null && result !== undefined) {
        displayUtilityResult(result);
      }
    }

    return result;

  } catch (err) {
    console.error("Error executing " + scriptPath + ":", err);
    displayUtilityResult("Error executing " + scriptPath + ": " + err.message);
    throw err;
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

    <div class="cmdButtonRow">
      <button id="utilitiesHelpButton" class="cmdButton" type="button">
        Help
      </button>
    </div>

    <div class="buttonSeparator"></div>

    <div id="utilitiesRebuildReport" class="utilitiesRebuildReport"></div>
  `;

} // end buildUtilitiesOffcanvasHtml


export function formatRebuildReport(report) {
  return formatRebuildReportShared(report);
} // end formatRebuildReport

/* ============================================================
   refreshUtilitiesFromManifestEdit()
   ------------------------------------------------------------
   FIX:
   After reloading manifests, rehydrate uiState.utilities.activeUtilityItem
   from the newly loaded utilitiesCache. Otherwise uiState still holds
   the old entry object (with stale status/title), so Edit Manifest
   reopens showing the previous values even though disk is updated.
============================================================ */
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

  // ----------------------------------------------------------
  // CRITICAL: rehydrate activeUtilityItem from the refreshed cache
  // ----------------------------------------------------------
  const subtab   = uiState.utilities.lastUtilitySubtab;
  const category = uiState.utilities.activeUtilityCategory;
  const entry    = uiState.utilities.activeUtilityItem;

  if (subtab && category && entry && entry.path) {

    const domain = (subtab === "Tools") ? utilitiesCache.Tools
                 : (subtab === "Lab")   ? utilitiesCache.Lab
                 : null;

    if (!domain) {
      throw new Error("refreshUtilitiesFromManifestEdit: invalid subtab '" + String(subtab) + "'");
    }

    const list = domain[category];
    if (!Array.isArray(list)) {
      throw new Error("refreshUtilitiesFromManifestEdit: missing category '" + String(category) + "' in " + subtab);
    }

    let found = null;
    for (let i = 0; i < list.length; i++) {
      if (list[i] && list[i].path === entry.path) {
        found = list[i];
        break;
      }
    }

    if (!found) {
      throw new Error(
        "refreshUtilitiesFromManifestEdit: active entry not found after reload: " +
        subtab + "/" + category + "/" + entry.path
      );
    }

    uiState.utilities.activeUtilityItem = found;
  }

  // Restore Utilities deterministically (Gallery model)
  await restoreUtilityTab();

} // end refreshUtilitiesFromManifestEdit


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

          out.textContent = "Running Global Rebuild...";

          // 1. Tell Node to fix the files on disk
          const report = await nodeRebuildAndValidateManifests();

          // 2. Perform Global Sync (Wipe cache + Invalidate all tab 'saved' states)
          // We use the dynamic import pattern you established in home.js
          const { syncSystemStateAfterRebuild } = await import("./uiUtilities.js");
          await syncSystemStateAfterRebuild();

          // 3. Since we are IN the Utilities tab, re-init it now
          // This triggers step 1 of initUtilityTab above (clearing the cache)
          await initUtilityTab(false);

          out.textContent = formatRebuildReport(report);

        }); // end click handler

        const helpBtn = document.getElementById("utilitiesHelpButton");
        if (!helpBtn) throw new Error("wireUtilitiesCommandsButton: utilitiesHelpButton missing");

        helpBtn.addEventListener("click", () => {
          const panel = document.getElementById("offcanvasPanel");
          if (!panel) throw new Error("wireUtilitiesCommandsButton: #offcanvasPanel missing");
          const oc = bootstrap.Offcanvas.getOrCreateInstance(panel);
          oc.hide();
          openHelpHomeOverlay();
        }); // end click

      } // end buildBody
    });

  });

} // end wireUtilitiesCommandsButton







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
