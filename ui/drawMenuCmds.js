/* drawMenuCmds.js
   ------------------------------------------------------------
   ADAPTER ONLY:
   - This file does NOT do canvas work.
   - It derives context and dispatches to ui/menuCmds.js.
------------------------------------------------------------ */

import { addDrawSubtab } from "./draw.js";
import { drawActiveTab } from "./drawRunner.js";
import { markTabClean } from "./draw.js";
import { DrawController } from "./draw.js";
import { createGalleryPatternPng } from "./menuCmds.js";   // NEW
import { createPatternScript } from "./menuCmds.js";   // NEW (next to createGalleryPatternPng)
import { saveSecondary, archiveSecondary } from "./secondaryObjects.js";
import { buildCanvasThumbnailBase64 } from "./uiUtilities.js";
import { uiState } from "./uiState.js";


export async function createPatternFromActiveDrawObject(menuContext) {

  if (!menuContext) throw new Error("createPatternFromActiveDrawObject: menuContext missing");

  const category = menuContext.category;
  const idName   = menuContext.id;

  if (typeof category !== "string" || category.trim() === "") {
    throw new Error("createPatternFromActiveDrawObject: menuContext.category missing/invalid");
  }

  if (typeof idName !== "string" || idName.trim() === "") {
    throw new Error("createPatternFromActiveDrawObject: menuContext.id missing/invalid");
  }

  const tabId = uiState.draw.activeSubtab;
  const info  = uiState.draw.tabs[tabId];

  if (!info || info.type !== "object") {
    throw new Error("createPatternFromActiveDrawObject: active draw tab is not an object tab");
  }

  const entry = info.drawRegistry;
  if (!entry) throw new Error("createPatternFromActiveDrawObject: drawRegistry entry missing");

  const params = info.parameters;
  if (!params) throw new Error("createPatternFromActiveDrawObject: active parameters missing");

  await createPatternScript({
    category: category,
    idName:   idName,
    entry:    entry,
    params:   params
  });

} // end createPatternFromActiveDrawObject


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
  await import(/* @vite-ignore */`${modulePath}?t=${Date.now()}`);

  // Get the newly created entry: may appear under different globals
  const newEntry =
    window.drawRegistry[key] ||
    window[`drawRegistry_${key}`] ||
    window[`drawRegistry_${key.replace(/^drawRegistry_/, "")}`];

  if (!newEntry)
    throw new Error("Reset: module reimport did not recreate entry");

  // ðŸ”¥ GUARANTEED FIX: ensure correct registry key
  window.drawRegistry[key] = newEntry;

  // Update UI state
  info.drawRegistry = newEntry;
  info.parameters = newEntry.params;

  newEntry.init();

  info.dirty = false;
  DrawController.markTabClean(tabId);

  drawActiveTab();
} // end resetActiveDrawObject


export async function createPngFromActiveDrawObject(menuContext) {

  if (!menuContext) throw new Error("createPngFromActiveDrawObject: menuContext missing");

  const category = menuContext.category;
  const idName   = menuContext.id;

  if (typeof category !== "string" || category.trim() === "") {
    throw new Error("createPngFromActiveDrawObject: menuContext.category missing/invalid");
  }

  if (typeof idName !== "string" || idName.trim() === "") {
    throw new Error("createPngFromActiveDrawObject: menuContext.id missing/invalid");
  }

  const canvas = window.drawCanvas;
  if (!canvas) throw new Error("createPngFromActiveDrawObject: window.drawCanvas missing");

  await createGalleryPatternPng({
    category: category,
    idName:   idName,
    canvas:   canvas
  });

} // end createPngFromActiveDrawObject


/* ===========================================================
   Secondary Object Commands
=========================================================== */

export async function saveActiveDrawObjectAsSecondary(menuContext) {
  const tabId = uiState.draw.activeSubtab;
  const info  = uiState.draw.tabs[tabId];
  if (!info) return;

  const name = prompt("Name for this variation?");
  if (!name) return;

  // Primary ID from context (e.g. "bird")
  // If we are currently on a secondary, we still save as secondary of the SAME primary.
  const primaryId = menuContext.registryKey || menuContext.id;

  const entry = info.drawRegistry;

  // Construct payload
  const payload = {
    name: name,
    id: primaryId,
    version: entry.version,
    category: entry.category,
    firstOrder: false,
    source: "secondary",
    tags: entry.tags || [],
    description: entry.description || "",
    params: info.parameters
  };

  const canvas = window.drawCanvas;
  if (!canvas) throw new Error("saveActiveDrawObjectAsSecondary: window.drawCanvas missing");

  const thumbBase64 = buildCanvasThumbnailBase64(canvas, 50, 50);

  await saveSecondary(primaryId, name, payload, thumbBase64);

  // If we were primary, we stay primary but now there is a secondary.
  // If we were secondary, we stay secondary (old one).
  // Maybe switch to the new one?
  // For now, just alert.
  alert("Secondary object created.");
}

export async function saveActiveSecondaryObject(menuContext) {
  const tabId = uiState.draw.activeSubtab;
  const info  = uiState.draw.tabs[tabId];

  // Safety check: must be in secondary mode
  if (!info || !info.secondary) {
    alert("Not a secondary object.");
    return;
  }

  const sec = info.secondary; // { primaryId, filename, name }
  const primaryId = sec.primaryId;
  const name = sec.name;

  const entry = info.drawRegistry;

  const payload = {
    name: name,
    id: primaryId,
    version: entry.version,
    category: entry.category,
    firstOrder: false,
    source: "secondary",
    tags: entry.tags || [],
    description: entry.description || "",
    params: info.parameters
  };

  const canvas = window.drawCanvas;
  const thumbBase64 = buildCanvasThumbnailBase64(canvas, 50, 50);

  await saveSecondary(primaryId, name, payload, thumbBase64);

  info.dirty = false;
  DrawController.markTabClean(tabId);

  alert("Saved.");
}

export async function archiveActiveSecondaryObject(menuContext) {
  const tabId = uiState.draw.activeSubtab;
  const info  = uiState.draw.tabs[tabId];
  if (!info || !info.secondary) return;

  if (!confirm("Are you sure you want to archive this secondary object?")) return;

  await archiveSecondary(info.secondary.primaryId, info.secondary.filename);

  // Revert to primary
  delete info.secondary;
  await resetActiveDrawObject();

  alert("Archived.");
}
