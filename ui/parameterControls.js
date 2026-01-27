/* ============================================================
   ParameterControls — Control Schema Flags (def.*)
   ------------------------------------------------------------
   This file consumes per-control schema objects ("def") from:
     - drawRegistry.controls (Draw tab)
     - scriptInfo.controls   (Scripts tab)

   The following def.* members are treated as FLAGS or OPTIONS
   that change rendering or behavior.

   ------------------------------------------------------------
   RANGE CONTROLS (widget: "range")
   ------------------------------------------------------------

   >> step

   >> clearOnAction

   def.min / def.max / def.step
     - Numeric range configuration for <input type="range">.
     - Applied in both setRangeControl() and setRangeHeaderControl().

   >> noButtons

   def.noButtons === true
     - Suppresses the small step buttons (< and >) that sit immediately
       left/right of the slider.
     - Used by BOTH range styles:
         setRangeControl()
         setRangeHeaderControl()

   >> rangeHeader

   def.rangeHeader === true
     - Selects which RANGE UI variant to draw when widget === "range".
     - Used only by setRangeControlUnified():
         true  -> setRangeHeaderControl()
         false -> setRangeControl() (classic min/readout/max style)

     NOTE: This makes "range" and "rangeHeader" interchangeable by
           schema flag instead of by widget name.

   def.rebuildControls === true
     - After a control changes value, the Action panel is rebuilt
       by calling:
         buildDrawParameterData(info)
         renderParameterControls(info, data, tabId)
     - Used by:
         setRangeControl()
         setRangeHeaderControl()
         setRadioControl()
     - (Other control types may add support later.)

   ------------------------------------------------------------
   HIDDEN CONTROLS (widget: "hidden")
   ------------------------------------------------------------
   >> hidden

   def.widget === "hidden"
     - Control is not rendered (returns null) and does not consume
       space in the Action panel.
     - Implemented in buildSingleControl() via setHiddenControl().

   ------------------------------------------------------------
   STATIC TEXT (widget: "staticText")
   ------------------------------------------------------------

   def.showKey = "<boolean-parameter-key>"
     - Conditional visibility for staticText controls.
     - If def.showKey is present and info.parameters[def.showKey] !== true,
       buildSingleControl() returns null (control is skipped).

   ------------------------------------------------------------
   POINT PICKERS (widget: "pointPicker" / "pointPickerArray")
   ------------------------------------------------------------

   >> noReadout

   def.noReadout === true
     - Suppresses the x,y readout text input(s) for point pickers.
     - Implemented in setPointPickerControl() and setPointPickerArrayControl().
     - NOTE: setPointPickerControl currently also hides the entire field
       (field.style.display = "none") when noReadout is true.

   ------------------------------------------------------------
   BUTTON CONTROLS (widget: "button")
   ------------------------------------------------------------

   def.fullRow === true
     - Button spans both grid columns (gridColumn: "1 / -1") and is centered.
     - Otherwise button is placed in column 2 (control column).
     - Implemented in setButtonControl().

   def.redraw === true
     - After the button action runs, forces info.redrawHandler().
     - Implemented in setButtonControl().

   ------------------------------------------------------------
   ACCORDION CONTROLS (widget: "accordion")
   ------------------------------------------------------------

   def.startOpen === true
     - Accordion sections start open; default is closed.
     - Implemented in setAccordionControl().

   def.redrawOnToggle === true
     - Calls info.redrawHandler() when a section is shown/hidden.
     - Implemented in setAccordionControl().

   sec.listClass / sec.itemClass (optional section members)
     - Optional CSS class overrides for accordion "items" list rendering.
     - Used in setAccordionControl() when sec.items exists.

   ------------------------------------------------------------
   SELECT / RADIO OPTIONS
   ------------------------------------------------------------

   def.options (array)
     - Enumerated options for widget: "select" and widget: "radio".
     - Used by setSelectControl() and setRadioControl().

   ------------------------------------------------------------
   NOTE ON info.onParamChange (Option A)
   ------------------------------------------------------------
   This file treats info.onParamChange as OPTIONAL.
   If present and a function, it is called after value updates.
   (setRangeHeaderControl used to require it; it no longer does.)
   ============================================================ */

import { overlayManager } from "./overlay.js";

