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

import { menuManager } from "./menuManager.js";
import { getHomeCaptionMenuItems } from "./homeMenuCmds.js";

import { uiState }          from "./uiState.js";
import { clearDivs, setCommandsButtonLabel }
                            from "./ui_utilities.js";
import { setCommandsButtonHandler, showCommandsOffcanvas }
                            from "./ui_utilities.js";
import { setCaptionBar }    from "./caption.js";
import { manifest }         from "./manifest.js";
import { fileLayer }        from "./fileLayer.js";
import { renderCategories } from "./categories.js";
import { loadScriptModule, executeScriptToCanvas }
                            from "./scriptRunner.js";

import { setCommandsButton, showOffcanvasPanel, escapeHtml } from "./ui_utilities.js";
import { nodeRebuildAndValidateManifests } from "./nodeLayer.js";

const TAB_NAME = "home";
let homeManifestLogged = false;
const HOME_VIEW_CATEGORIES = "categories";
const HOME_VIEW_RESULTS    = "results";

let homeManifestData   = null;
let homeManifestGrouped = null;
// Render sequencing token for Home Results (prevents stale async draws)
let homeResultsRenderToken = 0;


/* ===========================================================
   HomeTabSpec
   -----------------------------------------------------------
   Declarative description consumed by setUI.js
=========================================================== */
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


/* ===========================================================
   initHomeTab(restored = false)
   -----------------------------------------------------------
   Cold start path (called via setUI START logic or when
   uiState.home.saved is null).
=========================================================== */
export function initHomeTab(restored = false) {
  // Clear shared regions (matches your pattern in other tabs)
  clearDivs();
  setCommandsButtonLabel("Home Commands");
  wireHomeCommandsButton();

  // Build minimal UI
  setHomeSubtabs();
  setHomeCaption("Home (init)");
  setHomeText("Home tab skeleton: init()");
  setHomeAction();
  setHomeSketchpad();

  // Ensure saved state exists (fail-fast contract for future work)
    ensureHomeSavedState();
    switchHomeView(uiState.home.saved.view);
    loadHomeManifestAndLog();
} // end initHomeTab


/* ===========================================================
   saveHomeState()
   -----------------------------------------------------------
   Save contract: return a serializable snapshot.
   For now, we just return uiState.home.saved.
=========================================================== */
export function saveHomeState() {
  ensureHomeSavedState();
  return uiState.home.saved;
} // end saveHomeState


/* ===========================================================
   ensureHomeSavedState()
   -----------------------------------------------------------
   Guarantees uiState.home.saved exists with the expected shape.
=========================================================== */
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


/* ===========================================================
   Region builders (minimal, deterministic)
=========================================================== */
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





function clearHomeCaption() {
  const el = document.getElementById("caption");
  if (!el) throw new Error("clearHomeCaption: #caption not found");
  el.innerHTML = "";
} // end clearHomeCaption


function setHomeCaption(titleText) {
  setCaptionBar({
    targetId: "caption",
    title: titleText,
    onPrev: null,
    onNext: null,
    onMenu: null
  });
} // end setHomeCaption


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


function setHomeAction() {
  const el = document.getElementById("action");
  if (!el) throw new Error("setHomeAction: #action not found");
  el.innerHTML = "";
} // end setHomeAction


function setHomeSketchpad() {
  const el = document.getElementById("sketchpad");
  if (!el) throw new Error("setHomeSketchpad: #sketchpad not found");
  el.innerHTML = "";
} // end setHomeSketchpad

function loadHomeManifestAndLog() {
  if (homeManifestLogged) return;

  homeManifestLogged = true;

  // Kick async work; if it fails, let it fail loudly.
  loadHomeManifestAndLog_async().catch((err) => {
    console.error("Home manifest load FAILED", err);
    throw err;
  });
} // end loadHomeManifestAndLog


