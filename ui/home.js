/* home.js
   ============================================================
   Home Tab — Public Entry Point and Lifecycle
   ============================================================
   Role:
     This is the public entry point for the Home tab.
     It owns exactly four things:

       1. HomeTabSpec — the object consumed by setUI.js to drive
          tab activation (init / restore / save).

       2. Lifecycle functions — initHomeTab(), restoreHomeTab(),
          saveHomeState(). These are the only functions that
          orchestrate the full tab from top to bottom.

       3. Region builder stubs — setHomeText(), setHomeAction(),
          setHomeSketchpad(). These are small placeholder builders
          referenced by HomeTabSpec and used only during cold init.

       4. State guard — ensureHomeSavedState(). This is exported
          so that sub-modules (homeManifest.js, homeMenuCmds.js)
          can call it via dynamic import without duplicating the logic.

   What does NOT live here:
     • Subtabs and category view              → home/homeNav.js
     • Manifest loading and grouping          → home/homeManifest.js
     • Results display and rendering          → home/homeResults.js
     • Caption bar and commands offcanvas     → home/homeMenuCmds.js
     • Shared module-level state variables    → home/homeState.js

   Import structure:
     home.js imports from the home/ sub-modules.
     Sub-modules that need initHomeTab() or ensureHomeSavedState()
     use dynamic import() to avoid circular references.
   ============================================================ */

import { uiState } from "./uiState.js";
import { clearDivs, setCommandsButtonLabel } from "./uiUtilities.js";
import { setCaptionBar } from "./caption.js";
import { resetHomeState } from "./home/homeState.js";
import { loadHomeManifest } from "./home/homeManifest.js";
import {
  setHomeSubtabs,
  switchHomeView,
  renderHomeCategoriesIfReady
} from "./home/homeNav.js";
import {
  clearHomeCaption,
  setHomeCaption,
  wireHomeCommandsButton
} from "./home/homeMenuCmds.js";


/* ============================================================
   Constants
   ============================================================ */
const HOME_VIEW_CATEGORIES = "categories";
const HOME_VIEW_RESULTS    = "results";


/* ============================================================
   HomeTabSpec
   ============================================================
   Consumed by setUI.js to activate the Home tab.

   setUI.js calls:
     init(restored)  — on cold start or after needsUpdate
     restore()       — when uiState.home.saved exists
     save()          — before leaving the tab (optional)

   The region builders (buildSubtabs, buildCaption, etc.) are
   called by setUI.js during region setup. Most are thin stubs
   here because the real content is driven by loadHomeManifest()
   and switchHomeView() rather than by static builders.
   ============================================================ */
export const HomeTabSpec = {
  name:    "home",
  theme:   "theme-home",
  regions: ["subtabs", "sketchpad", "caption", "text", "action"],

  init:    initHomeTab,
  restore() { restoreHomeTab(); },
  save:    saveHomeState,

  buildSubtabs:   setHomeSubtabs,
  clearCaption:   clearHomeCaption,
  buildCaption:   setHomeCaption,
  buildText:      setHomeText,
  buildAction:    setHomeAction,
  buildSketchpad: setHomeSketchpad
};


/* ============================================================
   ensureHomeSavedState()
   ============================================================
   Guarantees that uiState.home.saved exists with the expected
   shape. Initialises it to the Categories view default if missing.

   Exported so sub-modules can call it via dynamic import without
   duplicating the initialisation logic.

   uiState.home.saved fields:
     view          — "categories" | "results"
     activeStatus  — status string | null
     activeIndex   — number | null
     activeEntry   — manifest entry object | null
   ============================================================ */
export function ensureHomeSavedState() {

  if (!uiState.home) {
    throw new Error("ensureHomeSavedState: uiState.home missing");
  }

  if (!uiState.home.saved) {
    uiState.home.saved = {
      view:         HOME_VIEW_CATEGORIES,
      activeStatus: null,
      activeIndex:  null,
      activeEntry:  null
    };
  }

} // end ensureHomeSavedState


/* ============================================================
   initHomeTab(restored)
   ============================================================
   Cold-start initialiser for the Home tab.

   Called by setUI.js when:
     a) The tab has never been visited (no saved state).
     b) uiState.home.needsUpdate is true (post-rebuild).

   Sequence:
     1. Reset all shared module state to clean defaults.
     2. Clear shared regions.
     3. Wire the commands button and set its label.
     4. Build the subtab bar.
     5. Set placeholder caption and clear action/sketchpad.
     6. Ensure saved state exists and enter the saved view.
     7. Kick the async manifest load (hits disk because cache cleared).

   Arguments:
     restored — true when called with needsUpdate (Refresh & Restore).
                Saved state is preserved and the view is restored.
   ============================================================ */
