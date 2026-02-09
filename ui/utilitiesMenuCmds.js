/* ui/utilitiesMenuCmds.js
   ------------------------------------------------------------
   Utilities Tab â€” Menu Commands (Adapter Layer)
   ------------------------------------------------------------
   Rules:
     â€¢ Consumes ONLY the `info` object passed from utilities.js
     â€¢ Does NOT derive context from uiState
     â€¢ Delegates generic work to menuCmds.js
   ------------------------------------------------------------
*/

import { menuManager } from "./menuManager.js";
import { manifest } from "./manifest.js";
import { archiveItem } from "./menuCmds.js";
import { showScriptOffcanvas } from "./menuCmds.js";
import { openEditManifestDialog } from "./menuCmds.js";

import { refreshUtilitiesFromManifestEdit } from "./utilities.js";

/* ============================================================
   showUtilitiesScript(info)
=========================================================== */
function showUtilitiesScript(info) {

  if (!info) throw new Error("showUtilitiesScript: info missing");
  if (!info.isScript) return;

  const scriptPath = info.scriptPath;
  if (!scriptPath) {
    throw new Error("showUtilitiesScript: scriptPath missing");
  }

  const label = info.filename || info.title || "(untitled)";
  showScriptOffcanvas(String(scriptPath), String(label));

} // end showUtilitiesScript


/* ============================================================
   editUtilitiesManifestItem(info)
=========================================================== */
async function editUtilitiesManifestItem(info) {

  if (!info) throw new Error("editUtilitiesManifestItem: info missing");

  if (!info.manifestPath) {
    throw new Error("editUtilitiesManifestItem: manifestPath missing");
  }

  if (!info.matchField) {
    throw new Error("editUtilitiesManifestItem: matchField missing");
  }

  if (!info.matchValue) {
    throw new Error("editUtilitiesManifestItem: matchValue missing");
  }

  const ok = await openEditManifestDialog({
    dialogTitle:   "Edit Manifest",
    manifestPath:  String(info.manifestPath),
    matchField:    String(info.matchField),
    matchValue:    String(info.matchValue),

    fileLabel:     String(info.filename || info.title || info.matchValue),

    initialTitle:  String(info.title  || ""),
    initialStatus: String(info.status || ""),

    statusPresets: ["new", "working", "current", "favorite"],
    allowCustomStatus: true,
    allowClearStatus:  true
  });

  if (!ok) return;

  if (manifest && typeof manifest.clearCache === "function") {
    manifest.clearCache();
  }
  if (manifest.cache) delete manifest.cache.utilities;

  await refreshUtilitiesFromManifestEdit();

} // end editUtilitiesManifestItem


/* ============================================================
   getUtilitiesCaptionMenuItems(info)
=========================================================== */
export async function getUtilitiesCaptionMenuItems(info) {

  if (!info) throw new Error("getUtilitiesCaptionMenuItems: info missing");

  const items = [];

  /* ----------------------------------------------------------
     Show Script
     -------------------------------------------------------- */
  const scriptPath = info.scriptPath || "";

  const label =
    info.filename ||
    info.title ||
    info.entryPath ||
    scriptPath ||
    "(untitled)";

  items.push({
    label: "Show Script",
    disabled: !scriptPath,
    tooltip: "View the source code for this utility",
    onClick: () => {
      if (!scriptPath) return;
      showScriptOffcanvas(scriptPath, label);
    } // end onClick
  });

  /* ----------------------------------------------------------
     Edit Manifest
     -------------------------------------------------------- */
  items.push({
    label: "Edit Manifest",
    disabled: false,
    tooltip: "Edit title, status, and other metadata",
    onClick: async () => {
      await editUtilitiesManifestItem(info);
    } // end onClick
  });

  /* ----------------------------------------------------------
     Archive
     -------------------------------------------------------- */
  items.push({
    label: "Archive",
    disabled: false,
    tooltip: "Move this utility to archive folder",
    onClick: async () => {
      await archiveUtilitiesItem(info);
    } // end onClick
  });

  return items;

} // end getUtilitiesCaptionMenuItems



/* ============================================================
   archiveUtilitiesItem(info)
   ------------------------------------------------------------
   Mirrors Gallery:
   - build payload { manifestPath, filename }
   - call archiveItem()
   - refresh Utilities deterministically on success
=========================================================== */
async function archiveUtilitiesItem(info) {

  if (!info) throw new Error("archiveUtilitiesItem: info missing");
  if (!info.manifestPath) throw new Error("archiveUtilitiesItem: manifestPath missing");
  if (!info.filename) throw new Error("archiveUtilitiesItem: filename missing");

  const payload = {
    manifestPath: info.manifestPath,
    filename: info.filename   // Utilities canonical identifier is entry.path
  };

  await archiveItem({
    payload,
    showAlert: true,

    onSuccess: async () => {

      if (manifest && typeof manifest.clearCache === "function") {
        manifest.clearCache();
      }
      if (manifest.cache) delete manifest.cache.utilities;

      await refreshUtilitiesFromManifestEdit();

    } // end onSuccess
  });

} // end archiveUtilitiesItem



// end ui/utilitiesMenuCmds.js
