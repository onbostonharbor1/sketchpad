/* patterns.js
   ------------------------------------------------------------
   Patterns Tab
   ------------------------------------------------------------
   New structure:
     • initPatternsTab(restoredFlag)  → cold-start only
     • restorePatternsTab()           → rebuild from uiState
     • PatternsController             → pure action functions
   ------------------------------------------------------------
*/
import { nodeRebuildAndValidateManifests } from "./nodeLayer.js";
import { getPatternsCaptionMenuItems } from "./patternsMenuCmds.js";
import { openHelpHomeOverlay } from "./help.js";
import { formatRebuildReportShared } from "./uiUtilities.js";
import { renderCategories }     from "./categories.js";
import { setCaptionBar }        from "./caption.js";
import { menuManager }          from "./menuManager.js";
import { runScriptByPath } from "./scriptRunner.js";
import {
  renderThumbnailGrid,
  buildCategoryDescriptor,
  markSelectedThumbnail,
  setCommandsButtonLabel,
  setCommandsButton,
  showCommandsOffcanvas
} from "./uiUtilities.js";
import { manifest }            from "./manifest.js";

/* ============================================================
   Constants — permanent subtab IDs
=========================================================== */
const CATEGORIES_ID = "patterns-categories";
const PATTERN_ID    = "patterns-pattern";

/* ============================================================
   PatternsTabSpec — used by setUI.js
   ------------------------------------------------------------
   Must implement:
     init(restoredFlag)
     restore()
     save()
=========================================================== */
export const PatternsTabSpec = {
  name: "patterns",
  theme: "theme-patterns",
  regions: ["caption", "text", "sketchpad", "action"],

  init: initPatternsTab,        // cold-start only
  restore: restorePatternsTab,  // rebuild from saved uiState
  save: savePatternsState,      // optional persistence hook

  buildCaption: () => {},
  buildText: () => {},
  buildSketchpad: () => {},
  buildAction: () => {}
}; // end PatternsTabSpec

/* ============================================================
   PatternsController — pure action functions
=========================================================== */
export const PatternsController = {
  initPatternsTab,
  showCategoryList,
  showSelectedPattern,
  onPrev,
  onNext
}; // end PatternsController


/* ============================================================
   ensurePatternsManifestLoaded()
   ------------------------------------------------------------
   Loads the patterns manifest once and caches it into
   manifest.cache.patterns as:
     {
       categoryName: [ entry, entry, ... ],
       ...
     }
=========================================================== */
async function ensurePatternsManifestLoaded() {
  if (manifest.cache && manifest.cache.patterns) {
    return;
  }

  const raw      = await manifest.get("patterns");
  const registry = manifest.getRegistry("patterns");

  if (!raw || !registry) {
    throw new Error("ensurePatternsManifestLoaded: patterns manifest data missing");
  }

  const map = {};
  for (let i = 0; i < registry.length; i++) {
    const categoryName = registry[i];
    map[categoryName] = raw[i] || [];
  }

  if (!manifest.cache) {
    manifest.cache = {};
  }

  manifest.cache.patterns = map;
} // end ensurePatternsManifestLoaded


/* ============================================================
   initPatternsTab(restored)
   ------------------------------------------------------------
   Cold-start initializer for the Patterns tab.

   NOTE:
     • setUI / setUI.initTab() has already cleared regions
       and applied the theme.
     • This function MUST NOT do any restore logic.
     • It sets up static UI (subtabs) and shows default
       category list.
=========================================================== */
export async function initPatternsTab(restored) {
  // 1. Ensure the state container exists
  if (!uiState.patterns) {
    uiState.patterns = {};
  }

  // 2. THE CLEANUP: Remove the "Pattern" subtab if it exists.
  // We do this here because 'init' always starts fresh at the Categories level.
  const patternBtn = document.querySelector(`[data-tab-id="patterns-pattern"]`);
  if (patternBtn) {
    // We remove the <li> (the parent) so the whole button disappears from the <ul>
    patternBtn.parentElement.remove();
  }

  // 3. Static setup
  setCommandsButtonLabel("Patterns Commands");
  wirePatternsCommandsButton();

  // 4. Re-load from manifest
  await ensurePatternsManifestLoaded();

  // 5. Build UI
  setPatternsSubtabs();

  // 6. Reset state to Categories
  uiState.patterns.activeCategory = null;
  uiState.patterns.activeItem     = null;
  uiState.patterns.saved = {
    view: "categories",
    activeCategory: null,
    activeItem: null
  };

  await showCategoryList();
}


