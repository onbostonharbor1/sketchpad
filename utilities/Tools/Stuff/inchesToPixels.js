/* ===========================================================
   inchesToPixels.js – Tools script
   -----------------------------------------------------------
   Converts inches to pixels (300 dpi default)
   Provides a text box for entry and displays the result.
=========================================================== */

import { buildScriptParameterData, renderParameterControls } from "/ui/parameterControls.js";


/* ===========================================================
   runPattern()
=========================================================== */
export function runPattern() {

  const sourceInfo = {

    // IMPORTANT:
    // No preset value. Empty input is valid.
    parameters: {
      inches: ""
    },

    controls: {
      inches: {
        label: "Inches:",
        widget: "text"
        // NO default here
      }
    },

    redrawHandler() {
      displayInchesResult(this.parameters);
    }

  };

  renderParameterControls(
    sourceInfo,
    buildScriptParameterData(sourceInfo),
    "tab-tools"
  );

  // Initial display (empty state)
  displayInchesResult(sourceInfo.parameters);

} // end runPattern



/* ------------------------------------------------------------
   displayInchesResult(params)
------------------------------------------------------------ */
function displayInchesResult(params) {

  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("displayInchesResult: #text not found");

  // Empty input is allowed
  if (params.inches === "" || params.inches === null || params.inches === undefined) {
    textDiv.innerHTML = "<p>Enter inches to compute pixels.</p>";
    return;
  }

  const inches = Number(params.inches);

  // Fail-fast on non-numeric input
  if (isNaN(inches)) {
    textDiv.innerHTML = "<p>Invalid number.</p>";
    return;
  }

  const pixels = inches * 300;

  textDiv.innerHTML =
    "<p>" + inches + " inch(es) is " + pixels + " pixels</p>";

} // end displayInchesResult
