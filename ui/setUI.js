/* ui/setUI.js
   ------------------------------------------------------------
   Sketchpad UI Controller
   - Clears all shared divs when a top-level tab is selected.
   - Assigns the active tab's div setter functions (from *Divs objects).
   - Establishes a predictable ownership model for interface actions.
   ------------------------------------------------------------ */

// activateTab(tabKey)          – switch to selected top-level tab
// clearDivs(args)              – clear core divs (optionally one more)
// handleTabChange(tabId)       – translate clicked tab id to internal key
// restoreTabState(tabName)     – rebuild previous state for tab if saved
// saveTabState(tabName)        – serialize current tab before leaving
// window.addEventListener()    – initialize UI on page load

/* ------------------------------------------------------------
   Registry of all tab div-controllers
   Each entry points to the *Divs object defined in that tab's file.
------------------------------------------------------------ */
const allDivSets = {
  draw: drawDivs,
  patterns: patternsDivs,
  figures: figuresDivs,
  gallery: galleryDivs,
  utilities: utilityDivs,
}; // end allDivSets

/* ===========================================================
   TAB STATE SAVE / RESTORE HANDLERS
   =========================================================== */

/* ------------------------------------------------------------
   saveTabState(tabName)
   Called before switching away from a tab.
   Captures any saveable state via that tab's save*State() function.

   Arguments:
     tabName – string key of the current top-level tab
------------------------------------------------------------ */
function saveTabState(tabName) {
  switch (tabName) {
    case "draw":
      if (typeof saveDrawState === "function")
        uiState.drawSavedState = saveDrawState();
      break;
    case "patterns":
      if (typeof savePatternsState === "function")
        uiState.patternsSavedState = savePatternsState();
      break;
    default:
      break;
  }
} // end saveTabState

/* ------------------------------------------------------------
   restoreTabState(tabName)
   Called when switching into a tab.
   If a saved state exists for that tab, it rehydrates the tab’s content.

   Arguments:
     tabName – string key of the tab being entered

   Returns:
     true  if a saved state was successfully restored
     false if no saved state existed
------------------------------------------------------------ */
function restoreTabState(tabName) {
  switch (tabName) {
    case "draw":
      if (uiState.drawSavedState && typeof restoreDrawState === "function") {
        restoreDrawState(uiState.drawSavedState);
        return true;
      }
      break;
    case "patterns":
      if (
        uiState.patternsSavedState &&
        typeof restorePatternsState === "function"
      ) {
        restorePatternsState(uiState.patternsSavedState);
        return true;
      }
      break;
    default:
      break;
  }
  return false; // no prior state
} // end restoreTabState

/* ------------------------------------------------------------
   activateTab(tabKey)
   Clears all divs and reassigns current setter functions
   based on the selected top-level tab.

   Arguments:
     tabKey – string key of the tab being activated
------------------------------------------------------------ */
function activateTab(tabKey) {
  clearDivs("subtabs");

  activeDivs = allDivSets[tabKey] || {};

  // apply theme
  const wrapper = document.getElementById("wrapper");
  wrapper.classList.remove(
    "theme-draw",
    "theme-patterns",
    "theme-figures",
    "theme-gallery",
    "theme-utilities"
  );
  if (activeDivs.theme) wrapper.classList.add(activeDivs.theme);

  // assign local references
  uiState.setAction = activeDivs.action || null;
  uiState.setButtons = activeDivs.buttons || null;
  uiState.setCaption = activeDivs.caption || null;
  uiState.setSketchpad = activeDivs.sketchpad || null;
  uiState.setSubtabs = activeDivs.subtabs || null;
  uiState.setText = activeDivs.text || null;

  // populate only the divs listed for this tab
  if (Array.isArray(activeDivs.activeDivs)) {
    if (activeDivs.activeDivs.includes("buttons") && uiState.setButtons)
      uiState.setButtons();
    if (activeDivs.activeDivs.includes("action") && uiState.setAction)
      uiState.setAction();
    if (activeDivs.activeDivs.includes("subtabs") && uiState.setSubtabs)
      uiState.setSubtabs();
    if (activeDivs.activeDivs.includes("caption") && uiState.setCaption)
      uiState.setCaption();
    if (activeDivs.activeDivs.includes("text") && uiState.setText)
      uiState.setText();
    if (activeDivs.activeDivs.includes("sketchpad") && uiState.setSketchpad)
      uiState.setSketchpad();
  }

  // --- Restore saved state if available ---
  const restored = restoreTabState(tabKey);

  // --- Call tab-specific initializer if needed ---
  if (!restored) {
    switch (tabKey) {
      case "draw":
        initDrawTab();
        break;
      case "patterns":
        initPatternsTab();
        break;
      case "figures":
        initFiguresTab();
        break;
      case "gallery":
        initGalleryTab();
        break;
      case "utilities":
        initUtilityTab();
        break;
    }
  }

  // update active tab
  uiState.activeTab = tabKey;
} // end activateTab