/* ===========================================================
   buildParameterControls()
   -----------------------------------------------------------
   High-level dispatcher for building parameter control data.

   IMPORTANT CONCEPT:
   ------------------
   This function does NOT directly manipulate the DOM.
   It prepares a *normalized control-data array* that will
   later be rendered into a specific TAB ENVIRONMENT.

   The "environment" here means:
     - Which top-level tab is active (Draw, Scripts, etc.)
     - Which tab-specific ACTION AREA will receive controls
       when renderParameterControls() is invoked.

   Typical environments:
     - Draw tab      → #tab-draw → action panel
     - Scripts tab   → #tab-scripts → action panel
     - Other tabs    → future extensions

   This function is intentionally generic and delegates:
     - data extraction → tab-specific builders
     - DOM rendering   → renderParameterControls()

=========================================================== */
export function buildParameterControls(
  sourceInfo,
  targetTabId = "tab-generic",
  render = true
) {
  let controlData = [];

  // ---------------------------------------------------------
  // AUTO-DETECT ENVIRONMENT (CRITICAL FIX)
  // ---------------------------------------------------------
  // If caller did not provide a specific tab id, infer the
  // correct builder from the shape of sourceInfo.
  //
  // Utilities Lab passes scriptInfo directly.
  // scriptInfo has: { parameters, controls, redrawHandler, ... }
  //
  // Draw passes a tabState with: { drawRegistry, parameters, ... }
  // ---------------------------------------------------------
  if (targetTabId === "tab-generic") {

    // ScriptInfo path (Utilities / Scripts-style)
    if (sourceInfo && sourceInfo.controls) {
      controlData = buildScriptParameterData(sourceInfo);
    }

    // Draw tabState path
    else if (sourceInfo && sourceInfo.drawRegistry) {
      controlData = buildDrawParameterData(sourceInfo);
    }

    // Unknown shape -> no controls
    else {
      controlData = [];
    }

  } else if (targetTabId.startsWith("tab-scripts")) {

    controlData = buildScriptParameterData(sourceInfo);

  } else if (targetTabId.startsWith("tab-draw")) {

    controlData = buildDrawParameterData(sourceInfo);

  } else {

    // Fallback: if caller provided some other tab id, still try shape-based inference
    if (sourceInfo && sourceInfo.controls) {
      controlData = buildScriptParameterData(sourceInfo);
    } else if (sourceInfo && sourceInfo.drawRegistry) {
      controlData = buildDrawParameterData(sourceInfo);
    } else {
      controlData = [];
    }
  }

  if (render) {
    renderParameterControls(sourceInfo, controlData, targetTabId);
  }

  return controlData;
} // end buildParameterControls



/* ===========================================================
   buildDrawParameterData(tabState)
   -----------------------------------------------------------
   DRAW TAB DATA BUILDER

   ENVIRONMENT:
   ------------
   Draw Tab only.

   This function extracts parameter definitions and current
   values from uiState-derived data structures and converts
   them into a normalized control schema suitable for UI
   rendering.

   It does NOT:
     - modify uiState
     - modify DOM
     - perform rendering

=========================================================== */
function buildDrawParameterData(tabState) {

  // ---------------------------------------------------------
  // Defensive guard:
  // If the Draw tab is not initialized or no registry
  // is active, there are no parameters to expose.
  //
  // Resulting environment effect:
  //   → Action panel remains empty.
  // ---------------------------------------------------------
  if (!tabState || !tabState.drawRegistry) return [];

  // ---------------------------------------------------------
  // The drawRegistry entry defines the parameter schema.
  //
  // controls → preferred modern name
  // params   → legacy / fallback
  // ---------------------------------------------------------
  const registry = tabState.drawRegistry;
  const schema = registry.controls || registry.params || {};

  const keys = Object.keys(schema);
  if (keys.length === 0) return [];

  // ---------------------------------------------------------
  // Normalize each parameter definition into a uniform
  // control descriptor object.
  //
  // This abstraction allows rendering logic to be
  // completely agnostic of where the data came from.
  // ---------------------------------------------------------
  return keys.map((key) => {
    const def = schema[key];

    // -----------------------------------------------------
    // Parameter value resolution priority:
    //   1. current uiState parameter value
    //   2. default defined in schema
    //   3. empty string
    // -----------------------------------------------------
    const value = tabState.parameters?.[key] ?? def.default ?? "";

    return {
      key: key,                         // parameter identifier
      label: def.label || key,          // UI label text
      widget: def.widget || def.type || "text",
      min: def.min ?? null,             // numeric constraints
      max: def.max ?? null,
      step: def.step ?? null,
      options: def.options ?? null,     // select / enum support
      value: value,                     // current value
      default: def.default ?? null,     // fallback reset value
    };
  });
} // end buildDrawParameterData



