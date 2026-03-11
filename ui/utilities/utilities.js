/* utilities.js
   ============================================================
   Utilities Tab -- Public Entry Point and Lifecycle
   ============================================================
   Role:
     Public entry point for the Utilities tab. Owns exactly
     three things:

       1. UtilityTabSpec -- the object consumed by setUI.js to
          drive tab activation (init / restore / save).

       2. Lifecycle functions -- initUtilityTab(), restoreUtilityTab(),
          saveUtilityState(), refreshUtilitiesFromManifestEdit().

       3. Cache loading -- loads manifest data for Tools and Lab
          domains during init and restore.

   What does NOT live here:
     * Subtab construction and navigation     -> utilities/utilitiesNav.js
     * Category display and utility execution -> utilities/utilitiesDisplay.js
     * Caption bar and menu items             -> utilities/utilitiesMenuCmds.js
     * Shared module-level state variables    -> utilities/utilitiesState.js
   ============================================================ */

import { manifest }                          from "/ui/manifest.js";
import {
  setCommandsButtonLabel,
  setCommandsButtonHandler,
  showCommandsOffcanvas,
  clearDivs,
  formatRebuildReportShared
}                                            from "/ui/uiUtilities.js";
import { nodeRebuildAndValidateManifests }   from "/ui/nodeLayer.js";
import { openHelpHomeOverlay }               from "/ui/help.js";
import {
  resetUtilitiesState,
  setHasRunUtility,
  getHasRunUtility
}                                            from "/ui/utilities/utilitiesState.js";
import {
  setUtilitySubtabs,
  switchUtilityTab
}                                            from "/ui/utilities/utilitiesNav.js";
import { displayUtilityResult }              from "/ui/utilities/utilitiesDisplay.js";


/* ============================================================
   UtilityTabSpec
   ============================================================ */
export const UtilityTabSpec = {
  theme:   "theme-utilities",
  init:    initUtilityTab,
  save:    saveUtilityState,
  restore: restoreUtilityTab,

  action:    () => {},
  caption:   () => {},
  sketchpad: () => {},
  subtabs:   setUtilitySubtabs,
  text:      () => {}
};


/* ============================================================
   ensureUtilitiesCacheLoaded()
   ============================================================ */
async function ensureUtilitiesCacheLoaded() {
  await manifest.get("utilities/Tools");
  await manifest.get("utilities/Lab");
} // end ensureUtilitiesCacheLoaded


/* ============================================================
   getUtilitiesCache()
   ============================================================ */
export function getUtilitiesCache() {
  return {
    Tools: manifest.getCategoryMap("utilities/Tools"),
    Lab:   manifest.getCategoryMap("utilities/Lab")
  };
} // end getUtilitiesCache


/* ============================================================
   initUtilityTab(restored)
   ============================================================ */
