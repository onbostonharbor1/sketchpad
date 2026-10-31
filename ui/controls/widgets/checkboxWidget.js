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

    if (typeof info.onParamChange === "function") info.onParamChange();
    info.redrawHandler();
  });

  field.appendChild(label);
  field.appendChild(input);
} // end setCheckboxControl

/* ------------------------------------------------------------
   setSelectControl()
------------------------------------------------------------ */

