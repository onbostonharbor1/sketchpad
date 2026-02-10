/* controls/widgets/textWidget.js
   ============================================================
   TEXT WIDGET
   ============================================================ */

import { CONTROL_CLASSES } from "../shared/constants.js";

export function setDefaultControl(field, label, def, value, info, key, tabId) {
  const input = document.createElement("input");
  input.type = def.type || "text";
  input.value = value;
  input.id = tabId + "-" + key;
  input.className = "ctrl-text";

  input.addEventListener("input", () => {
    const newVal =
      input.type === "number" ? parseFloat(input.value) : input.value;
    info.parameters[key] = newVal;
    if (typeof info.onParamChange === "function") info.onParamChange();
    info.redrawHandler();
  });

  field.appendChild(label);
  field.appendChild(input);
} // end setDefaultControl

/* ------------------------------------------------------------
   point picker helpers (local to parameterControls.js)
------------------------------------------------------------ */


export function setStaticTextControl(field, label, def, value, info, key, tabId) {

  // ----------------------------------------------------------
  // staticText
  //
  // Display-only block of text in the Action panel.
  //
  // ?EUR? No label
  // ?EUR? No parameter storage
  // ?EUR? No redraw
  // ?EUR? Text must be provided in-memory
  //
  // Text source:
  //   - def.text     : string
  //   - def.getText  : function(info, key, def) -> string
  // ----------------------------------------------------------

  let text;

  if (typeof def.text === "string") {
    text = def.text;
  } else if (typeof def.getText === "function") {
    text = def.getText(info, key, def);
  } else {
    throw new Error(
      "setStaticTextControl: def.text or def.getText required for key " + key
    );
  }

  // Force this control row to behave like a block, not a label+input flex row.
  field.style.display = "block";

  const box = document.createElement("div");
  box.className = "ctrl-static-text";
  box.id = tabId + "-" + key;

  // Make it expand to full available width (fixes the ?EURoeone word per line?EUR? collapse).
  box.style.display = "block";
  box.style.width = "100%";
  box.style.boxSizing = "border-box";

  // Preserve your explicit newlines, wrap normally.
  box.style.whiteSpace = "pre-wrap";
  box.style.wordBreak = "normal";
  box.style.overflowWrap = "break-word";

  box.textContent = text;

  // IMPORTANT: no label appended. This control is text-only.
  field.appendChild(box);

} // end setStaticTextControl

/* ------------------------------------------------------------
   setAccordionControl()

   PURPOSE
   -------
   Renders a Bootstrap accordion in the Action panel.

   UPDATED
   -------
   - Default is CLOSED (def.startOpen defaults to false)
   - Supports a simple clickable list, like a categories frame:

       sections: [
         {
           title: "Draw Registry",
           items: [
             { label: "Linked Circles", action: fn },
             { label: "Mystic Rose",    action: fn }
           ]
         }
       ]

   - If section.controls exists, it renders nested parameter controls
     (original behavior). If section.items exists, it renders a list.
     If both exist, items render first, then controls.

   FAIL-FAST
   ---------
   - Requires window.bootstrap
   - def.sections must be non-empty array
   - section.title must be non-empty string
   - section.items (if present) must be array of {label, action}
------------------------------------------------------------ */


