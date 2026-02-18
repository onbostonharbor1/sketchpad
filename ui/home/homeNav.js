/* homeNav.js
   ============================================================
   Home Tab — Subtabs, Category View, and Tab Launch
   ============================================================
   Role:
     Owns the subtab bar, the category view rendering, and the
     helpers that launch other tabs from within Home.

     Home has a simpler subtab model than Gallery — it has only
     two views (Categories and Results) rather than domain-based
     subtabs. The Results subtab appears lazily once an entry has
     been selected and stays visible for the rest of the session.

     The category descriptor builder lives here because it is
     tightly coupled to the click handlers that drive navigation —
     each click either launches Draw (for drawRegistry entries)
     or transitions the tab into the Results view.

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
import { getHomeManifestGrouped } from "./homeState.js";


/* ============================================================
   Constants — view keys must stay in sync with home.js
   ============================================================ */
const HOME_VIEW_CATEGORIES = "categories";
const HOME_VIEW_RESULTS    = "results";


/* ============================================================
   setHomeSubtabs()
   ============================================================
   Builds the Home subtab bar inside #subtabs.

   The Categories subtab is always present. The Results subtab
   is added only when uiState.home.saved.activeEntry exists —
   i.e. once the user has selected an item, Results stays
   available for the rest of the session.

   This function is safe to call repeatedly — it replaces the
   inner HTML each time so stale buttons do not accumulate.

   Called by:
     initHomeTab()      — on cold start
     restoreHomeTab()   — on tab restore
     switchHomeView()   — after every view transition so the
                          active state stays in sync
   ============================================================ */
export function setHomeSubtabs() {

  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setHomeSubtabs: #subtabs not found");

  /* Import ensureHomeSavedState lazily to avoid circular import
     with home.js (which imports from here). */
  const saved = uiState.home?.saved;
  if (!saved) throw new Error("setHomeSubtabs: uiState.home.saved missing");

  el.innerHTML = "";

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs home-subtabs";
  el.appendChild(bar);

  /* Categories subtab — always present. */
  addHomeSubtabButton(bar, "Categories", HOME_VIEW_CATEGORIES);

  /* Results subtab — only visible once an entry has been selected. */
  if (saved.activeEntry) {
    addHomeSubtabButton(bar, "Results", HOME_VIEW_RESULTS);
  }

  /* Activate whichever view is currently saved. */
  activateHomeSubtabButton(saved.view);

} // end setHomeSubtabs


/* ============================================================
   addHomeSubtabButton(barEl, label, viewKey)
   ============================================================
   Creates a single <li><button> subtab element and appends it
   to the given <ul> container.

   Arguments:
     barEl   — the <ul> subtab bar to append into
     label   — visible button text
     viewKey — "categories" | "results"
   ============================================================ */
function addHomeSubtabButton(barEl, label, viewKey) {

  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className    = "nav-link";
  btn.textContent  = label;
  btn.dataset.view = viewKey;

  btn.addEventListener("click", async () => {
    await switchHomeView(viewKey);
  });

  li.appendChild(btn);
  barEl.appendChild(li);

} // end addHomeSubtabButton


/* ============================================================
   activateHomeSubtabButton(viewKey)
   ============================================================
   Applies the "active" CSS class to the subtab button whose
   data-view attribute matches viewKey, removing it from all
   others.

   This is a pure visual operation — it does not change uiState.
   Callers are responsible for updating uiState.home.saved.view
   before calling this function.

   Arguments:
     viewKey — "categories" | "results"
   ============================================================ */
