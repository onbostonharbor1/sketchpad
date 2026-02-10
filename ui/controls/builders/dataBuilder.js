/* controls/builders/dataBuilder.js
   ============================================================
   DATA BUILDER
   ============================================================ */

import { filterControlsByActiveGroups } from "./groupFilter.js";

export function buildDrawParameterData(tabState) {

  // ---------------------------------------------------------
  // Defensive guard:
  // If the Draw tab is not initialized or no registry
  // is active, there are no parameters to expose.
  //
  // Resulting environment effect:
  // ---------------------------------------------------------
  if (!tabState || !tabState.drawRegistry) return [];

  // ---------------------------------------------------------
  // The drawRegistry entry defines the parameter schema.
  //
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
  const allControls = keys.map((key) => {
    const def = schema[key];

    // -----------------------------------------------------
    // Parameter value resolution priority:
    //   1. current uiState parameter value
    //   2. default defined in schema
    //   3. empty string
    // -----------------------------------------------------
    const value = tabState.parameters?.[key] ?? def.default ?? "";

    // Detect Interface Control vs Standard Control
    const isInterface = !!def.control;
    const widgetType = isInterface ? def.control : (def.widget || def.type || "text");

    return {
      key: key,                         // parameter identifier
      label: def.label || key,          // UI label text
      widget: widgetType,
      isInterface: isInterface,         // FLAG: Render in interface area
      min: def.min ?? null,             // numeric constraints
      max: def.max ?? null,
      step: def.step ?? null,
      options: def.options ?? null,     // select / enum support
      value: value,                     // current value
      default: def.default ?? null,     // fallback reset value
    };
  });
  
  // ---------------------------------------------------------
  // Apply group filtering to show only relevant controls
  // ---------------------------------------------------------
  return filterControlsByActiveGroups(allControls, tabState);
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
  // ?EURoevalue?EUR? field and it may not be JSON-safe.
  // ---------------------------------------------------------
  const allControls = keys.map((key) => {

    const def = schema[key];

    const value = sourceInfo.parameters?.[key] ?? def.default ?? "";

    const isInterface = !!def.control;
    const widgetType = isInterface ? def.control : (def.widget || def.type || "text");

    const item = {
      key: key,                         // parameter identifier
      label: def.label || key,          // UI label
      widget: widgetType,
      isInterface: isInterface,
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
  
  // ---------------------------------------------------------
  // Apply group filtering to show only relevant controls
  // ---------------------------------------------------------
  return filterControlsByActiveGroups(allControls, sourceInfo);
} // end buildScriptParameterData