/* ===========================================================
   buildScriptParameterData(sourceInfo)
   -----------------------------------------------------------
   SCRIPTS TAB DATA BUILDER

   ENVIRONMENT:
   ------------
   Scripts / Tools tab only.

   This function extracts parameter definitions from a
   script descriptor object rather than uiState.

   It supports:
     - utility scripts
     - tools
     - batch operations

=========================================================== */
export function buildScriptParameterData(sourceInfo) {

  // ---------------------------------------------------------
  // Guard:
  // Scripts without declared controls expose no parameters.
  // ---------------------------------------------------------
  if (!sourceInfo || !sourceInfo.controls) return [];

  const schema = sourceInfo.controls;
  const keys = Object.keys(schema);
  if (keys.length === 0) return [];

  // ---------------------------------------------------------
  // Normalize script parameter schema exactly the same way
  // as Draw parameters so rendering code can be shared.
  //
  // IMPORTANT:
  // Button controls require def.action (function or string).
  // The normalized item MUST preserve it, because it is not a
  // “value” field and it may not be JSON-safe.
  // ---------------------------------------------------------
  return keys.map((key) => {

    const def = schema[key];

    const value = sourceInfo.parameters?.[key] ?? def.default ?? "";

    const item = {
      key: key,                         // parameter identifier
      label: def.label || key,          // UI label
      widget: def.widget || def.type || "text",
      min: def.min ?? null,
      max: def.max ?? null,
      step: def.step ?? null,
      options: def.options ?? null,
      value: value,                     // current script value
      default: def.default ?? null
    };

    // -------------------------------------------------------
    // Button-only metadata that must be preserved in memory.
    // -------------------------------------------------------
    if (item.widget === "button") {
      item.action = def.action;               // function OR string
      item.redraw = def.redraw ?? false;      // optional
    }

    return item;

  });
} // end buildScriptParameterData


/* ===========================================================
   renderParameterControls(sourceInfo, controlData, targetTabId)
   -----------------------------------------------------------
   GENERIC DOM RENDERER FOR PARAMETER CONTROLS

   WHAT THIS FUNCTION DOES
   -----------------------
   1. Locates the active tab’s Action Area container: #action
   2. Clears that area (destructive rebuild)
   3. Creates a new controls container (#drawControls)
   4. Renders each control in controlData using buildSingleControl()
   5. Appends each resulting field to #drawControls
   6. Special-case: skip null fields (hidden controls)

   TAB ENVIRONMENT (WHERE IT WRITES)
   --------------------------------
   This function writes ONLY to DOM under:

       <div id="action"> ... </div>

   The meaning of #action depends on which top-level tab is active.

   • Draw tab:
       - #action is the left-side controls panel for the Draw tab
       - Controls typically drive live redraw to #sketchpad canvas

   • Scripts/Tools tab:
       - #action is the controls panel for script parameters
       - Controls configure scripts; script output usually goes to #text

   • Other/future tabs:
       - #action is still the designated “Action Area”
       - This renderer is tab-agnostic; behavior depends on handlers

   IMPORTANT ARCHITECTURAL CONTRACT
   --------------------------------
   • #action MUST exist for the active tab layout.
   • This function assumes that the UI shell for the active tab
     has already been created by that tab’s init/restore logic.
   • This function does NOT create tab structure; it only fills #action.
   • This function is destructive: it clears #action and rebuilds
     controls every time it runs.
   • This function does NOT update uiState directly.
     It only creates DOM controls; event wiring is inside
     buildSingleControl() (or helpers called by it).
   • targetTabId is passed through to buildSingleControl() so that
     control builders can vary behavior per tab (e.g., change handlers).

   NOTE ABOUT THE "MINIMAL EDIT"
   -----------------------------
   Hidden controls return null from buildSingleControl().
   This renderer must skip appending those null fields so that:
     - no empty rows appear
     - hidden controls do not consume DOM space

=========================================================== */
export function renderParameterControls(
  sourceInfo,
  controlData,
  targetTabId = "tab-generic"
) {

  // ---------------------------------------------------------
  // DOM TARGET RESOLUTION: ACTION AREA
  //
  // This is the ONLY required DOM anchor for this renderer.
  // If it does not exist, the active tab’s layout is broken.
  //
  // ENVIRONMENT:
  //   Writes into the active tab’s #action area.
  // ---------------------------------------------------------
  const actionDiv = document.getElementById("action");
  if (!actionDiv) throw new Error("renderParameterControls: #action not found");

  // ---------------------------------------------------------
  // DESTRUCTIVE REBUILD
  //
  // We clear the action panel entirely so controls always reflect
  // the current schema + values.
  //
  // EFFECT ON ENVIRONMENT:
  //   Any previous action-panel content for this tab is discarded.
  //   (This is intentional and deterministic.)
  // ---------------------------------------------------------
  actionDiv.innerHTML = "";

  // ---------------------------------------------------------
  // CONTROLS CONTAINER
  //
  // We create a dedicated container for the rendered fields.
  // The id "drawControls" is historical; it currently represents
  // “parameter controls” even when used outside the Draw tab.
  //
  // ENVIRONMENT:
  //   Appended under #action in the active tab.
  // ---------------------------------------------------------
  const controlsDiv = document.createElement("div");
  controlsDiv.id = "drawControls";
  controlsDiv.className = "draw-controls";
  actionDiv.appendChild(controlsDiv);

  // ---------------------------------------------------------
  // EMPTY STATE
  //
  // If no controls exist, we render a friendly placeholder.
  //
  // ENVIRONMENT:
  //   Writes text into #action → #drawControls.
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
  //     #action → #drawControls → <field>
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
    // HIDDEN CONTROL RULE
    // -------------------------------------------------------
    if (field) controlsDiv.appendChild(field);
  });
} // end renderParameterControls




