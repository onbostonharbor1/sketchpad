/* homeManifest.js
   ============================================================
   Home Tab — Manifest Loading and Grouping
   ============================================================
   Role:
     Owns everything related to loading /home/manifest.json,
     grouping its entries by status, and refreshing the grouped
     data after a manifest edit.

     The Home manifest is a flat array of entry objects, each
     with at minimum a "path" and "status" field. Unlike the
     gallery and patterns manifests (which are loaded via the
     central ManifestManager), the Home manifest is loaded
     directly via fileLayer.loadJSON() because it has a simpler,
     flat structure that does not require the registry/category
     abstraction.

   Architectural rules:
     • Does NOT render category frames. That is homeNav.js.
     • Does NOT display results. That is homeResults.js.
     • Reads and writes homeState.js via getters and setters.
     • refreshHomeCategoriesFromManifestEdit() is the single
       re-entry point after any Home manifest mutation.

   Exports:
     loadHomeManifest()                      — one-shot kick
     loadHomeManifest_async(forceReload)     — the actual async load
     groupHomeEntriesByStatus(list)          — pure grouping utility
     refreshHomeCategoriesFromManifestEdit() — post-edit refresh
   ============================================================ */

import { fileLayer } from "../fileLayer.js";
import {
  getHomeManifestLogged,
  setHomeManifestLogged,
  getHomeManifestData,
  setHomeManifestData,
  setHomeManifestGrouped
} from "./homeState.js";


/* ============================================================
   Constants — view keys must stay in sync with home.js
   ============================================================ */
const HOME_VIEW_CATEGORIES = "categories";
const HOME_VIEW_RESULTS    = "results";


/* ============================================================
   loadHomeManifest()
   ============================================================
   One-shot entry point for kicking the async manifest load.

   Uses the homeManifestLogged flag (from homeState.js) to
   prevent repeated disk reads within a single session. The
   flag is reset by resetHomeState() on cold start, so a
   full tab reinit always triggers a fresh load.

   Errors are surfaced loudly via console.error and rethrow
   rather than being swallowed, consistent with the fail-fast
   architecture used throughout the app.

   Called by:
     initHomeTab()    — on cold start
     restoreHomeTab() — on tab restore
   ============================================================ */
export function loadHomeManifest() {

  /* Guard: only load once per session unless reset. */
  if (getHomeManifestLogged()) return;

  setHomeManifestLogged(true);

  /* Kick the async work. Errors surface loudly in the console. */
  loadHomeManifest_async().catch((err) => {
    console.error("Home manifest load FAILED", err);
    throw err;
  });

} // end loadHomeManifest


/* ============================================================
   loadHomeManifest_async(forceReload)
   ============================================================
   Loads /home/manifest.json from disk, groups the entries by
   status, and triggers category rendering if the tab is
   currently in the Categories view.

   The forceReload argument appends a cache-busting query string
   so the browser does not serve a stale version after a rebuild
   or manifest edit.

   Sequence:
     1. Fetch JSON from disk (with optional cache bust).
     2. Validate it is a flat array.
     3. Store raw data in homeState.
     4. Group by status and store grouped map in homeState.
     5. If the tab is currently in Categories view, trigger
        renderHomeCategories() via homeNav.js.

   Arguments:
     forceReload — if true, appends ?v=<timestamp> to the URL
   ============================================================ */
export async function loadHomeManifest_async(forceReload) {

  const basePath    = "/home/manifest.json";
  const manifestUrl = forceReload
    ? (basePath + "?v=" + Date.now())
    : basePath;

  const data = await fileLayer.loadJSON(manifestUrl);

  if (!Array.isArray(data)) {
    throw new Error("Home manifest must be a flat array (got non-array)");
  }

  /* Store raw data and grouped map in shared state. */
  setHomeManifestData(data);
  const grouped = groupHomeEntriesByStatus(data);
  setHomeManifestGrouped(grouped);

  /* If in Categories view, render immediately now that data is ready. */
  if (uiState.home?.saved?.view === HOME_VIEW_CATEGORIES) {
    /* Import lazily to avoid circular dependency with homeNav.js. */
    const { renderHomeCategories } = await import("./homeNav.js");
    renderHomeCategories(grouped);
  }

} // end loadHomeManifest_async


