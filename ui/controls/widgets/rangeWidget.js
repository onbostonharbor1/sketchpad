/* controls/widgets/rangeWidget.js
   ============================================================
   RANGE WIDGET
   ============================================================ */

import { CONTROL_CLASSES } from "../shared/constants.js";
import { buildDrawParameterData} from   "/ui/controls/builders/dataBuilder.js";
import { renderParameterControls } from "/ui/controls/rendering/renderer.js";

export function setRangeControlUnified(field, label, def, value, info, key, tabId) {

  if (def.rangeHeader === true) {
    setRangeHeaderControl(field, label, def, value, info, key, tabId);
  } else {
    setRangeControl(field, label, def, value, info, key, tabId);
  }

} // end setRangeControlUnified


/* ------------------------------------------------------------
   setRangeHeaderControl()

   DESCRIPTION
   -----------
   Alternate range control UI:
     - header line: "Label: <value>"
     - slider below (full width)
     - no min/max/readout row

   PURPOSE
   -------
   Match the ?EURoeblack-background?EUR? style UI shown in your reference.

   REQUIRED
   --------
   - info.parameters exists
   - info.onParamChange() exists
   - info.redrawHandler() exists

------------------------------------------------------------ */

export function setRangeHeaderControl(field, _label, def, value, info, key, tabId) {

  // ----------------------------------------------------------
  // FAIL-FAST: required structures
  // ----------------------------------------------------------
  if (!field) throw new Error("setRangeHeaderControl: field missing");
  if (!def) throw new Error("setRangeHeaderControl: def missing for key " + key);
  if (!info) throw new Error("setRangeHeaderControl: info missing for key " + key);
  if (!info.parameters) throw new Error("setRangeHeaderControl: info.parameters missing for key " + key);
  if (typeof info.redrawHandler !== "function") throw new Error("setRangeHeaderControl: info.redrawHandler is not a function");
  if (!tabId) throw new Error("setRangeHeaderControl: tabId missing");
  if (!key) throw new Error("setRangeHeaderControl: key missing");

  // NOTE (Option A):
  // info.onParamChange is OPTIONAL for interchangeability with setRangeControl().
  // If present, we call it; if missing, we do nothing.

  // ----------------------------------------------------------
  // Defaults (no ?? / no optional chaining)
  // ----------------------------------------------------------
  const min  = (def.min  !== undefined) ? def.min  : 0;
  const max  = (def.max  !== undefined) ? def.max  : 100;
  const step = (def.step !== undefined) ? def.step : 1;

  // ----------------------------------------------------------
  // Full-row wrapper: spans BOTH grid columns
  // ----------------------------------------------------------
  const wrap = document.createElement("div");
  wrap.className = "ctrl-rangehdr-wrap";
  wrap.style.gridColumn = "1 / -1";     // full width across the 2-col grid

  // ----------------------------------------------------------
  // Header row: label (left) + current value (right)
  // (NO external label element for this control type)
  // ----------------------------------------------------------
  const head = document.createElement("div");
  head.className = "ctrl-rangehdr-head";

  const lbl = document.createElement("div");
  lbl.className = "ctrl-rangehdr-label";
  lbl.textContent = def.label || key;

  const val = document.createElement("div");
  val.className = "ctrl-rangehdr-value";
  val.textContent = String(value);

  head.appendChild(lbl);
  head.appendChild(val);

  // ----------------------------------------------------------
  // Slider
  // ----------------------------------------------------------
  const input = document.createElement("input");
  input.type = "range";
  input.className = "ctrl-rangehdr";
  input.id = tabId + "-" + key;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);

  function clampValue(v) {
    const lo = parseFloat(input.min);
    const hi = parseFloat(input.max);
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  } // end clampValue

  function applyValue(newVal) {

    const clamped = clampValue(newVal);

    input.value = String(clamped);

    val.textContent = String(clamped);
    info.parameters[key] = clamped;

    if (typeof info.onParamChange === "function") {
      info.onParamChange();
    }

    info.redrawHandler();

    if (def.rebuildControls) {
      const data = buildDrawParameterData(info);
      renderParameterControls(info, data, tabId);
    }

  } // end applyValue

  input.addEventListener("input", () => {
    const newVal = parseFloat(input.value);
    applyValue(newVal);
  }); // end input.addEventListener

  // ----------------------------------------------------------
  // Slider row: optional buttons + range input
  // (reuses the SAME button classes as setRangeControl)
  // ----------------------------------------------------------
  const sliderRow = document.createElement("div");
  sliderRow.className = "ctrl-range-slider-row";

  if (!def.noButtons) {

    const decBtn = document.createElement("button");
    decBtn.type = "button";
    decBtn.className = "ctrl-range-step-btn ctrl-range-step-dec";
    decBtn.textContent = "<";

    const incBtn = document.createElement("button");
    incBtn.type = "button";
    incBtn.className = "ctrl-range-step-btn ctrl-range-step-inc";
    incBtn.textContent = ">";

    decBtn.addEventListener("click", () => {
      const s   = parseFloat(input.step);
      const cur = parseFloat(input.value);
      applyValue(cur - s);
    }); // end decBtn.addEventListener

    incBtn.addEventListener("click", () => {
      const s   = parseFloat(input.step);
      const cur = parseFloat(input.value);
      applyValue(cur + s);
    }); // end incBtn.addEventListener

    sliderRow.appendChild(decBtn);
    sliderRow.appendChild(input);
    sliderRow.appendChild(incBtn);

  } else {

    sliderRow.appendChild(input);

  }

  // ----------------------------------------------------------
  // Assemble
  // ----------------------------------------------------------
  wrap.appendChild(head);
  wrap.appendChild(sliderRow);

  field.appendChild(wrap);

} // end setRangeHeaderControl





