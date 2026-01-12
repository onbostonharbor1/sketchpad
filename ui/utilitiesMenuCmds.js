/* ui/utilitiesMenuCmds.js
   ------------------------------------------------------------
   Utilities Tab — Caption Menu Commands
   ------------------------------------------------------------
   Commands:
     • getUtilitiesCaptionMenuItems(info)
     • editUtilitiesManifestItem(info)
   ------------------------------------------------------------
*/

import { showScriptOffcanvas } from "./menuCmds.js";
import { openEditManifestDialog } from "./menuCmds.js";
import { refreshUtilitiesFromManifestEdit } from "./utilities.js";

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
    info.file ||
    info.title ||
    info.entryPath ||
    scriptPath ||
    "(untitled)";

  items.push({
    label: "Show Script",
    disabled: !scriptPath,
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
    onClick: async () => {
      await editUtilitiesManifestItem(info);
    } // end onClick
  });

  return items;

} // end getUtilitiesCaptionMenuItems


/* ============================================================
   editUtilitiesManifestItem(info)
=========================================================== */
export async function editUtilitiesManifestItem(info) {

  if (!info) throw new Error("editUtilitiesManifestItem: info missing");

  const manifestPath = info.manifestPath;
  const entryPath    = info.entryPath;

  if (!manifestPath) throw new Error("editUtilitiesManifestItem: info.manifestPath missing");
  if (!entryPath)    throw new Error("editUtilitiesManifestItem: info.entryPath missing");

  const ok = await openEditManifestDialog({
    dialogTitle:   "Edit Manifest",
    manifestPath:  String(manifestPath),
    matchField:    "path",
    matchValue:    String(entryPath),

    fileLabel:     String(info.file || info.title || entryPath),

    initialTitle:  String(info.title || ""),
    initialStatus: String(info.status || ""),

    statusPresets: ["new", "working", "current", "favorite"],

    allowCustomStatus: true,
    allowClearStatus:  true
  });

  if (ok) {
    await refreshUtilitiesFromManifestEdit();
  }

} // end editUtilitiesManifestItem


// end ui/utilitiesMenuCmds.js
