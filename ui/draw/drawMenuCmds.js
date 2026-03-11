/* drawMenuCmds.js
   ============================================================
   Draw Tab -- Caption Bar, Menu Items, and Command Implementations
   ============================================================
   Role:
     Owns everything related to building the caption bar,
     constructing caption menu items, and implementing the
     draw command actions (save, copy, reset, secondary objects,
     maintenance offcanvas).

   Architectural rules:
     * Does NOT own lifecycle (init/restore/save). Those live
       in draw.js.
     * Does NOT render draw objects or navigate. Those live in
       draw/drawNav.js and drawRunner.js.
     * Uses dynamic imports where needed to avoid circular
       dependencies.

   Exports:
     updateDrawCaption(entry)
     getDrawCaptionMenuItems(entry)
     clearDrawCaption()
     setDrawAction()
     buildDrawMenuItems(menuContext)
     createPngFromActiveDrawObject(menuContext)
     createPatternFromActiveDrawObject(menuContext)
     copyActiveDrawObject()
     resetActiveDrawObject()
     saveActiveDrawObjectAsSecondary(menuContext)
     saveActiveSecondaryObject(menuContext)
     archiveActiveSecondaryObject(menuContext)
     wireDrawCommandsButton()
   ============================================================ */

import { menuManager }                from "/ui/menuManager.js";
import { setCaptionBar }              from "/ui/caption.js";
import { makeHelpItem }               from "/ui/menuCmds.js";
import { createGalleryPatternPng }    from "/ui/menuCmds.js";
import { createPatternScript }        from "/ui/menuCmds.js";
import { saveSecondary, archiveSecondary } from "/ui/draw/secondaryObjects.js";
import { uiState }                    from "/ui/uiState.js";
import { openHelpHomeOverlay }        from "/ui/help.js";
import { nodeRebuildAndValidateManifests } from "/ui/nodeLayer.js";
import {
  buildCanvasThumbnailBase64,
  setCommandsButtonHandler,
  showCommandsOffcanvas,
  formatRebuildReportShared
}                                     from "/ui/uiUtilities.js";


/* ============================================================
   updateDrawCaption(entry)
   ------------------------------------------------------------
   Builds the full caption bar for a draw object tab.
   Title rule: entry.name
   No prev/next -- Draw uses subtabs, not a linear list.
   ============================================================ */
export function updateDrawCaption(entry) {

  if (!entry) {
    clearDrawCaption();
    return;
  }

  const title = entry.name || "(untitled)";

  setCaptionBar({
    targetId: "caption",
    title,

    // No onPrev / onNext -- Draw tab navigation is via subtabs.

    onMenu: async (anchor) => {
      const menuItems = await getDrawCaptionMenuItems(entry);
      menuManager.open(menuItems, anchor);
    }
  });

} // end updateDrawCaption


/* ============================================================
   getDrawCaptionMenuItems(entry)
   ------------------------------------------------------------
   Always present:
     Help, Save as PNG, Save as Pattern, Copy Object,
     Reset Parameters

   Primary object only (no info.secondary):
     Save as Secondary

   Secondary object only (info.secondary present):
     Save Secondary, Archive Secondary
   ============================================================ */
export async function getDrawCaptionMenuItems(entry) {

  const tabId = uiState.draw.activeSubtab;
  const info  = uiState.draw.tabs?.[tabId];

  const menuContext = {
    id:       entry.id       || entry.name,
    category: entry.category || "uncategorized"
  };

  const items = [
    await makeHelpItem("draw", null),
    {
      label:    "Save as PNG",
      disabled: false,
      onClick:  () => createPngFromActiveDrawObject(menuContext)
    },
    {
      label:    "Save as Pattern",
      disabled: false,
      onClick:  () => createPatternFromActiveDrawObject(menuContext)
    },
    {
      label:    "Copy Object",
      disabled: false,
      onClick:  () => copyActiveDrawObject()
    },
    {
      label:    "Reset Parameters",
      disabled: false,
      onClick:  () => resetActiveDrawObject()
    }
  ];

  if (info?.secondary) {
    items.push(
      {
        label:    "Save Secondary",
        disabled: false,
        onClick:  () => saveActiveSecondaryObject(menuContext)
      },
      {
        label:    "Archive Secondary",
        disabled: false,
        onClick:  () => archiveActiveSecondaryObject(menuContext)
      }
    );
  } else {
    items.push({
      label:    "Save as Secondary",
      disabled: false,
      onClick:  () => saveActiveDrawObjectAsSecondary(menuContext)
    });
  }

  return items;

} // end getDrawCaptionMenuItems


/* ============================================================
   clearDrawCaption()
   ============================================================ */
export function clearDrawCaption() {
  const el = document.getElementById("caption");
  if (el) el.innerHTML = "";
} // end clearDrawCaption


/* ============================================================
   setDrawAction()
   ------------------------------------------------------------
   No-op placeholder -- parameter controls are injected directly
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
   Legacy descriptor format used by older callers.
   New code should use getDrawCaptionMenuItems() instead.
   ============================================================ */
export function buildDrawMenuItems(menuContext) {
  if (!menuContext) return [];

  return [
    {
      label:  "Save as PNG",
      action: () => createPngFromActiveDrawObject(menuContext)
    },
    {
      label:  "Save as Pattern",
      action: () => createPatternFromActiveDrawObject(menuContext)
    },
    {
      label:  "Copy Object",
      action: () => copyActiveDrawObject()
    },
    {
      label:  "Reset Parameters",
      action: () => resetActiveDrawObject()
    }
  ];
} // end buildDrawMenuItems


