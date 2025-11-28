/* actionsRegistry.js
   ------------------------------------------------------------
   Declarative registry for caption-menu actions.
   Each action has a builder(menuContext) that returns
   a fully formed menu item for menuManager.open().
   ------------------------------------------------------------ */

import { menuManager } from "./menuManager.js";
import { showScriptOffcanvas } from "./ui_utilities.js";

export const MENU_ACTIONS = {
  // --------------------------------------------------------
  // Shared action: Help
  // Uses manifest-driven menuManager.buildHelpItem().
  // menuContext:
  //   - tabName   – e.g. "draw"
  //   - itemName  – registry key (e.g. "inverseStar")
  // --------------------------------------------------------
  help: {
    builder(menuContext) {
      return menuManager.buildHelpItem(
        menuContext.tabName,
        menuContext.itemName
      );
    } // end builder
  },

  // --------------------------------------------------------
  // Shared action: Show Script
  // menuContext:
  //   - scriptPath – e.g. "../draw/inverseStar.js"
  //   - itemName   – used as the offcanvas title
  // --------------------------------------------------------
  showScript: {
    builder(menuContext) {
      return {
        label: "Show Script",
        onClick: () =>
          showScriptOffcanvas(
            menuContext.scriptPath,
            menuContext.itemName
          )
      };
    } // end builder
  },

  // --------------------------------------------------------
  // Draw-specific action: Duplicate
  // menuContext:
  //   - duplicateHandler – supplied by draw.js
  // --------------------------------------------------------
  duplicate: {
    builder(menuContext) {
      return {
        label: "Duplicate",
        onClick: () => menuContext.duplicateHandler()
      };
    } // end builder
  }
}; // end MENU_ACTIONS
