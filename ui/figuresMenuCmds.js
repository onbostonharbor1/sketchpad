/* figuresMenuCmds.js
   ============================================================
   FIGURES MENU COMMANDS - COMPATIBILITY FACADE
   ============================================================
   This file maintains backward compatibility with existing code.
   All functionality has been refactored into /figures/

   EXISTING IMPORTS CONTINUE TO WORK:
   ----------------------------------
   import { getFiguresCaptionMenuItems } from "./figuresMenuCmds.js"
   import { saveFigureState } from "./figuresMenuCmds.js"

   NEW CODE CAN IMPORT DIRECTLY FROM MODULES:
   ------------------------------------------
   import { setFiguresCaption } from "./figures/figuresMenuCmds.js"
   import { getFiguresCaptionMenuItems } from "./figures/figuresMenuCmds.js"

   REFACTORING STATUS:
   ------------------
   ✓ Complete modular architecture implemented
   ✓ Zero breaking changes
   ✓ All functions extracted
   ✓ Facade maintains compatibility indefinitely
   ============================================================ */

// Re-export everything from the new modular architecture
export * from "./figures/figuresMenuCmds.js";