export function setRangeControl(field, label, def, value, info, key, tabId) {

  const wrapper = document.createElement("div");
  wrapper.className = "ctrl-range-wrapper";

  const row = document.createElement("div");
  row.className = "ctrl-range-values";

  const minSpan = document.createElement("span");
  minSpan.textContent = def.min ?? 0;

  const readout = document.createElement("span");
  readout.className = "ctrl-readout";
  readout.textContent = value;

  const maxSpan = document.createElement("span");
  maxSpan.textContent = def.max ?? 100;

  row.appendChild(minSpan);
  row.appendChild(readout);
  row.appendChild(maxSpan);

  const input = document.createElement("input");
  input.type = "range";
  input.min = def.min ?? 0;
  input.max = def.max ?? 100;
  input.step = def.step ?? 1;
  input.value = value;
  input.id = tabId + "-" + key;
  input.className = "ctrl-range";

  function clampValue(v) {
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    if (v < min) return min;
    if (v > max) return max;
    return v;
  } // end clampValue

  function applyValue(newVal) {

    const clamped = clampValue(newVal);

    // Set the slider value (range input expects a string)
    input.value = String(clamped);

    // Keep UI + model in sync using the same logic as dragging
    readout.textContent = clamped;
    info.parameters[key] = clamped;

    // IMPORTANT:
    // Some scriptInfo objects do not define onParamChange().
    // ParameterControls must be generic; do not require it.
    if (typeof info.onParamChange === "function") {
      info.onParamChange();
    }

    info.redrawHandler();

    if (def.rebuildControls) {
      const data = buildDrawParameterData(info);
      renderParameterControls(info, data, tabId);
    }

  } // end applyValue

  input.addEventListener("input", () => {
    const newVal = parseFloat(input.value);
    applyValue(newVal);
  }); // end input.addEventListener

  wrapper.appendChild(row);

  // Slider row: optional buttons + range input
  const sliderRow = document.createElement("div");
  sliderRow.className = "ctrl-range-slider-row";

  if (!def.noButtons) {

    const decBtn = document.createElement("button");
    decBtn.type = "button";
    decBtn.className = "ctrl-range-step-btn ctrl-range-step-dec";
    decBtn.textContent = "<";

    const incBtn = document.createElement("button");
    incBtn.type = "button";
    incBtn.className = "ctrl-range-step-btn ctrl-range-step-inc";
    incBtn.textContent = ">";

    decBtn.addEventListener("click", () => {
      const step = parseFloat(input.step);
      const cur  = parseFloat(input.value);
      applyValue(cur - step);
    }); // end decBtn.addEventListener

    incBtn.addEventListener("click", () => {
      const step = parseFloat(input.step);
      const cur  = parseFloat(input.value);
      applyValue(cur + step);
    }); // end incBtn.addEventListener

    sliderRow.appendChild(decBtn);
    sliderRow.appendChild(input);
    sliderRow.appendChild(incBtn);

  } else {

    sliderRow.appendChild(input);

  }

  wrapper.appendChild(sliderRow);

  field.appendChild(label);
  field.appendChild(wrapper);

} // end setRangeControl




/* ------------------------------------------------------------
   setCheckboxControl()
------------------------------------------------------------ */

