/* ui/homeMenuCmds.js
   ------------------------------------------------------------
   Home Tab — Caption Menu Commands
   ------------------------------------------------------------
*/

import { showScriptOffcanvas } from "./ui_utilities.js";
import { openEditManifestDialog } from "./menuCmds.js";
import { refreshHomeCategoriesFromManifestEdit } from "./home.js";

/* ============================================================
   getHomeCaptionMenuItems(info)
=========================================================== */
export async function getHomeCaptionMenuItems(info) {

  if (!info) throw new Error("getHomeCaptionMenuItems: info missing");

  const items = [];

  /* ----------------------------------------------------------
     Show Script
     -------------------------------------------------------- */
  const isScript = !!info.isScript;
  const scriptPath = info.scriptPath || "";

  const label =
    info.file ||
    info.title ||
    info.entryPath ||
    scriptPath ||
    "(untitled)";

  items.push({
    label: "Show Script",
    disabled: !isScript,
    onClick: () => {
      if (!isScript) return;
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
      await editHomeManifestItem(info);
    } // end onClick
  });

  return items;

} // end getHomeCaptionMenuItems


/* ============================================================
   editHomeManifestItem(homeItem)
=========================================================== */
export async function editHomeManifestItem(homeItem) {

  if (!homeItem) throw new Error("editHomeManifestItem: homeItem missing");

  const manifestPath = homeItem.manifestPath;
  const entryPath    = homeItem.entryPath;

  if (!manifestPath) throw new Error("editHomeManifestItem: homeItem.manifestPath missing");
  if (!entryPath)    throw new Error("editHomeManifestItem: homeItem.entryPath missing");

  const ok = await openEditManifestDialog({
    dialogTitle:   "Edit Manifest",
    manifestPath:  String(manifestPath),
    matchField:    "path",
    matchValue:    String(entryPath),

    fileLabel:     String(homeItem.file || homeItem.title || entryPath),

    initialTitle:  String(homeItem.title || ""),
    initialStatus: String(homeItem.status || ""),

    statusPresets: ["new", "working", "current", "favorite"],

    allowCustomStatus: true,
    allowClearStatus:  true
  });

  if (ok) {
    await refreshHomeCategoriesFromManifestEdit();
  }

} // end editHomeManifestItem


// end ui/homeMenuCmds.js
