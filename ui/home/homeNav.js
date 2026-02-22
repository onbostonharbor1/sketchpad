/* homeNav.js
   ============================================================
   Home Tab — Subtabs, Category View, and Tab Launch
   ============================================================
   Role:
     Owns the subtab bar, the category view rendering, and the
     helpers that launch other tabs from within Home.

     Shared subtab mechanics are delegated to
     resultsViewController.js. This file supplies the
     Home-specific adapter and owns the category descriptor
     builder (which is unique to Home due to its drawRegistry
     launch path).

   Architectural rules:
     • Does NOT own the TabSpec, init(), or restore(). home.js.
     • Does NOT load or parse the manifest. homeManifest.js.
     • Does NOT render results. homeResults.js.
     • Does NOT build caption bars or commands panels. homeMenuCmds.js.
     • Reads homeManifestGrouped from homeState.js via getter.

   Exports:
     setHomeSubtabs()                    — build/rebuild the subtab bar
     activateHomeSubtabButton(viewKey)   — highlight the active subtab
     switchHomeView(viewKey)             — transition between views
     renderHomeCategories(grouped)       — render category frames
     renderHomeCategoriesIfReady()       — render if data is available
   ============================================================ */

import { renderCategories } from "../categories.js";
import { buildSubtabBar, activateSubtab } from "../resultsViewController.js";
import { getHomeManifestGrouped } from "./homeState.js";


/* ============================================================
   Constants — view keys must stay in sync with home.js
   ============================================================ */
const HOME_VIEW_CATEGORIES = "categories";
const HOME_VIEW_RESULTS    = "results";

const CATEGORIES_ID = "home-categories";
const RESULTS_ID    = "home-results";
const CSS_CLASS     = "home-subtabs";


/* ============================================================
   buildHomeAdapter()
   ============================================================
   Returns the RVCAdapter for the Home tab.

   The Results subtab is conditional — it only appears once
   an entry has been selected (activeEntry is set).
   ============================================================ */
function buildHomeAdapter() {
  return {
    cssClass: CSS_CLASS,

    getActiveId() {
      const view = uiState.home?.saved?.view;
      return (view === HOME_VIEW_RESULTS) ? RESULTS_ID : CATEGORIES_ID;
    },

    tabs: [
      {
        id:    CATEGORIES_ID,
        label: "Categories",
        async onClick() {
          await switchHomeView(HOME_VIEW_CATEGORIES);
        }
      },
      {
        id:        RESULTS_ID,
        label:     "Results",
        condition: () => !!uiState.home?.saved?.activeEntry,
        async onClick() {
          await switchHomeView(HOME_VIEW_RESULTS);
        }
      }
    ]
  };
} // end buildHomeAdapter


/* ============================================================
   setHomeSubtabs()
   ============================================================
   Builds the Home subtab bar inside #subtabs.

   The Categories subtab is always present. The Results subtab
   is added only when uiState.home.saved.activeEntry exists.

   Safe to call repeatedly — replaces inner HTML each time.
   ============================================================ */
export function setHomeSubtabs() {

  const saved = uiState.home?.saved;
  if (!saved) throw new Error("setHomeSubtabs: uiState.home.saved missing");

  buildSubtabBar(buildHomeAdapter());

} // end setHomeSubtabs


/* ============================================================
   activateHomeSubtabButton(viewKey)
   ============================================================
   Highlights the subtab button for the given view key.
   Pure visual operation — does not change uiState.
   ============================================================ */
export function activateHomeSubtabButton(viewKey) {

  const activeId = (viewKey === HOME_VIEW_RESULTS) ? RESULTS_ID : CATEGORIES_ID;
  activateSubtab(CSS_CLASS, activeId);

} // end activateHomeSubtabButton


/* ============================================================
   switchHomeView(viewKey)
   ============================================================
   Transitions the Home tab between its two views.
   ============================================================ */
