/* controls/widgets/radioWidget.js
   ============================================================
   RADIO WIDGET
   ============================================================ */

import { CONTROL_CLASSES } from "../shared/constants.js";
import { rebuildControls } from "../rendering/rebuild.js";

export function setRadioControl(field, label, def, value, info, key, tabId) {

  if (!def.options || !Array.isArray(def.options) || def.options.length === 0) {
    throw new Error("setRadioControl: def.options missing/invalid for key " + key);
  }

  // Group container (keeps radios aligned as a single control row)
  const group = document.createElement("div");
  group.className = "ctrl-radio-group";

  // A stable name groups the radios so only one can be selected.
  const groupName = tabId + "-" + key;

  for (let i = 0; i < def.options.length; i++) {

    const opt = def.options[i];

    let optValue;
    let optLabel;

    if (typeof opt === "object" && opt !== null) {
      optValue = opt.value;
      optLabel = opt.label ?? String(opt.value);
    } else {
      optValue = opt;
      optLabel = String(opt);
    }

    if (optValue === undefined || optValue === null) {
      throw new Error("setRadioControl: option value missing for key " + key);
    }

    const row = document.createElement("div");
    row.className = "ctrl-radio-row";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = groupName;
    input.id = groupName + "-" + i;
    input.className = "ctrl-radio";
    input.value = String(optValue);

    // Compare as strings for consistent matching (DOM radio values are strings).
    input.checked = String(value) === String(optValue);

    const lab = document.createElement("label");
    lab.className = "ctrl-radio-label";
    lab.htmlFor = input.id;
    lab.textContent = optLabel;

    input.addEventListener("change", () => {
      if (!input.checked) return;

      // Store original typed value when possible:
      // - if opt was an object, store opt.value as-is
      // - if opt was a string, store the string
      info.parameters[key] = (typeof opt === "object" && opt !== null) ? optValue : String(optValue);

      if (typeof info.onParamChange === "function") info.onParamChange();
      info.redrawHandler();

      // If this control has showsGroup flag, trigger a full rebuild
      if (def.showsGroup === true) {
        rebuildControls(info, tabId);
      }
    }); // end input.addEventListener

    row.appendChild(input);
    row.appendChild(lab);

    group.appendChild(row);
  }

  field.appendChild(label);
  field.appendChild(group);

} // end setRadioControl

/* ------------------------------------------------------------
   setButtonControl()

   DESCRIPTION
   -----------
   Renders a push-button control that invokes a command.

   LAYOUT RULE
   -----------
   Buttons do NOT use the external label element.
   They must either:
     A) appear in column 2 (normal control column), or
     B) span both columns (full-row), typically centered.

   We support:
     def.fullRow === true  -> span both columns (1 / -1)
     otherwise             -> column 2

   COMPATIBILITY (WITH YOUR EXISTING CONVERSION NOTES)
   ---------------------------------------------------
   Button actions must be preserved IN MEMORY.

   Style A:
     def.action is a function

   Style B:
     def.action is a string, resolved via info.actions[def.action]

   OPTIONAL FLAGS
   --------------
   def.redraw === true
     If set, info.redrawHandler() is called after the action.

------------------------------------------------------------ */