async function loadHomeManifestAndLog_async(forceReload) {

  const basePath = "/home/manifest.json";
  const manifestUrl = forceReload ? (basePath + "?v=" + Date.now()) : basePath;

  const data = await fileLayer.loadJSON(manifestUrl);

  if (!Array.isArray(data)) {
    throw new Error("Home manifest must be a flat array (got non-array)");
  }

  homeManifestData = data;
  homeManifestGrouped = groupHomeEntriesByStatus(data);

  console.group("HOME MANIFEST");
  console.log("url:", manifestUrl);
  console.log("raw data:", data);
  console.log("count:", data.length);

  const grouped = homeManifestGrouped;

  const statuses = Object.keys(grouped).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  console.log("distinct statuses:", statuses);

  const counts = {};
  statuses.forEach((s) => {
    counts[s] = grouped[s].length;
  });
  console.log("counts by status:", counts);

  console.groupEnd();

  if (uiState.home.saved && uiState.home.saved.view === HOME_VIEW_CATEGORIES) {
    renderHomeCategories(homeManifestGrouped);
  }

} // end loadHomeManifestAndLog_async



function groupHomeEntriesByStatus(list) {
  const grouped = {};

  list.forEach((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("Home manifest contains a non-object entry");
    }

    const status = entry.status;
    if (!status) {
      throw new Error("Home manifest entry is missing required 'status'");
    }

    if (!grouped[status]) grouped[status] = [];
    grouped[status].push(entry);
  });

  return grouped;
} // end groupHomeEntriesByStatus

function renderHomeCategories(grouped) {
  const frames = buildHomeCategoryDescriptor(grouped);
  renderCategories("text", frames);
} // end renderHomeCategories


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

            const origin = deriveHomeOriginFromPath(entry.path);
            setHomeCaptionForResult(entry, origin);

          } // end onClick
        };
      })
    };
  });

  return frames;

} // end buildHomeCategoryDescriptor




function renderHomeCategoriesIfReady() {
  if (!homeManifestGrouped) {
    const el = document.getElementById("text");
    if (!el) throw new Error("renderHomeCategoriesIfReady: #text not found");
    el.innerHTML = "Home: manifest not loaded yet.";
    return;
  }

  renderHomeCategories(homeManifestGrouped);
} // end renderHomeCategoriesIfReady


