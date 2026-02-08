/* ui/home.js
   ------------------------------------------------------------
   Home Tab Spec + Controller  (SKELETON)
   ------------------------------------------------------------
   Purpose (Item 5):
     - Prove the TabSpec contract: init / restore / save
     - Render a visible placeholder so we can confirm which
       lifecycle path ran (init vs restore)
     - Use the same shared regions as other tabs
     - Do not introduce Home manifest logic yet
   ------------------------------------------------------------ */

/* ============================================================
   IMPORTS
   ------------------------------------------------------------
   Role:
     - External UI services (caption/menu/offcanvas)
     - Shared utilities (clearDivs, commands button plumbing)
     - Manifest and file loading
     - Script execution to canvas
============================================================ */

import { menuManager } from "./menuManager.js";
import { getHomeCaptionMenuItems } from "./homeMenuCmds.js";
import { openHelpHomeOverlay } from "./help.js";
import { formatRebuildReportShared } from "./uiUtilities.js";
import { uiState } from "./uiState.js";
import { clearDivs, setCommandsButtonLabel } from "./uiUtilities.js";
import { setCommandsButtonHandler, showCommandsOffcanvas } from "./uiUtilities.js";
import { syncSystemStateAfterRebuild } from "./uiUtilities.js";
import { setCaptionBar } from "./caption.js";
import { manifest } from "./manifest.js";
import { fileLayer } from "./fileLayer.js";
import { renderCategories } from "./categories.js";
import { loadScriptModule, runScriptByPath } from "./scriptRunner.js";

import { setCommandsButton, showOffcanvasPanel, escapeHtml } from "./uiUtilities.js";
import { nodeRebuildAndValidateManifests } from "./nodeLayer.js";

/* ============================================================
   CONSTANTS / MODULE STATE
   ------------------------------------------------------------
   Role:
     - Tab key constants
     - Home view constants
     - Home manifest in-memory cache (Home-only)
     - Render token to prevent stale async draws
============================================================ */

const TAB_NAME = "home";
let homeManifestLogged = false;

const HOME_VIEW_CATEGORIES = "categories";
const HOME_VIEW_RESULTS    = "results";

let homeManifestData    = null;
let homeManifestGrouped = null;

// Render sequencing token for Home Results (prevents stale async draws)
let homeResultsRenderToken = 0;

/* ============================================================
   TAB SPEC (Consumed by setUI.js)
   ------------------------------------------------------------
   Role:
     - Declarative description consumed by setUI.js
     - Defines regions and lifecycle hooks
============================================================ */

/* ------------------------------------------------------------
   HomeTabSpec
   Arguments:
     - None (object literal consumed by setUI.js)
   ------------------------------------------------------------
   Role:
     - Describes tab name/theme/regions and lifecycle hooks
     - Supplies region builder functions
------------------------------------------------------------ */
export const HomeTabSpec = {
  name: TAB_NAME,
  theme: "theme-home",

  // Must match your shared region model (same as DrawTabSpec)
  regions: ["subtabs", "sketchpad", "caption", "text", "action"],

  // lifecycle hooks
  init: initHomeTab,
  restore() {
    restoreHomeTab();
  }, // end restore
  save: saveHomeState,

  // region builders (skeletal)
  buildSubtabs: setHomeSubtabs,
  clearCaption: clearHomeCaption,
  buildCaption: setHomeCaption,
  buildText: setHomeText,
  buildAction: setHomeAction,
  buildSketchpad: setHomeSketchpad
}; // end HomeTabSpec


/* ============================================================
   GENERAL FUNCTIONS
   ------------------------------------------------------------
   Role:
     - Pure state guarantees / invariants
     - Simple utilities that do not â€œbelongâ€ to a single div
============================================================ */

/* ------------------------------------------------------------
   ensureHomeSavedState()
   Arguments:
     - None
   ------------------------------------------------------------
   Role:
     - Guarantees uiState.home.saved exists with the expected shape.
     - Fail-fast if uiState.home is missing.
------------------------------------------------------------ */
function ensureHomeSavedState() {
  if (!uiState.home) {
    throw new Error("ensureHomeSavedState: uiState.home missing");
  }

  // If you later decide saved=null means cold-start, setUI.js will
  // use init(). For now, we ensure a stable object exists.
  if (!uiState.home.saved) {
    uiState.home.saved = {
      view: "categories",     // "categories" | "results"
      activeStatus: null,     // status string | null
      activeIndex: null,      // number | null
      activeEntry: null       // object | null
    };
  }
} // end ensureHomeSavedState


/* ------------------------------------------------------------
   isJsPath(p)
   Arguments:
     - p (string): path to test
   ------------------------------------------------------------
   Role:
     - Returns true if the path ends in ".js" (case-insensitive).
     - Fail-fast if p is not a string.
------------------------------------------------------------ */
function isJsPath(p) {
  if (typeof p !== "string") throw new Error("isJsPath: path must be a string");
  return p.toLowerCase().endsWith(".js");
} // end isJsPath


/* ------------------------------------------------------------
   isImagePath(path)
   Arguments:
     - path (string): path to test
   ------------------------------------------------------------
   Role:
     - Returns true for common image extensions: png/jpg/jpeg.
------------------------------------------------------------ */
function isImagePath(path) {
  const dot = path.lastIndexOf(".");
  if (dot < 0) return false;

  const ext = path.slice(dot + 1).toLowerCase();

  if (ext === "png") return true;
  if (ext === "jpg") return true;
  if (ext === "jpeg") return true;

  return false;
} // end isImagePath