export async function switchHomeView(viewKey) {

  const saved = uiState.home?.saved;
  if (!saved) throw new Error("switchHomeView: uiState.home.saved missing");

  saved.view = viewKey;

  setHomeSubtabs();
  activateHomeSubtabButton(viewKey);

  /* ── Categories view ─────────────────────────────────────── */
  if (viewKey === HOME_VIEW_CATEGORIES) {

    const captionDiv = document.getElementById("caption");
    if (!captionDiv) throw new Error("switchHomeView: #caption not found");
    captionDiv.innerHTML = "";

    const padDiv = document.getElementById("sketchpad");
    if (!padDiv) throw new Error("switchHomeView: #sketchpad not found");
    padDiv.innerHTML = "";

    const actionDiv = document.getElementById("action");
    if (!actionDiv) throw new Error("switchHomeView: #action not found");
    actionDiv.innerHTML = "";

    renderHomeCategoriesIfReady();
    return;
  }

  /* ── Results view ────────────────────────────────────────── */
  if (viewKey === HOME_VIEW_RESULTS) {
    const { renderHomeResults } = await import("./homeResults.js");
    await renderHomeResults();
    return;
  }

  throw new Error("switchHomeView: unknown viewKey: " + viewKey);

} // end switchHomeView


/* ============================================================
   renderHomeCategoriesIfReady()
   ============================================================
   Renders categories if manifest data is loaded, otherwise
   shows a loading message.
   ============================================================ */
export function renderHomeCategoriesIfReady() {

  const grouped = getHomeManifestGrouped();

  if (!grouped) {
    const el = document.getElementById("text");
    if (!el) throw new Error("renderHomeCategoriesIfReady: #text not found");
    el.innerHTML = "Home: loading...";
    return;
  }

  renderHomeCategories(grouped);

} // end renderHomeCategoriesIfReady


/* ============================================================
   renderHomeCategories(grouped)
   ============================================================
   Builds the category descriptor and renders to #text.
   ============================================================ */
export function renderHomeCategories(grouped) {

  const frames = buildHomeCategoryDescriptor(grouped);
  renderCategories("text", frames);

} // end renderHomeCategories


/* ============================================================
   buildHomeCategoryDescriptor(grouped)
   ============================================================
   Converts the grouped manifest map into the descriptor array
   for renderCategories(). Home has unique click logic:
     • drawRegistry entries → launch Draw tab
     • All others → enter Results view
   ============================================================ */
function buildHomeCategoryDescriptor(grouped) {

  const statuses = Object.keys(grouped).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  return statuses.map((status) => {

    const items = grouped[status] || [];

    return {
      title: status,
      items: items.map((entry) => {

        const name = entry.title || entry.file;

        return {
          name,
          hasSubitems: false,

          onClick: () => {

            const saved = uiState.home?.saved;
            if (!saved) throw new Error("buildHomeCategoryDescriptor onClick: uiState.home.saved missing");

            /* ── drawRegistry launch path ─────────────────── */
            if (entry.sourceType === "drawRegistry") {

              if (!entry.registryKey) {
                throw new Error("Home launcher: drawRegistry entry missing registryKey");
              }

              saved.view         = HOME_VIEW_CATEGORIES;
              saved.activeStatus = null;
              saved.activeEntry  = null;
              saved.activeIndex  = null;

              uiState.launch.pending     = true;
              uiState.launch.sourceTab   = "home";
              uiState.launch.targetTab   = "draw";
              uiState.launch.sourceType  = "drawRegistry";
              uiState.launch.registryKey = entry.registryKey;

              launchTabViaSetUI("draw").catch((err) => { throw err; });
              return;
            }

            /* ── Normal Home Results path ─────────────────── */
            saved.view         = HOME_VIEW_RESULTS;
            saved.activeStatus = status;
            saved.activeEntry  = entry;
            saved.activeIndex  = null;

            switchHomeView(HOME_VIEW_RESULTS);

            import("./homeMenuCmds.js").then((m) => {
              m.setHomeCaptionForResult(entry);
            });

          } // end onClick

        };
      })
    };
  });

} // end buildHomeCategoryDescriptor


/* ============================================================
   launchTabViaSetUI(tabKey)
   ============================================================
   Switches to another tab via dynamic import of setUI.js to
   avoid a circular dependency (setUI imports home.js).
   ============================================================ */
function launchTabViaSetUI(tabKey) {

  if (!tabKey) throw new Error("launchTabViaSetUI: tabKey missing");

  return import("../setUI.js").then((mod) => {
    if (typeof mod.setUI !== "function") {
      throw new Error("launchTabViaSetUI: setUI export missing");
    }
    mod.setUI(tabKey);
  });

} // end launchTabViaSetUI
