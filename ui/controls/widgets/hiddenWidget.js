/* controls/widgets/hiddenWidget.js
   ============================================================
   HIDDEN WIDGET
   ============================================================ */

export function setHiddenControl(info, key, def, value, tabId) {
  // No UI.
  // We do not touch info.parameters[key] here.
  // The registry entry (or caller) owns maintaining it.
  return null;
} // end setHiddenControl


