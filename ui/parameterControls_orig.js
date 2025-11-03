/* parameterControls.js
   ------------------------------------------------------------
   Builds the parameter controls within the action div that
   allow for the manipulation of a draw object. Controls only
   occur if there is a drawRegistery entry for the script
   ------------------------------------------------------------ 

// buildParameterControls(tabId) – build all parameter controls for the tab
// buildSingleControl(...)       – create one control field for a parameter
// setCheckboxControl(...)       – create checkbox control
// setColorControl(...)          – create color picker control
// setDefaultControl(...)        – create numeric/text control
// setRangeControl(...)          – create slider control
// setSelectControl(...)         – create dropdown control

===========================================================
   buildParameterControls(tabId)
   Creates a #drawControls div inside #action.
   Builds live input controls for each parameter defined in
   uiState.drawTabs[tabId].drawRegistry.
   Each change updates uiState.drawTabs[tabId].parameters[key]
   and triggers drawActiveTab().

   Arguments:
     tabId – string identifier for the active tab
=========================================================== */
function buildParameterControls(state, tabId) {
  const actionDiv = document.getElementById("action");
    if (!actionDiv)
	throw new Error("buildDrawControls: #action not found");

    // Clear and create wrapper div
    actionDiv.innerHTML = "";
    const controlsDiv = document.createElement("div");
    controlsDiv.id = "drawControls";
    controlsDiv.className = "draw-controls";
    actionDiv.appendChild(controlsDiv);

    const registry = state.drawRegistry;
    if (!registry)
	throw new Error("drawRegistry missing in tab state");

    // --- Schema and values ---
    const schema = registry.controls || registry.params || {};
    const values = state.parameters || {};
    const keys = Object.keys(schema);

  if (keys.length === 0) {
    controlsDiv.textContent = "(no parameters)";
    return;
  }

  // --- Build each control ---
  keys.forEach(key => {
    const def = schema[key];
    const value = values[key] ?? def.default;
    const field = buildSingleControl(key, def, value, state, tabId);
    controlsDiv.appendChild(field);
  });
} // end buildParameterControls

/* ===========================================================
   buildSingleControl(key, def, value, state, tabId)
   Builds and returns one fully configured parameter control.
   Used by buildDrawControls() to create each field.

   Arguments:
     key – parameter name
     def – definition object (min, max, widget type, etc.)
     value – current parameter value
     state – uiState entry for this tab
     tabId – active tab id
=========================================================== */
function buildSingleControl(key, def, value, state, tabId) {
  const field = document.createElement("div");
  field.className = "ctrl-field";

  const label = document.createElement("label");
  label.className = "ctrl-label";
  label.textContent = def.label || key;
  label.htmlFor = "ctrl-" + key;

  const widget = def.widget || def.type || "number";

  switch (widget) {
    case "range":
      setRangeControl(field, label, def, value, state, key, tabId);
      break;
    case "checkbox":
      setCheckboxControl(field, label, def, value, state, key, tabId);
      break;
    case "select":
      setSelectControl(field, label, def, value, state, key, tabId);
      break;
    case "color":
    case "colorPicker":
      setColorControl(field, label, def, value, state, key, tabId);
      break;
    default:
      setDefaultControl(field, label, def, value, state, key, tabId);
      break;
  }

  return field;
} // end buildSingleControl


/* ===========================================================
   setRangeControl(field, label, def, value, state, key)
   Builds a full range control (min/current/max + slider).

   Arguments:
     field – container element
     label – label element
     def – parameter definition (min, max, step)
     value – current numeric value
     state – uiState entry for current tab
     key – parameter key
     tabId – id of active tab
=========================================================== */
function setRangeControl(field, label, def, value, state, key, tabId) {
  const input = document.createElement("input");
  input.type = "range";
  input.id = "ctrl-" + key;
  input.min = def.min ?? 0;
  input.max = def.max ?? 100;
  input.step = def.step ?? 1;
  input.value = value;

  const rangeWrapper = document.createElement("div");
  rangeWrapper.className = "ctrl-range-wrapper";

  const valueRow = document.createElement("div");
  valueRow.className = "ctrl-range-values";

  const minSpan = document.createElement("span");
  minSpan.className = "ctrl-min";
  minSpan.textContent = input.min;

  const readout = document.createElement("span");
  readout.className = "ctrl-readout";
  readout.textContent = value;

  const maxSpan = document.createElement("span");
  maxSpan.className = "ctrl-max";
  maxSpan.textContent = input.max;

  valueRow.appendChild(minSpan);
  valueRow.appendChild(readout);
  valueRow.appendChild(maxSpan);

    input.addEventListener("input", () => {
	const newVal = parseFloat(input.value);
	readout.textContent = newVal;
	state.parameters[key] = newVal;
      markTabDirty(tabId);
      drawActiveTab();
    });

    rangeWrapper.appendChild(valueRow);
    rangeWrapper.appendChild(input);

    field.appendChild(label);
    field.appendChild(rangeWrapper);
} // end setRangeControl