/* ------------------------------------------------------------
   deriveHomeOriginFromPath(path)
   Arguments:
     - path (string): rooted content path (e.g., "/patterns/...")
   ------------------------------------------------------------
   Role:
     - Derives a human-readable origin label based on rooted prefix.
------------------------------------------------------------ */
function deriveHomeOriginFromPath(path) {
  if (typeof path !== "string" || !path.length) {
    return "Unknown";
  }

  const p = path.toLowerCase();

  if (p.startsWith("/patterns/"))   return "Patterns";
  if (p.startsWith("/gallery/"))    return "Gallery";
  if (p.startsWith("/utilities/"))  return "Utilities";
  if (p.startsWith("/drawregistry/")) return "Draw";
  if (p.startsWith("/home/"))       return "Home";

  return "Unknown";
} // end deriveHomeOriginFromPath


/* ============================================================
   TAB LIFECYCLE FUNCTIONS (init / restore / save)
   ------------------------------------------------------------
   Role:
     - Called by setUI.js via HomeTabSpec
     - Establishes deterministic cold start and restore behavior
============================================================ */

/* ------------------------------------------------------------
   initHomeTab(restored = false)
   Arguments:
     - restored (boolean): present for contract parity; ignored here
   ------------------------------------------------------------
   Role:
     - Cold start path (called via setUI START logic or when
       uiState.home.saved is null).
     - Clears regions, wires commands, builds minimal UI, then
       enters the saved view and kicks manifest load.
------------------------------------------------------------ */

export function initHomeTab(restored = false) {
  // 1. Wipe local module variables immediately on Cold Start
  homeManifestLogged = false;
  homeManifestData = null;
  homeManifestGrouped = null;

  // 2. Clear shared regions
  clearDivs();
  setCommandsButtonLabel("Commands");
  wireHomeCommandsButton();

  // 3. Build minimal UI
  setHomeSubtabs();
  setHomeCaption("Home (init)");
  setHomeText("Home tab skeleton: init()");
  setHomeAction();
  setHomeSketchpad();

  // 4. Ensure saved state exists and enter view
  ensureHomeSavedState();
  switchHomeView(uiState.home.saved.view);

  // 5. Load manifest (will hit disk because central cache was cleared)
  loadHomeManifest();
} // end initHomeTab

/* ------------------------------------------------------------
   restoreHomeTab()
   Arguments:
     - None
   ------------------------------------------------------------
   Role:
     - Restore path (called when uiState.home.saved exists).
     - Rebuilds subtabs, kicks manifest load, re-enters saved view.
     - Does not overwrite UI with placeholder text.
------------------------------------------------------------ */
function restoreHomeTab() {
  clearDivs();
  setCommandsButtonLabel("Commands");

  // Ensure the saved object exists (fail-fast contract)
  ensureHomeSavedState();

  // Build subtabs first (Results tab appears only if activeEntry exists)
  setHomeSubtabs();

  // Kick manifest load once (cached by homeManifestLogged)
  // If we are restoring into Categories, the manifest loader will
  // render categories when grouped data becomes available.
  loadHomeManifest();

  // Re-enter the saved view deterministically.
  // NOTE: switchHomeView is async because Results rendering can be async.
  // We intentionally do NOT await here because HomeTabSpec.restore()
  // is currently synchronous in this file. The view switch still runs,
  // and any fail-fast errors will surface in the console.
  switchHomeView(uiState.home.saved.view);

} // end restoreHomeTab


/* ------------------------------------------------------------
   saveHomeState()
   Arguments:
     - None
   ------------------------------------------------------------
   Role:
     - Save contract: return a serializable snapshot.
     - For now, we just return uiState.home.saved.
------------------------------------------------------------ */
export function saveHomeState() {
  ensureHomeSavedState();
  return uiState.home.saved;
} // end saveHomeState


/* ============================================================
   SUBTABS DIV FUNCTIONS (#subtabs)
   ------------------------------------------------------------
   Role:
     - Builds and maintains the Home subtab bar
     - Routes subtab clicks into switchHomeView()
============================================================ */

/* ------------------------------------------------------------
   setHomeSubtabs()
   Arguments:
     - None
   ------------------------------------------------------------
   Role:
     - Builds the Home subtab bar inside #subtabs.
     - Adds Categories always; adds Results only if activeEntry exists.
     - Activates the currently saved view.
------------------------------------------------------------ */
function setHomeSubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setHomeSubtabs: #subtabs not found");

  ensureHomeSavedState();

  el.innerHTML = "";

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs home-subtabs";
  el.appendChild(bar);

  // Categories tab (always)
  addHomeSubtabButton(bar, "Categories", HOME_VIEW_CATEGORIES);

  // Results tab (once an entry exists, it stays available)
  if (uiState.home.saved.activeEntry) {
    addHomeSubtabButton(bar, "Results", HOME_VIEW_RESULTS);
  }

  // Activate current view
  activateHomeSubtabButton(uiState.home.saved.view);
} // end setHomeSubtabs


