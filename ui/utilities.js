/* utilities.js
   ------------------------------------------------------------
   Displays executable scripts organized under Tools and Lab.
   Each subtab loads manifests from ./utilities/<subtab>,
   using the shared ManifestManager (manifests.js).
   ------------------------------------------------------------ */

import { uiState } from "./uiState.js";
import { setCaptionBar } from "./caption.js";
import { renderCategories } from "./categories.js";
import { manifest } from "./manifest.js";
import { showSharedOffcanvas, clearDivs } from "./ui_utilities.js";
import { menuManager } from "./menuManager.js";

// ============================================================
// Constants
// ============================================================
const TOOLS = "Tools";
const LAB = "Lab";
const RESULT = "Result";

/* ------------------------------------------------------------
   initUtilityTab()

   Purpose:
     Entry point for the Utilities tab. Clears shared UI regions,
     ensures the subtabs bar exists, loads manifest data for
     utilities, restores the previously active subtab, and
     switches to it.

   Arguments:
     (none)

   Notes:
     - Uses uiState.activeUtilityTab to restore the last
       active subtab, defaulting to "tab-tools".
     - Ensures ManifestManager has loaded "utilities" data
       before any categories are rendered.
------------------------------------------------------------ */
export async function initUtilityTab() {
  console.log("⚙️ initUtilityTab() called");

  // Clear any leftover content from other tabs
  clearDivs();

  // Ensure subtabs are present in the UI
  setUtilitySubtabs();

  // If uiState has no utilities tab info yet, initialize it
  const created = Object.keys(uiState.utilitiesTabs || {});
  if (created.length === 0) {
    uiState.utilitiesTabs = {};
  }

  // Load all utilities manifests (Tools, Lab, Result) into cache
  await manifest.load("utilities");

  // Decide which subtab should be active (default: Tools)
  const tabId = uiState.activeUtilityTab || "tab-tools";
  uiState.activeUtilityTab = tabId;

  // Switch to the chosen subtab (this will render categories)
  await switchUtilityTab(tabId);

  console.log(`✅ initUtilityTab restored ${tabId}`);
} // end initUtilityTab

/* ------------------------------------------------------------
   setUtilitySubtabs()

   Purpose:
     Build the Utilities subtab bar inside #subtabs with three
     buttons: Tools, Lab, Result. Wires each button to switch
     the active utility tab.

   Arguments:
     (none)

   Throws:
     Error if #subtabs is not found in the DOM.
------------------------------------------------------------ */
function setUtilitySubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setUtilitySubtabs: #subtabs not found");

  // Reset container before building the new tab bar
  el.innerHTML = "";

  // Create <ul> container for Bootstrap-like nav tabs
  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs utility-subtabs";
  el.appendChild(bar);

  // Helper to create each subtab button
  function makeSubtab(name, active = false) {
    const li = document.createElement("li");
    li.className = "nav-item";

    const btn = document.createElement("button");
    btn.className = "nav-link" + (active ? " active" : "");
    btn.dataset.tabId = "tab-" + name.toLowerCase();
    btn.textContent = name;

    // Clicking a subtab switches the active utilities subtab
    btn.addEventListener("click", () => switchUtilityTab(btn.dataset.tabId));

    li.appendChild(btn);
    bar.appendChild(li);
  } // end makeSubtab

  // Initial active tab is Tools; others are inactive
  makeSubtab(TOOLS, true);
  makeSubtab(LAB);
  makeSubtab(RESULT);
} // end setUtilitySubtabs