/* ============================================================
   setPatternsSubtabs()
   ------------------------------------------------------------
   Builds the Patterns subtab bar inside #subtabs.

   • "Categories" tab is always present and active by default.
   • "Pattern" tab is added later by addPatternSubtab() when
     a specific pattern is selected.
=========================================================== */
function setPatternsSubtabs() {
  const container = document.getElementById("subtabs");
  if (!container) {
    throw new Error("setPatternsSubtabs: #subtabs not found");
  }

  container.innerHTML = "";

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs patterns-subtabs";
  container.appendChild(bar);

  // Categories tab ------------------------------------------------
  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className = "nav-link active";
  btn.dataset.tabId = CATEGORIES_ID;
  btn.textContent = "Categories";

  btn.addEventListener("click", async function () {
    if (!uiState.patterns) {
      uiState.patterns = {};
    }

    uiState.patterns.activeCategory = null;
    uiState.patterns.activeItem     = null;
    uiState.patterns.saved = {
      view: "categories",
      activeCategory: null,
      activeItem: null
    };

    const textDiv = document.getElementById("text");
    const actionDiv = document.getElementById("action");
    const padDiv = document.getElementById("sketchpad");

    if (!textDiv || !actionDiv || !padDiv) {
      throw new Error("setPatternsSubtabs: one or more regions missing");
    }

    textDiv.innerHTML   = "";
    actionDiv.innerHTML = "";
    padDiv.innerHTML    = "";

    await showCategoryList();
  });

  li.appendChild(btn);
  bar.appendChild(li);
} // end setPatternsSubtabs

/* ============================================================
   restorePatternsTab()
   ------------------------------------------------------------
   Called ONLY when uiState.patterns.saved exists.

   Rules:
     • NO clearing — setUI/initTab already handled that.
     • NO static UI building — subtabs already built during init.
     • JUST restore the exact previous view from uiState.
=========================================================== */
export async function restorePatternsTab() {
  const saved = uiState.patterns?.saved;
  if (!saved) return initPatternsTab(false);

  // 1. Rebuild the static parts (Command button, etc.)
  setCommandsButtonLabel("Patterns Commands");
  wirePatternsCommandsButton();
  await ensurePatternsManifestLoaded();

  // 2. Build the navigation subtabs
  setPatternsSubtabs(); // This creates the "Categories" button

  if (saved.view === "pattern") {
    // 3. THE KEY: Manually add the "Pattern" subtab back
    // This ensures the Patterns subtab exists and is highlighted
    addPatternSubtab(saved.activeCategory, saved.activeItem);

    // 4. Show the actual pattern content
    await showSelectedPattern(saved.activeCategory, saved.activeItem);
  } else {
    await showCategoryList();
  }
}


/* ============================================================
   updatePatternsCaption(category, item, filename, helpKey, scriptPath)
   ------------------------------------------------------------
   Title rule: "{category}: {title}"
=========================================================== */
function updatePatternsCaption(category, item, helpKey) {

  if (typeof category !== "string" || category.trim() === "") {
    throw new Error("updatePatternsCaption: category missing");
  }

  if (!item) {
    throw new Error("updatePatternsCaption: item missing");
  }

  if (typeof item.path !== "string" || item.path.trim() === "") {
    throw new Error("updatePatternsCaption: item.path missing");
  }

  // item.path is authoritative and INCLUDES extension
  const fullFilename = item.path.split("/").pop();

  const rawTitle = item.title || fullFilename || "(untitled)";
  const title = category + ": " + rawTitle;

  setCaptionBar({
    targetId: "caption",
    title,

    onPrev: () => onPrev(),
    onNext: () => onNext(),

    // Patterns renders into the sketchpad region (canvas).
    // So the Next/Prev click-zone overlay must be anchored there.
    overlayTargetId: "sketchpad-wrapper",

    onMenu: async (anchor) => {

      const info = {
        // REQUIRED
        manifestPath: `/patterns/${category}/manifest.json`,
        filename: fullFilename,
        category: category,

        // Manifest editing
        matchField: "path",
        matchValue: item.path,

        title: String(item.title || ""),
        status: String(item.status || ""),

        // Script-related (only used if applicable)
        isScript: fullFilename.toLowerCase().endsWith(".js"),
        scriptPath: `/patterns/${category}/${fullFilename}`,
        helpKey: helpKey
      };

      const menuItems = await getPatternsCaptionMenuItems(info);
      menuManager.open(menuItems, anchor);
    }
  });

} // end updatePatternsCaption