/* ------------------------------------------------------------
   addHomeSubtabButton(barEl, label, viewKey)
   Arguments:
     - barEl (HTMLElement): the <ul> container to append into
     - label (string): button label
     - viewKey (string): "categories" | "results"
   ------------------------------------------------------------
   Role:
     - Creates a single subtab button that calls switchHomeView(viewKey).
------------------------------------------------------------ */
function addHomeSubtabButton(barEl, label, viewKey) {
  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className = "nav-link";
  btn.textContent = label;
  btn.dataset.view = viewKey;

  btn.addEventListener("click", async () => {
    await switchHomeView(viewKey);
  });

  li.appendChild(btn);
  barEl.appendChild(li);
} // end addHomeSubtabButton


/* ------------------------------------------------------------
   activateHomeSubtabButton(viewKey)
   Arguments:
     - viewKey (string): "categories" | "results"
   ------------------------------------------------------------
   Role:
     - Applies "active" class to the matching subtab button and
       removes it from the others.
------------------------------------------------------------ */
function activateHomeSubtabButton(viewKey) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) throw new Error("activateHomeSubtabButton: #subtabs ul not found");

  bar.querySelectorAll(".nav-link").forEach((btn) => {
    if (btn.dataset.view === viewKey) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
} // end activateHomeSubtabButton


/* ------------------------------------------------------------
   switchHomeView(viewKey)
   Arguments:
     - viewKey (string): "categories" | "results"
   ------------------------------------------------------------
   Role:
     - Updates uiState.home.saved.view.
     - Rebuilds subtabs.
     - For Categories view: clears caption/sketchpad/action and renders categories if ready.
     - For Results view: calls renderHomeResults().
------------------------------------------------------------ */
async function switchHomeView(viewKey) {
  ensureHomeSavedState();

  uiState.home.saved.view = viewKey;

  // Rebuild subtabs (Results stays present if activeEntry exists)
  setHomeSubtabs();
  activateHomeSubtabButton(viewKey);

  if (viewKey === HOME_VIEW_CATEGORIES) {

    // Categories view does NOT use caption
    clearHomeCaption();

    // Clear sketchpad so prior drawing does not remain
    const padDiv = document.getElementById("sketchpad");
    if (!padDiv) throw new Error("switchHomeView: #sketchpad not found");
    padDiv.innerHTML = "";

    // Clear action area
    const actionDiv = document.getElementById("action");
    if (!actionDiv) throw new Error("switchHomeView: #action not found");
    actionDiv.innerHTML = "";

    renderHomeCategoriesIfReady();
    return;
  }

  if (viewKey === HOME_VIEW_RESULTS) {
    await renderHomeResults();
    return;
  }

  throw new Error("switchHomeView: unknown viewKey " + viewKey);
} // end switchHomeView






/* ============================================================
   CAPTION DIV FUNCTIONS (#caption)
   ------------------------------------------------------------
   Role:
     - Clears caption for Categories view
     - Sets caption for placeholder and Results view
     - Results caption includes full path injected into caption-buttons
============================================================ */

/* ------------------------------------------------------------
   clearHomeCaption()
   Arguments:
     - None
   ------------------------------------------------------------
   Role:
     - Clears #caption content.
------------------------------------------------------------ */
function clearHomeCaption() {
  const el = document.getElementById("caption");
  if (!el) throw new Error("clearHomeCaption: #caption not found");
  el.innerHTML = "";
} // end clearHomeCaption


/* ------------------------------------------------------------
   setHomeCaption(titleText)
   Arguments:
     - titleText (string): caption title string
   ------------------------------------------------------------
   Role:
     - Builds a minimal caption bar with a title and no prev/next/menu.
------------------------------------------------------------ */
function setHomeCaption(titleText) {
  setCaptionBar({
    targetId: "caption",
    title: titleText,
    onPrev: null,
    onNext: null,
    onMenu: null
  });
} // end setHomeCaption


/* ------------------------------------------------------------
   setHomeCaptionForResult(entry)
   ------------------------------------------------------------
   Role:
     - Builds caption bar for Results:
         - Title from entry.title/entry.file
         - Menu items from getHomeCaptionMenuItems(bundle)
     - Injects full rooted path into "#caption .caption-buttons"
       immediately before the menu button.

   IMPORTANT FIX:
     - Do NOT capture bundle in a closure.
     - Build bundle fresh inside onMenu so "Edit Manifest"
       always sees the current status/title without requiring
       a tab switch or caption rebuild.
------------------------------------------------------------ */
function setHomeCaptionForResult(entry) {

  if (!entry) throw new Error("setHomeCaptionForResult: entry missing");
  if (typeof entry !== "object") throw new Error("setHomeCaptionForResult: entry must be an object");

  const title =
    entry.title ||
    entry.file  ||
    "(untitled)";

  const fullPath = entry.path || "";
  if (typeof fullPath !== "string" || !fullPath.length) {
    throw new Error("setHomeCaptionForResult: entry.path missing");
  }

  // Build the caption bar FIRST (this creates caption-buttons + menu button)
  setCaptionBar({
    targetId: "caption",
    title: title,

    onMenu: async (anchor) => {

      // ------------------------------------------------------
      // Build bundle FRESH every time the menu opens.
      // This prevents stale status/title when Results stays up.
      // ------------------------------------------------------
      ensureHomeSavedState();

      const active = uiState.home.saved.activeEntry;
      if (!active) throw new Error("Home caption menu: activeEntry missing");

      const activePath = active.path;
      if (typeof activePath !== "string" || !activePath.length) {
        throw new Error("Home caption menu: activeEntry.path missing");
      }

      const bundle = {
        tabName: "home",

        // Manifest identity
        manifestPath: "/home/manifest.json",

        // Entry identity
        entryPath: activePath,

        // Convenience fields for UI/editor defaults (CURRENT VALUES)
        title: active.title || "",
        file:  active.file  || "",
        status: (typeof active.status === "string") ? active.status : "",

        // Script detection
        isScript: isJsPath(activePath),
        scriptPath: isJsPath(activePath) ? activePath : null,

        helpKey: null
      };

      const items = await getHomeCaptionMenuItems(bundle);
      menuManager.open(items, anchor);

    } // end onMenu
  });

  // ---- inject pathname into .caption-buttons ----
  const btnBar = document.querySelector("#caption .caption-buttons");
  if (!btnBar) {
    throw new Error("setHomeCaptionForResult: .caption-buttons not found");
  }

  // Remove any existing path span
  const old = btnBar.querySelector(".home-caption-path");
  if (old) old.remove();

  // Create path span (add spacing on the right)
  const span = document.createElement("span");
  span.className = "home-caption-path";
  span.innerHTML = fullPath + "&nbsp;&nbsp;";

  // Insert BEFORE the menu button (last button = menu)
  const buttons = btnBar.querySelectorAll("button");
  if (!buttons.length) {
    throw new Error("setHomeCaptionForResult: no buttons in caption-buttons");
  }

  const menuBtn = buttons[buttons.length - 1];
  btnBar.insertBefore(span, menuBtn);

} // end setHomeCaptionForResult




/* ============================================================
   TEXT DIV FUNCTIONS (#text)
   ------------------------------------------------------------
   Role:
     - Minimal placeholder text for skeleton init
     - Categories view uses renderCategories("text", frames)
============================================================ */

/* ------------------------------------------------------------
   setHomeText(message)
   Arguments:
     - message (string): message to display
   ------------------------------------------------------------
   Role:
     - Writes a simple message into #text and echoes uiState.home.saved
       as JSON for debugging/testing.
------------------------------------------------------------ */
function setHomeText(message) {
  const el = document.getElementById("text");
  if (!el) throw new Error("setHomeText: #text not found");

  el.innerHTML = "";

  const div = document.createElement("div");
  div.textContent = message;
  el.appendChild(div);

  // Also echo current saved snapshot (helps testing)
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(uiState.home.saved, null, 2);
  el.appendChild(pre);
} // end setHomeText


/* ============================================================
   ACTION DIV FUNCTIONS (#action)
   ------------------------------------------------------------
   Role:
     - Home itself does not populate #action in this skeleton
     - Results view clears it
============================================================ */

/* ------------------------------------------------------------
   setHomeAction()
   Arguments:
     - None
   ------------------------------------------------------------
   Role:
     - Clears #action.
------------------------------------------------------------ */
function setHomeAction() {
  const el = document.getElementById("action");
  if (!el) throw new Error("setHomeAction: #action not found");
  el.innerHTML = "";
} // end setHomeAction


/* ============================================================
   SKETCHPAD DIV FUNCTIONS (#sketchpad)
   ------------------------------------------------------------
   Role:
     - Home clears sketchpad for Categories view
     - Results view renders either shared canvas or an image element
============================================================ */

/* ------------------------------------------------------------
   setHomeSketchpad()
   Arguments:
     - None
   ------------------------------------------------------------
   Role:
     - Clears #sketchpad.
------------------------------------------------------------ */
function setHomeSketchpad() {
  const el = document.getElementById("sketchpad");
  if (!el) throw new Error("setHomeSketchpad: #sketchpad not found");
  el.innerHTML = "";
} // end setHomeSketchpad


/* ------------------------------------------------------------
   renderHomeImageEntryToSketchpad(entry, myToken)
   Arguments:
     - entry (object): activeEntry (must include .path)
     - myToken (number): render token for stale async prevention
   ------------------------------------------------------------
   Role:
     - Loads an image from entry.path and displays it in #sketchpad.
     - Uses token check to avoid stale async updates.
------------------------------------------------------------ */
async function renderHomeImageEntryToSketchpad(entry, myToken) {

  const padDiv = document.getElementById("sketchpad");
  if (!padDiv) throw new Error("Home Results: #sketchpad missing");

  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("Home Results: #text missing");

  // Clear sketchpad and show a minimal loading marker
  padDiv.innerHTML = "<p>(Loading image...)</p>";

  const img = new Image();

  const loaded = await new Promise(function (resolve) {

    img.onload = function () { resolve({ ok: true }); };   // end onload
    img.onerror = function () { resolve({ ok: false }); }; // end onerror

    // Rooted path is used directly
    img.src = entry.path;

  }); // end Promise

  // Stale render: do nothing (newer click already took over)
  if (myToken !== homeResultsRenderToken) return;

  if (!loaded.ok) {
    padDiv.innerHTML =
      "<p><b>Home:</b> Image failed to load.</p>" +
      "<p>Path: " + entry.path + "</p>";

    textDiv.innerHTML =
      "<p><b>Home:</b> Image failed to load: " + entry.path + "</p>";

    throw new Error("Home Results: image failed to load: " + entry.path);
  }

  // Fit behavior: preserve aspect, contain within region
  img.style.maxWidth = "100%";
  img.style.maxHeight = "100%";
  img.style.objectFit = "contain";
  img.style.display = "block";

  padDiv.innerHTML = "";
  padDiv.appendChild(img);

} // end renderHomeImageEntryToSketchpad


/* ============================================================
   HOME MANIFEST LOAD + CATEGORIES RENDERING (#text)
   ------------------------------------------------------------
   Role:
     - Loads /home/manifest.json (flat array)
     - Groups entries by "status"
     - Renders categories frames into #text
============================================================ */

/* ------------------------------------------------------------
   loadHomeManifest()
   Arguments:
     - None
   ------------------------------------------------------------
   Role:
     - One-shot kick of async manifest load + console logging.
     - Uses homeManifestLogged to prevent repeated loads.
------------------------------------------------------------ */
function loadHomeManifest() {
  if (homeManifestLogged) return;

  homeManifestLogged = true;

  // Kick async work; if it fails, let it fail loudly.
  loadHomeManifest_async().catch((err) => {
    console.error("Home manifest load FAILED", err);
    throw err;
  });
} // end loadHomeManifest


/* ------------------------------------------------------------
   loadHomeManifest_async(forceReload)
   Arguments:
     - forceReload (boolean|undefined): if true, busts cache with ?v=Date.now()
   ------------------------------------------------------------
   Role:
     - Loads /home/manifest.json (flat array).
     - Groups by status into homeManifestGrouped.
     - Logs summary to console.
     - If currently in Categories view, renders categories immediately.
------------------------------------------------------------ */
async function loadHomeManifest_async(forceReload) {

  const basePath = "/home/manifest.json";
  const manifestUrl = forceReload ? (basePath + "?v=" + Date.now()) : basePath;

  const data = await fileLayer.loadJSON(manifestUrl);

  if (!Array.isArray(data)) {
    throw new Error("Home manifest must be a flat array (got non-array)");
  }

  homeManifestData = data;
  homeManifestGrouped = groupHomeEntriesByStatus(data);

  const grouped = homeManifestGrouped;

  const statuses = Object.keys(grouped).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  const counts = {};
  statuses.forEach((s) => {
    counts[s] = grouped[s].length;
  });


  if (uiState.home.saved && uiState.home.saved.view === HOME_VIEW_CATEGORIES) {
    renderHomeCategories(homeManifestGrouped);
  }

} // end loadHomeManifest_async


export async function refreshHomeCategoriesFromManifestEdit() {

  // Force a rebuild of the grouped data used by category frames.
  // We do NOT touch homeManifestLogged; this is an explicit refresh.
  homeManifestData    = null;
  homeManifestGrouped = null;

  // Bust browser cache and rebuild homeManifestGrouped + homeManifestData
  await loadHomeManifest_async(true);

  // ----------------------------------------------------------
  // Desired behavior:
  //   - If status changed (non-empty -> non-empty): stay in Results.
  //   - If status cleared OR entry removed from /home/manifest.json:
  //       exit Results and go back to Categories.
  //   - ALSO: keep uiState.home.saved.activeEntry in sync with
  //       the refreshed manifest so the next Edit dialog seeds
  //       the correct values.
  // ----------------------------------------------------------
  ensureHomeSavedState();

  // If we are not in Results, nothing else to do.
  if (uiState.home.saved.view !== HOME_VIEW_RESULTS) return;

  const active = uiState.home.saved.activeEntry;
  if (!active) return;

  const entryPath = active.path;
  if (!entryPath) throw new Error("refreshHomeCategoriesFromManifestEdit: activeEntry.path missing");

  // Find the entry in the freshly reloaded manifest array.
  const match = homeManifestData.find((e) => {
    return e && e.path === entryPath;
  });

  // Case 1: Entry was removed from manifest (correct behavior for cleared status).
  if (!match) {

    uiState.home.saved.view         = HOME_VIEW_CATEGORIES;
    uiState.home.saved.activeStatus = null;
    uiState.home.saved.activeIndex  = null;
    uiState.home.saved.activeEntry  = null;

    await switchHomeView(HOME_VIEW_CATEGORIES);
    return;
  }

  // Case 2: Entry still exists, but status was cleared (browser-side "skip" rule).
  const status = match.status;

  if (typeof status !== "string" || status.trim() === "") {

    uiState.home.saved.view         = HOME_VIEW_CATEGORIES;
    uiState.home.saved.activeStatus = null;
    uiState.home.saved.activeIndex  = null;
    uiState.home.saved.activeEntry  = null;

    await switchHomeView(HOME_VIEW_CATEGORIES);
    return;
  }

  // Case 3: Status changed but is still non-empty.
  // Requirement: stay in Results and do NOT redraw â€” but DO sync the saved entry
  // so subsequent Edit Manifest shows the correct current values.
  if (typeof match.title === "string") active.title = match.title;
  if (typeof match.file  === "string") active.file  = match.file;
  active.status = String(match.status);

  // Keep activeStatus consistent with the entryâ€™s current status (used by UI state).
  uiState.home.saved.activeStatus = active.status;

  return;

} // end refreshHomeCategoriesFromManifestEdit




/* ------------------------------------------------------------
   groupHomeEntriesByStatus(list)
   Arguments:
     - list (array): flat manifest array
   ------------------------------------------------------------
   Role:
     - Validates entries are objects and have required "status".
     - Returns map: { statusKey: [entry, ...], ... }.
------------------------------------------------------------ */
/* ------------------------------------------------------------
   groupHomeEntriesByStatus(list)
   Arguments:
     - list (array): flat manifest array
   ------------------------------------------------------------
   Role:
     - Validates entries are objects.
     - SKIPS entries with missing/blank "status".
     - Returns map: { statusKey: [entry, ...], ... }.
------------------------------------------------------------ */
function groupHomeEntriesByStatus(list) {
  const grouped = {};

  list.forEach((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("Home manifest contains a non-object entry");
    }

    const status = entry.status;

    // --------------------------------------------------------
    // IMPORTANT RULE:
    // If status is missing or "", the item is NOT ACTIVE
    // and must NOT appear in Home.
    // We skip it (do not throw).
    // --------------------------------------------------------
    if (typeof status !== "string") return;
    if (status.trim() === "") return;

    if (!grouped[status]) grouped[status] = [];
    grouped[status].push(entry);
  });

  return grouped;
} // end groupHomeEntriesByStatus