/* ------------------------------------------------------------
   handleTabChange(tabId)
   Called when a top-level tab button is clicked.
   Translates Bootstrap button IDs into internal tab keys.

   Arguments:
     tabId – DOM id of the clicked nav button
------------------------------------------------------------ */
function handleTabChange(event) {
  // handles both event object or id string
  const tabId = event?.target?.id || event;

  const map = {
    "draw-tab": "draw",
    "patterns-tab": "patterns",
    "figures-tab": "figures",
    "gallery-tab": "gallery",
    "utilities-tab": "utilities",
  };

  const tabKey = map[tabId];
  if (!tabKey) {
    console.warn("Unknown tab ID:", tabId);
    return;
  }

  // --- Save current tab state before switching ---
  if (uiState.activeTab) saveTabState(uiState.activeTab);

  // --- Switch to the requested tab ---
  activateTab(tabKey);
} // end handleTabChange

/* ------------------------------------------------------------
   setCaptionBar(targetDivId, entry, showScriptHandler)
   Shared caption builder for Utility and Gallery tabs.
   - targetDivId: "caption" or another container id
   - entry: manifest entry with title, filename, path, subtab, etc.
   - showScriptHandler: function(title, path) to handle "Show Script" click
------------------------------------------------------------ */
function setCaptionBar(targetDivId, entry, showScriptHandler) {
  const el = document.getElementById(targetDivId);
  if (!el) throw new Error(`setCaptionBar: #${targetDivId} not found`);

  el.style.display = "flex";
  el.style.justifyContent = "space-between";
  el.style.alignItems = "center";
  el.innerHTML = "";

  if (!entry) return;

  const title = document.createElement("span");
  title.className = "caption-title";
  title.textContent = entry.title || entry.filename || "(untitled)";
  el.appendChild(title);

  const buttonsDiv = document.createElement("div");
  buttonsDiv.className = "caption-buttons";

  const btnShow = document.createElement("button");
  btnShow.textContent = "Show Script";
  btnShow.addEventListener("click", () => {
    if (typeof showScriptHandler === "function") {
      showScriptHandler(
        entry.title || entry.filename,
        entry.path,
        entry.subtab
      );
    }
  });
  buttonsDiv.appendChild(btnShow);

  el.appendChild(buttonsDiv);
} // end setCaptionBar

/* ------------------------------------------------------------
   initOffcanvasHandler()
   Initializes the shared offcanvas panel used by Gallery
   and Utility tabs. Creates or reuses Bootstrap instance.
------------------------------------------------------------ */
function initOffcanvasHandler() {
  const panel = document.getElementById("offcanvasPanel");
  if (!panel) {
    console.warn("initOffcanvasHandler: #offcanvasPanel not found");
    return;
  }

  // initialize Bootstrap offcanvas once
  const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(panel);

  // close button already uses data-bs-dismiss="offcanvas"
  // this ensures Esc key and backdrop click also work
  panel.addEventListener("hidden.bs.offcanvas", () => {
    console.log("Offcanvas closed");
  });

  // optional: expose global reference
  window.sharedOffcanvas = offcanvas;
} // end initOffcanvasHandler

/* ------------------------------------------------------------
   showSharedOffcanvas(title, text)
   ------------------------------------------------------------
   Displays text (e.g., script source, manifest entry, or notes)
   inside the shared offcanvas panel. Used by multiple tabs.
------------------------------------------------------------ */
function showSharedOffcanvas(title, text) {
  const panel = document.getElementById("offcanvasPanel");
  if (!panel) throw new Error("showSharedOffcanvas: #offcanvasPanel not found");

  const titleEl = panel.querySelector(".offcanvas-title");
  const body = panel.querySelector(".offcanvas-body");
  if (!titleEl || !body) return;

  titleEl.textContent = title || "(untitled)";
  body.innerHTML = `<pre style="white-space:pre-wrap;">${
    text || "(empty)"
  }</pre>`;

  try {
    const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(panel);
    offcanvas.show();
  } catch (err) {
    panel.classList.add("show");
    panel.style.visibility = "visible";
    panel.style.opacity = "1";
  }
} // end showSharedOffcanvas

/* ------------------------------------------------------------
   Initialize UI on first load.
   Adds event listeners to main tab buttons and activates
   the Draw tab by default.

   Arguments:
     (none)
------------------------------------------------------------ */
window.addEventListener("DOMContentLoaded", () => {
  // attach tab listeners
  const tabButtons = document.querySelectorAll("#mainTabs .nav-link");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => handleTabChange(btn.id));
  });

  // initial state: Draw tab active
  activateTab("draw");
}); // end DOMContentLoaded
