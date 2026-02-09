/* galleryMenuCmds.js
   ------------------------------------------------------------
   Gallery Tab â€” Menu Commands (Adapter Layer)
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
   Matches archivePatternsItem logic exactly:
   1. Calc Next Index.
   2. Archive.
   3. Clear Cache.
   4. Save "Bookmark" state to sessionStorage.
============================================================ */
export async function archiveGalleryItem(info) {
  if (!window.confirm(`Archive "${info.title || info.filename}"?`)) return;

  const { archiveItem } = await import("./menuCmds.js");

  // 1. Perform server-side work first
  const result = await archiveItem({
    payload: { manifestPath: info.manifestPath, filename: info.filename },
    showAlert: false
  });

  if (result?.status === "ok") {
    const { domain, category } = info;
    const list = manifest.cache.gallery[domain][category];
    const currentIndex = uiState.gallery.saved.index;

    // 2. Determine new bookmark
    if (list.length > 1) {
      const nextIndex = (currentIndex === list.length - 1) ? currentIndex - 1 : currentIndex;

      sessionStorage.setItem("sketchpad.gallery.saved", JSON.stringify({
        view: "results",
        domain,
        category,
        index: nextIndex
      }));
    } else {
      // Category is now empty
      sessionStorage.removeItem("sketchpad.gallery.saved");
    }

    // 3. Single point of truth: Reload the app to the new bookmark
    window.location.reload();
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
