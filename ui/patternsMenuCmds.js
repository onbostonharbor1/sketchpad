/* ui/patternMenuCmds.js
   ------------------------------------------------------------
   Patterns menu commands
   ------------------------------------------------------------
*/

import { manifest } from "./manifest.js";

export async function addPatternCommand() {
  const category = uiState.patterns.activeCategory;
  if (!category) {
    throw new Error("Add Pattern: no active category");
  }

  const resp = await fetch("/api/patterns/addPattern", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category: category })
  });

  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(data && data.error ? data.error : "Add Pattern: request failed");
  }

  // Manifest changed; clear caches so the next view is consistent
  manifest.clearCache();
  if (manifest.cache && manifest.cache.patterns) {
    delete manifest.cache.patterns;
  }

  return data;
} // end addPatternCommand