/* ============================================================
   createPatternFromActiveDrawObject(menuContext)
   ============================================================ */
export async function createPatternFromActiveDrawObject(menuContext) {

  if (!menuContext) throw new Error("createPatternFromActiveDrawObject: menuContext missing");

  const category = menuContext.category;
  const idName   = menuContext.id;

  if (typeof category !== "string" || category.trim() === "")
    throw new Error("createPatternFromActiveDrawObject: menuContext.category missing/invalid");

  if (typeof idName !== "string" || idName.trim() === "")
    throw new Error("createPatternFromActiveDrawObject: menuContext.id missing/invalid");

  const tabId = uiState.draw.activeSubtab;
  const info  = uiState.draw.tabs[tabId];

  if (!info || info.type !== "object")
    throw new Error("createPatternFromActiveDrawObject: active draw tab is not an object tab");

  const entry = info.drawRegistry;
  if (!entry) throw new Error("createPatternFromActiveDrawObject: drawRegistry entry missing");

  const params = info.parameters;
  if (!params) throw new Error("createPatternFromActiveDrawObject: active parameters missing");

  await createPatternScript({ category, idName, entry, params });

} // end createPatternFromActiveDrawObject


/* ============================================================
   copyActiveDrawObject()
   ============================================================ */
export function copyActiveDrawObject() {

  const tabId = uiState.draw.activeSubtab;
  const info  = uiState.draw.tabs[tabId];
  if (!info || info.type !== "object") return;

  const entry     = info.drawRegistry;
  const newParams = structuredClone(info.parameters);
  const baseName  = entry.name.replace(/\s*\(Copy.*\)$/i, "").trim();

  const existing = Object.values(uiState.draw.tabs)
    .filter((t) =>
      t.type === "object" &&
      t.drawRegistry?.name?.startsWith(baseName)
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

  const newName = nextNumber === 1
    ? `${baseName} (Copy)`
    : `${baseName} (Copy ${nextNumber})`;

  import("/ui/draw/drawNav.js").then((m) => {
    m.addDrawSubtab({ name: newName, entry: { ...entry, name: newName, params: newParams } });
  });

} // end copyActiveDrawObject


/* ============================================================
   resetActiveDrawObject()
   ============================================================ */
export async function resetActiveDrawObject() {

  const tabId = uiState.draw.activeSubtab;
  const info  = uiState.draw.tabs[tabId];
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

  if (!newEntry) throw new Error("Reset: module reimport did not recreate entry");

  window.drawRegistry[key] = newEntry;
  info.drawRegistry  = newEntry;
  info.parameters    = newEntry.params;

  newEntry.init();
  info.dirty = false;

  const { markTabClean } = await import("/ui/draw/drawNav.js");
  markTabClean(tabId);

  const { drawActiveTab } = await import("/ui/drawRunner.js");
  drawActiveTab();

} // end resetActiveDrawObject


/* ============================================================
   createPngFromActiveDrawObject(menuContext)
   ============================================================ */
export async function createPngFromActiveDrawObject(menuContext) {

  if (!menuContext) throw new Error("createPngFromActiveDrawObject: menuContext missing");

  const category = menuContext.category;
  const idName   = menuContext.id;

  if (typeof category !== "string" || category.trim() === "")
    throw new Error("createPngFromActiveDrawObject: menuContext.category missing/invalid");

  if (typeof idName !== "string" || idName.trim() === "")
    throw new Error("createPngFromActiveDrawObject: menuContext.id missing/invalid");

  const canvas = window.drawCanvas;
  if (!canvas) throw new Error("createPngFromActiveDrawObject: window.drawCanvas missing");

  await createGalleryPatternPng({ category, idName, canvas });

} // end createPngFromActiveDrawObject


/* ============================================================
   Secondary Object Commands
   ============================================================ */

export async function saveActiveDrawObjectAsSecondary(menuContext) {

  const tabId = uiState.draw.activeSubtab;
  const info  = uiState.draw.tabs[tabId];
  if (!info) return;

  const name = prompt("Name for this variation?");
  if (!name) return;

  const primaryId = menuContext.registryKey || menuContext.id;
  const entry     = info.drawRegistry;

  const payload = {
    name,
    id:          primaryId,
    version:     entry.version,
    category:    entry.category,
    firstOrder:  false,
    source:      "secondary",
    tags:        entry.tags        || [],
    description: entry.description || "",
    params:      info.parameters
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

  const { primaryId, name } = info.secondary;
  const entry = info.drawRegistry;

  const payload = {
    name,
    id:          primaryId,
    version:     entry.version,
    category:    entry.category,
    firstOrder:  false,
    source:      "secondary",
    tags:        entry.tags        || [],
    description: entry.description || "",
    params:      info.parameters
  };

  const canvas      = window.drawCanvas;
  const thumbBase64 = buildCanvasThumbnailBase64(canvas, 50, 50);
  await saveSecondary(primaryId, name, payload, thumbBase64);

  info.dirty = false;
  const { markTabClean } = await import("/ui/draw/drawNav.js");
  markTabClean(tabId);

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

            const { initDrawTab } = await import("/ui/draw/draw.js");
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
