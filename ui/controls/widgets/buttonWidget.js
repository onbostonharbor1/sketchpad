/* controls/widgets/buttonWidget.js
   ============================================================
   BUTTON WIDGET
   ============================================================ */

import { CONTROL_CLASSES } from "../shared/constants.js";

export function setButtonControl(field, label, def, value, info, key, tabId) {

  // ----------------------------------------------------------
  // Resolve the action function (fail-fast)
  // ----------------------------------------------------------
  let fn = null;

  // Style A: function-valued def.action (in-memory contract)
  if (typeof def.action === "function") {
    fn = def.action;
  }

  // Style B: string-valued def.action that indexes info.actions
  else if (typeof def.action === "string") {

    const actions = info.actions;
    if (!actions || typeof actions !== "object") {
      throw new Error("setButtonControl: info.actions missing for key " + key);
    }

    fn = actions[def.action];
    if (typeof fn !== "function") {
      throw new Error(
        "setButtonControl: action '" + def.action + "' not found or not a function"
      );
    }
  }

  // Anything else is invalid
  else {
    throw new Error("setButtonControl: def.action missing/invalid for key " + key);
  }

  // ----------------------------------------------------------
  // Build the button
  // ----------------------------------------------------------
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ctrl-button";
  button.textContent = def.label || key;
  button.id = tabId + "-" + key;

  // ----------------------------------------------------------
  // Grid placement:
  //   - default: column 2 (control column)
  //   - fullRow: span both columns
  // ----------------------------------------------------------
  if (def.fullRow === true) {
    button.style.gridColumn = "1 / -1";
    button.style.justifySelf = "center";
  } else {
    button.style.gridColumn = "2";
    button.style.justifySelf = "start";
  }

  // ----------------------------------------------------------
  // Click behavior
  // ----------------------------------------------------------
  button.addEventListener("click", () => {

    // Provide info/key/def for in-memory action functions
    fn.call(info, info, key, def);

    if (def.redraw === true) {
      if (typeof info.redrawHandler !== "function") {
        throw new Error("setButtonControl: redrawHandler missing");
      }
      info.redrawHandler();
    }

  }); // end button.addEventListener

  // ----------------------------------------------------------
  // Assemble (NO external label for buttons)
  // ----------------------------------------------------------
  field.appendChild(button);

} // end setButtonControl