function clearPatternsCaption() {
  const captionDiv = document.getElementById("caption");
  if (captionDiv) captionDiv.innerHTML = "";
}



/* ============================================================
   showCategoryList()
   ------------------------------------------------------------
   Shows category frames inside #text.
   Uses manifest.cache.patterns exclusively.
=========================================================== */
async function showCategoryList() {
  const textDiv   = document.getElementById("text");
  const actionDiv = document.getElementById("action");
  const padDiv    = document.getElementById("sketchpad");

  if (!textDiv || !actionDiv || !padDiv) {
    throw new Error("showCategoryList: required region missing");
  }

  clearPatternsCaption();

  // Clear dynamic regions only (subtabs are already built)
  textDiv.innerHTML   = "Loading pattern categories...";
  actionDiv.innerHTML = "";
  padDiv.innerHTML    = "";

  await ensurePatternsManifestLoaded();
  const groups = manifest.cache.patterns;

  if (!groups) {
    throw new Error("showCategoryList: manifest.cache.patterns missing");
  }

  const descriptor = buildCategoryDescriptor(
    groups,
    function (entry) { return entry.title || entry.filename; }, // label
    function (categoryName, sortedList, entry, idx) {           // click handler
      uiState.patterns.activeCategory = categoryName;
      uiState.patterns.activeItem     = idx;
      uiState.patterns.saved = {
        view: "pattern",
        activeCategory: categoryName,
        activeItem: idx
      };

      addPatternSubtab(categoryName);
      showSelectedPattern(categoryName, idx);
    }
  );

  textDiv.innerHTML = "";
  renderCategories("text", descriptor);
} // end showCategoryList



/* ============================================================
   addPatternSubtab(category)
   ------------------------------------------------------------
   Ensures that the "Pattern" subtab exists and becomes active.
   Does NOT clear regions.
=========================================================== */
function addPatternSubtab(category) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) {
    throw new Error("addPatternSubtab: #subtabs ul not found");
  }

  // Look for existing Pattern tab
  let btn = bar.querySelector(`[data-tab-id="${PATTERN_ID}"]`);

  // If not present, create it
  if (!btn) {
    const li = document.createElement("li");
    li.className = "nav-item";

    btn = document.createElement("button");
    btn.className = "nav-link";
    btn.dataset.tabId = PATTERN_ID;
    btn.textContent = "Pattern";

    btn.addEventListener("click", () => {
      // On click, simply reselect the current pattern from uiState
      const cat = uiState.patterns.activeCategory;
      const idx = uiState.patterns.activeItem;

      if (cat != null && typeof idx === "number") {
        uiState.patterns.saved = {
          view: "pattern",
          activeCategory: cat,
          activeItem: idx
        };
        showSelectedPattern(cat, idx);
      }
    });

    li.appendChild(btn);
    bar.appendChild(li);
  }

  // Activate the Pattern tab and deactivate the Categories tab
  bar.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  // Update saved state
  uiState.patterns.saved = {
    view: "pattern",
    activeCategory: category,
    activeItem: uiState.patterns.activeItem
  };
} // end addPatternSubtab

