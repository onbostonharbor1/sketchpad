/* figuresMenuCmds.js
   ============================================================
   Figures Tab -- Caption Bar and Menu Items
   ============================================================
   Role:
     Owns everything related to building the caption bar and
     constructing menu items for figure operations.

     Also contains the menu command implementations (save,
     reset order, archive, edit manifest, show script).

   Architectural rules:
     * Does NOT own lifecycle (init/restore/save). Those live
       in figures.js.
     * Does NOT render figures or navigate. Those live in
       figuresDisplay.js and figuresNav.js.
     * Uses dynamic imports for runner functions to avoid
       circular dependencies.

   Exports:
     setFiguresCaption(name, context)
     getFiguresCaptionMenuItems(info)
     saveFigureState(context)
     archiveFigureItem(info)
     editFigureManifestItem(info)
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
   setFiguresCaption(name, context)
   ============================================================ */
export function setFiguresCaption(name = "Figures", context = null) {

  const config = {
    targetId: "caption",
    title:    name,
    onMenu:   context ? async (anchor) => {
      const items = await getFiguresCaptionMenuItems(context);
      menuManager.open(items, anchor);
    } : null
  };

  setCaptionBar(config);

} // end setFiguresCaption


/* ============================================================
   getFiguresCaptionMenuItems(info)
   ============================================================ */
export async function getFiguresCaptionMenuItems(info) {

  if (!info) throw new Error("getFiguresCaptionMenuItems: info missing");

  return [
    await makeHelpItem("figures", info.helpKey),
    makeShowScriptItem(info, showScriptOffcanvas),
    makeEditManifestItem(() => editFigureManifestItem(info)),
    makeArchiveItem(() => archiveFigureItem(info)),
    makeResetOrderItem(info),
    makeSaveItem(info)
  ];

} // end getFiguresCaptionMenuItems


/* ============================================================
   makeResetOrderItem(info)
   ============================================================ */
function makeResetOrderItem(info) {
  return {
    label:    "Reset Order",
    disabled: !info.path,
    tooltip:  "Reload figure and reset all overlays to default order",
    onClick:  async () => {
      if (info.path && info.figureId) {
        const { runFigureScript } = await import("/ui/figuresRunner.js");
        runFigureScript(info.path, info.figureId);
      }
    }
  };
} // end makeResetOrderItem


/* ============================================================
   makeSaveItem(info)
   ============================================================ */
function makeSaveItem(info) {
  return {
    label:    "Save",
    disabled: false,
    tooltip:  "Save current overlay configuration",
    onClick:  () => { saveFigureState(info); }
  };
} // end makeSaveItem


/* ============================================================
   archiveFigureItem(info)
   ============================================================ */
export async function archiveFigureItem(info) {

  if (!info) throw new Error("archiveFigureItem: info missing");

  if (!window.confirm(`Archive "${info.name || info.matchValue}"?`)) return;

  await archiveItem({
    payload:   { manifestPath: info.manifestPath, filename: info.matchValue },
    showAlert: false
  });

  manifest.clearCache();

  const { initFiguresTab } = await import("/ui/figures/figures.js");
  await initFiguresTab(false);

} // end archiveFigureItem


/* ============================================================
   editFigureManifestItem(info)
   ============================================================ */
export async function editFigureManifestItem(info) {

  if (!info)              throw new Error("editFigureManifestItem: info missing");
  if (!info.manifestPath) throw new Error("editFigureManifestItem: manifestPath missing");
  if (!info.matchField)   throw new Error("editFigureManifestItem: matchField missing");
  if (!info.matchValue)   throw new Error("editFigureManifestItem: matchValue missing");

  const ok = await openEditManifestDialog({
    dialogTitle:       "Edit Manifest",
    manifestPath:      String(info.manifestPath),
    matchField:        String(info.matchField),
    matchValue:        String(info.matchValue),
    fileLabel:         String(info.name || info.matchValue),
    initialTitle:      String(info.name   || ""),
    initialStatus:     String(info.status || ""),
    statusPresets:     ["new", "working", "current", "favorite"],
    allowCustomStatus: true,
    allowClearStatus:  true
  });

  if (!ok) return;

  manifest.clearCache();

  const { restoreFiguresTab } = await import("/ui/figures/figures.js");
  await restoreFiguresTab();

} // end editFigureManifestItem


/* ============================================================
   saveFigureState(context)
   ============================================================ */
export async function saveFigureState(context) {

  const { getActiveOverlays } = await import("/ui/figuresRunner.js");

  const overlays  = getActiveOverlays();
  const saveData  = {
    figureId:  context.figureId,
    timestamp: Date.now(),
    overlays:  overlays.map(o => {
      const safeParams = {};
      const controls   = o.controls || {};
      for (const key in o.params) {
        if (controls[key] && controls[key].control) continue;
        safeParams[key] = o.params[key];
      }
      return { id: o.figureId, params: safeParams };
    })
  };

  console.log("Figure state to save:", saveData);

  const json = JSON.stringify(saveData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${context.name.replace(/\s+/g, "_")}_saved.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

} // end saveFigureState
