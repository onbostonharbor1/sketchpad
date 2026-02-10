/* parameterControls.js
   ============================================================
   PARAMETER CONTROLS - COMPATIBILITY FACADE

   This file maintains backward compatibility with existing code.
   All functionality has been refactored into /ui/controls/

   EXISTING IMPORTS CONTINUE TO WORK:
   ----------------------------------
   import { buildParameterControls } from "/ui/parameterControls.js"
   import { renderParameterControls } from "/ui/parameterControls.js"

   NEW CODE CAN IMPORT DIRECTLY FROM MODULES:
   ------------------------------------------
   import { buildParameterControls } from "/ui/controls/controlsCore.js"
   import { setRangeControl } from "/ui/controls/widgets/rangeWidget.js"

   REFACTORING STATUS:
   ------------------
   ✓ Complete modular architecture implemented
   ✓ Zero breaking changes
   ✓ All 14 modules extracted
   ✓ Facade maintains compatibility indefinitely
   ============================================================ */

// Re-export everything from the new modular architecture
export * from "./controls/controlsCore.js";