async function renderHomeResults() {
  ensureHomeSavedState();

  // bump token: anything already in-flight becomes stale
  homeResultsRenderToken += 1;
  const myToken = homeResultsRenderToken;

  const entry = uiState.home.saved.activeEntry;
  if (!entry) throw new Error("Home Results: activeEntry missing");

  // Guard: drawRegistry entries are launch-only and are never valid Results.
  if (entry.sourceType === "drawRegistry") {
    throw new Error("Home Results: drawRegistry items are launch-only (not runnable in Home): " + String(entry.path || entry.file));
  }

  // Results view must NOT leave categories visible
  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("Home Results: #text missing");
  textDiv.innerHTML = "";

  const actionDiv = document.getElementById("action");
  if (!actionDiv) throw new Error("Home Results: #action missing");
  actionDiv.innerHTML = "";

  // Caption
  const origin = deriveHomeOriginFromPath(entry.path);
  setHomeCaptionForResult(entry, origin);

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


function isImagePath(path) {
  const dot = path.lastIndexOf(".");
  if (dot < 0) return false;

  const ext = path.slice(dot + 1).toLowerCase();

  if (ext === "png") return true;
  if (ext === "jpg") return true;
  if (ext === "jpeg") return true;

  return false;
} // end isImagePath


async function renderHomeImageEntryToSketchpad(entry, myToken) {

  const padDiv = document.getElementById("sketchpad");
  if (!padDiv) throw new Error("Home Results: #sketchpad missing");

  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("Home Results: #text missing");

  // Clear sketchpad and show a minimal loading marker
  padDiv.innerHTML = "<p>(Loading image...)</p>";

  const img = new Image();

  const loaded = await new Promise(function (resolve) {

    img.onload = function () { resolve({ ok: true }); }; // end onload
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
   setHomeCaptionForResult(entry)
   ------------------------------------------------------------
   Home caption:
     • title handled by setCaptionBar
     • FULL PATH inserted into .caption-buttons
     • path appears immediately BEFORE menu button ("v")
     • NO Prev/Next for Home
   ============================================================ */
/* ============================================================
   setHomeCaptionForResult(entry)
   ------------------------------------------------------------
   Home caption:
     • title handled by setCaptionBar
     • FULL PATH inserted into .caption-buttons
     • path appears immediately BEFORE menu button ("v")
     • NO Prev/Next for Home
   ============================================================ */
function setHomeCaptionForResult(entry) {

  if (!entry) throw new Error("setHomeCaptionForResult: entry missing");

  const title =
    entry.title ||
    entry.file  ||
    "(untitled)";

  const fullPath = entry.path || "";

  // Build the caption bar FIRST (this creates caption-buttons + menu button)
  setCaptionBar({
    targetId: "caption",
    title: title,
    onMenu: (anchor) => {
      const items = getHomeCaptionMenuItems(entry);
      menuManager.open(items, anchor);
    }
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






function deriveHomeOriginFromPath(path) {
  if (typeof path !== "string" || !path.length) {
    return "Unknown";
  }

  const p = path.toLowerCase();

  if (p.startsWith("/patterns/"))  return "Patterns";
  if (p.startsWith("/gallery/"))   return "Gallery";
  if (p.startsWith("/utilities/")) return "Utilities";
  if (p.startsWith("/drawregistry/")) return "Draw";
  if (p.startsWith("/home/"))      return "Home";

  return "Unknown";
} // end deriveHomeOriginFromPath

/* ============================================================
   Home Results — run rooted .js module into shared canvas
   Reuses scriptRunner.js (same pathway as Patterns).
============================================================ */

function isJsPath(p) {
  if (typeof p !== "string") throw new Error("isJsPath: path must be a string");
  return p.toLowerCase().endsWith(".js");
} // end isJsPath


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

async function renderHomeJsEntryToCanvas(entry, token) {
  if (!entry) throw new Error("renderHomeJsEntryToCanvas: entry missing");
  if (typeof entry.path !== "string") throw new Error("renderHomeJsEntryToCanvas: entry.path missing");
  if (!isJsPath(entry.path)) throw new Error("renderHomeJsEntryToCanvas: not a .js entry: " + entry.path);

  if (typeof token !== "number") throw new Error("renderHomeJsEntryToCanvas: token missing");

  const padDiv = document.getElementById("sketchpad");
  if (!padDiv) throw new Error("renderHomeJsEntryToCanvas: #sketchpad missing");

  const canvas = window.drawCanvas;
  if (!canvas) throw new Error("renderHomeJsEntryToCanvas: window.drawCanvas missing");

  // Attach canvas
  padDiv.innerHTML = "";
  padDiv.appendChild(canvas);

  // Clear to known state
  clearHomeCanvasAndOverlays();

  // Load module
  let mod = null;
  try {
    mod = await loadScriptModule(entry.path);
  } catch (err) {
    showHomeResultsError("load", err);
  }

  // Abort if a newer Results render started while we were importing
  if (token !== homeResultsRenderToken) return;

  // Execute
  try {
    const label = entry.file || entry.title || entry.path;
    executeScriptToCanvas(mod, label);
  } catch (err) {
    showHomeResultsError("execute", err);
  }
} // end renderHomeJsEntryToCanvas

/* ===========================================================
   restoreHomeTab()
   -----------------------------------------------------------
   Restore path (called when uiState.home.saved exists).
   NOTE: setUI.js does not clear before calling restore().
         Each tab owns its restore behavior.

   REAL RESTORE BEHAVIOR
   ---------------------
   - Rebuild Home subtabs
   - Re-enter the saved view ("categories" or "results")
   - Do NOT overwrite the UI with skeleton placeholder text
   - Manifest load is kicked (and categories will render once ready)
=========================================================== */
function restoreHomeTab() {
  clearDivs();
  setCommandsButtonLabel("Home Commands");

  // Ensure the saved object exists (fail-fast contract)
  ensureHomeSavedState();

  // Build subtabs first (Results tab appears only if activeEntry exists)
  setHomeSubtabs();

  // Kick manifest load once (cached by homeManifestLogged)
  // If we are restoring into Categories, the manifest loader will
  // render categories when grouped data becomes available.
  loadHomeManifestAndLog();

  // Re-enter the saved view deterministically.
  // NOTE: switchHomeView is async because Results rendering can be async.
  // We intentionally do NOT await here because HomeTabSpec.restore()
  // is currently synchronous in this file. The view switch still runs,
  // and any fail-fast errors will surface in the console.
  switchHomeView(uiState.home.saved.view);

} // end restoreHomeTab

function buildHomeOffcanvasHtml() {

  return `
    <div class="cmdButtonRow">
      <button id="rebuildValidateButton" class="cmdButton" type="button">
        Rebuild &amp; Validate
      </button>
    </div>

    <div class="buttonSeparator"></div>

    <div id="homeRebuildReport" class="homeRebuildReport"></div>
  `;

} // end buildHomeOffcanvasHtml




function formatRebuildReport(report) {

  if (!report) throw new Error("formatRebuildReport: report missing");

  // Service now returns: request: "manifestMaintenance"
  if (report.request !== "manifestMaintenance") {
    throw new Error("formatRebuildReport: unexpected request: " + String(report.request));
  }

  const lines = [];

  lines.push("Log: " + (report.logName || "(none)"));
  lines.push("");

  // report.added and report.broken are maps: { groupKey: [items...] }
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


export function wireHomeCommandsButton() {

  setCommandsButton("Commands", () => {

    showCommandsOffcanvas({
      title: "Home Maintenance",
      buildBody(offcanvasBodyEl) {

        if (!offcanvasBodyEl) {
          throw new Error("Home Commands: offcanvasBodyEl missing");
        }

        offcanvasBodyEl.innerHTML = buildHomeOffcanvasHtml();

        const btn = document.getElementById("rebuildValidateButton");
        if (!btn) throw new Error("wireHomeCommandsButton: #rebuildValidateButton missing");

        btn.addEventListener("click", async () => {

          const out = document.getElementById("homeRebuildReport");
          if (!out) throw new Error("wireHomeCommandsButton: #homeRebuildReport missing");

          out.textContent = "Running...";

          const report = await nodeRebuildAndValidateManifests();

          manifest.clearCache();

          // force Home manifest reload
          homeManifestLogged  = false;
          homeManifestData   = null;
          homeManifestGrouped = null;

          homeManifestLogged = true;
          loadHomeManifestAndLog_async(true).catch((err) => {
            console.error("Home manifest reload FAILED", err);
            throw err;
          });

          out.textContent = formatRebuildReport(report);

        }); // end click

      } // end buildBody
    });

  });

} // end wireHomeCommandsButton

async function launchTab(tabKey) {

  if (!tabKey) throw new Error("launchTab: tabKey missing");

  const mod = await import("./setUI.js");
  if (!mod || typeof mod.setUI !== "function") {
    throw new Error("launchTab: setUI export missing from ./setUI.js");
  }

  mod.setUI(tabKey);

} // end launchTab


function launchTabViaSetUI(tabKey) {

  // Dynamic import avoids circular dependency:
  //   setUI.js imports home.js
  //   home.js must NOT statically import setUI.js
  return import("./setUI.js").then((mod) => {
    mod.setUI(tabKey);
  });

} // end launchTabViaSetUI



// end home.js
