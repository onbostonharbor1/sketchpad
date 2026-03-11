/* home.js
   ============================================================
   Home Tab -- Public Entry Point and Lifecycle
   ============================================================
   Role:
     Public entry point for the Home tab. Owns exactly four things:

       1. HomeTabSpec -- the object consumed by setUI.js to drive
          tab activation (init / restore / save).

       2. Lifecycle functions -- initHomeTab(), restoreHomeTab(),
          saveHomeState().

       3. Region builder stubs -- setHomeText(), setHomeAction(),
          setHomeSketchpad().

       4. State guard -- ensureHomeSavedState(). Exported so that
          sub-modules can call it via dynamic import.

   What does NOT live here:
     * Subtabs and category view           -> home/homeNav.js
     * Manifest loading and grouping       -> home/homeManifest.js
     * Results display and rendering       -> home/homeResults.js
     * Caption bar and commands offcanvas  -> home/homeMenuCmds.js
     * Shared module-level state variables -> home/homeState.js
   ============================================================ */

import { clearDivs, setCommandsButtonLabel } from "/ui/uiUtilities.js";
import { setCaptionBar }                     from "/ui/caption.js";
import { resetHomeState }                    from "/ui/home/homeState.js";
import { loadHomeManifest }                  from "/ui/home/homeManifest.js";
import {
  setHomeSubtabs,
  switchHomeView,
  renderHomeCategoriesIfReady
}                                            from "/ui/home/homeNav.js";
import {
  clearHomeCaption,
  setHomeCaption,
  wireHomeCommandsButton
}                                            from "/ui/home/homeMenuCmds.js";


/* ============================================================
   Constants
   ============================================================ */
const HOME_VIEW_CATEGORIES = "categories";
const HOME_VIEW_RESULTS    = "results";


/* ============================================================
   HomeTabSpec
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
   ============================================================ */
export function ensureHomeSavedState() {

  if (!uiState.home)
    throw new Error("ensureHomeSavedState: uiState.home missing");

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
   ============================================================ */
export function initHomeTab(restored = false) {

  resetHomeState();

  clearDivs();
  setCommandsButtonLabel("Home Commands");
  wireHomeCommandsButton();

  setHomeSubtabs();
  setHomeCaption("Home");
  setHomeText("Home tab: loading...");
  setHomeAction();
  setHomeSketchpad();

  ensureHomeSavedState();
  switchHomeView(uiState.home.saved.view);

  loadHomeManifest();

} // end initHomeTab


/* ============================================================
   restoreHomeTab()
   ============================================================ */
function restoreHomeTab() {

  clearDivs();
  setCommandsButtonLabel("Home Commands");
  wireHomeCommandsButton();

  ensureHomeSavedState();
  setHomeSubtabs();
  loadHomeManifest();
  switchHomeView(uiState.home.saved.view);

} // end restoreHomeTab


/* ============================================================
   saveHomeState()
   ============================================================ */
export function saveHomeState() {
  ensureHomeSavedState();
  return uiState.home.saved;
} // end saveHomeState


/* ============================================================
   clearHomeLocalState()
   ============================================================ */
export function clearHomeLocalState() {
  resetHomeState();
} // end clearHomeLocalState


/* ============================================================
   Region builder stubs
   ============================================================ */
function setHomeText(message) {
  const el = document.getElementById("text");
  if (!el) throw new Error("setHomeText: #text not found");
  el.innerHTML = "";
  const div = document.createElement("div");
  div.textContent = message || "";
  el.appendChild(div);
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
  const wrapper = document.getElementById("sketchpad-wrapper");
  if (wrapper) wrapper.style.display = "block";
} // end setHomeSketchpad
