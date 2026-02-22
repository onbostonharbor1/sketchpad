/* utilities.js
   ============================================================
   Utilities Tab Ã¢â‚¬â€ Public Entry Point and Lifecycle
   ============================================================
   Role:
     This is the public entry point for the Utilities tab.
     It owns exactly three things:

       1. UtilityTabSpec Ã¢â‚¬â€ the object consumed by setUI.js to
          drive tab activation (init / restore / save).

       2. Lifecycle functions Ã¢â‚¬â€ initUtilityTab(), restoreUtilityTab(),
          saveUtilityState(), refreshUtilitiesFromManifestEdit().

       3. Cache loading Ã¢â‚¬â€ loads manifest data for Tools and Lab
          domains during init and restore.

   What does NOT live here:
     Ã¢â‚¬Â¢ Subtab construction and navigation       Ã¢â€ â€™ utilities/utilitiesNav.js
     Ã¢â‚¬Â¢ Category display and utility execution   Ã¢â€ â€™ utilities/utilitiesDisplay.js
     Ã¢â‚¬Â¢ Caption bar and menu items               Ã¢â€ â€™ utilities/utilitiesMenuCmds.js
     Ã¢â‚¬Â¢ Shared module-level state variables      Ã¢â€ â€™ utilities/utilitiesState.js

   Import structure:
     utilities.js imports from the utilities/ sub-modules.
     Sub-modules import from utilities.js only via dynamic import()
     to avoid circular references.
   ============================================================ */

import { manifest } from "./manifest.js";
import {
  setCommandsButtonLabel,
  setCommandsButton,
  setCommandsButtonHandler,
  showCommandsOffcanvas,
  clearDivs
} from "/ui/uiUtilities.js";
import { formatRebuildReportShared } from "/ui/uiUtilities.js";
import { nodeRebuildAndValidateManifests } from "./nodeLayer.js";
import { openHelpHomeOverlay } from "./help.js";
import {
  resetUtilitiesState,
  setHasRunUtility,
  getHasRunUtility
} from "./utilities/utilitiesState.js";
import {
  setUtilitySubtabs,
  switchUtilityTab
} from "./utilities/utilitiesNav.js";
import {
  displayUtilityResult
} from "./utilities/utilitiesDisplay.js";


/* ============================================================
   UtilityTabSpec
   ============================================================
   Consumed by setUI.js to activate the Utilities tab.

   setUI.js calls:
     init(restored)  Ã¢â‚¬â€ on cold start or after needsUpdate
     restore()       Ã¢â‚¬â€ when uiState.utilities.saved exists
     save()          Ã¢â‚¬â€ before leaving the tab (optional)
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
   ensureUtilitiesCacheLoaded()
   ============================================================
   Loads the utilities manifest data for Tools and Lab domains.

   Returns immediately if the cache is already populated.
   Called by init, restore, and refreshUtilitiesFromManifestEdit().

   Cache invalidation:
     Call manifest.clearCache() before calling this function
     to force a reload from disk (e.g. after a rebuild).
   ============================================================ */
async function ensureUtilitiesCacheLoaded() {

  /* Load both domains. ManifestManager caches each basedir; if already
     warm these calls return immediately. getCategoryMap() then shapes
     the raw arrays into { categoryName: [entries] } — no tab-level copy. */
  await manifest.get("utilities/Tools");
  await manifest.get("utilities/Lab");

} // end ensureUtilitiesCacheLoaded


/* ============================================================
   getUtilitiesCache()
   ============================================================
   Returns the combined utilities cache shaped as:
     { Tools: { categoryName: [entries] }, Lab: { categoryName: [entries] } }

   Reads directly from ManifestManager's shapedCache — no local copy.
   Must be called after ensureUtilitiesCacheLoaded() has resolved.
   ============================================================ */
export function getUtilitiesCache() {
  return {
    Tools: manifest.getCategoryMap("utilities/Tools"),
    Lab:   manifest.getCategoryMap("utilities/Lab")
  };
} // end getUtilitiesCache


/* ============================================================
   initUtilityTab(restored)
   ============================================================
   Cold-start initializer for the Utilities tab.

   Called by setUI.js when:
     a) The tab has never been visited (no saved state).
     b) uiState.utilities.needsUpdate is true (post-rebuild).

   Sequence:
     1. Clear local cache (forces reload from manifest).
     2. Set up UI (clear divs, wire commands button).
     3. Ensure state container exists.
     4. Load manifest data.
     5. Restore hasRunUtility flag if applicable.
     6. Build subtabs.
     7. Switch to appropriate tab (restored or default).

   Arguments:
     restored Ã¢â‚¬â€ true when called with needsUpdate (Refresh & Restore).
                The saved state is preserved and the view is restored.
   ============================================================ */
