/* homeMenuCmds.js   (ui/homeMenuCmds.js)
   ============================================================
   Home Menu Commands — Compatibility Facade
   ============================================================
   This file is a re-export facade. All Home menu command and
   caption logic has moved into:

     ui/home/homeMenuCmds.js

   Existing imports of the form:

     import { getHomeCaptionMenuItems } from "./homeMenuCmds.js"

   continue to work without change. New code should import
   directly from the sub-module path.
   ============================================================ */

export * from "./home/homeMenuCmds.js";
