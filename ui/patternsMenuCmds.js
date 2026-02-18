/* patternsMenuCmds.js
   ============================================================
   PATTERNS MENU COMMANDS - COMPATIBILITY FACADE
   ============================================================
   This file maintains backward compatibility with existing code.
   All functionality has been refactored into /patterns/

   EXISTING IMPORTS CONTINUE TO WORK:
   ----------------------------------
   import { getPatternsCaptionMenuItems } from "./patternsMenuCmds.js"
   import { createPatternThumbnail } from "./patternsMenuCmds.js"
   import { archivePatternsItem } from "./patternsMenuCmds.js"

   NEW CODE CAN IMPORT DIRECTLY FROM MODULES:
   ------------------------------------------
   import { updatePatternsCaption } from "./patterns/patternsMenuCmds.js"
   import { wirePatternsCommandsButton } from "./patterns/patternsMenuCmds.js"

   REFACTORING STATUS:
   ------------------
   ✓ Complete modular architecture implemented
   ✓ Zero breaking changes
   ✓ All functions extracted
   ✓ Facade maintains compatibility indefinitely
   ============================================================ */

// Re-export everything from the new modular architecture
export * from "./patterns/patternsMenuCmds.js";