export function initHomeTab(restored = false) {

  /* ── 1. Reset shared state ──────────────────────────────── */
  resetHomeState();

  /* ── 2. Clear shared regions ────────────────────────────── */
  clearDivs();
  setCommandsButtonLabel("Home Commands");
  wireHomeCommandsButton();

  /* ── 3 & 4. Build minimal UI ────────────────────────────── */
  setHomeSubtabs();
  setHomeCaption("Home");
  setHomeText("Home tab: loading...");
  setHomeAction();
  setHomeSketchpad();

  /* ── 5. Ensure saved state and enter view ───────────────── */
  ensureHomeSavedState();
  switchHomeView(uiState.home.saved.view);

  /* ── 6. Load manifest ───────────────────────────────────── */
  /* Hits disk because resetHomeState() cleared homeManifestLogged. */
  loadHomeManifest();

} // end initHomeTab


/* ============================================================
   restoreHomeTab()
   ============================================================
   Restore path — called when uiState.home.saved exists and the
   tab is being re-activated after a previous visit.

   Unlike initHomeTab(), this path does NOT replace the UI with
   placeholder text. It rebuilds the chrome and re-enters the
   saved view directly.

   Note: switchHomeView() is async but is not awaited here
   because HomeTabSpec.restore() is currently synchronous.
   The view switch still runs; any errors surface in the console.
   ============================================================ */
function restoreHomeTab() {

  clearDivs();
  setCommandsButtonLabel("Home Commands");
  wireHomeCommandsButton();

  ensureHomeSavedState();

  /* Rebuild subtabs first (Results tab appears if activeEntry exists). */
  setHomeSubtabs();

  /* Kick manifest load (uses homeManifestLogged guard to prevent
     duplicate loads if already loaded this session). */
  loadHomeManifest();

  /* Re-enter the saved view deterministically. */
  switchHomeView(uiState.home.saved.view);

} // end restoreHomeTab


/* ============================================================
   saveHomeState()
   ============================================================
   Called by setUI.js before leaving the tab (optional hook).
   Returns the current saved state snapshot for persistence.
   ============================================================ */
export function saveHomeState() {
  ensureHomeSavedState();
  return uiState.home.saved;
} // end saveHomeState


/* ============================================================
   clearHomeLocalState()
   ============================================================
   Resets the local module variables without a full cold start.
   Used by rebuild/sync hooks that need to clear stale data
   without reinitialising the full tab lifecycle.

   Delegates to resetHomeState() in homeState.js.
   ============================================================ */
export function clearHomeLocalState() {
  resetHomeState();
} // end clearHomeLocalState


/* ============================================================
   Region builder stubs
   ============================================================
   These small functions are referenced by HomeTabSpec and called
   by setUI.js during region setup. They provide deterministic
   initial content for each region during cold start.

   They are deliberately thin — the real content for each region
   is driven by loadHomeManifest() and switchHomeView() after
   the manifest data is available.
   ============================================================ */

/* setHomeText(message)
   --------------------
   Writes a simple message into #text. Used as a loading
   placeholder during cold init before manifest data arrives. */
function setHomeText(message) {
  const el = document.getElementById("text");
  if (!el) throw new Error("setHomeText: #text not found");
  el.innerHTML = "";
  const div = document.createElement("div");
  div.textContent = message || "";
  el.appendChild(div);
} // end setHomeText


/* setHomeAction()
   ----------------
   Clears #action. Home does not populate the action region
   directly — scripts running in Results may write to it. */
function setHomeAction() {
  const el = document.getElementById("action");
  if (!el) throw new Error("setHomeAction: #action not found");
  el.innerHTML = "";
} // end setHomeAction


/* setHomeSketchpad()
   ------------------
   Clears #sketchpad and ensures the sketchpad-wrapper is
   visible (clearDivs() hides it by default). */
function setHomeSketchpad() {
  const el = document.getElementById("sketchpad");
  if (!el) throw new Error("setHomeSketchpad: #sketchpad not found");
  el.innerHTML = "";

  const wrapper = document.getElementById("sketchpad-wrapper");
  if (wrapper) wrapper.style.display = "block";
} // end setHomeSketchpad
