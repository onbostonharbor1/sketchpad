/* figuresMenuCmds.js
   ============================================================
   Figures Tab — Caption Bar and Menu Items
   ============================================================
   Role:
     Owns everything related to building the caption bar and
     constructing menu items for figure operations.

     Also contains the menu command implementations (save,
     reset order, archive, edit manifest, show script).

   Architectural rules:
     • Does NOT own lifecycle (init/restore/save). Those live
       in figures.js.
     • Does NOT render figures or navigate. Those live in
       figuresDisplay.js and figuresNav.js.
     • Uses dynamic imports for runner functions to avoid
       circular dependencies.

   Exports:
     setFiguresCaption(name, context)
     getFiguresCaptionMenuItems(info)
     saveFigureState(context)
     archiveFigureItem(info)
     editFigureManifestItem(info)
   ============================================================ */

import { setCaptionBar }          from "../caption.js";
import { menuManager }            from "../menuManager.js";
import { manifest }               from "../manifest.js";
import { archiveItem }            from "../menuCmds.js";
import { showScriptOffcanvas }    from "../menuCmds.js";
import { openEditManifestDialog } from "../menuCmds.js";
import {
  makeHelpItem,
  makeShowScriptItem,
  makeEditManifestItem,
  makeArchiveItem
} from "../menuCmds.js";


/* ============================================================
   setFiguresCaption(name, context)
   ============================================================
   Builds the caption bar for the figures tab.

   Arguments:
     name    — Display name for the caption (default: "Figures")
     context — Optional context object:
               { figureId, name, path, manifestPath,
                 matchField, matchValue, helpKey, scriptPath }
               If provided, enables the menu button.
   ============================================================ */
export function setFiguresCaption(name = "Figures", context = null) {
  const config = {
    targetId: "caption",
    title: name,
    onMenu: context ? async (anchor) => {
      const items = await getFiguresCaptionMenuItems(context);
      menuManager.open(items, anchor);
    } : null
  };
  setCaptionBar(config);
} // end setFiguresCaption


/* ============================================================
   getFiguresCaptionMenuItems(info)
   ============================================================
   Returns menu items for the figures caption menu.

   Arguments:
     info = {
       figureId:     <string>
       name:         <string>
       path:         <string>  — script path (for Reset Order)
       scriptPath:   <string>  — same as path, for Show Script
       manifestPath: <string>  — path to the manifest.json
       matchField:   <string>  — field to match in manifest
       matchValue:   <string>  — value to match
       helpKey:      <string>  — optional help file key
     }
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
   ============================================================
   Returns a Reset Order menu item — figures-specific.
   ============================================================ */
function makeResetOrderItem(info) {
  return {
    label:    "Reset Order",
    disabled: !info.path,
    tooltip:  "Reload figure and reset all overlays to default order",
    onClick:  async () => {
      if (info.path && info.figureId) {
        const { runFigureScript } = await import("../figuresRunner.js");
        runFigureScript(info.path, info.figureId);
      }
    }
  };
} // end makeResetOrderItem


/* ============================================================
   makeSaveItem(info)
   ============================================================
   Returns a Save menu item — figures-specific.
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
   ============================================================
   Confirms with the user then archives the active figure via
   the shared archiveItem command.

   After archiving, navigates back to the figures category list.

   Arguments:
     info — { name, manifestPath, matchField, matchValue }
   ============================================================ */
export async function archiveFigureItem(info) {

  if (!info) throw new Error("archiveFigureItem: info missing");

  if (!window.confirm(`Archive "${info.name || info.matchValue}"?`)) return;

  await archiveItem({
    payload:   { manifestPath: info.manifestPath, filename: info.matchValue },
    showAlert: false
  });

  /* Clear stale manifest cache. */
  if (manifest.cache) delete manifest.cache.figures;

  /* Navigate back to the figures category list. */
  const { initFiguresTab } = await import("../figures.js");
  await initFiguresTab(false);

} // end archiveFigureItem


/* ============================================================
   editFigureManifestItem(info)
   ============================================================
   Opens the Edit Manifest dialog for the active figure and,
   if confirmed, refreshes the figures tab.

   Arguments:
     info — { manifestPath, matchField, matchValue, name }
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
    initialTitle:      String(info.name  || ""),
    initialStatus:     String(info.status || ""),
    statusPresets:     ["new", "working", "current", "favorite"],
    allowCustomStatus: true,
    allowClearStatus:  true
  });

  if (!ok) return;

  /* Clear stale cache and restore. */
  if (manifest.cache) delete manifest.cache.figures;

  const { restoreFiguresTab } = await import("../figures.js");
  await restoreFiguresTab();

} // end editFigureManifestItem


/* ============================================================
   saveFigureState(context)
   ============================================================
   Saves the current figure overlay configuration as a
   downloadable JSON file.
   ============================================================ */
export async function saveFigureState(context) {

  const { getActiveOverlays } = await import("../figuresRunner.js");

  const overlays = getActiveOverlays();
  const saveData = {
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