/* ============================================================
   groupHomeEntriesByStatus(list)
   ============================================================
   Pure grouping function — converts the flat manifest array
   into a map keyed by status string.

   Entries with a missing or blank status are silently skipped.
   This is intentional: items without a status are considered
   inactive and must not appear in the Home categories view.

   Arguments:
     list — flat array of manifest entry objects

   Returns:
     { statusKey: [entry, entry, ...], ... }
   ============================================================ */
export function groupHomeEntriesByStatus(list) {

  const grouped = {};

  list.forEach((entry) => {

    if (!entry || typeof entry !== "object") {
      throw new Error("Home manifest contains a non-object entry");
    }

    const status = entry.status;

    /* Skip entries with missing or blank status — they are inactive. */
    if (typeof status !== "string") return;
    if (status.trim() === "")       return;

    if (!grouped[status]) grouped[status] = [];
    grouped[status].push(entry);

  });

  return grouped;

} // end groupHomeEntriesByStatus


/* ============================================================
   refreshHomeCategoriesFromManifestEdit()
   ============================================================
   Re-syncs the Home tab after a manifest has been mutated
   (via Edit Manifest in the caption menu).

   This is the single re-entry point after any Home manifest
   change. It:
     1. Clears the in-memory manifest data to force a fresh load.
     2. Reloads and regroups from disk (with cache bust).
     3. Inspects the current saved view and active entry.
     4. Decides whether to stay in Results or bounce to Categories.

   Decision rules:
     • Entry removed from manifest    → bounce to Categories.
     • Entry status cleared/blank     → bounce to Categories.
     • Entry status changed (non-empty) → stay in Results, sync
       the saved entry fields so the next Edit dialog seeds
       the correct current values.

   Exported for use by homeMenuCmds.js (called after Edit Manifest
   dialog confirms).
   ============================================================ */
export async function refreshHomeCategoriesFromManifestEdit() {

  /* ── 1. Clear in-memory data to force a fresh disk read ─── */
  setHomeManifestData(null);
  setHomeManifestGrouped(null);

  /* ── 2. Reload from disk with cache bust ────────────────── */
  await loadHomeManifest_async(true);

  /* ── 3. Check current view and active entry ─────────────── */
  /* Import ensureHomeSavedState lazily to avoid circular import. */
  const { ensureHomeSavedState } = await import("../home.js");
  ensureHomeSavedState();

  /* Nothing to do if not in Results view. */
  if (uiState.home.saved.view !== HOME_VIEW_RESULTS) return;

  const active = uiState.home.saved.activeEntry;
  if (!active) return;

  const entryPath = active.path;
  if (!entryPath) {
    throw new Error("refreshHomeCategoriesFromManifestEdit: activeEntry.path missing");
  }

  /* ── 4. Find the entry in the freshly loaded manifest ───── */
  const data  = getHomeManifestData();
  const match = data.find((e) => e && e.path === entryPath);

  const { switchHomeView } = await import("./homeNav.js");

  /* Case 1: Entry was removed from manifest entirely. */
  if (!match) {
    uiState.home.saved.view         = HOME_VIEW_CATEGORIES;
    uiState.home.saved.activeStatus = null;
    uiState.home.saved.activeIndex  = null;
    uiState.home.saved.activeEntry  = null;
    await switchHomeView(HOME_VIEW_CATEGORIES);
    return;
  }

  /* Case 2: Entry exists but status was cleared or blanked. */
  const status = match.status;
  if (typeof status !== "string" || status.trim() === "") {
    uiState.home.saved.view         = HOME_VIEW_CATEGORIES;
    uiState.home.saved.activeStatus = null;
    uiState.home.saved.activeIndex  = null;
    uiState.home.saved.activeEntry  = null;
    await switchHomeView(HOME_VIEW_CATEGORIES);
    return;
  }

  /* Case 3: Entry still exists with a non-empty status.
     Stay in Results but sync the saved entry so the next Edit
     dialog seeds the correct current title/status. */
  if (typeof match.title === "string") active.title  = match.title;
  if (typeof match.file  === "string") active.file   = match.file;
  active.status = String(match.status);

  /* Keep activeStatus consistent with the updated entry. */
  uiState.home.saved.activeStatus = active.status;

} // end refreshHomeCategoriesFromManifestEdit