/* ===========================================================
   onUtilityItemClick(item)

   Purpose:
     Handle the user clicking on a rendered utility item
     (from renderCategories). Switches to the Result subtab,
     loads the selected script as an ES module, and either:
       - draws into the shared canvas (Lab); or
       - displays textual result (Tools).

   Arguments:
     item (object) – structure from renderCategories:
       {
         name:    string (display title),
         entry:   manifest entry object,
         subtab:  "Tools" | "Lab",
         category:string (folder name under that subtab)
       }

   Throws:
     Error if #sketchpad is missing when Lab drawing is used.
=========================================================== */
async function onUtilityItemClick(item) {
  console.log(
    "Clicked:",
    item.name,
    "from",
    item.subtab,
    "category:",
    item.category
  );

  // Remember which subtab and item were last used
  uiState.lastUtilitySubtab = item.subtab;
  uiState.activeUtilityItem = item.entry;

  // Always show results in the Result subtab
  await switchUtilityTab("tab-result");

  // Build the module path directly from manifest entry
  const scriptPath = `/utilities/${item.subtab}/${item.entry.path}`;
  console.log("Loading utility script:", scriptPath);

  try {
    // Load as ES module (consistent with Gallery scripts)
    const mod = await import(scriptPath + `?t=${Date.now()}`);

    if (typeof mod.runPattern !== "function") {
      displayUtilityResult(`runPattern() not found in ${item.entry.filename}`);
      return;
    }

    // If this is a Lab script, attach the shared canvas
    if (item.subtab === LAB) {
      const sketchDiv = document.getElementById("sketchpad");
      if (!sketchDiv)
        throw new Error("onUtilityItemClick: #sketchpad not found");

      // Clear any previous Lab content and insert the shared canvas
      sketchDiv.innerHTML = "";
      sketchDiv.appendChild(window.drawCanvas);

      // Clear the canvas to white before drawing
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
    }

    // Execute the script's entry point
    const result = await mod.runPattern();

    // Update caption to reflect the selected script
    setUtilityCaption({
      title: item.entry.title || item.entry.filename || "(untitled)",
      path: item.entry.path,
      subtab: item.subtab,
    });

    // Lab scripts draw visually; Tools scripts display textual result
    if (item.subtab === LAB) {
      console.log("🎨 Lab drawing complete");
    } else {
      displayUtilityResult(result);
    }
  } catch (err) {
    console.error(`Error executing ${scriptPath}:`, err);
    displayUtilityResult(`Error executing ${scriptPath}: ${err.message}`);
  }
} // end onUtilityItemClick

/* ------------------------------------------------------------
   setUtilityCategories(which)

   Purpose:
     Populate the #text area with category cards for the given
     utility subtab ("Tools" or "Lab"). Uses ManifestManager's
     cached data for ./utilities/<subtab>.

   Arguments:
     which (string) – one of:
       "Tools" – use manifest.cache.utilities.tools
       "Lab"   – use manifest.cache.utilities.lab

   Throws:
     Error if #text is not found or manifest data is missing.
------------------------------------------------------------ */
async function setUtilityCategories(which) {
  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("setUtilityCategories: #text not found");

  // Show a simple loading message while we build categories
  textDiv.innerHTML = `<p>Loading ${which} categories...</p>`;

  try {
    // Pick the correct sub-cache based on the subtab
    let sections = null;
    if (which === TOOLS) {
      sections = manifest.cache.utilities.tools;
    } else if (which === LAB) {
      sections = manifest.cache.utilities.lab;
    }

    if (!sections || typeof sections !== "object") {
      throw new Error(`setUtilityCategories: no manifest data for ${which}`);
    }

    // Convert manifest cache into the format expected by renderCategories
    const categoriesData = Object.keys(sections).map((subdir) => {
      const entries = sections[subdir] || [];

      const items = entries.map((entry) => ({
        name: entry.title || entry.filename || "(untitled)",
        entry,
        subtab: which, // "Tools" or "Lab"
        category: subdir, // actual folder under the subtab
      }));

      return {
        title: subdir,
        items,
      };
    });

    // Optional expand handler (placeholder for future behavior)
    function onExpandClick(item) {
      console.log("Expand clicked:", item.name);
    } // end onExpandClick

    // Hand off to shared category renderer
    renderCategories("text", categoriesData, onUtilityItemClick, onExpandClick);
    console.log(`✅ ${which} categories displayed`);
  } catch (err) {
    console.error(`Failed to load ${which} categories:`, err);
    textDiv.innerHTML = `<p style="color:red;">Error loading ${which} categories</p>`;
  }
} // end setUtilityCategories

/* ------------------------------------------------------------
   switchUtilityTab(tabId)

   Purpose:
     Central subtab switcher for the Utilities tab. Updates
     uiState, clears shared content regions, calls appropriate
     loaders (setUtilityCategories), and updates the active
     tab button's CSS class.

   Arguments:
     tabId (string) – one of:
       "tab-tools", "tab-lab", "tab-result"

   Notes:
     - "tab-result" currently only restores the tab appearance;
       any result content is whatever was last written to #text.
------------------------------------------------------------ */
async function switchUtilityTab(tabId) {
  // Track the active utilities subtab in uiState
  uiState.activeUtilityTab = tabId;

  // Clear any shared content areas before drawing new content
  clearDivs();

  // Convert "tab-tools" → "tools"
  const key = tabId.replace("tab-", "");

  // Load content appropriate for the selected subtab
  if (key === "tools") {
    await setUtilityCategories(TOOLS);
  } else if (key === "lab") {
    await setUtilityCategories(LAB);
  } else if (key === "result") {
    // Result tab: currently no automatic restore behavior.
    // Existing #text contents are preserved after clearDivs()
    // via later calls to displayUtilityResult().
  }

  // Update the subtab button visual state
  const bar = document.querySelector("#subtabs ul");
  if (bar) {
    // Remove "active" from all nav-link buttons
    bar
      .querySelectorAll(".nav-link")
      .forEach((b) => b.classList.remove("active"));

    // Try to locate the button by any of the supported data attributes
    const activeBtn = bar.querySelector(
      `[data-tabId="${tabId}"], [data-tabid="${tabId}"], [data-tab-id="${tabId}"]`
    );
    const fallbackBtn = bar.querySelector(`[data-tab-id="${tabId}"]`);
    const btn = activeBtn || fallbackBtn;

    if (btn) btn.classList.add("active");
  }
} // end switchUtilityTab

