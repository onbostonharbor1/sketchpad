/* controls/rendering/renderer.js
   ============================================================
   RENDERER
   ============================================================ */

import { WIDGET_TYPES } from "../shared/constants.js";
import { setHiddenControl } from "../widgets/hiddenWidget.js";
import { setRangeControlUnified } from "../widgets/rangeWidget.js";
import { setRangeHeaderControl } from "../widgets/rangeWidget.js";
import { setCheckboxControl } from "../widgets/checkboxWidget.js";
import { setSelectControl } from "../widgets/selectWidget.js";
import { setRadioControl } from "../widgets/radioWidget.js";
import { setColorControl } from "../widgets/colorWidget.js";
import { setButtonControl } from "../widgets/buttonWidget.js";
import { setStaticTextControl, setDefaultControl } from "../widgets/textWidget.js";
import { setAccordionControl } from "../widgets/accordionWidget.js";
import { setThumbnailGridControl } from "../widgets/thumbnailWidget.js";
import { setNumberControl }        from "../widgets/numberWidget.js";

export function renderParameterControls(
  sourceInfo,
  controlData,
  targetTabId = "tab-generic"
) {

  // ---------------------------------------------------------
  // DOM TARGET RESOLUTION: ACTION AREA
  //
  // This is the ONLY required DOM anchor for this renderer.
  // If it does not exist, the active tab?EUR(TM)s layout is broken.
  //
  // ENVIRONMENT:
  //   Writes into the active tab?EUR(TM)s #action area.
  // ---------------------------------------------------------
  const actionDiv = document.getElementById("action");
  if (!actionDiv) throw new Error("renderParameterControls: #action not found");

  // ---------------------------------------------------------
  // CONTROLS CONTAINER
  //
  // We locate or create #drawControls within #action.
  // We clear ONLY this container, preserving other tools (like checkboxes).
  // ---------------------------------------------------------
  let controlsDiv = document.getElementById("drawControls");
  if (!controlsDiv) {
    controlsDiv = document.createElement("div");
    controlsDiv.id = "drawControls";
    controlsDiv.className = "draw-controls";
    actionDiv.appendChild(controlsDiv);
  }

  // Also locate Interface Controls container (added to index.html in layout refactor)
  // If not present, we can't render interface controls (or could create it).
  const interfaceDiv = document.getElementById("interface-controls");

  controlsDiv.innerHTML = "";
  if (interfaceDiv) interfaceDiv.innerHTML = "";

  // ---------------------------------------------------------
  // EMPTY STATE
  //
  // If no controls exist, we render a friendly placeholder.
  //
  // ENVIRONMENT:
  // ---------------------------------------------------------
  if (!controlData || controlData.length === 0) {
    controlsDiv.textContent = "(no parameters)";
    return;
  }

  // ---------------------------------------------------------
  // RENDER EACH CONTROL
  //
  // controlData is the normalized list produced by:
  //   - buildDrawParameterData()   or
  //   - buildScriptParameterData()
  //
  // For each item:
  //   1. Locate the original schema definition ("def")
  //   2. Ask buildSingleControl() to create a DOM field
  //   3. Append the field into #drawControls (unless hidden)
  //
  // ENVIRONMENT:
  //   Each field becomes a child element of:
  // ---------------------------------------------------------
  controlData.forEach((item) => {

    // -------------------------------------------------------
    // SCHEMA SOURCE RESOLUTION
    //
    // We need the original per-key schema definition so we can
    // provide buildSingleControl() with full control metadata
    // (widget type, ranges, options, etc.).
    //
    // Priority order:
    //   1) sourceInfo.controls
    //      - typical for Scripts/Tools
    //
    //   2) sourceInfo.drawRegistry?.controls
    //      - typical for Draw tab, when sourceInfo is tabState
    //
    //   3) {}
    //
    // NOTE:
    // This is schema lookup only. The actual current value is
    // item.value, already normalized earlier.
    // -------------------------------------------------------
    const schemaSource =
      sourceInfo.controls || sourceInfo.drawRegistry?.controls || {};

    // -------------------------------------------------------
    // Lookup the schema definition for this specific parameter.
    // -------------------------------------------------------
    const def = schemaSource[item.key];

    // -------------------------------------------------------
    // BUILD ONE CONTROL FIELD
    //
    // CHANGE (BUTTON ONLY):
    //   For button controls, pass the FULL normalized item
    //   so action/redraw metadata survives normalization.
    // -------------------------------------------------------
    const field = buildSingleControl(
      sourceInfo,
      item.key,
      def,
      (item.widget === "button") ? item : item.value,
      targetTabId
    );

    // -------------------------------------------------------
    // HIDDEN CONTROL RULE & TARGETING
    // -------------------------------------------------------
    if (field) {
        if (item.isInterface && interfaceDiv) {
            interfaceDiv.appendChild(field);
            interfaceDiv.style.display = "block"; // Ensure visible if it has content
        } else {
            controlsDiv.appendChild(field);
        }
    }
  });

  // Hide interface div if empty (handled by CSS :empty but explicit doesn't hurt)
  // if (interfaceDiv && interfaceDiv.children.length === 0) {
  //     interfaceDiv.style.display = "none";
  // }

} // end renderParameterControls




