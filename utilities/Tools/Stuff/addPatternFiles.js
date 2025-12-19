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

  const updated = report.updatedCategories;
  if (!Array.isArray(updated)) {
    throw new Error("addPatternFiles: report.updatedCategories must be an array");
  }

  if (updated.length === 0) {
    return "No new pattern files were found.";
  }

  let html = "";
  html += "Added pattern files:<br><br>";

  // Group by category with a simple indented bullet list.
  // No special CSS required; keep it plain.
  for (const cat of updated) {
    if (!cat || typeof cat !== "object") {
      throw new Error("addPatternFiles: invalid category report entry");
    }

    const categoryName = cat.category;
    const added = cat.added;

    if (typeof categoryName !== "string" || categoryName.trim() === "") {
      throw new Error("addPatternFiles: category name missing/invalid");
    }

    if (!Array.isArray(added)) {
      throw new Error(`addPatternFiles: added list missing/invalid for category ${categoryName}`);
    }

    // Category header
    html += `${escapeHtml(categoryName)}<br>`;

    // Items as bullet points (using a unicode bullet)
    for (const entry of added) {
      if (!entry || typeof entry !== "object") {
        throw new Error(`addPatternFiles: invalid added entry in category ${categoryName}`);
      }

      const p = entry.path;
      if (typeof p !== "string" || p.trim() === "") {
        throw new Error(`addPatternFiles: entry.path missing/invalid in category ${categoryName}`);
      }

      html += `&nbsp;&nbsp;• ${escapeHtml(p)}<br>`;
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
