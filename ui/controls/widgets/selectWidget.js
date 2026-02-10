/* controls/widgets/selectWidget.js
   ============================================================
   SELECT WIDGET
   ============================================================ */

import { CONTROL_CLASSES } from "../shared/constants.js";
import { rebuildControls } from "../rendering/rebuild.js";

export function setSelectControl(field, label, def, value, info, key, tabId) {
  const select = document.createElement("select");
  select.id = tabId + "-" + key;
  select.className = "ctrl-select";

  (def.options || []).forEach((opt) => {
    const o = document.createElement("option");

    // allow either string or object with { value, label }
    if (typeof opt === "object" && opt !== null) {
      o.value = opt.value;
      o.textContent = opt.label ?? String(opt.value);
      if (opt.value === value) o.selected = true;
    } else {
      o.value = opt;
      o.textContent = opt;
      if (opt === value) o.selected = true;
    }

    select.appendChild(o);
  });

  select.addEventListener("change", () => {
    // convert numeric strings back to numbers automatically
    const raw = select.value;
    const num = !isNaN(raw) && raw.trim() !== "" ? Number(raw) : raw;
    info.parameters[key] = num;
    
    // If this control has showsGroup flag, trigger a full rebuild
    if (def.showsGroup === true) {
      rebuildControls(info, tabId);
    }
    
    if (typeof info.onParamChange === "function") info.onParamChange();
    info.redrawHandler();
  });

  field.appendChild(label);
  field.appendChild(select);
} // end setSelectControl

/* ------------------------------------------------------------
   setColorControl()
------------------------------------------------------------ */
// function setColorControl(field, label, def, value, info, key, tabId) {
//   const input = document.createElement("input");
//   input.type = "color";
//   input.value = value || "#000000";
//   input.id = tabId + "-" + key;
//   input.className = "ctrl-color";

//   input.addEventListener("input", () => {
//     info.parameters[key] = input.value;
//     if (typeof info.onParamChange === "function") info.onParamChange();
//     info.redrawHandler();
//   });

//   field.appendChild(label);
//   field.appendChild(input);
// } // end setColorControl



