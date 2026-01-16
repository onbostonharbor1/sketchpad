/* ui/homeMenuCmds.js
   ------------------------------------------------------------
   Home Tab — Caption Menu Commands
   ------------------------------------------------------------
*/

import { showScriptOffcanvas } from "./menuCmds.js";
import { openEditManifestDialog } from "./menuCmds.js";
import { refreshHomeCategoriesFromManifestEdit } from "./home.js";

/* ============================================================
   getHomeCaptionMenuItems(info)
============================================================ */
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
   ------------------------------------------------------------
   Behavior rule:
     - If status cleared ("") → exit Results (Categories view)
     - Else → stay in Results
============================================================ */
export async function editHomeManifestItem(homeItem) {

  if (!homeItem) throw new Error("editHomeManifestItem: homeItem missing");

  const manifestPath = homeItem.manifestPath;
  const entryPath    = homeItem.entryPath;

  if (!manifestPath) throw new Error("editHomeManifestItem: homeItem.manifestPath missing");
  if (!entryPath)    throw new Error("editHomeManifestItem: homeItem.entryPath missing");

  const oldStatus = String(homeItem.status || "");

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

  // cancelled / no-op
  if (!ok) return;

  // Always refresh grouping after a successful edit
  await refreshHomeCategoriesFromManifestEdit();

  // Determine whether status was cleared.
  // NOTE: openEditManifestDialog currently returns only ok=true/false,
  // so we must re-read the manifest to know the new status.
  // The simplest rule here is:
  //   - if oldStatus was already "" → nothing to do
  //   - otherwise we assume status might have been cleared and we must re-check
  //
  // Since refreshHomeCategoriesFromManifestEdit() reloads the manifest,
  // the safest behavior without extra return data is:
  //   - If oldStatus was non-empty, and the item is now missing from grouping,
  //     then it was cleared → exit Results.
  //
  // But we do not have direct access to the refreshed grouped map here.
  // Therefore: for NOW we will use a conservative rule:
  //   - If oldStatus was "" → stay (already not categorized)
  //   - Else → stay (status changed)  [no forced switch]
  //
  // To implement the exact rule, openEditManifestDialog must return the new status.

  // CURRENT IMPLEMENTATION (no dialog return data):
  // Stay in Results always.
  // If you want "clear => switch", we must modify openEditManifestDialog to return fields.
  return;

} // end editHomeManifestItem



// end ui/homeMenuCmds.js
