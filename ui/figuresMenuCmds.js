/* ui/figuresMenuCmds.js
   ------------------------------------------------------------
   Figures Tab Menu Commands (Adapter Layer)
   ------------------------------------------------------------
   This file marshalls data from figures.js to menuCmds.js,
   following the established pattern from other tabs.
------------------------------------------------------------ */

import { runFigureScript } from "./figuresRunner.js";
import { getActiveOverlays } from "./figuresRunner.js";


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
    onClick: () => {
      if (info.path && info.figureId) {
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
    tooltip: "Save current overlay configuration (not yet implemented)",
    onClick: () => {
      saveFigureState(info);
    }
  });
  
  return items;
  
} // end getFiguresCaptionMenuItems


/* ============================================================
   saveFigureState(context)
   ------------------------------------------------------------
   Adapter function to save figure state.
   
   In the future, this could call a function in menuCmds.js
   if saving becomes a shared operation across tabs.
============================================================ */
function saveFigureState(context) {
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
  
  // TODO: Implement actual save logic
  // This could call a function in menuCmds.js for persisting to disk
  alert("Save functionality not yet implemented. State logged to console.");
  
} // end saveFigureState


// end ui/figuresMenuCmds.js