/* ------------------------------------------------------------
   executeUtilityScript(entry, subtab)

   Purpose:
     Legacy helper to fetch and eval a script under utilities,
     using plain JavaScript instead of ES modules.

   Arguments:
     entry  (object) – manifest entry object with:
       entry.path     – relative path under /utilities/<subtab>
       entry.filename – display name for logging/errors
     subtab (string) – "Tools" | "Lab" | "Result"

   Notes:
     - Currently not used by the main path; onUtilityItemClick
       prefers ES module loading with runPattern().
------------------------------------------------------------ */
async function executeUtilityScript(entry, subtab) {
  const scriptPath = `/utilities/${subtab}/${entry.path}`;
  console.log(`Loading utility script: ${scriptPath}`);

  try {
    // Fetch the script source as text
    const resp = await fetch(`${scriptPath}?t=${Date.now()}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${scriptPath}`);

    const code = await resp.text();

    // Execute script in global scope (legacy behavior)
    // NOTE: This is intentionally fail-fast if 'code' is invalid.
    eval(code);

    console.log(`✅ Executed ${entry.filename}`);
  } catch (err) {
    console.error(`❌ Failed to execute ${entry.filename}:`, err);
    const textDiv = document.getElementById("text");
    if (textDiv) {
      textDiv.innerHTML = `<p style="color:red;">Error executing ${entry.filename}</p>`;
    }
  }
} // end executeUtilityScript

/* ------------------------------------------------------------
   displayUtilityResult(textOrArray)

   Purpose:
     Render textual (or array-of-lines) result into #text using
     a <pre> block with monospace wrapping.

   Arguments:
     textOrArray (string | array | null | undefined) –
       - string  → displayed as-is
       - array   → each element converted to string and placed
                   on its own line
       - null/undefined → "(no output)"
------------------------------------------------------------ */
function displayUtilityResult(textOrArray) {
  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("displayUtilityResult: #text not found");

  // Clear any previous content
  textDiv.innerHTML = "";

  // Build <pre> with simple formatting suited for code/text
  const pre = document.createElement("pre");
  pre.style.whiteSpace = "pre-wrap";
  pre.style.fontFamily = "monospace";

  if (Array.isArray(textOrArray)) {
    // Join array elements into separate lines
    pre.textContent = textOrArray.map((line) => String(line)).join("\n");
  } else {
    pre.textContent = textOrArray ?? "(no output)";
  }

  textDiv.appendChild(pre);
} // end displayUtilityResult

/* ------------------------------------------------------------
   setUtilityCaption(entry)

   Purpose:
     Update the shared caption bar for Utilities using
     the unified caption-bar system (setCaptionBar).
------------------------------------------------------------ */
function setUtilityCaption(entry) {
  const title  = entry.title    || entry.filename || "(untitled)";
  const path   = entry.path;
  const subtab = entry.subtab || TOOLS;

  // No Prev/Next arrows for Utilities (leave null)
  const onPrev = null;
  const onNext = null;

  // Dropdown menu: show script source in the shared offcanvas
  const onMenu = () => {
    console.log("Utilities menu clicked — menu not yet implemented.");
  };


  setCaptionBar({
    targetId: "caption",   // same as Gallery
    title: title,
    onPrev: onPrev,
    onNext: onNext,
    onMenu: onMenu
  });
} // end setUtilityCaption


/* ------------------------------------------------------------
   PUBLIC API for ui_callbacks.js

   - saveUtilityState()
   - loadCategory(categoryName)
   - runUtilityItem(itemName)
------------------------------------------------------------ */

/* ------------------------------------------------------------
   saveUtilityState()

   Purpose:
     Serialize the current Utilities tab state into a plain
     object suitable for persistence (e.g., uiState snapshots).

   Arguments:
     (none)

   Returns:
     state (object) – serializable snapshot:
       {
         activeUtilityTab: string | null,
         utilitiesTabs:    object,
         lastUtilitySubtab:string | null,
         activeUtilityItem:object | null
       }
------------------------------------------------------------ */
export function saveUtilityState() {
  const state = {
    activeUtilityTab: uiState.activeUtilityTab || null,
    utilitiesTabs: uiState.utilitiesTabs || {},
    lastUtilitySubtab: uiState.lastUtilitySubtab || null,
    activeUtilityItem: uiState.activeUtilityItem || null,
  };

  console.log("💾 Saved Utility state (serializable):", state);
  return state;
} // end saveUtilityState

