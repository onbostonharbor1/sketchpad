/* figuresMenuCmds.js
   ============================================================
   Figures Tab — Caption Bar and Menu Items
   ============================================================
   Role:
     Owns everything related to building the caption bar and
     constructing menu items for figure operations.

     Also contains the menu command implementations (save,
     reset order).

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
   ============================================================ */

import { setCaptionBar } from "../caption.js";
import { menuManager } from "../menuManager.js";


/* ============================================================
   setFiguresCaption(name, context)
   ------------------------------------------------------------
   Builds the caption bar for the figures tab.
   
   Arguments:
     name    — Display name for the caption (default: "Figures")
     context — Optional context object with { figureId, name, path }
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
   ------------------------------------------------------------
   Returns menu items for the figures caption menu.
   
   Arguments:
     info = {
       figureId: <string>,
       name: <string>,
       path: <string>
     }
   ============================================================ */
export async function getFiguresCaptionMenuItems(info) {
  
  if (!info) throw new Error("getFiguresCaptionMenuItems: info missing");
  
  const items = [];
  
  /* ----------------------------------------------------------
     Reset Order - Reload the figure script to reset overlays
     -------------------------------------------------------- */
  items.push({
    label: "Reset Order",
    disabled: !info.path,
    tooltip: "Reload figure and reset all overlays to default order",
    onClick: async () => {
      if (info.path && info.figureId) {
        const { runFigureScript } = await import("../figuresRunner.js");
        runFigureScript(info.path, info.figureId);
      }
    }
  });
  
  /* ----------------------------------------------------------
     Save - Save current figure state
     -------------------------------------------------------- */
  items.push({
    label: "Save",
    disabled: false,
    tooltip: "Save current overlay configuration",
    onClick: () => {
      saveFigureState(info);
    }
  });
  
  return items;
  
} // end getFiguresCaptionMenuItems


/* ============================================================
   saveFigureState(context)
   ------------------------------------------------------------
   Saves the current figure state to a JSON file.
   
   This captures all overlay configurations (excluding control-
   only parameters) and downloads as a JSON file.
   ============================================================ */
export async function saveFigureState(context) {
  const { getActiveOverlays } = await import("../figuresRunner.js");
  
  const overlays = getActiveOverlays();
  const saveData = {
    figureId: context.figureId,
    timestamp: Date.now(),
    overlays: overlays.map(o => {
      const safeParams = {};
      const controls = o.controls || {};
      for (const key in o.params) {
        if (controls[key] && controls[key].control) continue;
        safeParams[key] = o.params[key];
      }
      return {
        id: o.figureId,
        params: safeParams
      };
    })
  };
  
  console.log("Figure state to save:", saveData);
  
  // Download as JSON file
  const json = JSON.stringify(saveData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${context.name.replace(/\s+/g, "_")}_saved.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
} // end saveFigureState