/* ------------------------------------------------------------
   buildSingleControl() — UPDATE
   - Add a new case: "radio"
------------------------------------------------------------ */
function buildSingleControl(info, key, def, value, tabId) {

  // Hidden controls do not render a field at all.
  if (def.widget === "hidden") {
    return setHiddenControl(info, key, def, value, tabId);
  }

  // ----------------------------------------------------------
  // staticText controls can be conditionally suppressed without
  // creating an empty row.
  //
  // If def.showKey exists and the corresponding parameter is false,
  // we return null so renderParameterControls() skips it.
  // ----------------------------------------------------------
  if (def.widget === "staticText") {
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

  switch (def.widget) {
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

    // case "pointPicker":
    //   setPointPickerControl(field, label, def, value, info, key, tabId);
    //   break;

    // case "pointPickerArray":
    //   setPointPickerArrayControl(field, label, def, value, info, key, tabId);
    //   break;

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
function setHiddenControl(info, key, def, value, tabId) {
  // No UI.
  // We do not touch info.parameters[key] here.
  // The registry entry (or caller) owns maintaining it.
  return null;
} // end setHiddenControl

function setRangeControlUnified(field, label, def, value, info, key, tabId) {

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
   Match the “black-background” style UI shown in your reference.

   REQUIRED
   --------
   - info.parameters exists
   - info.onParamChange() exists
   - info.redrawHandler() exists

------------------------------------------------------------ */
function setRangeHeaderControl(field, _label, def, value, info, key, tabId) {

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




function setRangeControl(field, label, def, value, info, key, tabId) {

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
function setCheckboxControl(field, label, def, value, info, key, tabId) {
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
function setSelectControl(field, label, def, value, info, key, tabId) {
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
    if (typeof info.onParamChange === "function") info.onParamChange();
    info.redrawHandler();
  });

  field.appendChild(label);
  field.appendChild(select);
} // end setSelectControl

/* ------------------------------------------------------------
   setColorControl()
------------------------------------------------------------ */
function setColorControl(field, label, def, value, info, key, tabId) {
  const input = document.createElement("input");
  input.type = "color";
  input.value = value || "#000000";
  input.id = tabId + "-" + key;
  input.className = "ctrl-color";

  input.addEventListener("input", () => {
    info.parameters[key] = input.value;
    if (typeof info.onParamChange === "function") info.onParamChange();
    info.redrawHandler();
  });

  field.appendChild(label);
  field.appendChild(input);
} // end setColorControl


/* ------------------------------------------------------------
   setDefaultControl()
------------------------------------------------------------ */
function setDefaultControl(field, label, def, value, info, key, tabId) {
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

function pointPickerDotId(tabId, key, index) {
  // index may be null for single-point controls
  if (index === null || index === undefined) return "dot-" + tabId + "-" + key;
  return "dot-" + tabId + "-" + key + "-" + index;
} // end pointPickerDotId

function removePointPickerDots(container, tabId, key) {
  // Remove any existing dots created for this control.
  // This prevents dot accumulation when the action panel is rebuilt.
  const prefix = "dot-" + tabId + "-" + key;
  const kids = Array.from(container.children);

  for (let i = 0; i < kids.length; i++) {
    const el = kids[i];
    if (el.id && el.id.startsWith(prefix)) {
      container.removeChild(el);
    }
  }
} // end removePointPickerDots

/* ------------------------------------------------------------
   setPointPickerControl()
   ------------------------------------------------------------
   PURPOSE
   -------
   Render ONE point-picker control (single Point value = {x, y})
   that:
     - shows a read-only text readout: "x, y"
     - draws ONE draggable dot on the interaction overlay layer
     - updates info.parameters[key].x/y while dragging
     - calls info.onParamChange() and info.redrawHandler()

   IMPORTANT DESIGN NOTES
   ----------------------
   This version intentionally preserves your “old” drag model:
     - mousedown starts drag
     - window mousemove updates dot position + parameter
     - window mouseup ends drag

   But it adds key fixes borrowed from the newer work:
     (A) Remove old dots for this key on rebuild (prevents duplicates)
     (B) Use a tab+key-specific dot id (prevents collisions)
     (C) Do NOT leave window listeners installed forever
         (install them only during drag; remove on mouseup)

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - #sharedCanvas exists
   - overlayManager.canvasLayers["interaction"] exists
   - info.parameters[key] already exists and is an object with x/y
   - info.redrawHandler exists
------------------------------------------------------------ */


/* ------------------------------------------------------------
   setPointPickerControl()
   ------------------------------------------------------------
   PURPOSE
   -------
   Render ONE point-picker control (single Point value = {x, y}).

   UPDATED BEHAVIOR
   ----------------
   - Supports 'def.noReadout': If true, the x,y text input is hidden.
   - Preserves draggable dot functionality on the interaction layer.
------------------------------------------------------------ */
function setPointPickerControl_old(field, label, def, value, info, key, tabId) {

  // ---------------------------------------------------------
  // READOUT (UI)
  // ---------------------------------------------------------
  const noReadout = !!def.noReadout;
  let readout = null;

  if (!noReadout) {
    readout = document.createElement("input");
    readout.type = "text";
    readout.readOnly = true;
    readout.className = "ctrl-text";
    readout.value = Math.round(value.x) + ", " + Math.round(value.y);
    readout.id = tabId + "-" + key;
  }

  // ---------------------------------------------------------
  // CANVAS & OVERLAY LOOKUP
  // ---------------------------------------------------------
  const canvas = document.getElementById("sharedCanvas");
  if (!canvas) throw new Error("pointPicker: #sharedCanvas not found");

  const container = overlayManager.canvasLayers["interaction"];
  if (!container) throw new Error("pointPicker: interaction-layer missing");

  container.style.display = "block";

  // ---------------------------------------------------------
  // DOT CLEANUP
  // ---------------------------------------------------------
  const prefix = "dot-" + tabId + "-" + key;
  const kids = Array.from(container.children);

  for (let i = 0; i < kids.length; i++) {
    const el = kids[i];
    if (el.id && el.id.indexOf(prefix) === 0) {
      container.removeChild(el);
    }
  }

  // ---------------------------------------------------------
  // DOT CREATION
  // ---------------------------------------------------------
  const dot = document.createElement("div");
  dot.className = "point-picker-dot";
  dot.id = prefix;
  dot.style.position = "absolute";
  dot.style.left = (value.x - 5) + "px";
  dot.style.top  = (value.y - 5) + "px";
  dot.style.cursor = "grab";
  container.appendChild(dot);

  // ---------------------------------------------------------
  // DRAG STATE & HANDLERS
  // ---------------------------------------------------------
  let isDragging = false;

  function onMouseMove(e) {
    if (!isDragging) return;

    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const newX = e.clientX - rect.left;
    const newY = e.clientY - rect.top;

    // Update dot position (visual)
    dot.style.left = (newX - 5) + "px";
    dot.style.top  = (newY - 5) + "px";

    // Update the underlying model
    info.parameters[key].x = newX;
    info.parameters[key].y = newY;

    // Notify and redraw
    if (typeof info.onParamChange === "function") info.onParamChange();
    info.redrawHandler();

    // Update the readout text only if it exists
    if (readout) {
      readout.value = Math.round(newX) + ", " + Math.round(newY);
    }
  } // end onMouseMove

  function endDrag() {
    if (!isDragging) return;

    isDragging = false;
    dot.style.cursor = "grab";

    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", endDrag);
  } // end endDrag

  dot.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();

    isDragging = true;
    dot.style.cursor = "grabbing";

    window.addEventListener("mousemove", onMouseMove, { passive: false });
    window.addEventListener("mouseup", endDrag);
  });

  // ---------------------------------------------------------
  // ASSEMBLE CONTROL ROW DOM
  // ---------------------------------------------------------
// Only append the label if we are NOT suppressing the readout.
  // This prevents the "orphan label" look in your screenshot.
  if (!noReadout) {
    field.appendChild(label);
    if (readout) {
      field.appendChild(readout);
    }
  } else {
    // Optional: If noReadout is true, we might want to hide the
    // entire row container so it doesn't take up vertical space.
    field.style.display = "none";
  }

} // end setPointPickerControl

function setPointPickerArrayControl_old(field, label, def, value, info, key, tabId) {
  if (!Array.isArray(value)) {
    throw new Error("pointPickerArray: value must be an array for key " + key);
  }

  const canvas = document.getElementById("sharedCanvas");
  if (!canvas) throw new Error("pointPickerArray: #sharedCanvas not found");

  const container = overlayManager.canvasLayers["interaction"];
  if (!container) throw new Error("pointPickerArray: interaction-layer missing");

  // Dots must be able to receive pointer events.
  container.style.display = "block";
  container.style.pointerEvents = "auto";

  // ------------------------------------------------------------
  // Remove any existing dots for THIS control instance only.
  // Prevents duplicates when the action panel is rebuilt.
  // ------------------------------------------------------------
  const prefix = "dot-" + tabId + "-" + key + "-";
  const children = Array.from(container.children);

  for (let i = 0; i < children.length; i++) {
    const el = children[i];
    if (el.id && el.id.indexOf(prefix) === 0) {
      container.removeChild(el);
    }
  }

  const noReadout = !!def.noReadout;

  // Optional readouts (one per point), only if not suppressed.
  const readouts = [];

  if (!noReadout) {
    field.appendChild(label);

    for (let i = 0; i < value.length; i++) {
      const p = value[i];
      if (!p) throw new Error("pointPickerArray: missing point at index " + i);

      const readout = document.createElement("input");
      readout.type = "text";
      readout.readOnly = true;
      readout.className = "ctrl-text";
      readout.value = Math.round(p.x) + ", " + Math.round(p.y);
      readout.id = tabId + "-" + key + "-" + i;

      readouts.push(readout);
      field.appendChild(readout);
    }
  }

  // ------------------------------------------------------------
  // Create N draggable dots.
  // IMPORTANT:
  // - Mousemove/mouseup listeners are installed ONLY during drag.
  // - They are removed on mouseup.
  // This prevents stale handlers and duplicated listeners.
  // ------------------------------------------------------------
  for (let i = 0; i < value.length; i++) {
    const p = value[i];

    const dot = document.createElement("div");
    dot.className = "point-picker-dot";
    dot.id = "dot-" + tabId + "-" + key + "-" + i;

    dot.style.position = "absolute";
    dot.style.left = (p.x - 5) + "px";
    dot.style.top  = (p.y - 5) + "px";
    dot.style.cursor = "grab";

    container.appendChild(dot);

    let isDragging = false;

    function onMouseMove(e) {
      if (!isDragging) return;

      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const newX = e.clientX - rect.left;
      const newY = e.clientY - rect.top;

      // Move the dot (visual)
      dot.style.left = (newX - 5) + "px";
      dot.style.top  = (newY - 5) + "px";

      // Update the underlying model
      info.parameters[key][i].x = newX;
      info.parameters[key][i].y = newY;

      // Update readout if enabled
      if (!noReadout) {
        readouts[i].value = Math.round(newX) + ", " + Math.round(newY);
      }

      if (typeof info.onParamChange === "function") info.onParamChange();
      info.redrawHandler();
    } // end onMouseMove

    function endDrag() {
      if (!isDragging) return;

      isDragging = false;
      dot.style.cursor = "grab";

      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", endDrag);
    } // end endDrag

    dot.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();

      isDragging = true;
      dot.style.cursor = "grabbing";

      window.addEventListener("mousemove", onMouseMove, { passive: false });
      window.addEventListener("mouseup", endDrag);
    }); // end dot.addEventListener
  }

} // end setPointPickerArrayControl




/* ------------------------------------------------------------
   setRadioControl()

   DESCRIPTION
   -----------
   Renders a radio-button group driven by def.options.
   Exactly one option is selectable at a time.

   CONTROL SCHEMA (USAGE)
   ---------------------
   Example controls block:

     controls: {
       mode: {
         label: "Mode",
         widget: "radio",
         options: [
           "linear",
           "radial",
           { value: "spiral", label: "Spiral Mode" }
         ],
         default: "linear",
         rebuildControls: false   // optional
       }
     }

   OPTIONS FORMAT
   --------------
   def.options may be:
     • ["A", "B", "C"]
     • [
         { value: "A", label: "Option A" },
         { value: "B", label: "Option B" }
       ]

   VALUE RULES
   -----------
   • Stored in info.parameters[key]
   • Stored value is:
       - the string itself (for string options)
       - opt.value (for object options)
   • DOM radio values are strings; matching is done as strings,
     but stored values preserve original typing where possible.

   RUNTIME BEHAVIOR
   ----------------
   • Selecting a radio updates info.parameters[key]
   • Calls info.onParamChange() if defined
   • Calls info.redrawHandler()
   • If def.rebuildControls === true:
       - control panel is rebuilt after change

   FAIL-FAST CONDITIONS
   --------------------
   • def.options missing or not an array
   • def.options empty
   • option value missing or undefined
------------------------------------------------------------ */


function setRadioControl(field, label, def, value, info, key, tabId) {

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

      if (def.rebuildControls) {
        const data = buildDrawParameterData(info);
        renderParameterControls(info, data, tabId);
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
function setButtonControl(field, label, def, value, info, key, tabId) {

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


function setStaticTextControl(field, label, def, value, info, key, tabId) {

  // ----------------------------------------------------------
  // staticText
  //
  // Display-only block of text in the Action panel.
  //
  // • No label
  // • No parameter storage
  // • No redraw
  // • Text must be provided in-memory
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

  // Make it expand to full available width (fixes the “one word per line” collapse).
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

function setAccordionControl(field, label, def, value, info, key, tabId) {

  if (!field) throw new Error("setAccordionControl: field missing");
  if (!def) throw new Error("setAccordionControl: def missing for key " + key);
  if (!info) throw new Error("setAccordionControl: info missing for key " + key);
  if (!info.parameters) throw new Error("setAccordionControl: info.parameters missing for key " + key);
  if (typeof info.redrawHandler !== "function") throw new Error("setAccordionControl: info.redrawHandler is not a function");
  if (!tabId) throw new Error("setAccordionControl: tabId missing");
  if (!key) throw new Error("setAccordionControl: key missing");

  if (!window.bootstrap) {
    throw new Error("setAccordionControl: Bootstrap JS (window.bootstrap) not found");
  }

  const sections = def.sections;
  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    throw new Error("setAccordionControl: def.sections missing/invalid for key " + key);
  }

  // Default CLOSED unless explicitly requested.
  const startOpen = (def.startOpen === true);

  // Full-width wrapper (accordion manages its own layout)
  const wrap = document.createElement("div");
  wrap.className = "ctrl-accordion-wrap";
  wrap.style.gridColumn = "1 / -1";

  const acc = document.createElement("div");
  acc.className = "accordion";
  acc.id = tabId + "-" + key + "-accordion";

  for (let i = 0; i < sections.length; i++) {

    const sec = sections[i];
    if (!sec) throw new Error("setAccordionControl: missing section at index " + i + " for key " + key);

    if (typeof sec.title !== "string" || sec.title.trim() === "") {
      throw new Error("setAccordionControl: section.title missing/invalid at index " + i + " for key " + key);
    }

    const hasItems = (sec.items !== undefined);
    const hasControls = (sec.controls !== undefined);

    if (hasItems) {
      if (!Array.isArray(sec.items)) {
        throw new Error("setAccordionControl: section.items must be an array at index " + i + " for key " + key);
      }
    }

    if (hasControls) {
      if (!sec.controls || typeof sec.controls !== "object") {
        throw new Error("setAccordionControl: section.controls missing/invalid at index " + i + " for key " + key);
      }
    }

    if (!hasItems && !hasControls) {
      throw new Error("setAccordionControl: section must define items and/or controls at index " + i + " for key " + key);
    }

    const item = document.createElement("div");
    item.className = "accordion-item";

    const h2 = document.createElement("h2");
    h2.className = "accordion-header";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "accordion-button";
    if (!startOpen) btn.classList.add("collapsed");
    btn.textContent = sec.title;

    const collapseId = tabId + "-" + key + "-collapse-" + i;
    btn.setAttribute("data-bs-toggle", "collapse");
    btn.setAttribute("data-bs-target", "#" + collapseId);
    btn.setAttribute("aria-expanded", startOpen ? "true" : "false");
    btn.setAttribute("aria-controls", collapseId);

    h2.appendChild(btn);

    const bodyWrap = document.createElement("div");
    bodyWrap.id = collapseId;
    bodyWrap.className = "accordion-collapse collapse" + (startOpen ? " show" : "");
    bodyWrap.setAttribute("data-bs-parent", "#" + acc.id);

    const body = document.createElement("div");
    body.className = "accordion-body";

    // --------------------------------------------------------
    // 1) OPTIONAL: Render a categories-style clickable list
    // --------------------------------------------------------
    if (hasItems) {

      const list = document.createElement("div");
      list.className = (typeof sec.listClass === "string" && sec.listClass.trim() !== "")
        ? sec.listClass
        : "ctrl-accordion-list";

      for (let j = 0; j < sec.items.length; j++) {

        const it = sec.items[j];
        if (!it) throw new Error("setAccordionControl: missing item at section " + i + " index " + j);

        if (typeof it.label !== "string" || it.label.trim() === "") {
          throw new Error("setAccordionControl: item.label missing/invalid at section " + i + " index " + j);
        }

        if (typeof it.action !== "function") {
          throw new Error("setAccordionControl: item.action missing/invalid for '" + it.label + "'");
        }

        const row = document.createElement("div");
        row.className = (typeof sec.itemClass === "string" && sec.itemClass.trim() !== "")
          ? sec.itemClass
          : "ctrl-accordion-item";

        row.textContent = it.label;
        row.style.cursor = "pointer";

        // CLICK LISTENER WITH SYSTEM-LEVEL CLEARING
        row.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          // If the accordion definition includes clearOnAction,
          // handle the canvas housekeeping here.
          if (def.clearOnAction === true) {
            const canvas = document.getElementById("sharedCanvas");
            if (canvas) {
              const ctx = canvas.getContext("2d");
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
          }

          it.action();
        });

        list.appendChild(row);

        // separator line
        if (j !== sec.items.length - 1) {
          const hr = document.createElement("hr");
          hr.className = "ctrl-accordion-sep";
          list.appendChild(hr);
        }
      }

      body.appendChild(list);
    }

    // --------------------------------------------------------
    // 2) OPTIONAL: Render nested parameter controls (original)
    // --------------------------------------------------------
    if (hasControls) {

      const innerKeys = Object.keys(sec.controls);

      for (let k = 0; k < innerKeys.length; k++) {

        const innerKey = innerKeys[k];
        const innerDef = sec.controls[innerKey];

        if (!innerDef) {
          throw new Error("setAccordionControl: missing innerDef for key " + innerKey);
        }

        const innerValue =
          (info.parameters[innerKey] !== undefined) ? info.parameters[innerKey]
          : (innerDef.default !== undefined) ? innerDef.default
          : "";

        let passValue = innerValue;

        if (innerDef.widget === "button") {
          passValue = {
            widget: "button",
            action: innerDef.action,
            redraw: (innerDef.redraw !== undefined) ? innerDef.redraw : false
          };
        }

        const innerField = buildSingleControl(
          info,
          innerKey,
          innerDef,
          passValue,
          tabId
        );

        if (innerField) body.appendChild(innerField);
      }
    }

    bodyWrap.appendChild(body);

    item.appendChild(h2);
    item.appendChild(bodyWrap);

    acc.appendChild(item);
  }

  // Optional redraw on accordion toggle
  if (def.redrawOnToggle === true) {
    acc.addEventListener("shown.bs.collapse", () => {
      info.redrawHandler();
    });
    acc.addEventListener("hidden.bs.collapse", () => {
      info.redrawHandler();
    });
  }

  wrap.appendChild(acc);
  field.appendChild(wrap);

} // end setAccordionControl








