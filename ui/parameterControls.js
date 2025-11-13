/* ===========================================================
   buildParameterControls(sourceInfo, targetTabId, render)
   -----------------------------------------------------------
   Generic entry point for building parameter controls.
   - Always constructs a neutral data structure.
   - Optionally renders the controls in the #action area.
   - Delegates to a tab-specific data builder.
=========================================================== */
function buildParameterControls(
  sourceInfo,
  targetTabId = "tab-generic",
  render = true
) {
  // Determine which data builder to use
  let controlData = [];

  if (targetTabId.startsWith("tab-scripts")) {
    controlData = buildScriptParameterData(sourceInfo);
  } else if (targetTabId.startsWith("tab-draw")) {
    controlData = buildDrawParameterData(sourceInfo);
  }

  // Render if requested
  if (render) {
    renderParameterControls(sourceInfo, controlData, targetTabId);
  }

  return controlData;
} // end buildParameterControls

/* ===========================================================
   buildDrawParameterData(tabState)
   -----------------------------------------------------------
   Draw-specific data builder.
   Extracts parameter schema and current values from uiState.
=========================================================== */
function buildDrawParameterData(tabState) {
  if (!tabState || !tabState.drawRegistry) return [];

  const registry = tabState.drawRegistry;
  const schema = registry.controls || registry.params || {};
  const keys = Object.keys(schema);
  if (keys.length === 0) return [];

  return keys.map((key) => {
    const def = schema[key];
    const value = tabState.parameters?.[key] ?? def.default ?? "";
    return {
      key: key,
      label: def.label || key,
      widget: def.widget || def.type || "text",
      min: def.min ?? null,
      max: def.max ?? null,
      step: def.step ?? null,
      options: def.options ?? null,
      value: value,
      default: def.default ?? null,
    };
  });
} // end buildDrawParameterData

/* ===========================================================
   buildScriptParameterData(sourceInfo)
   -----------------------------------------------------------
   Scripts-specific data builder.
   Extracts parameter schema and current values from scriptInfo.
=========================================================== */
function buildScriptParameterData(sourceInfo) {
  if (!sourceInfo || !sourceInfo.controls) return [];

  const schema = sourceInfo.controls;
  const keys = Object.keys(schema);
  if (keys.length === 0) return [];

  return keys.map((key) => {
    const def = schema[key];
    const value = sourceInfo.parameters?.[key] ?? def.default ?? "";
    return {
      key: key,
      label: def.label || key,
      widget: def.widget || def.type || "text",
      min: def.min ?? null,
      max: def.max ?? null,
      step: def.step ?? null,
      options: def.options ?? null,
      value: value,
      default: def.default ?? null,
    };
  });
} // end buildScriptParameterData

/* ===========================================================
   renderParameterControls(sourceInfo, controlData, targetTabId)
   -----------------------------------------------------------
   Generic renderer. Creates and inserts controls into DOM.
   Uses the appropriate per-tab control builder.
=========================================================== */
function renderParameterControls(
  sourceInfo,
  controlData,
  targetTabId = "tab-generic"
) {
  const actionDiv = document.getElementById("action");
  if (!actionDiv) throw new Error("renderParameterControls: #action not found");

  actionDiv.innerHTML = "";
  const controlsDiv = document.createElement("div");
  controlsDiv.id = "drawControls";
  controlsDiv.className = "draw-controls";
  actionDiv.appendChild(controlsDiv);

  if (!controlData || controlData.length === 0) {
    controlsDiv.textContent = "(no parameters)";
    return;
  }

  // delegate to specific control builder
  controlData.forEach((item) => {
    const schemaSource =
      sourceInfo.controls || sourceInfo.drawRegistry?.controls || {};
    const def = schemaSource[item.key];

    const field = buildSingleControl(
      sourceInfo,
      item.key,
      def,
      item.value,
      targetTabId
    );
    controlsDiv.appendChild(field);
  });
}

/* ------------------------------------------------------------
   buildSingleControl()
   Decides which widget to build and delegates creation.
------------------------------------------------------------ */
function buildSingleControl(info, key, def, value, tabId) {
  const field = document.createElement("div");
  field.className = "ctrl-field";

  const label = document.createElement("label");
  label.className = "ctrl-label";
  label.textContent = def.label || key;
  label.htmlFor = tabId + "-" + key;

  switch (def.widget) {
    case "range":
      setRangeControl(field, label, def, value, info, key, tabId);
      break;
    case "checkbox":
      setCheckboxControl(field, label, def, value, info, key, tabId);
      break;
    case "select":
      setSelectControl(field, label, def, value, info, key, tabId);
      break;

    case "pointPicker":
      setPointPickerControl(field, label, def, value, info, key, tabId);
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
   setRangeControl()
------------------------------------------------------------ */
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

  input.addEventListener("input", () => {
    const newVal = parseFloat(input.value);
    readout.textContent = newVal;
    info.parameters[key] = newVal;
    if (typeof info.redrawHandler === "function") info.redrawHandler();
  });
  wrapper.appendChild(row);
  wrapper.appendChild(input);

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
    if (typeof info.redrawHandler === "function") info.redrawHandler();
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
    o.value = opt;
    o.textContent = opt;
    if (opt === value) o.selected = true;
    select.appendChild(o);
  });

  select.addEventListener("change", () => {
    info.parameters[key] = select.value;
    if (typeof info.redrawHandler === "function") info.redrawHandler();
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
    if (typeof info.redrawHandler === "function") info.redrawHandler();
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
    if (typeof info.redrawHandler === "function") info.redrawHandler();
  });

  field.appendChild(label);
  field.appendChild(input);
} // end setDefaultControl

function setPointPickerControl(field, label, def, value, info, key, tabId) {
  const readout = document.createElement("input");
  readout.type = "text";
  readout.readOnly = true;
  readout.className = "ctrl-text";
  readout.value = `${Math.round(value.x)}, ${Math.round(value.y)}`;
  readout.id = tabId + "-" + key;

  const canvas = document.getElementById("sharedCanvas");
const container = document.getElementById("sketchpad");
  const rect = canvas.getBoundingClientRect();

  const dot = document.createElement("div");
  dot.className = "point-picker-dot";
  dot.id = `dot-${key}`;
  dot.style.position = "absolute";
  dot.style.left = value.x - 5 + "px";
  dot.style.top  = value.y - 5 + "px";
  dot.style.cursor = "grab";
  container.appendChild(dot);

  let isDragging = false;

  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();

    // compute coordinates relative to canvas
    const rect = canvas.getBoundingClientRect();
    const newX = e.clientX - rect.left;
    const newY = e.clientY - rect.top;

    dot.style.left = newX - 5 + "px";
    dot.style.top  = newY - 5 + "px";

    info.parameters[key].x = newX;
    info.parameters[key].y = newY;
    readout.value = `${Math.round(newX)}, ${Math.round(newY)}`;

    if (typeof info.redrawHandler === "function") {
      info.redrawHandler();
    }
  };

  dot.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
    dot.style.cursor = "grabbing";
  });

  window.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      dot.style.cursor = "grab";
    }
  });

  window.addEventListener("mousemove", onMouseMove, { passive: false });

  field.appendChild(label);
  field.appendChild(readout);
} // end setPointPickerControl




