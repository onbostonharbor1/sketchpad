/* utilitiesMenuCmds.js
   ============================================================
   UTILITIES MENU COMMANDS - COMPATIBILITY FACADE
   ============================================================
   This file maintains backward compatibility with existing code.
   All functionality has been refactored into /utilities/

   EXISTING IMPORTS CONTINUE TO WORK:
   ----------------------------------
   import { getUtilitiesCaptionMenuItems } from "./utilitiesMenuCmds.js"

   NEW CODE CAN IMPORT DIRECTLY FROM MODULES:
   ------------------------------------------
   import { updateUtilitiesCaption } from "./utilities/utilitiesMenuCmds.js"
   import { getUtilitiesCaptionMenuItems } from "./utilities/utilitiesMenuCmds.js"

   REFACTORING STATUS:
   ------------------
   ✓ Complete modular architecture implemented
   ✓ Zero breaking changes
   ✓ All functions extracted
   ✓ Facade maintains compatibility indefinitely
   ============================================================ */

// Re-export everything from the new modular architecture
export * from "./utilities/utilitiesMenuCmds.js";
