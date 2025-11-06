/* ===========================================================
   inchesToPixels.js – Tools script
   -----------------------------------------------------------
   Converts inches to pixels (300 dpi default)
   Provides a text box for entry and displays the result.
=========================================================== */
function inchesToPixels() {
  const sourceInfo = {
    parameters: { inches: 1 },
    controls: {
      inches: {
        label: "Inches:",
        widget: "text",
        default: 1,
      },
    },
    redrawHandler: () => displayInchesResult(sourceInfo.parameters),
  };

  renderParameterControls(
    sourceInfo,
    buildScriptParameterData(sourceInfo),
    "tab-tools"
  );
  displayInchesResult(sourceInfo.parameters);
} // end inchesToPixels

/* ------------------------------------------------------------
   displayInchesResult(params)
   ------------------------------------------------------------ */
function displayInchesResult(params) {
  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("displayInchesResult: #text not found");

  const inches = parseFloat(params.inches) || 0;
  const pixels = inches * 300;
  textDiv.innerHTML = `<p>${inches} inch(es) is ${pixels} pixels</p>`;
} // end displayInchesResult
