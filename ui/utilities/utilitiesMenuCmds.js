/* utilitiesMenuCmds.js
   ============================================================
   Utilities Tab -- Caption Bar and Menu Items
   ============================================================
   Role:
     Owns everything related to building the caption bar and
     constructing menu items for utility operations.

   Architectural rules:
     * Does NOT own lifecycle (init/restore/save). Those live
       in utilities.js.
     * Does NOT render utilities or navigate. Those live in
       utilitiesDisplay.js and utilitiesNav.js.
     * Uses dynamic imports for lifecycle functions to avoid
       circular dependencies.

   Exports:
     updateUtilitiesCaption(options)
     getUtilitiesCaptionMenuItems(info)
     showUtilitiesScript(info)
     editUtilitiesManifestItem(info)
     archiveUtilitiesItem(info)
   ============================================================ */

import { setCaptionBar }          from "/ui/caption.js";
import { menuManager }            from "/ui/menuManager.js";
import { manifest }               from "/ui/manifest.js";
import {
  archiveItem,
  showScriptOffcanvas,
  openEditManifestDialog,
  makeHelpItem,
  makeShowScriptItem,
  makeEditManifestItem,
  makeArchiveItem
}                                 from "/ui/menuCmds.js";


/* ============================================================
   updateUtilitiesCaption(options)
   ============================================================ */
export function updateUtilitiesCaption({ title, path, subtab, category, manifestPath, entryPath, status }) {

  const finalTitle =
    (category && category.trim() !== "")
      ? (category + ": " + (title || "(untitled)"))
      : (title || "(untitled)");

  const scriptPath =
    (subtab && category && entryPath)
      ? `/utilities/${subtab}/${category}/${entryPath}`
      : "";

  setCaptionBar({
    targetId: "caption",
    title:    finalTitle,
    onPrev:   null,
    onNext:   null,

    onMenu: async (anchor) => {
      if (!manifestPath) throw new Error("updateUtilitiesCaption: manifestPath missing");
      if (!entryPath)    throw new Error("updateUtilitiesCaption: entryPath missing");

      const info = {
        helpKey:      `utilities/${subtab}/${category}/${entryPath}`,
        isScript:     true,
        scriptPath,
        manifestPath,
        matchField:   "path",
        matchValue:   entryPath,
        filename:     entryPath,
        title:        title  || "",
        status:       status || ""
      };

      const items = await getUtilitiesCaptionMenuItems(info);
      menuManager.open(items, anchor);
    }
  });

} // end updateUtilitiesCaption


/* ============================================================
   getUtilitiesCaptionMenuItems(info)
   ============================================================ */
export async function getUtilitiesCaptionMenuItems(info) {

  if (!info) throw new Error("getUtilitiesCaptionMenuItems: info missing");

  return [
    await makeHelpItem("utilities", info.helpKey),
    makeShowScriptItem(info, showScriptOffcanvas),
    makeEditManifestItem(() => editUtilitiesManifestItem(info)),
    makeArchiveItem(() => archiveUtilitiesItem(info))
  ];

} // end getUtilitiesCaptionMenuItems


/* ============================================================
   editUtilitiesManifestItem(info)
   ============================================================ */
async function editUtilitiesManifestItem(info) {

  if (!info)              throw new Error("editUtilitiesManifestItem: info missing");
  if (!info.manifestPath) throw new Error("editUtilitiesManifestItem: manifestPath missing");
  if (!info.matchField)   throw new Error("editUtilitiesManifestItem: matchField missing");
  if (!info.matchValue)   throw new Error("editUtilitiesManifestItem: matchValue missing");

  const ok = await openEditManifestDialog({
    dialogTitle:       "Edit Manifest",
    manifestPath:      String(info.manifestPath),
    matchField:        String(info.matchField),
    matchValue:        String(info.matchValue),
    fileLabel:         String(info.filename || info.title || info.matchValue),
    initialTitle:      String(info.title  || ""),
    initialStatus:     String(info.status || ""),
    statusPresets:     ["new", "working", "current", "favorite"],
    allowCustomStatus: true,
    allowClearStatus:  true
  });

  if (!ok) return;

  manifest.clearCache();

  const { refreshUtilitiesFromManifestEdit } = await import("/ui/utilities/utilities.js");
  await refreshUtilitiesFromManifestEdit();

} // end editUtilitiesManifestItem


/* ============================================================
   archiveUtilitiesItem(info)
   ============================================================ */
async function archiveUtilitiesItem(info) {

  if (!info)              throw new Error("archiveUtilitiesItem: info missing");
  if (!info.manifestPath) throw new Error("archiveUtilitiesItem: manifestPath missing");
  if (!info.filename)     throw new Error("archiveUtilitiesItem: filename missing");

  await archiveItem({
    payload:   { manifestPath: info.manifestPath, filename: info.filename },
    showAlert: true,
    onSuccess: async () => {
      manifest.clearCache();

      const { refreshUtilitiesFromManifestEdit } = await import("/ui/utilities//utilities.js");
      await refreshUtilitiesFromManifestEdit();
    }
  });

} // end archiveUtilitiesItem