/* ------------------------------------------------------------
   loadCategory(categoryName)

   Purpose:
     External entry point to switch the Utilities subtab by
     name. Used by higher-level navigation that works in terms
     of "Tools", "Lab", "Result" instead of tab ids.

   Arguments:
     categoryName (string | null | undefined) –
       null/empty → "Tools"
       "tools"    → "tab-tools"
       "lab"      → "tab-lab"
       "result"   → "tab-result"

   Notes:
     - Falls back to Tools for any unrecognized input.
------------------------------------------------------------ */
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

  // Fallback — return to Tools if category is unknown
  await switchUtilityTab("tab-tools");
} // end loadCategory

/* ------------------------------------------------------------
   runUtilityItem(itemName)

   Purpose:
     Reserved future entry point for running a utility by name.
     Currently not wired: all utilities are started via
     onUtilityItemClick with full metadata from renderCategories.

   Arguments:
     itemName (string) – name of the item to run (unused for now)

   Throws:
     Error unconditionally to make missing wiring obvious.
------------------------------------------------------------ */
export async function runUtilityItem(itemName) {
  // NOTE:
  // Utilities currently wires item clicks directly via
  // onUtilityItemClick with full item/entry metadata from
  // renderCategories.
  // This generic entry point is provided for future use; for now,
  // it fails fast to make missing wiring obvious if invoked.
  void itemName; // suppress unused variable warning in some linters

  throw new Error(
    "runUtilityItem is not yet wired to a manifest lookup; utilities items are launched via onUtilityItemClick."
  );
} // end runUtilityItem

/* ------------------------------------------------------------
   utilityDivs

   Purpose:
     Div-controller registration for the Utilities tab. Tells
     the shared UI controller which functions own which regions
     when the Utilities tab is active.

   Properties:
     activeDivs – array of div ids initially considered active
     theme      – CSS theme class name for the tab
     action     – function to clear/build #action
     buttons    – function to clear/build #buttons
     caption    – function to update the caption bar
     sketchpad  – function to clear/build #sketchpad
     subtabs    – function to build the subtab bar
     text       – function to clear/build #text
------------------------------------------------------------ */
export const utilityDivs = {
  activeDivs: ["subtabs"],
  theme: "theme-utilities",
  action: setUtilityAction,
  buttons: setUtilityButtons,
  caption: setUtilityCaption,
  sketchpad: setUtilitySketchpad,
  subtabs: setUtilitySubtabs,
  text: setUtilityText,
}; // end utilityDivs

// ------------------------------------------------------------
// Minimal stubs (currently simple placeholders)
// ------------------------------------------------------------

/* ------------------------------------------------------------
   setActiveUtilityItem(category, entry)

   Purpose:
     Placeholder hook for future per-item state tracking.
     Currently unused.

   Arguments:
     category (string) – category name (folder under Tools/Lab)
     entry    (object) – manifest entry for the item
------------------------------------------------------------ */
function setActiveUtilityItem(category, entry) {
  void category;
  void entry;
} // end setActiveUtilityItem


/* ------------------------------------------------------------
   setUtilityAction()

   Purpose:
     Clear the #action region. Utilities currently has no
     specialized actions; this is a clean slate.

   Arguments:
     (none)
------------------------------------------------------------ */
function setUtilityAction() {
  const el = document.getElementById("action");
  if (el) el.innerHTML = "";
} // end setUtilityAction

/* ------------------------------------------------------------
   setUtilityButtons()

   Purpose:
     Clear the #buttons region. Utilities currently does not
     use a dedicated buttons strip.

   Arguments:
     (none)
------------------------------------------------------------ */
function setUtilityButtons() {
  const el = document.getElementById("buttons");
  if (el) el.innerHTML = "";
} // end setUtilityButtons

/* ------------------------------------------------------------
   setUtilitySketchpad()

   Purpose:
     Clear the #sketchpad region. Lab scripts can later attach
     the shared canvas here when needed.

   Arguments:
     (none)
------------------------------------------------------------ */
function setUtilitySketchpad() {
  const el = document.getElementById("sketchpad");
  if (el) el.innerHTML = "";
} // end setUtilitySketchpad

/* ------------------------------------------------------------
   setUtilityText()

   Purpose:
     Clear the #text region. Category lists and script output
     are displayed here.

   Arguments:
     (none)
------------------------------------------------------------ */
function setUtilityText() {
  const el = document.getElementById("text");
  if (el) el.innerHTML = "";
} // end setUtilityText
