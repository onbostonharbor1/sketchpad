/* galleryMenuCmds.js
   ------------------------------------------------------------
   Gallery Tab Ã¢â‚¬â€ Menu Commands (Adapter Layer)
   ------------------------------------------------------------
*/

import { menuManager } from "./menuManager.js";
import { manifest } from "./manifest.js";
import { showScriptOffcanvas } from "./menuCmds.js";
import { openEditManifestDialog } from "./menuCmds.js";
import { refreshGalleryFromManifestEdit } from "./gallery.js";

/* ============================================================
   archiveGalleryItem(info)
   ------------------------------------------------------------
   1. Ensure cache warm before reading list length.
   2. Calculate next index.
   3. Archive.
   4. Clear cache.
   5. Navigate in-place — no page reload.
============================================================ */
export async function archiveGalleryItem(info) {
  if (!window.confirm(`Archive "${info.title || info.filename}"?`)) return;

  const { domain, category } = info;
  const currentIndex = uiState.gallery.saved?.index ?? 0;

  // 1. Ensure the gallery cache is warm before reading from it.
  //    It may be cold if this is the first operation in a session,
  //    or if a previous action cleared it.
  const { ensureGalleryCacheLoaded, restoreGalleryTab, initGalleryTab,
          getGalleryCache, clearGalleryCache } =
    await import("./gallery.js");
  await ensureGalleryCacheLoaded();

  const list = getGalleryCache()?.[domain]?.[category] ?? [];

  // 2. Calculate where to navigate after removal.
  const stayInResultsView = list.length > 1;
  let nextIndex = currentIndex;
  if (currentIndex >= list.length - 1) {
    nextIndex = Math.max(0, currentIndex - 1);
  }

  // 3. Perform the archive (moves file on disk).
  const { archiveItem } = await import("./menuCmds.js");
  await archiveItem({
    payload: { manifestPath: info.manifestPath, filename: info.filename },
    showAlert: false
  });

  // 4. Clear the stale cache so the next load hits disk.
  clearGalleryCache();

  // 5. Navigate immediately without a page reload.
  await ensureGalleryCacheLoaded();

  if (stayInResultsView) {
    uiState.gallery.saved = {
      view: "results",
      domain,
      category,
      index: nextIndex
    };
    await restoreGalleryTab();
  } else {
    // Category now empty — go back to category list.
    uiState.gallery.saved = {
      view: "categories",
      domain,
      category: null,
      index: null
    };
    await initGalleryTab(false);
  }
}

/* ============================================================
   showGalleryScript(info)
=========================================================== */
function showGalleryScript(info) {
  if (!info) throw new Error("showGalleryScript: info missing");
  if (!info.isScript) return;
  const scriptPath = info.scriptPath;
  const label = info.filename || info.title || "(untitled)";
  if (!scriptPath) throw new Error("showGalleryScript: scriptPath missing");
  showScriptOffcanvas(String(scriptPath), String(label));
}

/* ============================================================
   editGalleryManifestItem(info)
=========================================================== */
async function editGalleryManifestItem(info) {
  if (!info) throw new Error("editGalleryManifestItem: info missing");
  const manifestPath = info.manifestPath;
  const matchField   = info.matchField;
  const matchValue   = info.matchValue;

  if (!manifestPath) throw new Error("editGalleryManifestItem: manifestPath missing");
  if (!matchField)   throw new Error("editGalleryManifestItem: matchField missing");
  if (!matchValue)   throw new Error("editGalleryManifestItem: matchValue missing");

  const ok = await openEditManifestDialog({
    dialogTitle:   "Edit Manifest",
    manifestPath:  String(manifestPath),
    matchField:    String(matchField),
    matchValue:    String(matchValue),
    fileLabel:     String(info.filename || info.title || matchValue),
    initialTitle:  String(info.title  || ""),
    initialStatus: String(info.status || ""),
    statusPresets: ["new", "working", "current", "favorite"],
    allowCustomStatus: true,
    allowClearStatus:  true
  });

  if (!ok) return;
  await refreshGalleryFromManifestEdit();
}

/* ============================================================
   getGalleryCaptionMenuItems(info)
=========================================================== */
export async function getGalleryCaptionMenuItems(info) {
  if (!info) throw new Error("getGalleryCaptionMenuItems: info missing");
  const items = [];

  // Help
  if (info.helpKey) {
    const helpItem = await menuManager.buildHelpItem("gallery", info.helpKey, {
      subdirs: info.helpSubdirs
    });
    items.push(helpItem);
  } else {
    items.push({ label: "Help", disabled: true, onClick: () => {} });
  }

  // Show Script
  items.push({
    label: "Show Script",
    disabled: !info.isScript,
    tooltip: "View the source code for this gallery item",
    onClick: () => showGalleryScript(info)
  });

  // Edit Manifest
  items.push({
    label: "Edit Manifest",
    disabled: false,
    tooltip: "Edit title, status, and other metadata",
    onClick: async () => {
      await editGalleryManifestItem(info);
    }
  });

  // Archive
  items.push({
    label: "Archive",
    disabled: false,
    tooltip: "Move this item to archive folder",
    onClick: async () => {
      await archiveGalleryItem(info);
    }
  });

  return items;
}
