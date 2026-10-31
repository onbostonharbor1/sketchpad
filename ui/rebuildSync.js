/* ===========================================================
   rebuildSync.js
   -----------------------------------------------------------
   After a manifest rebuild: clear the manifest cache and mark every tab for update;
   and turn the rebuild report into text.
   =========================================================== */

import { manifest } from "./manifest.js";
import { uiState } from "/ui/uiState.js";

/**
 * Global Sync: Wipes the manifest cache and sets needsUpdate for all tabs.
 * * This is the "Passive" partner to the Node "Active" rebuild.
 */
export async function syncSystemStateAfterRebuild() {
  // 1. Wipe the central ManifestManager memory singleton
  manifest.clearCache();

  // 2. Mark 'needsUpdate' for all tabs.
  // This ensures setUI.js runs init() with restored=true on next visit.
  const allTabs = ["home", "draw", "patterns", "gallery", "utilities", "figures"];
  allTabs.forEach(key => {
    if (uiState[key]) {
      uiState[key].needsUpdate = true;
    }
  });

} // end syncSystemStateAfterRebuild

export function formatRebuildReportShared(report) {

  if (!report) throw new Error("formatRebuildReportShared: report missing");

  if (report.request !== "manifestMaintenance") {
    throw new Error("formatRebuildReportShared: unexpected request: " + String(report.request));
  }

  const lines = [];

  lines.push("Log: " + (report.logName || "(none)"));
  lines.push("");

  // ----------------------------------------------------------
  // Writes summary
  // ----------------------------------------------------------
  const manifestsWritten = Array.isArray(report.manifestsWritten)
    ? report.manifestsWritten
    : [];

  const homeWritten = !!report.homeWritten;

  lines.push("Writes:");
  lines.push("  Manifests written: " + manifestsWritten.length);
  lines.push("  Home manifest written: " + (homeWritten ? "yes" : "no"));
  lines.push("");

  // ----------------------------------------------------------
  // ADDED files (the part you actually care about)
  // ----------------------------------------------------------
  const addedFiles = Array.isArray(report.addedFiles) ? report.addedFiles : [];

  if (addedFiles.length) {
    lines.push("Added files:");
    for (const p of addedFiles) {
      lines.push("- " + p);
    }
    lines.push("");
  }

  // ----------------------------------------------------------
  // BROKEN items (optional)
  // ----------------------------------------------------------
  const brokenFiles = Array.isArray(report.brokenFiles) ? report.brokenFiles : [];

  if (brokenFiles.length) {
    lines.push("Broken files:");
    for (const p of brokenFiles) {
      lines.push("- " + p);
    }
    lines.push("");
  }

  // ----------------------------------------------------------
  // Nothing happened
  // ----------------------------------------------------------
  if (!manifestsWritten.length && !homeWritten && !addedFiles.length && !brokenFiles.length) {
    lines.push("No Added or Broken items.");
  }

  return lines.join("\n");

} // end formatRebuildReportShared
