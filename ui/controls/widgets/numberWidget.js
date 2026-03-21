/* controls/widgets/numberWidget.js
   ============================================================
   NUMBER WIDGET
   ============================================================
   Renders a plain <input type="number"> control.

   Spec entry:
     count: { widget: "number", label: "Copies", min: 1 }

   Behavior:
     - Updates info.parameters[key] on change
     - Calls info.redrawHandler() if defined
     - Enforces min (and max if provided)
   ============================================================ */

import { CONTROL_CLASSES } from "/ui/controls/shared/constants.js";


/* ============================================================
   setNumberControl(field, label, def, value, info, key, tabId)
   ============================================================ */
export function setNumberControl(field, label, def, value, info, key, tabId) {

  /* -- Build the input ---------------------------------------- */
  const input = document.createElement("input");
  input.type      = "number";
  input.id        = tabId + "-" + key;
  input.className = CONTROL_CLASSES.NUMBER || "ctrl-number";
  input.value     = value ?? (def.min ?? 1);

  if (def.min  !== undefined) input.min  = def.min;
  if (def.max  !== undefined) input.max  = def.max;
  if (def.step !== undefined) input.step = def.step;

  /* -- Wire change handler ------------------------------------ */
  input.addEventListener("change", () => {
    let val = parseFloat(input.value);

    if (isNaN(val)) val = def.min ?? 1;
    if (def.min !== undefined && val < def.min) val = def.min;
    if (def.max !== undefined && val > def.max) val = def.max;

    input.value = val;
    info.parameters[key] = val;

    if (typeof info.redrawHandler === "function") {
      info.redrawHandler();
    }
  });

  /* -- Assemble ----------------------------------------------- */
  label.htmlFor = input.id;
  field.appendChild(label);
  field.appendChild(input);

} // end setNumberControl