/* ------------------------------------------------------------
   renderHomeCategories(grouped)
   Arguments:
     - grouped (object): map { status: [entries...] }
   ------------------------------------------------------------
   Role:
     - Builds category descriptor frames and renders them into #text.
------------------------------------------------------------ */
function renderHomeCategories(grouped) {
  const frames = buildHomeCategoryDescriptor(grouped);
  renderCategories("text", frames);
} // end renderHomeCategories


/* ------------------------------------------------------------
   renderHomeCategoriesIfReady()
   Arguments:
     - None
   ------------------------------------------------------------
   Role:
     - If homeManifestGrouped not ready, shows a simple message in #text.
     - Otherwise renders categories.
------------------------------------------------------------ */
function renderHomeCategoriesIfReady() {
  if (!homeManifestGrouped) {
    const el = document.getElementById("text");
    if (!el) throw new Error("renderHomeCategoriesIfReady: #text not found");
    el.innerHTML = "Home: manifest not loaded yet.";
    return;
  }

  renderHomeCategories(homeManifestGrouped);
} // end renderHomeCategoriesIfReady


/* ------------------------------------------------------------
   buildHomeCategoryDescriptor(grouped)
   Arguments:
     - grouped (object): map { status: [entries...] }
   ------------------------------------------------------------
   Role:
     - Converts grouped data into the descriptor format expected by categories.js.
     - Each item click either:
         - Launches Draw for drawRegistry entries (no Home Results), or
         - Stores selection and enters Results view.
------------------------------------------------------------ */
function buildHomeCategoryDescriptor(grouped) {

  const statuses = Object.keys(grouped).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  const frames = statuses.map((status) => {

    const items = grouped[status] || [];

    return {
      title: status,
      items: items.map((entry) => {

        const name = entry.title ? entry.title : entry.file;

        return {
          name,
          hasSubitems: false,

          onClick: () => {

            ensureHomeSavedState();

            // DRAW REGISTRY ITEMS:
            // Launch Draw and DO NOT enter Home Results.
            // Also DO NOT persist this as activeEntry, because Home Results
            // assumes runnable modules (runPattern).
            if (entry.sourceType === "drawRegistry") {

              if (!entry.registryKey) {
                throw new Error("Home launcher: drawRegistry entry missing registryKey");
              }

              // Keep Home stable: Categories view, no active entry.
              uiState.home.saved.view = HOME_VIEW_CATEGORIES;
              uiState.home.saved.activeStatus = null;
              uiState.home.saved.activeEntry = null;
              uiState.home.saved.activeIndex = null;

              // Transient launch intent (not persisted)
              uiState.launch.pending     = true;
              uiState.launch.sourceTab   = "home";
              uiState.launch.targetTab   = "draw";
              uiState.launch.sourceType  = "drawRegistry";
              uiState.launch.registryKey = entry.registryKey;

              // Switch tabs via your real tab switcher
              launchTabViaSetUI("draw").catch((err) => { throw err; });

              return;
            }

            // NORMAL HOME BEHAVIOR:
            // Record selection in Home state, then enter Results view.
            uiState.home.saved.view         = HOME_VIEW_RESULTS;
            uiState.home.saved.activeStatus = status;
            uiState.home.saved.activeEntry  = entry;
            uiState.home.saved.activeIndex  = null;

            switchHomeView(HOME_VIEW_RESULTS);

            setHomeCaptionForResult(entry);

          } // end onClick
        };
      })
    };
  });

  return frames;

} // end buildHomeCategoryDescriptor



