/* galleryMenuCmds.js
   ------------------------------------------------------------
   Gallery Tab — Menu Commands (Adapter Layer)
   ------------------------------------------------------------
   Rules:
     • Consumes ONLY the `info` object passed from gallery.js
     • Does NOT derive context from uiState
     • Delegates generic work to menuCmds.js
   ------------------------------------------------------------
*/

import { menuManager } from "./menuManager.js";
import { manifest } from "./manifest.js";

import { showScriptOffcanvas } from "./menuCmds.js";
import { openEditManifestDialog } from "./menuCmds.js";
import { archiveItem } from "./menuCmds.js";

import { refreshGalleryFromManifestEdit } from "./gallery.js";

/* ============================================================
   archiveGalleryItem(info)
   ------------------------------------------------------------
   Mirrors archivePatternItem behavior:
   - build payload { manifestPath, filename }
   - call archiveItem with showAlert
   - refresh Gallery deterministically on success
=========================================================== */
async function archiveGalleryItem(info) {

  if (!info) throw new Error("archiveGalleryItem: info missing");
  if (!info.manifestPath) throw new Error("archiveGalleryItem: manifestPath missing");
  if (!info.filename)     throw new Error("archiveGalleryItem: filename missing");

  const payload = {
    manifestPath: info.manifestPath,
    filename:     info.filename
  };

  console.log("archiveGalleryItem → archiveItem payload:", payload);

  await archiveItem({
    payload,
    showAlert: true,

    onSuccess: async () => {

      if (manifest && typeof manifest.clearCache === "function") {
        manifest.clearCache();
      }
      if (manifest.cache) delete manifest.cache.gallery;

      await refreshGalleryFromManifestEdit();

    }
  });

} // end archiveGalleryItem



/* ============================================================
   showGalleryScript(info)
=========================================================== */
function showGalleryScript(info) {

  if (!info) throw new Error("showGalleryScript: info missing");

  if (!info.isScript) return;

  const scriptPath = info.scriptPath;
  const label =
    info.filename ||
    info.title ||
    "(untitled)";

  if (!scriptPath) {
    throw new Error("showGalleryScript: scriptPath missing");
  }

  showScriptOffcanvas(String(scriptPath), String(label));

} // end showGalleryScript


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

} // end editGalleryManifestItem


/* ============================================================
   getGalleryCaptionMenuItems(info)
=========================================================== */
export async function getGalleryCaptionMenuItems(info) {

  if (!info) throw new Error("getGalleryCaptionMenuItems: info missing");

  const items = [];

  /* ----------------------------------------------------------
     Help
     -------------------------------------------------------- */
  if (info.helpKey) {
    const helpItem = await menuManager.buildHelpItem("gallery", info.helpKey);
    items.push(helpItem);
  } else {
    items.push({ label: "Help", disabled: true, onClick: () => {} });
  }

  /* ----------------------------------------------------------
     Show Script
     -------------------------------------------------------- */
  items.push({
    label: "Show Script",
    disabled: !info.isScript,
    onClick: () => showGalleryScript(info)
  });

  /* ----------------------------------------------------------
     Edit Manifest
     -------------------------------------------------------- */
  items.push({
    label: "Edit Manifest",
    disabled: false,
    onClick: async () => {
      await editGalleryManifestItem(info);
    }
  });

  /* ----------------------------------------------------------
     Archive
     -------------------------------------------------------- */
  items.push({
    label: "Archive",
    disabled: false,
    onClick: async () => {
      await archiveGalleryItem(info);
    }
  });

  return items;

} // end getGalleryCaptionMenuItems


// end galleryMenuCmds.js