/* ============================================================
   renderPatternThumbGrid(category)

   Rebuilds the thumbnail grid for the given category into #action.
   Click behavior remains "select pattern idx".
=========================================================== */
// renderPatternThumbGrid(category)
export function renderPatternThumbGrid(category) {

  if (!category) throw new Error("renderPatternThumbGrid: category missing");

  const list = manifest.cache.patterns[category];
  if (!Array.isArray(list)) {
    throw new Error("renderPatternThumbGrid: list missing for category: " + category);
  }

  renderThumbnailGrid(
    "action",
    list,
    (entry) => `./patterns/${category}/images/thumb_${entry.filename}.png`,
    (_, idx) => {
      uiState.patterns.activeCategory = category;
      uiState.patterns.activeItem     = idx;
      uiState.patterns.saved = {
        view: "pattern",
        activeCategory: category,
        activeItem: idx
      };

      // IMPORTANT: showSelectedPattern will rebuild the grid anyway.
      showSelectedPattern(category, idx);
    }
  );

  // AFTER the grid exists, mark the selected one.
  // This is the key: first arg is the panel id, second is the index.
  markSelectedThumbnail("action", uiState.patterns.activeItem);

} // end renderPatternThumbGrid


/* ============================================================
   showSelectedPattern(category, index)
   ------------------------------------------------------------
   Draws the pattern on the shared canvas.
   Populates captions and thumbnails.
=========================================================== */
async function showSelectedPattern(category, index) {
  uiState.patterns.activeCategory = category;
  uiState.patterns.activeItem     = index;

  const savedState = {
    view: "pattern",
    activeCategory: category,
    activeItem: index
  };
  uiState.patterns.saved = savedState;

  // --- ADD THIS LINE ---
  sessionStorage.setItem("sketchpad.patterns.saved", JSON.stringify(savedState));
  // ---------------------

  await ensurePatternsManifestLoaded();
  // ... rest of the function ...

  await ensurePatternsManifestLoaded();
  const list = manifest.cache.patterns[category] || [];
  const item = list[index];

  const textDiv   = document.getElementById("text");
  const padDiv    = document.getElementById("sketchpad");
  const actionDiv = document.getElementById("action");

  if (!textDiv || !padDiv || !actionDiv) {
    throw new Error("showSelectedPattern: missing required region");
  }

  // Clear dynamic regions
  textDiv.innerHTML   = "";
  actionDiv.innerHTML = "";
  padDiv.innerHTML    = "";

  if (!item) {
    padDiv.innerHTML =
      "<p style='color:red'>(Missing pattern entry)</p>";
    return;
  }

  const filename   = item.filename;
  const scriptPath = `/patterns/${category}/${filename}.js`;
  const helpKey    = `${category}/${filename}`;

  // REVISED (scriptRunner):
  // Single unified call:
  //   - loads module
  //   - attaches canvas
  //   - resets canvas
  //   - runs runPattern() (compat: may pass ctx)
  //   - builds parameterControls if scriptInfo exists
  try {
    await runScriptByPath(scriptPath, "canvas", {
      canvasRegionId: "sketchpad",
      enableControls: true
    });
  } catch (err) {
    padDiv.innerHTML =
      `<p style='color:red'>Pattern execute error: ${err.message}</p>`;
    return;
  }

  renderPatternThumbGrid(category);

  // Caption bar: "{category}: {title}"
  updatePatternsCaption(category, item, helpKey);

  // Ensure Pattern subtab active
  addPatternSubtab(category);
} // end showSelectedPattern




/* ============================================================
   onPrev() / onNext()
   ------------------------------------------------------------
   Simple index cycling — fail-fast if manifest missing.
=========================================================== */
function onPrev() {
  const category = uiState.patterns.activeCategory;
  const index    = uiState.patterns.activeItem;

  const list = manifest.cache.patterns?.[category] || [];
  if (!list.length) return;

  const newIndex = index > 0 ? index - 1 : list.length - 1;

  uiState.patterns.activeItem = newIndex;
  uiState.patterns.saved = {
    view: "pattern",
    activeCategory: category,
    activeItem: newIndex
  };

  showSelectedPattern(category, newIndex);
} // end onPrev


function onNext() {
  const category = uiState.patterns.activeCategory;
  const index    = uiState.patterns.activeItem;

  const list = manifest.cache.patterns?.[category] || [];
  if (!list.length) return;

  const newIndex = index < list.length - 1 ? index + 1 : 0;

  uiState.patterns.activeItem = newIndex;
  uiState.patterns.saved = {
    view: "pattern",
    activeCategory: category,
    activeItem: newIndex
  };

  showSelectedPattern(category, newIndex);
} // end onNext



