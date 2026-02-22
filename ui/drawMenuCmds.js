/* drawMenuCmds.js
   ------------------------------------------------------------
   ADAPTER ONLY:
   - This file does NOT do canvas work.
   - It derives context and dispatches to ui/menuCmds.js.
------------------------------------------------------------ */

import { addDrawSubtab } from "./draw/drawNav.js";
import { drawActiveTab } from "./drawRunner.js";
import { markTabClean } from "./draw/drawNav.js";
import { DrawController } from "./draw.js";
import { createGalleryPatternPng } from "./menuCmds.js";
import { createPatternScript } from "./menuCmds.js";
import { saveSecondary, archiveSecondary } from "./secondaryObjects.js";
import { buildCanvasThumbnailBase64, setCommandsButtonHandler, showCommandsOffcanvas, formatRebuildReportShared } from "/ui/uiUtilities.js";
import { uiState } from "/ui/uiState.js";
import { openHelpHomeOverlay } from "./help.js";
import { nodeRebuildAndValidateManifests } from "./nodeLayer.js";


/* ============================================================
   clearDrawCaption()
   ------------------------------------------------------------
   Empties the #caption region for the Draw tab.
   ============================================================ */
export function clearDrawCaption() {
  const el = document.getElementById("caption");
  if (el) el.innerHTML = "";
} // end clearDrawCaption


/* ============================================================
   setDrawCaption(entry)
   ------------------------------------------------------------
   Populates the #caption region with the draw object's name.
   ============================================================ */
export function setDrawCaption(entry) {
  const el = document.getElementById("caption");
  if (!el) return;
  if (!entry) { el.innerHTML = ""; return; }
  el.textContent = entry.name || "";
} // end setDrawCaption


/* ============================================================
   setDrawAction()
   ------------------------------------------------------------
   No-op placeholder — parameter controls are injected directly
   by the draw object's own init()/render().
   ============================================================ */
export function setDrawAction() {
  // Parameter controls are wired by drawRunner / parameterControls.
  // This function exists as the hook consumed by DrawTabSpec and
  // drawNav.switchTab(); it intentionally does nothing here.
} // end setDrawAction


/* ============================================================
   buildDrawMenuItems(menuContext)
   ------------------------------------------------------------
   Returns menu item descriptors for the Draw tab commands panel.
   ============================================================ */
export function buildDrawMenuItems(menuContext) {
  if (!menuContext) return [];

  return [
    {
      label: "Save as PNG",
      action: () => createPngFromActiveDrawObject(menuContext)
    },
    {
      label: "Save as Pattern",
      action: () => createPatternFromActiveDrawObject(menuContext)
    },
    {
      label: "Copy Object",
      action: () => copyActiveDrawObject()
    },
    {
      label: "Reset Parameters",
      action: () => resetActiveDrawObject()
    }
  ];
} // end buildDrawMenuItems


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

  const newParams = structuredClone(info.parameters);

  const baseName = entry.name.replace(/\s*\(Copy.*\)$/i, "").trim();

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

  delete window.drawRegistry[key];

  await import(/* @vite-ignore */`${modulePath}?t=${Date.now()}`);

  const newEntry =
    window.drawRegistry[key] ||
    window[`drawRegistry_${key}`] ||
    window[`drawRegistry_${key.replace(/^drawRegistry_/, "")}`];

  if (!newEntry)
    throw new Error("Reset: module reimport did not recreate entry");

  window.drawRegistry[key] = newEntry;

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

  const primaryId = menuContext.registryKey || menuContext.id;

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
  if (!canvas) throw new Error("saveActiveDrawObjectAsSecondary: window.drawCanvas missing");

  const thumbBase64 = buildCanvasThumbnailBase64(canvas, 50, 50);

  await saveSecondary(primaryId, name, payload, thumbBase64);

  alert("Secondary object created.");
} // end saveActiveDrawObjectAsSecondary


export async function saveActiveSecondaryObject(menuContext) {
  const tabId = uiState.draw.activeSubtab;
  const info  = uiState.draw.tabs[tabId];

  if (!info || !info.secondary) {
    alert("Not a secondary object.");
    return;
  }

  const sec = info.secondary;
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
} // end saveActiveSecondaryObject


export async function archiveActiveSecondaryObject(menuContext) {
  const tabId = uiState.draw.activeSubtab;
  const info  = uiState.draw.tabs[tabId];
  if (!info || !info.secondary) return;

  if (!confirm("Are you sure you want to archive this secondary object?")) return;

  await archiveSecondary(info.secondary.primaryId, info.secondary.filename);

  delete info.secondary;
  await resetActiveDrawObject();

  alert("Archived.");
} // end archiveActiveSecondaryObject


/* ============================================================
   wireDrawCommandsButton()
   ------------------------------------------------------------
   Wires the Commands button handler for the Draw tab.
   ============================================================ */
export function wireDrawCommandsButton() {

  setCommandsButtonHandler(() => {
    showCommandsOffcanvas({
      title: "Draw Maintenance",
      buildBody(container) {
        if (!container) return;

        container.innerHTML = `
          <div class="cmdButtonRow">
            <button id="drawRebuildValidateButton" class="cmdButton" type="button">
              Rebuild &amp; Validate
            </button>
          </div>

          <div class="cmdButtonRow">
            <button id="drawHelpButton" class="cmdButton" type="button">
              Help
            </button>
          </div>

          <div class="buttonSeparator"></div>

          <div id="drawRebuildReport" class="drawRebuildReport"></div>
        `;

        const rebuildBtn = document.getElementById("drawRebuildValidateButton");
        const helpBtn    = document.getElementById("drawHelpButton");
        const reportDiv  = document.getElementById("drawRebuildReport");

        if (rebuildBtn) {
          rebuildBtn.addEventListener("click", async () => {
            if (!reportDiv) return;
            reportDiv.textContent = "Running Global Rebuild...";

            const report = await nodeRebuildAndValidateManifests();

            const { syncSystemStateAfterRebuild } = await import("/ui/uiUtilities.js");
            await syncSystemStateAfterRebuild();

            const { initDrawTab } = await import("./draw.js");
            await initDrawTab(true);

            reportDiv.textContent = formatRebuildReportShared(report);
          });
        }

        if (helpBtn) {
          helpBtn.addEventListener("click", () => {
            const panel = document.getElementById("offcanvasPanel");
            if (panel) {
              const oc = bootstrap.Offcanvas.getOrCreateInstance(panel);
              oc.hide();
            }
            openHelpHomeOverlay();
          });
        }
      }
    });
  });

} // end wireDrawCommandsButton
