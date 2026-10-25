/* ===========================================================
   validateDrawRegistry.js  – Tools script (runPattern version)
   -----------------------------------------------------------
   One CLOSED accordion.

   Open it to see a simple list of drawRegistry names.
   Click a name to validate it and print results into #text.

   Uses parameterControls.js widget: "accordion" with section.items.
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

  actionDiv.innerHTML = "";
  textDiv.innerHTML   = "";

  const keys = Object.keys(window.drawRegistry);
  if (!keys || keys.length === 0) throw new Error("validateDrawRegistry: window.drawRegistry is empty");

  // Build clickable list items for the accordion section
  const items = [];

  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];

    items.push({
      label: k,
      action() {
        validate(k, textDiv);
      } // end action
    });
  }

  const scriptInfo = {

    title: "Validate drawRegistry",

    controls: {
      registryAccordion: {
        widget: "accordion",
        startOpen: false,          // CLOSED by default
        sections: [
          {
            title: "Draw Registry",
            items: items,
          } // end section
        ]
      } // end registryAccordion
    }, // end controls

    params: {},

    parameters: null,

    onParamChange() {
      // Keep for compatibility
    }, // end onParamChange

    redrawHandler() {
      // No-op: validation runs on click.
    } // end redrawHandler

  }; // end scriptInfo

  scriptInfo.parameters = scriptInfo.params;

  buildParameterControls(
    scriptInfo,
    "tab-scripts",
    true
  );

  // Return the initial message as HTML so it displays in the Result tab
  return "Open the accordion, then click a drawRegistry item to validate it.";

} // end runPattern


/* ===========================================================
   validate(key, textDiv)
   -----------------------------------------------------------
   Updated validation output:

     - Prints drawRegistry entry name at top
     - Shows four sections (h3):
         Required: Found
         Required: Missing
         Optional: Found
         Optional: Missing
     - init/update/draw are treated as REQUIRED and validated
       as functions.

   NOTE:
   - "Required" list is explicit (based on your framework).
   - Everything else present in the object is treated as Optional.
=========================================================== */
function validate(key, textDiv) {

  if (!textDiv) throw new Error("validate: textDiv missing");

  textDiv.innerHTML = "";

  const reg = window.drawRegistry[key];
  if (!reg) {
    textDiv.textContent = 'No drawRegistry entry named "' + key + '"';
    return;
  }

  // ---------------------------------------------------------
  // Title
  // ---------------------------------------------------------
  const title = document.createElement("h1");
  title.textContent = reg.name ? reg.name : key;
  textDiv.appendChild(title);

  // ---------------------------------------------------------
  // Required vs Optional keys
  // (Required list reflects your framework + lifecycle functions)
  // ---------------------------------------------------------
  const requiredKeys = [
    "name",
    "id",
    "category",
    "firstOrder",
    "elements",
    "params",
    "controls",
    "init",
    "update",
    "draw"
  ];

  // ---------------------------------------------------------
  // Buckets
  // ---------------------------------------------------------
  const requiredFound   = [];
  const requiredMissing = [];
  const optionalFound   = [];
  const optionalMissing = []; // only meaningful if we define optional expectations (we don't)

  // ---------------------------------------------------------
  // Required checks (including function checks)
  // ---------------------------------------------------------
  for (let i = 0; i < requiredKeys.length; i++) {

    const prop = requiredKeys[i];

    if (!Object.prototype.hasOwnProperty.call(reg, prop)) {
      requiredMissing.push(prop);
      continue;
    }

    // Special handling: lifecycle functions must be functions
    if (prop === "init" || prop === "update" || prop === "draw") {
      if (typeof reg[prop] === "function") {
        requiredFound.push(prop + " (function)");
      } else {
        requiredMissing.push(prop + " (missing function)");
      }
      continue;
    }

    requiredFound.push(prop);
  }

  // ---------------------------------------------------------
  // Optional checks:
  // Everything present but not required is "Optional: Found".
  // For "Optional: Missing" we have no declared optional schema,
  // so this list will normally be empty.
  // ---------------------------------------------------------
  const allKeys = Object.keys(reg);

  for (let i = 0; i < allKeys.length; i++) {
    const prop = allKeys[i];
    if (requiredKeys.indexOf(prop) !== -1) continue;
    optionalFound.push(prop);
  }

  // ---------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------
  function addSection(headerText, items) {

    const h = document.createElement("h3");
    h.textContent = headerText;
    h.style.fontWeight = "300";     // enforce bold even if CSS resets headings
    textDiv.appendChild(h);

    if (!items || items.length === 0) {
      const p = document.createElement("div");
      p.textContent = "(none)";
      textDiv.appendChild(p);
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const line = document.createElement("div");
      line.textContent = items[i];

      // Color cue (optional, but useful)
      if (headerText.indexOf("Missing") !== -1) line.style.color = "red";
      if (headerText.indexOf("Found")   !== -1) line.style.color = "green";

      textDiv.appendChild(line);
    }
  } // end addSection

  // ---------------------------------------------------------
  // Sections (blank lines are handled by heading block layout)
  // ---------------------------------------------------------
  addSection("Required: Found", requiredFound);
  addSection("Required: Missing", requiredMissing);
  addSection("Optional: Found", optionalFound);
  addSection("Optional: Missing", optionalMissing);

  // ---------------------------------------------------------
  // Divider + pretty print (keep, because it's still useful)
  // ---------------------------------------------------------
  textDiv.appendChild(document.createElement("hr"));

  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(reg, null, 2);
  pre.style.whiteSpace = "pre-wrap";
  textDiv.appendChild(pre);

} // end validate