/* ============================================================
   savePatternsState()
   ------------------------------------------------------------
   Called by setUI before a tab switch.
   Must return a plain object representing current state.
=========================================================== */
function savePatternsState() {
  // uiState.patterns.saved is always maintained by controller actions.
  if (!uiState.patterns || !uiState.patterns.saved) {
    return {
      view: "categories",
      activeCategory: null,
      activeItem: null
    };
  }

  return {
    view: uiState.patterns.saved.view,
    activeCategory: uiState.patterns.saved.activeCategory,
    activeItem: uiState.patterns.saved.activeItem
  };
} // end savePatternsState


function buildPatternsOffcanvasHtml() {

  return `
    <div class="cmdButtonRow">
      <button id="patternsRebuildValidateButton" class="cmdButton" type="button">
        Rebuild &amp; Validate
      </button>
    </div>

    <div class="cmdButtonRow">
      <button id="patternsHelpButton" class="cmdButton" type="button">
        Help
      </button>
    </div>

    <div class="buttonSeparator"></div>

    <div id="patternsRebuildReport" class="patternsRebuildReport"></div>
  `;

} // end buildPatternsOffcanvasHtml

export function formatRebuildReport(report) {
  return formatRebuildReportShared(report);
} // end formatRebuildReport


export function wirePatternsCommandsButton() {

  setCommandsButton("Commands", () => {

    showCommandsOffcanvas({
      title: "Patterns Maintenance",
      buildBody(offcanvasBodyEl) {

        if (!offcanvasBodyEl) {
          throw new Error("Patterns Commands: offcanvasBodyEl missing");
        }

        offcanvasBodyEl.innerHTML = buildPatternsOffcanvasHtml();

        const btn = document.getElementById("patternsRebuildValidateButton");
        if (!btn) throw new Error("wirePatternsCommandsButton: button missing");

        btn.addEventListener("click", async () => {

          const out = document.getElementById("patternsRebuildReport");
          if (!out) throw new Error("wirePatternsCommandsButton: report div missing");

          out.textContent = "Running Global Rebuild...";

          // 1. Maintain disk via Node service
          const report = await nodeRebuildAndValidateManifests();

          // 2. Perform the Global Sync (Wipes cache + Invalidates other tab saved-states)
          // Uses dynamic import to avoid circular dependency with uiUtilities.js
          const { syncSystemStateAfterRebuild } = await import("./uiUtilities.js");
          await syncSystemStateAfterRebuild();

          // 3. Immediately re-init this tab to show the results
          // Since the global cache is empty, this fetches fresh data from disk
          await initPatternsTab(false);

          out.textContent = formatRebuildReport(report);

        }); // end click handler

        const helpBtn = document.getElementById("patternsHelpButton");
        if (!helpBtn) throw new Error("wirePatternsCommandsButton: patternsHelpButton missing");

        btn.addEventListener("click", async () => {
          const out = document.getElementById("patternsRebuildReport");
          out.textContent = "Rebuilding...";

          // 1. Update the disk
          const report = await nodeRebuildAndValidateManifests();

          // 2. Clear the global cache
          const { syncSystemStateAfterRebuild } = await import("./uiUtilities.js");
          await syncSystemStateAfterRebuild();

          // 3. THE FIX: Re-load the local patterns cache BEFORE restoring
          // This ensures the "Pattern" view sees the new Title/Sort order
          await ensurePatternsManifestLoaded();

          // 4. RESTORE instead of INIT
          // If uiState.patterns.saved.view was "pattern", it stays "pattern"
          await restorePatternsTab();

          out.textContent = formatRebuildReport(report);
        }); // end click

      } // end buildBody
    });

  });

} // end wirePatternsCommandsButton

/* ============================================================
   rehydratePatternsState()
   ------------------------------------------------------------
   Restores state from sessionStorage so it survives page reloads.
============================================================ */
export function rehydratePatternsState() {
  const saved = sessionStorage.getItem("sketchpad.patterns.saved");
  if (!saved) return;

  if (!uiState.patterns) uiState.patterns = {};

  const parsed = JSON.parse(saved);
  uiState.patterns.saved = parsed;

  // Sync the active pointers for the current session
  uiState.patterns.activeCategory = parsed.activeCategory;
  uiState.patterns.activeItem     = parsed.activeItem;
}

// At the bottom of patterns.js
rehydratePatternsState();

// end patterns.js
