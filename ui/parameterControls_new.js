/* ===========================================================
   buildParameterControls(sourceInfo, targetTabId, render)
   -----------------------------------------------------------
   Generic entry point for building parameter controls.
   - Always constructs a neutral data structure.
   - Optionally renders the controls in the #action area.
   - Delegates to a tab-specific data builder.
=========================================================== */

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
  // ---------------------------------------------------------
  // controlData will become an array of normalized objects,
  // each describing ONE UI control (slider, text input, etc.)
  //
  // At this stage, it is PURE DATA — no DOM, no rendering.
  // ---------------------------------------------------------
  let controlData = [];

  // ---------------------------------------------------------
  // TAB ENVIRONMENT SELECTION
  //
  // The targetTabId determines which *tab ecosystem*
  // this control set belongs to.
  //
  // We do NOT test for equality — we test prefixes —
  // because subtabs may exist (e.g., tab-draw-main,
  // tab-scripts-tools, etc.).
  // ---------------------------------------------------------

  if (targetTabId.startsWith("tab-scripts")) {

    // -----------------------------------------------------
    // SCRIPTS TAB ENVIRONMENT
    //
    // Data is sourced from a script descriptor object.
    // Controls typically affect:
    //   - script parameters
    //   - tool execution behavior
    //
    // Rendering destination (later):
    //   Scripts tab → Action panel
    // -----------------------------------------------------
    controlData = buildScriptParameterData(sourceInfo);

  } else if (targetTabId.startsWith("tab-draw")) {

    // -----------------------------------------------------
    // DRAW TAB ENVIRONMENT
    //
    // Data is sourced from uiState.drawRegistry and
    // uiState.parameters.
    //
    // Controls typically affect:
    //   - live drawing parameters
    //   - redraw behavior on canvas
    //
    // Rendering destination (later):
    //   Draw tab → Action panel
    // -----------------------------------------------------
    controlData = buildDrawParameterData(sourceInfo);
  }

  // ---------------------------------------------------------
  // OPTIONAL RENDERING PHASE
  //
  // Rendering is optional so callers may:
  //   - inspect / transform control data
  //   - test schemas
  //   - reuse control definitions elsewhere
  //
  // When rendering occurs, DOM output is written into
  // the ACTION AREA of the specified TAB ENVIRONMENT.
  // ---------------------------------------------------------
  if (render) {
    renderParameterControls(sourceInfo, controlData, targetTabId);
  }

  // ---------------------------------------------------------
  // Always return the control metadata array so the caller
  // can retain or reuse it regardless of rendering.
  // ---------------------------------------------------------
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
function buildScriptParameterData(sourceInfo) {

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
  // ---------------------------------------------------------
  return keys.map((key) => {
    const def = schema[key];

    const value = sourceInfo.parameters?.[key] ?? def.default ?? "";

    return {
      key: key,                         // parameter identifier
      label: def.label || key,          // UI label
      widget: def.widget || def.type || "text",
      min: def.min ?? null,
      max: def.max ?? null,
      step: def.step ?? null,
      options: def.options ?? null,
      value: value,                     // current script value
      default: def.default ?? null,
    };
  });
} // end buildScriptParameterData

/* ===========================================================
   renderParameterControls()
   -----------------------------------------------------------
   DOM WRITE TARGETS AND TAB ENVIRONMENT CONTRACT
   -----------------------------------------------------------

   This function is the ONLY place where parameter control
   metadata is converted into actual DOM elements.

   It writes UI controls into the Action Area of the
   currently active tab, as determined by targetTabId.

   -----------------------------------------------------------
   TAB → DOM TARGET MAPPING
   -----------------------------------------------------------

   Draw Tab Environment
   --------------------
   targetTabId starts with: "tab-draw"

   DOM destination:
     #action   (inside the Draw tab content container)

   Result:
     - Parameter controls affect live drawing state
     - Controls are rebuilt on object change or restore
     - Canvas redraw is driven by control change handlers


   Scripts / Tools Tab Environment
   -------------------------------
   targetTabId starts with: "tab-scripts"

   DOM destination:
     #action   (inside the Scripts tab content container)

   Result:
     - Parameter controls configure script execution
     - Controls do NOT affect canvas unless script runs
     - Output is typically written to #text, not #sketchpad


   Generic / Future Tabs
   ---------------------
   targetTabId = "tab-generic" or other prefixes

   DOM destination:
     #action   (within the active tab's layout)

   Result:
     - No tab-specific behavior assumed
     - Rendering is data-driven only


   -----------------------------------------------------------
   STRUCTURAL ASSUMPTIONS
   -----------------------------------------------------------

   • The #action element already exists in the active tab.
   • This function does NOT create or remove tab containers.
   • Clearing or preservation of prior controls is handled
     inside this function (or by its immediate helpers).
   • This function does NOT modify uiState directly.
   • Event handlers attached here report changes outward
     (e.g., via registered callbacks).

   -----------------------------------------------------------
   SUMMARY
   -----------------------------------------------------------

   renderParameterControls() is the boundary between:
     - abstract parameter metadata
     - concrete tab-specific UI controls

   All parameter UI for all tabs flows through this function.

=========================================================== */


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
function renderParameterControls(
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
    // If missing, def will be undefined and buildSingleControl()
    // may throw (fail-fast) or handle it (depending on your style).
    // -------------------------------------------------------
    const def = schemaSource[item.key];

    // -------------------------------------------------------
    // BUILD ONE CONTROL FIELD
    //
    // buildSingleControl() is the per-control factory.
    // It is responsible for:
    //   - creating the DOM for the control row
    //   - wiring events
    //   - tab-specific behaviors based on targetTabId
    //
    // ENVIRONMENT:
    //   Returned value should be a DOM element representing
    //   one complete control row/field — or null if hidden.
    // -------------------------------------------------------
    const field = buildSingleControl(
      sourceInfo,     // context object (tabState or scriptInfo)
      item.key,       // parameter name
      def,            // schema definition for this parameter
      item.value,     // current value (already resolved earlier)
      targetTabId     // tab environment hint for handlers
    );

    // -------------------------------------------------------
    // HIDDEN CONTROL RULE (MINIMAL EDIT)
    //
    // Hidden controls return null so they produce no DOM.
    // This prevents empty rows and keeps layout stable.
    //
    // ENVIRONMENT:
    //   If field is non-null, it is appended into:
    //     #action → #drawControls
    // -------------------------------------------------------
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









