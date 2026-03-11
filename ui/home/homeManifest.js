/* homeManifest.js
   ============================================================
   Home Tab -- Manifest Loading and Grouping
   ============================================================
   Role:
     Owns everything related to loading /home/manifest.json,
     grouping its entries by status, and refreshing the grouped
     data after a manifest edit.

   Architectural rules:
     * Does NOT render category frames. homeNav.js.
     * Does NOT display results. homeResults.js.
     * Reads and writes homeState.js via getters and setters.
     * refreshHomeCategoriesFromManifestEdit() is the single
       re-entry point after any Home manifest mutation.

   Exports:
     loadHomeManifest()
     loadHomeManifest_async()
     groupHomeEntriesByStatus(list)
     refreshHomeCategoriesFromManifestEdit()
   ============================================================ */

import { manifest }   from "/ui/manifest.js";
import { fileLayer }  from "/ui/fileLayer.js";
import {
  getHomeManifestGrouped,
  setHomeManifestGrouped
}                     from "./homeState.js";


/* ============================================================
   Constants
   ============================================================ */
const HOME_VIEW_CATEGORIES = "categories";
const HOME_VIEW_RESULTS    = "results";


/* ============================================================
   loadHomeManifest()
   ============================================================ */
export function loadHomeManifest() {
  loadHomeManifest_async().catch((err) => {
    console.error("Home manifest load FAILED", err);
    throw err;
  });
} // end loadHomeManifest


/* ============================================================
   loadHomeManifest_async()
   ============================================================ */
export async function loadHomeManifest_async() {

  let data;

  if (Object.prototype.hasOwnProperty.call(manifest.cache, "home")) {
    data = manifest.cache["home"];
  } else {
    data = await fileLayer.loadJSON("/home/manifest.json");
    if (!Array.isArray(data)) {
      throw new Error("Home manifest must be a flat array (got non-array)");
    }
    manifest.cache["home"] = data;
  }

  const grouped = groupHomeEntriesByStatus(data);
  setHomeManifestGrouped(grouped);

  if (uiState.home?.saved?.view === HOME_VIEW_CATEGORIES) {
    const { renderHomeCategories } = await import("/ui/home/homeNav.js");
    renderHomeCategories(grouped);
  }

} // end loadHomeManifest_async


/* ============================================================
   groupHomeEntriesByStatus(list)
   ============================================================ */
export function groupHomeEntriesByStatus(list) {

  const grouped = {};

  list.forEach((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("Home manifest contains a non-object entry");
    }

    const status = entry.status;
    if (typeof status !== "string") return;
    if (status.trim() === "")       return;

    if (!grouped[status]) grouped[status] = [];
    grouped[status].push(entry);
  });

  return grouped;

} // end groupHomeEntriesByStatus


/* ============================================================
   refreshHomeCategoriesFromManifestEdit()
   ============================================================ */
export async function refreshHomeCategoriesFromManifestEdit() {

  manifest.clearCache();

  await loadHomeManifest_async();

  const { ensureHomeSavedState } = await import("/ui/home/home.js");
  ensureHomeSavedState();

  if (uiState.home.saved.view !== HOME_VIEW_RESULTS) return;

  const active = uiState.home.saved.activeEntry;
  if (!active) return;

  const entryPath = active.path;
  if (!entryPath) {
    throw new Error("refreshHomeCategoriesFromManifestEdit: activeEntry.path missing");
  }

  const data  = manifest.cache["home"] || [];
  const match = data.find((e) => e && e.path === entryPath);

  const { switchHomeView } = await import("/ui/home/homeNav.js");

  if (!match) {
    uiState.home.saved.view         = HOME_VIEW_CATEGORIES;
    uiState.home.saved.activeStatus = null;
    uiState.home.saved.activeIndex  = null;
    uiState.home.saved.activeEntry  = null;
    await switchHomeView(HOME_VIEW_CATEGORIES);
    return;
  }

  const status = match.status;
  if (typeof status !== "string" || status.trim() === "") {
    uiState.home.saved.view         = HOME_VIEW_CATEGORIES;
    uiState.home.saved.activeStatus = null;
    uiState.home.saved.activeIndex  = null;
    uiState.home.saved.activeEntry  = null;
    await switchHomeView(HOME_VIEW_CATEGORIES);
    return;
  }

  if (typeof match.title === "string") active.title  = match.title;
  if (typeof match.file  === "string") active.file   = match.file;
  active.status = String(match.status);

  uiState.home.saved.activeStatus = active.status;

} // end refreshHomeCategoriesFromManifestEdit
