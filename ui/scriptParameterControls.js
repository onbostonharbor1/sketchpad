/* buildScriptParameterControls.js
   ------------------------------------------------------------
   Scripts-only parameter UI (display-only version).
   Parallels the Draw control builder but isolated so that
   no interactive or redraw behavior occurs.
   ------------------------------------------------------------ */

function buildScriptParameterControls(scriptInfo, tabId = "tab-scripts") {
    const actionDiv = document.getElementById("action");
    if (!actionDiv)
	throw new Error("buildScriptParameterControls: #action not found");

    // clear display area
    actionDiv.innerHTML = "";
    const controlsDiv = document.createElement("div");
    controlsDiv.id = "drawControls";
    controlsDiv.className = "draw-controls";
    actionDiv.appendChild(controlsDiv);

  if (!scriptInfo || !scriptInfo.params) {
    controlsDiv.textContent = "(no parameters)";
    return;
  }

    const schema = scriptInfo.controls;
    const keys = Object.keys(schema);
    if (keys.length === 0) {
	controlsDiv.textContent = "(no parameters)";
	return;
    }

    keys.forEach(key => {
	const def = schema[key];
	const value = scriptInfo.params[key] ?? def.default ?? "";
	const field = buildSingleScriptControl(key, def, value);

	// --- Hook up live handler ---
	const input = field.querySelector("input, select");
	if (input) {
	    input.addEventListener("input", () => {
		let newValue;
		if (input.type === "checkbox") newValue = input.checked;
		else if (input.type === "range")
		    newValue = parseFloat(input.value);
		else newValue = input.value;
		
		scriptInfo.params[key] = newValue;
		// redraw using active script function
		if (typeof redrawActiveScript === "function")
		    redrawActiveScript();
	    });
	}

	controlsDiv.appendChild(field);
    });

} // end buildScriptParameterControls


/* ------------------------------------------------------------
   buildSingleScriptControl()
   Standalone analogue of buildSingleControl for Scripts.
   No state, tab, or event wiring.
------------------------------------------------------------ */
function buildSingleScriptControl(key, def, value) {
  const field = document.createElement("div");
  field.className = "ctrl-field";

  const label = document.createElement("label");
  label.className = "ctrl-label";
  label.textContent = def.label || key;
  label.htmlFor = "script-" + key;

  switch (def.widget) {
    case "range":
      setScriptRangeControl(field, label, def, value, key);
      break;
    case "checkbox":
      setScriptCheckboxControl(field, label, def, value, key);
      break;
    case "select":
      setScriptSelectControl(field, label, def, value, key);
      break;
    case "color":
    case "colorPicker":
      setScriptColorControl(field, label, def, value, key);
      break;
    default:
      setScriptDefaultControl(field, label, def, value, key);
      break;
  }

  return field;
} // end buildSingleScriptControl


/* ------------------------------------------------------------
   setScriptRangeControl()
------------------------------------------------------------ */
function setScriptRangeControl(field, label, def, value, key) {
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
  input.id = "script-" + key;
  input.className = "ctrl-range";

  input.addEventListener("input", () => {
    readout.textContent = input.value;
  });

  wrapper.appendChild(row);
  wrapper.appendChild(input);

  field.appendChild(label);
  field.appendChild(wrapper);
} // end setScriptRangeControl


/* ------------------------------------------------------------
   setScriptCheckboxControl()
------------------------------------------------------------ */
function setScriptCheckboxControl(field, label, def, value, key) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = value === true;
  input.id = "script-" + key;
  input.className = "ctrl-check";

  field.appendChild(label);
  field.appendChild(input);
} // end setScriptCheckboxControl


/* ------------------------------------------------------------
   setScriptSelectControl()
------------------------------------------------------------ */
function setScriptSelectControl(field, label, def, value, key) {
  const select = document.createElement("select");
  select.id = "script-" + key;
  select.className = "ctrl-select";

  (def.options || []).forEach(opt => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    if (opt === value) o.selected = true;
    select.appendChild(o);
  });

  field.appendChild(label);
  field.appendChild(select);
} // end setScriptSelectControl


/* ------------------------------------------------------------
   setScriptColorControl()
------------------------------------------------------------ */
function setScriptColorControl(field, label, def, value, key) {
  const input = document.createElement("input");
  input.type = "color";
  input.value = value || "#000000";
  input.id = "script-" + key;
  input.className = "ctrl-color";

  field.appendChild(label);
  field.appendChild(input);
} // end setScriptColorControl


/* ------------------------------------------------------------
   setScriptDefaultControl()
------------------------------------------------------------ */
function setScriptDefaultControl(field, label, def, value, key) {
  const input = document.createElement("input");
  input.type = def.type || "text";
  input.value = value;
  input.id = "script-" + key;
  input.className = "ctrl-text";

  field.appendChild(label);
  field.appendChild(input);
} // end setScriptDefaultControl