/* ============================================================
   HOME RESULTS VIEW (Mix of #caption/#text/#action/#sketchpad)
   ------------------------------------------------------------
   Role:
     - Clears categories UI
     - Sets Results caption
     - Routes to JS (canvas) or image rendering
     - Uses token to prevent stale async updates
============================================================ */

/* ------------------------------------------------------------
   renderHomeResults()
   Arguments:
     - None (reads uiState.home.saved.activeEntry)
   ------------------------------------------------------------
   Role:
     - Enters Results rendering using the currently selected entry.
     - Clears #text and #action.
     - Sets caption for result.
     - Routes to JS or image renderer (or fails fast).
------------------------------------------------------------ */
async function renderHomeResults() {
  ensureHomeSavedState();

  // bump token: anything already in-flight becomes stale
  homeResultsRenderToken += 1;
  const myToken = homeResultsRenderToken;

  const entry = uiState.home.saved.activeEntry;
  if (!entry) throw new Error("Home Results: activeEntry missing");

  // Guard: drawRegistry entries are launch-only and are never valid Results.
  if (entry.sourceType === "drawRegistry") {
    throw new Error(
      "Home Results: drawRegistry items are launch-only (not runnable in Home): " +
      String(entry.path || entry.file)
    );
  }

  // Results view must NOT leave categories visible
  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("Home Results: #text missing");
  textDiv.innerHTML = "";

  const actionDiv = document.getElementById("action");
  if (!actionDiv) throw new Error("Home Results: #action missing");
  actionDiv.innerHTML = "";

  // Caption
  setHomeCaptionForResult(entry);

  if (isJsPath(entry.path)) {
    await renderHomeJsEntryToCanvas(entry, myToken);
    return;
  }

  if (isImagePath(entry.path)) {
    await renderHomeImageEntryToSketchpad(entry, myToken);
    return;
  }

  const padDiv = document.getElementById("sketchpad");
  if (!padDiv) throw new Error("Home Results: #sketchpad missing");
  padDiv.innerHTML = "<p>(Unsupported result type)</p>";

  textDiv.innerHTML =
    "<p><b>Home:</b> Unsupported result type for: " + entry.path + "</p>";

  throw new Error("Home Results: unsupported result type: " + entry.path);
} // end renderHomeResults


