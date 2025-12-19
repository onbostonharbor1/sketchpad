/* ===========================================================
   inchesToPixels.js – Tools script (runPattern version)
   Uses ONLY existing ctrl-field / ctrl-text / ctrl-label CSS.
   =========================================================== */
export async function runPattern() {
  // Clear action panel (Tools pattern)
  const action = document.getElementById("action");
  action.innerHTML = "";

  // Call Node service via nodeLayer bridge
  const report = await nodeAddPatternScripts();

  // Return HTML for Utilities runner to display in Result tab
  return buildReportHtml(report);
} // end runPattern