export function activateHomeSubtabButton(viewKey) {

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


/* ============================================================
   switchHomeView(viewKey)
   ============================================================
   Transitions the Home tab between its two views.

   For Categories view:
     • Updates uiState.home.saved.view.
     • Rebuilds and activates subtabs.
     • Clears caption, sketchpad, and action regions.
     • Renders categories if manifest data is ready.

   For Results view:
     • Updates uiState.home.saved.view.
     • Rebuilds and activates subtabs.
     • Delegates to renderHomeResults() in homeResults.js.

   Arguments:
     viewKey — "categories" | "results"
   ============================================================ */
export async function switchHomeView(viewKey) {

  const saved = uiState.home?.saved;
  if (!saved) throw new Error("switchHomeView: uiState.home.saved missing");

  /* ── Update saved view ──────────────────────────────────── */
  saved.view = viewKey;

  /* ── Rebuild subtabs (Results tab appears if entry exists) ─ */
  setHomeSubtabs();
  activateHomeSubtabButton(viewKey);

  /* ── Categories view ────────────────────────────────────── */
  if (viewKey === HOME_VIEW_CATEGORIES) {

    /* Caption is not used in Categories view. */
    const captionDiv = document.getElementById("caption");
    if (!captionDiv) throw new Error("switchHomeView: #caption not found");
    captionDiv.innerHTML = "";

    /* Clear sketchpad so prior drawings do not persist. */
    const padDiv = document.getElementById("sketchpad");
    if (!padDiv) throw new Error("switchHomeView: #sketchpad not found");
    padDiv.innerHTML = "";

    /* Clear action area. */
    const actionDiv = document.getElementById("action");
    if (!actionDiv) throw new Error("switchHomeView: #action not found");
    actionDiv.innerHTML = "";

    renderHomeCategoriesIfReady();
    return;
  }

  /* ── Results view ───────────────────────────────────────── */
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
   Renders the category frames if the manifest data has been
   loaded and grouped. If the data is not yet ready, shows a
   brief loading message in #text instead.

   This is called speculatively — it may be called before the
   async manifest load completes (e.g. during init or restore).
   The manifest loader calls renderHomeCategories() directly
   once its async work finishes.

   Called by:
     switchHomeView(HOME_VIEW_CATEGORIES)
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
   Builds the category descriptor array from the grouped manifest
   data and hands it to renderCategories() for DOM construction.

   Arguments:
     grouped — { statusKey: [entry, ...], ... }

   Called by:
     renderHomeCategoriesIfReady() — when data is already loaded
     loadHomeManifest_async()      — immediately after loading,
                                     if tab is in Categories view
   ============================================================ */
export function renderHomeCategories(grouped) {

  const frames = buildHomeCategoryDescriptor(grouped);
  renderCategories("text", frames);

} // end renderHomeCategories


/* ============================================================
   buildHomeCategoryDescriptor(grouped)
   ============================================================
   Converts the grouped manifest map into the descriptor array
   format expected by renderCategories() in categories.js.

   Each entry click does one of two things:
     • drawRegistry entries — launch the Draw tab and preserve
       Home in the Categories view. Home Results is not entered
       because drawRegistry items are not runnable modules.
     • All other entries — record the selection in uiState and
       transition into the Results view.

   Arguments:
     grouped — { statusKey: [entry, ...], ... }

   Returns:
     Array of category frame descriptors for renderCategories()
   ============================================================ */
function buildHomeCategoryDescriptor(grouped) {

  /* Sort statuses alphabetically for consistent display order. */
  const statuses = Object.keys(grouped).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  const frames = statuses.map((status) => {

    const items = grouped[status] || [];

    return {
      title: status,
      items: items.map((entry) => {

        /* Use title if available; fall back to filename. */
        const name = entry.title || entry.file;

        return {
          name,
          hasSubitems: false,

          onClick: () => {

            const saved = uiState.home?.saved;
            if (!saved) throw new Error("buildHomeCategoryDescriptor onClick: uiState.home.saved missing");

            /* ── drawRegistry launch path ─────────────────── */
            /* These items open in Draw, not in Home Results.
               Home state stays on Categories with no active entry. */
            if (entry.sourceType === "drawRegistry") {

              if (!entry.registryKey) {
                throw new Error("Home launcher: drawRegistry entry missing registryKey");
              }

              /* Keep Home stable at Categories view. */
              saved.view         = HOME_VIEW_CATEGORIES;
              saved.activeStatus = null;
              saved.activeEntry  = null;
              saved.activeIndex  = null;

              /* Signal the launch intent via uiState.launch. */
              uiState.launch.pending     = true;
              uiState.launch.sourceTab   = "home";
              uiState.launch.targetTab   = "draw";
              uiState.launch.sourceType  = "drawRegistry";
              uiState.launch.registryKey = entry.registryKey;

              /* Switch tabs via dynamic import to avoid circular reference. */
              launchTabViaSetUI("draw").catch((err) => { throw err; });
              return;
            }

            /* ── Normal Home Results path ─────────────────── */
            /* Record selection and transition into Results view. */
            saved.view         = HOME_VIEW_RESULTS;
            saved.activeStatus = status;
            saved.activeEntry  = entry;
            saved.activeIndex  = null;

            switchHomeView(HOME_VIEW_RESULTS);

            /* Build caption immediately for the selected entry. */
            import("./homeMenuCmds.js").then((m) => {
              m.setHomeCaptionForResult(entry);
            });

          } // end onClick

        };
      })
    };
  });

  return frames;

} // end buildHomeCategoryDescriptor


/* ============================================================
   launchTabViaSetUI(tabKey)
   ============================================================
   Switches to another tab by dynamically importing setUI.js
   and calling setUI(tabKey).

   Dynamic import is essential here because setUI.js imports
   home.js at the top level. A static import of setUI.js from
   any home sub-module would create a circular dependency that
   the ES module loader cannot resolve.

   Arguments:
     tabKey — the tab key string (e.g. "draw", "patterns")
   ============================================================ */
function launchTabViaSetUI(tabKey) {

  if (!tabKey) throw new Error("launchTabViaSetUI: tabKey missing");

  return import("../setUI.js").then((mod) => {
    if (typeof mod.setUI !== "function") {
      throw new Error("launchTabViaSetUI: setUI export missing from setUI.js");
    }
    mod.setUI(tabKey);
  });

} // end launchTabViaSetUI