/* ===========================================================
   setCheckboxControl(field, label, def, value, state, key)
   Builds a single checkbox with label.

   Arguments:
     field – container element
     label – label element
     def – parameter definition
     value – boolean value
     state – uiState entry
     key – parameter key
     tabId – id of active tab
=========================================================== */
function setCheckboxControl(field, label, def, value, state, key, tabId) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = "ctrl-" + key;
    input.checked = !!value;
    
    input.addEventListener("change", () => {
	state.parameters[key] = input.checked;
	markTabDirty(tabId);
	drawActiveTab();
    });

    field.appendChild(input);
    field.appendChild(label);
} // end setCheckboxControl


/* ===========================================================
   setSelectControl(field, label, def, value, state, key)
   Builds a dropdown (<select>) with options.

   Arguments:
     field – container element
     label – label element
     def – parameter definition including options
     value – current selected value
     state – uiState entry
     key – parameter key
     tabId – id of active tab
=========================================================== */
function setSelectControl(field, label, def, value, state, key, tabId) {
  const input = document.createElement("select");
  input.id = "ctrl-" + key;

  const opts = def.options || [];
  opts.forEach(opt => {
    const o = document.createElement("option");
    if (typeof opt === "object") {
      o.value = opt.value;
      o.textContent = opt.label || opt.value;
    } else {
      o.value = opt;
      o.textContent = opt;
    }
    if (String(o.value) === String(value)) o.selected = true;
    input.appendChild(o);
  });

    input.addEventListener("change", () => {
	state.parameters[key] = input.value;
	markTabDirty(tabId);
	drawActiveTab();
    });

    field.appendChild(label);
    field.appendChild(input);
} // end setSelectControl


/* ===========================================================
   setColorControl(field, label, def, value, state, key)
   Builds a color picker input.

   Arguments:
     field – container element
     label – label element
     def – parameter definition
     value – hex color string
     state – uiState entry
     key – parameter key
     tabId – id of active tab
=========================================================== */
function setColorControl(field, label, def, value, state, key, tabId) {
  const input = document.createElement("input");
  input.type = "color";
  input.id = "ctrl-" + key;
  input.value = value || "#000000";

    input.addEventListener("input", () => {
	state.parameters[key] = input.value;
	markTabDirty(tabId);
	drawActiveTab();
    });

    field.appendChild(label);
    field.appendChild(input);
} // end setColorControl


/* ===========================================================
   setDefaultControl(field, label, def, value, state, key)
   Builds numeric or text input field.

   Arguments:
     field – container element
     label – label element
     def – parameter definition (type, min, max)
     value – initial value
     state – uiState entry
     key – parameter key
     tabId – id of active tab
=========================================================== */
function setDefaultControl(field, label, def, value, state, key, tabId) {
  const input = document.createElement("input");
  input.type = def.type === "text" ? "text" : "number";
  input.id = "ctrl-" + key;
  input.value = value;

    if (typeof def.min !== "undefined") input.min = def.min;
    if (typeof def.max !== "undefined") input.max = def.max;
    if (typeof def.step !== "undefined") input.step = def.step;

    input.addEventListener("input", () => {
	const newVal = input.type === "number" ?
	      parseFloat(input.value) : input.value;
	state.parameters[key] = newVal;
	markTabDirty(tabId);
	drawActiveTab();
    });

    field.appendChild(label);
    field.appendChild(input);
} // end setDefaultControl