/* ------------------------------------------------------------
   buildSingleControl() ?EUR" UPDATE
   - Add a new case: "radio"
------------------------------------------------------------ */

export function buildSingleControl(info, key, def, value, tabId) {

  // Determine the actual widget type
  // For interface controls, def.control contains the widget type
  // For standard controls, def.widget contains the widget type
  const widgetType = def.control || def.widget || def.type || "text";

  // Hidden controls do not render a field at all.
  if (widgetType === "hidden") {
    return setHiddenControl(info, key, def, value, tabId);
  }

  // ----------------------------------------------------------
  // staticText controls can be conditionally suppressed without
  // creating an empty row.
  //
  // If def.showKey exists and the corresponding parameter is false,
  // we return null so renderParameterControls() skips it.
  // ----------------------------------------------------------
  if (widgetType === "staticText") {
    if (def.showKey) {
      if (info.parameters[def.showKey] !== true) return null;
    }
  }

  const field = document.createElement("div");
  field.className = "ctrl-field";

  const label = document.createElement("label");
  label.className = "ctrl-label";
  label.textContent = def.label || key;
  label.htmlFor = tabId + "-" + key;

  switch (widgetType) {
    case "range":
      setRangeControlUnified(field, label, def, value, info, key, tabId);
      break;

    // inside buildSingleControl() switch
    case "rangeHeader":
      setRangeHeaderControl(field, label, def, value, info, key, tabId);
      break;

    case "accordion":
      setAccordionControl(field, label, def, value, info, key, tabId);
      break;


    case "checkbox":
      setCheckboxControl(field, label, def, value, info, key, tabId);
      break;

    case "select":
      setSelectControl(field, label, def, value, info, key, tabId);
      break;

    case "button": {
      // Button controls: value is expected to be the FULL normalized item.
      const item = value;

      const def2 = Object.assign({}, def);
      def2.action = item.action;
      def2.redraw = item.redraw;

      setButtonControl(field, label, def2, null, info, key, tabId);
      break;
    }

    case "staticText":
      setStaticTextControl(field, label, def, value, info, key, tabId);
      break;

    case "radio":
      setRadioControl(field, label, def, value, info, key, tabId);
      break;

    case "thumbnailGrid":
      setThumbnailGridControl(field, label, def, value, info, key, tabId);
      break;

    // case "pointPicker":
    //   setPointPickerControl(field, label, def, value, info, key, tabId);
    //   break;

    // case "pointPickerArray":
    //   setPointPickerArrayControl(field, label, def, value, info, key, tabId);
    //   break;

    case "number":
      setNumberControl(field, label, def, value, info, key, tabId);
      break;

    case "color":
    case "colorPicker":
      setColorControl(field, label, def, value, info, key, tabId);
      break;

    case "text":
    default:
      setDefaultControl(field, label, def, value, info, key, tabId);
      break;
  }

  return field;

} // end buildSingleControl


/* ------------------------------------------------------------
   setHiddenControl()
   - Ensures a key exists in the params model but renders nothing.
   - Returns null so caller can skip appending it.
------------------------------------------------------------ */