export async function initUtilityTab(restored = false) {

  // 1. Wipe ManifestManager cache so next load hits disk
  manifest.clearCache();

  clearDivs();
  setCommandsButtonLabel("Utilities Commands");
  wireUtilitiesCommandsButton();

  // 2. Ensure state container exists
  uiState.utilities = uiState.utilities || {
    activeUtilityTabId: "tab-tools",
    activeUtilityItem: null,
    lastResult: "",
    lastUtilitySubtab: null,
    saved: null
  };

  // 3. Load manifest data
  await ensureUtilitiesCacheLoaded();

  // 4. Restore hasRunUtility flag if we have saved state
  if (restored && uiState.utilities.saved) {
    setHasRunUtility(uiState.utilities.saved.hasRunUtility || false);
  } else {
    setHasRunUtility(false);
  }

  // 5. Build subtabs
  await setUtilitySubtabs();

  // 6. Determine which tab to switch to
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
        const cache = getUtilitiesCache();
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
          // Fallback: active item gone, switch to Tools
          console.warn("Utility item not found after restore/refresh:", entry.path);
          tabId = "tab-tools";
          uiState.utilities.activeUtilityTabId = tabId;
        }
      }
    }
  }

  uiState.utilities.activeUtilityTabId = tabId;

  // 7. Switch to the determined tab
  await switchUtilityTab(tabId);

} // end initUtilityTab


/* ============================================================
   restoreUtilityTab()
   ============================================================
   Reconstructs the Utilities tab from uiState.utilities.saved.

   Called by:
     initUtilityTab(true)             Ã¢â‚¬â€ Refresh & Restore path
     setUI.js / activateTab()         Ã¢â‚¬â€ returning to the tab
     refreshUtilitiesFromManifestEdit() Ã¢â‚¬â€ after manifest mutation

   If saved state is missing entirely, falls back to a cold init.
   ============================================================ */
async function restoreUtilityTab() {
  setCommandsButtonLabel("Utilities Commands");
  wireUtilitiesCommandsButton();

  const saved = uiState.utilities.saved;

  if (!saved) {
    await initUtilityTab(false);
    return;
  }

  // Restore the hasRunUtility flag from saved state
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
   ============================================================
   Called by setUI.js before leaving the tab (optional hook).
   Returns the current save snapshot for persistence.

   Saves:
     Ã¢â‚¬Â¢ Active tab ID
     Ã¢â‚¬Â¢ Last utility subtab/category/item (for Result restoration)
     Ã¢â‚¬Â¢ Last result text
     Ã¢â‚¬Â¢ hasRunUtility flag (controls Result tab visibility)
   ============================================================ */
export function saveUtilityState() {

  const s = {
    activeUtilityTabId: uiState.utilities.activeUtilityTabId,
    lastUtilitySubtab:  uiState.utilities.lastUtilitySubtab || null,
    lastUtilityCategory: uiState.utilities.activeUtilityCategory || null,
    lastUtilityItem:    uiState.utilities.activeUtilityItem || null,
    lastResult:         uiState.utilities.lastResult || "",
    hasRunUtility:      getHasRunUtility()
  };

  uiState.utilities.saved = s;
  return s;

} // end saveUtilityState


/* ============================================================
   refreshUtilitiesFromManifestEdit()
   ============================================================
   Called after editing a manifest entry to reload data and
   restore the current view.

   Sequence:
     1. Clear manifest cache
     2. Reload cache (same as init path)
     3. Rehydrate activeUtilityItem from refreshed cache
     4. Restore Utilities tab deterministically
   ============================================================ */
export async function refreshUtilitiesFromManifestEdit() {

  // Drop manifest cache
  if (manifest && typeof manifest.clearCache === "function") {
    manifest.clearCache();
  }
  if (manifest.cache) delete manifest.cache.utilities;

  // Force reload
  await ensureUtilitiesCacheLoaded();

  // Rehydrate activeUtilityItem from the refreshed cache
  const subtab   = uiState.utilities.lastUtilitySubtab;
  const category = uiState.utilities.activeUtilityCategory;
  const entry    = uiState.utilities.activeUtilityItem;

  if (subtab && category && entry && entry.path) {

    const cache = getUtilitiesCache();
    const domain = (subtab === "Tools") ? cache.Tools
                 : (subtab === "Lab")   ? cache.Lab
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

  // Restore Utilities deterministically
  await restoreUtilityTab();

} // end refreshUtilitiesFromManifestEdit


/* ============================================================
   Maintenance / Commands
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


export function wireUtilitiesCommandsButton() {

  setCommandsButtonHandler(() => {

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

          // 2. Perform Global Sync
          const { syncSystemStateAfterRebuild } = await import("/ui/uiUtilities.js");
          await syncSystemStateAfterRebuild();

          // 3. Re-init the Utilities tab
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

export const utilityDivs = {
  activeDivs: ["subtabs"],
  theme: "theme-utilities",
  action: () => { const el = document.getElementById("action"); if (el) el.innerHTML = ""; },
  caption: () => {},
  sketchpad: () => { const el = document.getElementById("sketchpad"); if (el) el.innerHTML = ""; },
  subtabs: setUtilitySubtabs,
  text: () => { const el = document.getElementById("text"); if (el) el.innerHTML = ""; }
};
