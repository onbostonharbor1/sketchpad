/* controls/widgets/colorWidget.js
   ============================================================
   COLOR WIDGET
   ============================================================ */

import { CONTROL_CLASSES } from "../shared/constants.js";

export function setColorControl(field, label, def, value, info, key, tabId) {
  const current = value || "hsl(0, 0%, 0%)";

  // Label stays in column 1
  field.appendChild(label);

  // Wrapper for swatch + hidden Coloris input
  const wrap = document.createElement("div");
  wrap.className = "ctrl-color-wrap";

  // Hidden Coloris input (still text, still HSL)
  const input = document.createElement("input");
  input.type = "text";                    // must stay "text" for HSL
  input.value = current;
  input.id = tabId + "-" + key;
  input.setAttribute("data-coloris", ""); // activates Coloris
  input.className = "ctrl-color-input";

  // Visible swatch button
  const swatch = document.createElement("button");
  swatch.type = "button";
  swatch.className = "ctrl-color-swatch";
  swatch.style.backgroundColor = current;

  // Keep model + swatch in sync when Coloris changes the input
  input.addEventListener("input", (e) => {
    const newVal = e.target.value;
    info.parameters[key] = newVal;
    swatch.style.backgroundColor = newVal;
    if (typeof info.onParamChange === "function") info.onParamChange();
    info.redrawHandler();
  });

  // Clicking the swatch opens the Coloris picker
  swatch.addEventListener("click", () => {
    input.focus();
    input.click();
  });

  wrap.appendChild(swatch);
  wrap.appendChild(input);
  field.appendChild(wrap);
}

/* ------------------------------------------------------------
   setDefaultControl()
------------------------------------------------------------ */

