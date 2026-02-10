/* controls/widgets/checkboxWidget.js
   ============================================================
   CHECKBOX WIDGET
   ============================================================ */

import { CONTROL_CLASSES } from "../shared/constants.js";

export function setCheckboxControl(field, label, def, value, info, key, tabId) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = value === true;
  input.id = tabId + "-" + key;
  input.className = "ctrl-check";

  input.addEventListener("change", () => {
    info.parameters[key] = input.checked;
    
    // Special handling for showControls checkbox in secondary objects
    if (key === "showControls" && tabId.startsWith("tab-draw")) {
      // Store the state
      const tabState = info; // info is the Draw tab state
      if (tabState.secondary) {
        tabState.showControls = input.checked;
      }
      
      // Toggle visibility of parameter controls
      const controlsDiv = document.getElementById("drawControls");
      if (controlsDiv) {
        Array.from(controlsDiv.children).forEach(child => {
          if (child.classList.contains("ctrl-field")) {
            child.style.display = input.checked ? "" : "none";
          }
        });
      }
    }
    
    if (typeof info.onParamChange === "function") info.onParamChange();
    info.redrawHandler();
  });

  field.appendChild(label);
  field.appendChild(input);
} // end setCheckboxControl

/* ------------------------------------------------------------
   setSelectControl()
------------------------------------------------------------ */