export async function initUtilityTab(restored = false) {

  manifest.clearCache();

  clearDivs();
  setCommandsButtonLabel("Utilities Commands");
  wireUtilitiesCommandsButton();

  uiState.utilities = uiState.utilities || {
    activeUtilityTabId:    "tab-tools",
    activeUtilityItem:     null,
    lastResult:            "",
    lastUtilitySubtab:     null,
    saved:                 null
  };

  await ensureUtilitiesCacheLoaded();

  if (restored && uiState.utilities.saved) {
    setHasRunUtility(uiState.utilities.saved.hasRunUtility || false);
  } else {
    setHasRunUtility(false);
  }

  await setUtilitySubtabs();

  let tabId = uiState.utilities.activeUtilityTabId || "tab-tools";

  if (restored && uiState.utilities.saved) {
    const s = uiState.utilities.saved.activeUtilityTabId;
    if (s) tabId = s;

    if (tabId === "tab-result") {
      const subtab   = uiState.utilities.lastUtilitySubtab;
      const category = uiState.utilities.activeUtilityCategory;
      const entry    = uiState.utilities.activeUtilityItem;

      if (subtab && category && entry && entry.path) {
        const cache  = getUtilitiesCache();
        const domain = (subtab === "Tools") ? cache.Tools
                     : (subtab === "Lab")   ? cache.Lab
                     : null;

        let found = null;
        if (domain && domain[category]) {
          found = domain[category].find(e => e.path === entry.path);
        }

        if (found) {
          uiState.utilities.activeUtilityItem = found;
        } else {
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

  setHasRunUtility(saved.hasRunUtility || false);

  await setUtilitySubtabs();

  const tabId = saved.activeUtilityTabId || "tab-tools";
  uiState.utilities.activeUtilityTabId = tabId;

  await switchUtilityTab(tabId);

  if (tabId === "tab-result" && saved.lastResult) {
    displayUtilityResult(saved.lastResult);
  }

} // end restoreUtilityTab


/* ============================================================
   saveUtilityState()
   ============================================================ */
export function saveUtilityState() {

  const s = {
    activeUtilityTabId:   uiState.utilities.activeUtilityTabId,
    lastUtilitySubtab:    uiState.utilities.lastUtilitySubtab    || null,
    lastUtilityCategory:  uiState.utilities.activeUtilityCategory || null,
    lastUtilityItem:      uiState.utilities.activeUtilityItem     || null,
    lastResult:           uiState.utilities.lastResult            || "",
    hasRunUtility:        getHasRunUtility()
  };

  uiState.utilities.saved = s;
  return s;

} // end saveUtilityState


/* ============================================================
   refreshUtilitiesFromManifestEdit()
   ============================================================ */
export async function refreshUtilitiesFromManifestEdit() {

  manifest.clearCache();
  await ensureUtilitiesCacheLoaded();

  const subtab   = uiState.utilities.lastUtilitySubtab;
  const category = uiState.utilities.activeUtilityCategory;
  const entry    = uiState.utilities.activeUtilityItem;

  if (subtab && category && entry && entry.path) {
    const cache  = getUtilitiesCache();
    const domain = (subtab === "Tools") ? cache.Tools
                 : (subtab === "Lab")   ? cache.Lab
                 : null;

    if (!domain)
      throw new Error("refreshUtilitiesFromManifestEdit: invalid subtab '" + String(subtab) + "'");

    const list = domain[category];
    if (!Array.isArray(list))
      throw new Error("refreshUtilitiesFromManifestEdit: missing category '" + String(category) + "' in " + subtab);

    const found = list.find(e => e && e.path === entry.path);

    if (!found)
      throw new Error(
        "refreshUtilitiesFromManifestEdit: active entry not found after reload: " +
        subtab + "/" + category + "/" + entry.path
      );

    uiState.utilities.activeUtilityItem = found;
  }

  await restoreUtilityTab();

} // end refreshUtilitiesFromManifestEdit


/* ============================================================
   buildUtilitiesOffcanvasHtml()
   ============================================================ */
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


/* ============================================================
   wireUtilitiesCommandsButton()
   ============================================================ */
export function wireUtilitiesCommandsButton() {

  setCommandsButtonHandler(() => {
    showCommandsOffcanvas({
      title: "Utilities Maintenance",
      buildBody(offcanvasBodyEl) {

        if (!offcanvasBodyEl)
          throw new Error("Utilities Commands: offcanvasBodyEl missing");

        offcanvasBodyEl.innerHTML = buildUtilitiesOffcanvasHtml();

        const btn = document.getElementById("utilitiesRebuildValidateButton");
        if (!btn) throw new Error("wireUtilitiesCommandsButton: button missing");

        btn.addEventListener("click", async () => {
          const out = document.getElementById("utilitiesRebuildReport");
          if (!out) throw new Error("wireUtilitiesCommandsButton: report div missing");

          out.textContent = "Running Global Rebuild...";

          const report = await nodeRebuildAndValidateManifests();

          const { syncSystemStateAfterRebuild } = await import("/ui/uiUtilities.js");
          await syncSystemStateAfterRebuild();

          await initUtilityTab(false);

          out.textContent = formatRebuildReportShared(report);
        });

        const helpBtn = document.getElementById("utilitiesHelpButton");
        if (!helpBtn) throw new Error("wireUtilitiesCommandsButton: utilitiesHelpButton missing");

        helpBtn.addEventListener("click", () => {
          const panel = document.getElementById("offcanvasPanel");
          if (!panel) throw new Error("wireUtilitiesCommandsButton: #offcanvasPanel missing");
          const oc = bootstrap.Offcanvas.getOrCreateInstance(panel);
          oc.hide();
          openHelpHomeOverlay();
        });
      }
    });
  });

} // end wireUtilitiesCommandsButton


/* ============================================================
   Legacy Exports (Compatibility)
   ============================================================ */
export async function loadCategory(categoryName) {
  if (!categoryName) { await switchUtilityTab("tab-tools"); return; }
  const key = categoryName.toLowerCase();
  if (key === "tools")  return await switchUtilityTab("tab-tools");
  if (key === "lab")    return await switchUtilityTab("tab-lab");
  if (key === "result") return await switchUtilityTab("tab-result");
  await switchUtilityTab("tab-tools");
} // end loadCategory

export async function runUtilityItem(name) {
  throw new Error("runUtilityItem is not wired; items run via onUtilityItemClick.");
} // end runUtilityItem

export const utilityDivs = {
  activeDivs: ["subtabs"],
  theme:      "theme-utilities",
  action:     () => { const el = document.getElementById("action");    if (el) el.innerHTML = ""; },
  caption:    () => {},
  sketchpad:  () => { const el = document.getElementById("sketchpad"); if (el) el.innerHTML = ""; },
  subtabs:    setUtilitySubtabs,
  text:       () => { const el = document.getElementById("text");      if (el) el.innerHTML = ""; }
};