/* ------------------------------------------------------------
   clearHomeCanvasAndOverlays()
   Arguments:
     - None
   ------------------------------------------------------------
   Role:
     - Resets ctx transform and clears shared canvas to a known white background.
     - Clears overlay layers if present.
------------------------------------------------------------ */
function clearHomeCanvasAndOverlays() {
  const canvas = window.drawCanvas;
  if (!canvas) throw new Error("clearHomeCanvasAndOverlays: window.drawCanvas missing");

  const c = window.ctx;
  if (!c) throw new Error("clearHomeCanvasAndOverlays: window.ctx missing");

  // IMPORTANT:
  // Prior scripts may leave the ctx in a transformed state.
  // clearRect() is affected by transforms, so we must reset first.
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = "source-over";

  // Clear to a known background (white) so every script starts clean.
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, canvas.width, canvas.height);

  // Clear interaction layers if present
  const layers = document.getElementById("canvasOverlayLayers");
  if (layers) layers.innerHTML = "";
} // end clearHomeCanvasAndOverlays


/* ------------------------------------------------------------
   showHomeResultsError(where, err)
   Arguments:
     - where (string): "load" | "execute" | other marker
     - err (Error): the error object
   ------------------------------------------------------------
   Role:
     - Displays an error message into #sketchpad, then rethrows
       to preserve fail-fast stack trace in console.
------------------------------------------------------------ */
function showHomeResultsError(where, err) {
  const padDiv = document.getElementById("sketchpad");
  if (!padDiv) throw new Error("showHomeResultsError: #sketchpad missing");

  const msg = err && err.message ? err.message : String(err);

  padDiv.innerHTML =
    "<p style='color:red; font-weight:700; margin:10px 0'>" +
    "Home Results error (" + where + "): " + msg +
    "</p>";

  // Fail-fast: after making it visible, throw so the console shows the real stack.
  throw err;
} // end showHomeResultsError


