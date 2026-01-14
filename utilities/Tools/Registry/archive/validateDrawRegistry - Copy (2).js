/* ===========================================================
   validateDrawRegistry.js  – Tools script (runPattern version)
   -----------------------------------------------------------
   Displays a dropdown listing all drawRegistry entries.
   Selecting an entry validates it and prints the results into #text.

   UPDATED:
   --------
   Uses parameterControls.js for the dropdown UI (select widget).

=========================================================== */

import { buildParameterControls } from "/ui/parameterControls.js";


/* ===========================================================
   runPattern()
=========================================================== */
export function runPattern() {

  const actionDiv = document.getElementById("action");
  const textDiv   = document.getElementById("text");

  if (!actionDiv) throw new Error("validateDrawRegistry: missing #action");
  if (!textDiv)   throw new Error("validateDrawRegistry: missing #text");

  // Clear output panels (deterministic)
  actionDiv.innerHTML = "";
  textDiv.innerHTML   = "";

  // ---------------------------------------------------------
  // Build dropdown using parameterControls
  // ---------------------------------------------------------
  const keys = Object.keys(window.drawRegistry);
  if (!keys || keys.length === 0) throw new Error("validateDrawRegistry: window.drawRegistry is empty");

  const scriptInfo = {

    title: "Validate drawRegistry",

    controls: {
      target: {
        label: "Validate:",
        widget: "select",
        options: keys,
        default: keys[0]
      } // end target
    }, // end controls

    params: {
      target: keys[0]
    }, // end params

    parameters: null,

    onParamChange() {
      // ParameterControls calls this in some flows; keep it.
      // We do our work in redrawHandler so it always runs after changes.
    }, // end onParamChange

    redrawHandler() {
      // Validate selected target into #text
      validate(this.params.target, textDiv);
    } // end redrawHandler

  }; // end scriptInfo


  // ParameterControls compatibility alias
  scriptInfo.parameters = scriptInfo.params;

  // Build controls into #action
  buildParameterControls(
    scriptInfo,
    "tab-scripts",
    true
  );

  // Initial validation
  scriptInfo.redrawHandler();

  return null;

} // end runPattern



/* ===========================================================
   validate(key, textDiv)
   Core validation logic moved into its own helper function.
=========================================================== */
function validate(key, textDiv) {

  if (!textDiv) throw new Error("validate: textDiv missing");

  textDiv.innerHTML = "";

  const reg = window.drawRegistry[key];
  if (!reg) {
    textDiv.textContent = 'No drawRegistry entry named "' + key + '"';
    return;
  }

  const resultsDiv = document.createElement("div");
  resultsDiv.id = "validationResults";
  textDiv.appendChild(resultsDiv);

  const expected = [
    "name","version","category","firstOrder","source","background",
    "overlays","params","controls","create","draw"
  ];

  const lines = [];

  expected.forEach((prop) => {
    if (Object.prototype.hasOwnProperty.call(reg, prop)) {
      lines.push({ msg: "✔ " + prop + ": present", ok: true });
    } else {
      lines.push({ msg: "❌ missing " + prop, ok: false });
    }
  });

  Object.keys(reg).forEach((k) => {
    if (expected.indexOf(k) === -1) {
      lines.push({ msg: "⚠ extra member: " + k, ok: false });
    }
  });

  if (typeof reg.create !== "function") lines.push({ msg: "❌ create is not a function", ok: false });
  if (typeof reg.draw   !== "function") lines.push({ msg: "❌ draw is not a function", ok: false });

  // Append results
  lines.forEach((l) => {
    const p = document.createElement("div");
    p.textContent = l.msg;
    p.style.color = l.ok ? "green" : "red";
    resultsDiv.appendChild(p);
  });

  resultsDiv.appendChild(document.createElement("hr"));

  // Pretty-print registry object
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(reg, null, 2);
  pre.style.whiteSpace = "pre-wrap";
  textDiv.appendChild(pre);

} // end validate
