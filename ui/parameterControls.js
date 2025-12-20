/* ===========================================================
   buildParameterControls(sourceInfo, targetTabId, render)
   -----------------------------------------------------------
   Generic entry point for building parameter controls.
   - Always constructs a neutral data structure.
   - Optionally renders the controls in the #action area.
   - Delegates to a tab-specific data builder.
=========================================================== */

import { overlayManager } from "./overlay.js";


export function buildParameterControls(
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
/* ===========================================================
   renderParameterControls() — MINIMAL EDIT
   - Skip appending null fields (used by "hidden" widget).
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

    // IMPORTANT CHANGE:
    // Hidden controls return null so they do not render.
    if (field) controlsDiv.appendChild(field);
  });
} // end renderParameterControls


/* ------------------------------------------------------------
   buildSingleControl() — MINIMAL EDIT
   - Add a new case: "hidden"
------------------------------------------------------------ */
function buildSingleControl(info, key, def, value, tabId) {
  // Hidden controls do not render a field at all.
  // This keeps the "controls list drives keys" model intact
  // without displaying a UI element.
  if (def.widget === "hidden") {
    return setHiddenControl(info, key, def, value, tabId);
  }

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

    case "pointPickerArray":
      setPointPickerArrayControl(field, label, def, value, info, key, tabId);
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
function setHiddenControl(info, key, def, value, tabId) {
  // No UI.
  // We do not touch info.parameters[key] here.
  // The registry entry (or caller) owns maintaining it.
  return null;
} // end setHiddenControl



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

  info.onParamChange();
  info.redrawHandler();

  if (def.rebuildControls) {
    const data = buildDrawParameterData(info);
    renderParameterControls(info, data, tabId);
  }
}); // end input.addEventListener



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
   - Supports a single Point (value = {x,y}) OR an array of Points.
   - No window-level listeners.
   - No permanent pointer interception.
   - Removes old dots for this control on rebuild.
------------------------------------------------------------ */
function setPointPickerControl(field, label, def, value, info, key, tabId) {
  const canvas = document.getElementById("sharedCanvas");
  if (!canvas) throw new Error("pointPicker: #sharedCanvas not found");

  const container = overlayManager.getCanvasLayer("interaction");
  // Note: overlayManager.getCanvasLayer already fail-fast throws if missing

  // Remove any existing dots for this control (rebuild-safe)
  removePointPickerDots(container, tabId, key);

  // We keep interaction-layer non-interactive except while dragging
  // so it cannot block normal canvas interactions.
  container.style.display = "block";

  // If your CSS already sets pointer-events:none for interaction-layer,
  // keep it that way until a drag starts.
  container.style.pointerEvents = "none";

  // Normalize: allow single point or array of points
  const isArray = Array.isArray(value);
  const points = isArray ? value : [value];

  // Build one readout per point (stacked)
  // If you prefer a single combined readout for arrays, say so.
  const readouts = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!p) throw new Error("pointPicker: missing point value for " + key);

    const readout = document.createElement("input");
    readout.type = "text";
    readout.readOnly = true;
    readout.className = "ctrl-text";
    readout.value = Math.round(p.x) + ", " + Math.round(p.y);
    readout.id = tabId + "-" + key + (isArray ? "-" + i : "");
    readouts.push(readout);
  }

  // Create dots
  for (let i = 0; i < points.length; i++) {
    const p = points[i];

    const dot = document.createElement("div");
    dot.className = "point-picker-dot";
    dot.id = pointPickerDotId(tabId, key, isArray ? i : null);
    dot.style.position = "absolute";
    dot.style.left = (p.x - 5) + "px";
    dot.style.top  = (p.y - 5) + "px";
    dot.style.cursor = "grab";
    dot.style.touchAction = "none"; // prevents browser panning/zooming during drag
    container.appendChild(dot);

    // Use Pointer Events so we don't install global window handlers.
    dot.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();

      dot.setPointerCapture(e.pointerId);
      dot.style.cursor = "grabbing";

      // Enable event handling only during the drag
      container.style.pointerEvents = "auto";

      const onMove = (ev) => {
        ev.preventDefault();

        const rect = canvas.getBoundingClientRect();
        const newX = ev.clientX - rect.left;
        const newY = ev.clientY - rect.top;

        dot.style.left = (newX - 5) + "px";
        dot.style.top  = (newY - 5) + "px";

        if (isArray) {
          // Expect info.parameters[key] to be an array of Points
          info.parameters[key][i].x = newX;
          info.parameters[key][i].y = newY;
          readouts[i].value = Math.round(newX) + ", " + Math.round(newY);
        } else {
          info.parameters[key].x = newX;
          info.parameters[key].y = newY;
          readouts[0].value = Math.round(newX) + ", " + Math.round(newY);
        }

        if (typeof info.onParamChange === "function") info.onParamChange();
        info.redrawHandler();
      };

      const onUp = (ev) => {
        ev.preventDefault();

        dot.releasePointerCapture(ev.pointerId);
        dot.style.cursor = "grab";

        dot.removeEventListener("pointermove", onMove);
        dot.removeEventListener("pointerup", onUp);
        dot.removeEventListener("pointercancel", onUp);

        // Immediately stop intercepting clicks when drag ends
        container.style.pointerEvents = "none";
      };

      dot.addEventListener("pointermove", onMove);
      dot.addEventListener("pointerup", onUp);
      dot.addEventListener("pointercancel", onUp);
    });
  }

  // Assemble DOM
  field.appendChild(label);

  for (let i = 0; i < readouts.length; i++) {
    field.appendChild(readouts[i]);
  }
} // end setPointPickerControl