/* ------------------------------------------------------------
   renderHomeJsEntryToCanvas(entry, token)
   Arguments:
     - entry (object): activeEntry (must include .path)
     - token (number): render token for stale async prevention
   ------------------------------------------------------------
   Role:
     - Attaches shared canvas to #sketchpad.
     - Clears canvas to known state.
     - Loads and executes the module at entry.path.
     - Aborts if token is stale after module load.
------------------------------------------------------------ */

async function renderHomeJsEntryToCanvas(entry, token) {
  const padDiv = document.getElementById("sketchpad");
  if (!padDiv) throw new Error("Home Results: #sketchpad missing");

  // 1. ENSURE THE OVERLAY CONTAINER EXISTS
  // Without this, armInteractor (called by scriptRunner) has no stage to play on.
  let overlay = document.getElementById("canvasOverlayLayers");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "canvasOverlayLayers";
    // Usually, this should be a sibling or child of the canvas host
    padDiv.appendChild(overlay);
  }

  // 2. RUN THE SCRIPT WITH CONTROLS ENABLED
  try {
    const label = entry.file || entry.title || entry.path;
    // We use the unified runner so it hits your 'armInteractor' logic
    await runScriptByPath(entry.path, "canvas", {
      canvasRegionId: "sketchpad",
      enableControls: true,      // This triggers the building of controls
      controlsRegionId: "action" // Puts sliders in the action area
    });
  } catch (err) {
    showHomeResultsError("execute", err);
  }
}

