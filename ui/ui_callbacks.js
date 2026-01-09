/* ui_callbacks.js
   ------------------------------------------------------------
   Central UI Callback Layer (Third / Correct Version)
   - No orchestrators, no generic tab APIs.
   - Each tab uses its OWN functions.
   - Only event routing lives here.
   ------------------------------------------------------------ */

import { uiState }        from "./uiState.js";
import { overlayManager } from "./overlay.js";

import * as draw          from "./draw.js";
import * as patterns      from "./patterns.js";
import * as gallery       from "./gallery.js";
import * as figures       from "./figures.js";
import * as utility       from "./utilities.js"; // ⭐ NEW

/* ===========================================================
   TAB ACTIVATION
=========================================================== */
function onTabActivated(tabName) {
  uiState.activeTab = tabName;
  overlayManager.clearAll();

  if (tabName === "draw") {
    draw.initDrawTab();
    return;
  }

  if (tabName === "patterns") {
    patterns.initPatternsTab();
    return;
  }

  if (tabName === "gallery") {
    gallery.initGalleryTab();
    return;
  }

  if (tabName === "figures") {
    figures.initFiguresTab();
    return;
  }

  if (tabName === "utilities") {
    // ⭐ NEW
    utility.initUtilityTab();
    return;
  }

  throw new Error("onTabActivated: unknown tab " + tabName);
} // end onTabActivated

/* ===========================================================
   CATEGORY SELECTION
=========================================================== */
function onCategorySelected(tabName, categoryName) {
  uiState[tabName].activeCategory = categoryName;

  if (tabName === "draw") {
    draw.setDrawCategories();
    return;
  }

  if (tabName === "patterns") {
    patterns.loadCategory(categoryName);
    return;
  }

  if (tabName === "gallery") {
    gallery.loadCategory(categoryName);
    return;
  }

  if (tabName === "utilities") {
    // ⭐ NEW
    utility.loadCategory(categoryName);
    return;
  }

  throw new Error("onCategorySelected: unsupported tab " + tabName);
} // end onCategorySelected

/* ===========================================================
   ITEM SELECTION
=========================================================== */
function onItemSelected(tabName, itemName) {
  uiState[tabName].activeItem = itemName;

  if (tabName === "draw") {
    const reg = window.drawRegistry || {};
    const entry = Object.values(reg).find((e) => e.name === itemName);
    if (!entry) throw new Error("draw item not found: " + itemName);

    draw.addDrawSubtab({ name: entry.name, entry: entry });
    return;
  }

  if (tabName === "patterns") {
    patterns.loadItem(itemName);
    return;
  }

  if (tabName === "gallery") {
    gallery.showImage(itemName);
    return;
  }

  if (tabName === "utilities") {
    // ⭐ NEW
    utility.runUtilityItem(itemName);
    return;
  }

  throw new Error("onItemSelected: unsupported tab " + tabName);
} // end onItemSelected

/* ===========================================================
   PARAMETER CHANGE  (Draw only)
=========================================================== */
function onParamChanged(paramName, newValue) {
  const tabId = uiState.activeDrawTab;
  const tab = uiState.drawTabs[tabId];
  if (!tab) return;

  tab.parameters[paramName] = newValue;
  draw.drawActiveTab();
} // end onParamChanged

/* ===========================================================
   HELP
=========================================================== */
function onHelpRequested(html) {
  overlayManager.show("help", html);
} // end onHelpRequested

/* ===========================================================
   OVERLAY OPERATIONS
=========================================================== */
function onOpenOverlay(html) {
  overlayManager.show("interaction", html);
} // end onOpenOverlay

function onCloseOverlay() {
  overlayManager.hide("interaction");
} // end onCloseOverlay

/* ===========================================================
   NAVIGATION
   (Gallery only for now)
=========================================================== */
function onPrev(tabName) {
  if (tabName === "gallery") {
    gallery.showPrevImage();
    return;
  }
  console.warn("onPrev: no prev handler for tab " + tabName);
} // end onPrev

function onNext(tabName) {
  if (tabName === "gallery") {
    gallery.showNextImage();
    return;
  }
  console.warn("onNext: no next handler for tab " + tabName);
} // end onNext

/* ===========================================================
   SAVE
=========================================================== */
function onSave(tabName) {
  if (tabName === "draw") {
    draw.saveDrawState();
    return;
  }
  if (tabName === "patterns") {
    patterns.savePatternsState();
    return;
  }
  if (tabName === "gallery") {
    gallery.saveGalleryState();
    return;
  }
  if (tabName === "utilities") {
    // ⭐ NEW
    utility.saveUtilityState();
    return;
  }

  console.warn("onSave: no save handler for tab " + tabName);
} // end onSave

/* ===========================================================
   RESET PARAMETERS  (Draw only)
=========================================================== */
function onResetParameters() {
  const tabId = uiState.activeDrawTab;
  const info = uiState.drawTabs[tabId];
  if (!info || info.type !== "object") return;

  info.drawRegistry.init();
  info.parameters = info.drawRegistry.params;
  draw.drawActiveTab();
} // end onResetParameters

/* ===========================================================
   EXPORT CALLBACKS
=========================================================== */
export const callbacks = {
  onTabActivated,
  onCategorySelected,
  onItemSelected,
  onParamChanged,
  onHelpRequested,
  onOpenOverlay,
  onCloseOverlay,
  onPrev,
  onNext,
  onSave,
  onResetParameters,
}; // end callbacks
