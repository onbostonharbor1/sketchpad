/* ===========================================================
   addPatternFiles.js  – Utilities/Tools script (runPattern)
   -----------------------------------------------------------
   PURPOSE
   -------
   Utilities command: “Add Pattern Files”

   This tool:
     • calls the Node service task "addPatternScripts"
     • receives a JSON report
     • displays a bullet list of added files in #text

   REQUIREMENTS
   ------------
   • nodeLayer.js must export nodeAddPatternScripts()
   • Node server must be running:
       http://localhost:5174/dispatch

   Uses ONLY existing ctrl-field / ctrl-text / ctrl-label CSS.

   =========================================================== */

import { nodeAddPatternScripts } from "/ui/nodeLayer.js";
import { manifest } from "/ui/manifest.js";

/* ===========================================================
   runPattern()

   DESCRIPTION
   -----------
   Entry point invoked by the Utilities tab tool runner.

   Behavior:
     • clears #action
     • clears #text
     • shows a short “running…” message
     • calls the Node service
     • renders results (or error) into #text

   =========================================================== */

export async function runPattern() {
  const action = document.getElementById("action");
  action.innerHTML = "";

  const report = await nodeAddPatternScripts();

  // Force all manifests to be reread next time they are requested.
  // This is exactly what ManifestManager.clearCache() is for.
  manifest.clearCache();

  return buildReportHtml(report);
} // end runPattern



/* ===========================================================
   buildReportHtml(report)

   DESCRIPTION
   -----------
   Converts the service report object into simple HTML.

   Report shape:
     {
       request: "addPatternScripts",
       updatedCategories: [
         { category, added: [ {filename, path, title}, ... ] }
       ]
     }

   Output:
     - If no changes: a simple message
     - Otherwise: a bullet list grouped by category

   =========================================================== */

function buildReportHtml(report) {
  if (!report) {
    throw new Error("addPatternFiles: report is null/undefined");
  }

  if (report.request !== "addPatternScripts") {
    throw new Error(`addPatternFiles: unexpected report.request: ${String(report.request)}`);
  }

  const updatedPatterns = report.updatedCategories;
  const updatedGallery  = report.updatedGallery || [];

  if (!Array.isArray(updatedPatterns)) {
    throw new Error("addPatternFiles: report.updatedCategories must be an array");
  }
  if (!Array.isArray(updatedGallery)) {
    throw new Error("addPatternFiles: report.updatedGallery must be an array");
  }

  if (updatedPatterns.length === 0 && updatedGallery.length === 0) {
    return "No new pattern files were found.";
  }

  let html = "";
  html += "Added files:<br><br>";

  /* ---- Patterns ---- */
  for (const cat of updatedPatterns) {
    const categoryName = cat.category;
    const added = cat.added;

    html += `${escapeHtml(categoryName)}<br>`;
    for (const entry of added) {
      html += `&nbsp;&nbsp;• ${escapeHtml(entry.path)}<br>`;
    }
    html += "<br>";
  }

  /* ---- Gallery Scripts ---- */
  for (const section of updatedGallery) {
    html += "Gallery / Scripts<br>";
    for (const entry of section.added) {
      html += `&nbsp;&nbsp;• ${escapeHtml(entry.path)}<br>`;
    }
    html += "<br>";
  }

  return html;
} // end buildReportHtml



/* ===========================================================
   escapeHtml(text)

   DESCRIPTION
   -----------
   Minimal HTML escaping for safe insertion into innerHTML.

   =========================================================== */

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
} // end escapeHtml