/* ============================================================
   OFFCANVAS / COMMANDS FUNCTIONS
   ------------------------------------------------------------
   Role:
     - Builds Home Maintenance offcanvas content
     - Runs manifest maintenance via nodeLayer and refreshes Home manifest
============================================================ */

/* ------------------------------------------------------------
   buildHomeOffcanvasHtml()
   Arguments:
     - None
   ------------------------------------------------------------
   Role:
     - Returns inner HTML string for the Home Maintenance offcanvas body.
------------------------------------------------------------ */
function buildHomeOffcanvasHtml() {

  return `
    <div class="cmdButtonRow">
      <button id="rebuildValidateButton" class="cmdButton" type="button">
        Rebuild &amp; Validate
      </button>
    </div>

    <div class="cmdButtonRow">
      <button id="homeHelpButton" class="cmdButton" type="button">
        Help
      </button>
    </div>

    <div class="buttonSeparator"></div>

    <div id="homeRebuildReport" class="homeRebuildReport"></div>
  `;

} // end buildHomeOffcanvasHtml



export function formatRebuildReport(report) {
  return formatRebuildReportShared(report);
} // end formatRebuildReport


/* ------------------------------------------------------------
   wireHomeCommandsButton()
  áº®ruments:
     - None
   ------------------------------------------------------------
   Role:
     - Wires the global Commands button to open the Home Maintenance offcanvas.
     - Runs rebuild/validate; clears manifest caches; forces Home manifest reload;
       updates report text.
     - Adds Help button (same behavior as Utilities)
------------------------------------------------------------ */

export function wireHomeCommandsButton() {

  setCommandsButton("Commands", () => {

    showCommandsOffcanvas({
      title: "Home Maintenance",
      buildBody(offcanvasBodyEl) {

        if (!offcanvasBodyEl) {
          throw new Error("Commands: offcanvasBodyEl missing");
        }

        offcanvasBodyEl.innerHTML = buildHomeOffcanvasHtml();

        const btn = document.getElementById("rebuildValidateButton");
        if (!btn) throw new Error("wireHomeCommandsButton: #rebuildValidateButton missing");

        btn.addEventListener("click", async () => {

          const out = document.getElementById("homeRebuildReport");
          if (!out) throw new Error("wireHomeCommandsButton: #homeRebuildReport missing");

          out.textContent = "Running Global Rebuild...";

          // 1. Tell Node to update disk
          const report = await nodeRebuildAndValidateManifests();

          // 2. Clear global cache and invalidate all tab 'saved' states
          // This uses the utility we added to uiUtilities.js
          const { syncSystemStateAfterRebuild } = await import("./uiUtilities.js");
          await syncSystemStateAfterRebuild();

          // 3. Re-init THIS tab immediately
          // This call triggers step 1 of initHomeTab above (variable clearing)
          initHomeTab(false);

          out.textContent = formatRebuildReport(report);

        }); // end click

        const helpBtn = document.getElementById("homeHelpButton");
        if (!helpBtn) throw new Error("wireHomeCommandsButton: #homeHelpButton missing");

        helpBtn.addEventListener("click", () => {
          const panel = document.getElementById("offcanvasPanel");
          if (!panel) throw new Error("wireHomeCommandsButton: #offcanvasPanel missing");
          const oc = bootstrap.Offcanvas.getOrCreateInstance(panel);
          oc.hide();
          openHelpHomeOverlay();
        }); // end click

      } // end buildBody
    });

  });

} // end wireHomeCommandsButton



/* ============================================================
   LAUNCH / TAB SWITCH HELPERS
   ------------------------------------------------------------
   Role:
     - Launches another tab via dynamic import of setUI.js
     - Avoids circular dependency by using dynamic import
============================================================ */

/* ------------------------------------------------------------
   launchTab(tabKey)
   Arguments:
     - tabKey (string): target tab key
   ------------------------------------------------------------
   Role:
     - Dynamically imports setUI.js and calls setUI(tabKey).
------------------------------------------------------------ */
async function launchTab(tabKey) {

  if (!tabKey) throw new Error("launchTab: tabKey missing");

  const mod = await import("./setUI.js");
  if (!mod || typeof mod.setUI !== "function") {
    throw new Error("launchTab: setUI export missing from ./setUI.js");
  }

  mod.setUI(tabKey);

} // end launchTab


/* ------------------------------------------------------------
   launchTabViaSetUI(tabKey)
   Arguments:
     - tabKey (string): target tab key
   ------------------------------------------------------------
   Role:
     - Dynamic import avoids circular dependency:
         setUI.js imports home.js
         home.js must NOT statically import setUI.js
     - Returns a promise that calls mod.setUI(tabKey).
------------------------------------------------------------ */
function launchTabViaSetUI(tabKey) {

  // Dynamic import avoids circular dependency:
  //   setUI.js imports home.js
  //   home.js must NOT statically import setUI.js
  return import("./setUI.js").then((mod) => {
    mod.setUI(tabKey);
  });

} // end launchTabViaSetUI

/* ============================================================
   REBUILD / SYNC HOOKS
   ============================================================ */
export function clearHomeLocalState() {
    homeManifestLogged = false;
    homeManifestData = null;
    homeManifestGrouped = null;
}  // clearHomeLocalState

// end home.js
