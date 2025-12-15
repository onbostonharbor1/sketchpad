/*************************************************************
   copyActiveDrawObject()
   -----------------------------------------------------------
   Duplicate the currently active drawRegistry entry into
   a new subtab with "(Copy)" or "(Copy n)" suffix.
*************************************************************/
import { addDrawSubtab } from "./draw.js";
import { drawActiveTab } from "./draw.js";
import { markTabClean } from "./draw.js";
import { DrawController } from "./draw.js";

export function copyActiveDrawObject() {
  const tabId = uiState.draw.activeSubtab;
  const info = uiState.draw.tabs[tabId];
  if (!info || info.type !== "object") return;

  const entry = info.drawRegistry;

  // Clone parameters
  const newParams = structuredClone(info.parameters);

  // Base name without previous copy suffix
  const baseName = entry.name.replace(/\s*\(Copy.*\)$/i, "").trim();

  // Find existing copies to determine next number
  const existing = Object.values(uiState.draw.tabs)
    .filter(
      (t) =>
        t.type === "object" &&
        t.drawRegistry &&
        t.drawRegistry.name &&
        t.drawRegistry.name.startsWith(baseName)
    )
    .map((t) => t.drawRegistry.name);

  let nextNumber = 1;
  existing.forEach((name) => {
    const match = name.match(/\(Copy\s*(\d*)\)$/i);
    if (match) {
      const n = parseInt(match[1] || "1", 10);
      if (n >= nextNumber) nextNumber = n + 1;
    }
  });

  const newName =
    nextNumber === 1
      ? `${baseName} (Copy)`
      : `${baseName} (Copy ${nextNumber})`;

  // Construct new entry
  const newItem = {
    name: newName,
    entry: {
      ...entry,
      name: newName,
      params: newParams
    }
  };

  addDrawSubtab(newItem);
} // end copyActiveDrawObject


export async function resetActiveDrawObject() {
  const tabId = uiState.draw.activeSubtab;
  const info = uiState.draw.tabs[tabId];
  if (!info || info.type !== "object") return;

  const oldEntry = info.drawRegistry;

  const key = Object.keys(window.drawRegistry).find(
    (k) => window.drawRegistry[k] === oldEntry
  );
  if (!key) throw new Error("Reset: registry key not found");

  const modulePath = `/drawRegistry/${key}.js`;

  // Remove old entry
  delete window.drawRegistry[key];

  // Re-import (cache-bust)
  await import(`${modulePath}?t=${Date.now()}`);

  // Get the newly created entry: may appear under different globals
  const newEntry =
    window.drawRegistry[key] ||
    window[`drawRegistry_${key}`] ||
    window[`drawRegistry_${key.replace(/^drawRegistry_/, "")}`];

  if (!newEntry)
    throw new Error("Reset: module reimport did not recreate entry");

  // 🔥 GUARANTEED FIX: ensure correct registry key
  window.drawRegistry[key] = newEntry;

  // Update UI state
  info.drawRegistry = newEntry;
  info.parameters = newEntry.params;

  newEntry.init();

  info.dirty = false;
  DrawController.markTabClean(tabId);

  drawActiveTab();
} // end resetActiveDrawObject



