/* ui/homeCmds.js
   ------------------------------------------------------------
   Home Tab — Caption Menu Commands
   ------------------------------------------------------------
   Rules:
     - Menu command builders live here (like patternsMenuCmds.js).
     - home.js owns caption wiring and menuManager.open().
     - "Show Script" is DISABLED (grayed) when current result is an image.
*/

import { showScriptOffcanvas } from "./ui_utilities.js";

/* ============================================================
   getHomeCaptionMenuItems(entry)
   ------------------------------------------------------------
   Returns menu items for the Home caption bar menu.
=========================================================== */
export function getHomeCaptionMenuItems(entry) {

  if (!entry) throw new Error("getHomeCaptionMenuItems: entry missing");

  const path = entry.path || "";
  const isJs = isJsPath(path);

  const label = entry.file || entry.title || path || "(untitled)";

  const items = [];

  items.push({
    label: "Show Script",
    disabled: !isJs,
    onClick: () => {
      if (!isJs) return;
      showScriptOffcanvas(path, label);
    }
  });

  return items;

} // end getHomeCaptionMenuItems


/* ============================================================
   isJsPath(p)
=========================================================== */
function isJsPath(p) {
  if (typeof p !== "string") return false;
  return p.toLowerCase().endsWith(".js");
} // end isJsPath

// end homeCmds.js