function setPointPickerArrayControl(field, label, def, value, info, key, tabId) {
  if (!Array.isArray(value)) {
    throw new Error("pointPickerArray: value must be an array for key " + key);
  }

  const canvas = document.getElementById("sharedCanvas");
  if (!canvas) throw new Error("pointPickerArray: #sharedCanvas not found");

  // Use the same access pattern you already used successfully.
  const container = overlayManager.canvasLayers["interaction"];
  if (!container) throw new Error("pointPickerArray: interaction-layer missing");

  // The container MUST accept events or the dots cannot be dragged.
  container.style.display = "block";
  container.style.pointerEvents = "auto";

  // ------------------------------------------------------------
  // Clean up previous dots for THIS control instance only.
  // (This does NOT solve the “dots persist on numCircles change”
  // issue in general, but it prevents duplicates for this key.)
  // ------------------------------------------------------------
  const prefix = "dot-" + tabId + "-" + key + "-";
  const children = Array.from(container.children);

  for (let i = 0; i < children.length; i++) {
    const el = children[i];
    if (el.id && el.id.indexOf(prefix) === 0) {
      container.removeChild(el);
    }
  }

  // If noReadout is set, we draw dots only (no label/readouts).
  const noReadout = !!def.noReadout;

  // Optional readouts (one per point), only if not suppressed.
  const readouts = [];

  if (!noReadout) {
    // If we do show readouts, include the label and stack readouts.
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
  // Each dot uses the same drag model as your single picker:
  //   - mousedown on dot starts drag
  //   - window mousemove updates coordinates
  //   - window mouseup ends drag
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

    const onMouseMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const newX = e.clientX - rect.left;
      const newY = e.clientY - rect.top;

      dot.style.left = (newX - 5) + "px";
      dot.style.top  = (newY - 5) + "px";

      info.parameters[key][i].x = newX;
      info.parameters[key][i].y = newY;

      if (!noReadout) {
        readouts[i].value = Math.round(newX) + ", " + Math.round(newY);
      }

      if (typeof info.onParamChange === "function") info.onParamChange();
      info.redrawHandler();
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
  }
} // end setPointPickerArrayControl









