/* patternsMenuCmds.js
   ============================================================
   Patterns Tab Ã¢â‚¬â€ Caption Bar, Menu Items, and Maintenance
   ============================================================
   Role:
     Owns everything related to building the caption bar,
     constructing menu items, and wiring the maintenance
     commands offcanvas panel.

     Also contains the menu command implementations (archive,
     edit manifest, create thumbnail, show script).

   Architectural rules:
     Ã¢â‚¬Â¢ Does NOT own lifecycle (init/restore/save). Those live
       in patterns.js.
     Ã¢â‚¬Â¢ Does NOT render patterns or navigate. Those live in
       patternsDisplay.js.
     Ã¢â‚¬Â¢ Uses dynamic imports for lifecycle functions to avoid
       circular dependencies (e.g. refreshing after rebuild).

   Exports:
     updatePatternsCaption(category, item, helpKey)
     wirePatternsCommandsButton()
     getPatternsCaptionMenuItems(info)
     createPatternThumbnail(info)
     archivePatternsItem(info)
     showPatternScript(info)
     editPatternsManifestItem(info)
   ============================================================ */

import { manifest }             from "../manifest.js";
import { menuManager }          from "../menuManager.js";
import { setCaptionBar }        from "../caption.js";
import { showScriptOffcanvas }  from "../menuCmds.js";
import { archiveItem }          from "../menuCmds.js";
import { openEditManifestDialog } from "../menuCmds.js";
import {
  makeHelpItem,
  makeShowScriptItem,
  makeThumbnailItem,
  makeEditManifestItem,
  makeArchiveItem
} from "../menuCmds.js";
import { buildCanvasThumbnailBase64 } from "/ui/uiUtilities.js";
import {
  setCommandsButton,
  setCommandsButtonHandler,
  showCommandsOffcanvas
} from "/ui/uiUtilities.js";
import { formatRebuildReportShared } from "/ui/uiUtilities.js";
import { nodeRebuildAndValidateManifests } from "../nodeLayer.js";
import { openHelpHomeOverlay } from "../help.js";
import {
  onPrev,
  onNext
} from "./patternsDisplay.js";


/* ============================================================
   updatePatternsCaption(category, item, helpKey)
   ------------------------------------------------------------
   Title rule: "{category}: {title}"
   ============================================================ */
export function updatePatternsCaption(category, item, helpKey) {

  if (typeof category !== "string" || category.trim() === "") {
    throw new Error("updatePatternsCaption: category missing");
  }

  if (!item) {
    throw new Error("updatePatternsCaption: item missing");
  }

  if (typeof item.path !== "string" || item.path.trim() === "") {
    throw new Error("updatePatternsCaption: item.path missing");
  }

  // item.path is authoritative and INCLUDES extension
  const fullFilename = item.path.split("/").pop();

  const rawTitle = item.title || fullFilename || "(untitled)";
  const title = category + ": " + rawTitle;

  setCaptionBar({
    targetId: "caption",
    title,

    onPrev: () => onPrev(),
    onNext: () => onNext(),

    // Patterns renders into the sketchpad region (canvas).
    // So the Next/Prev click-zone overlay must be anchored there.
    overlayTargetId: "sketchpad-wrapper",

    onMenu: async (anchor) => {

      const info = {
        // REQUIRED
        manifestPath: `/patterns/${category}/manifest.json`,
        filename: fullFilename,
        category: category,

        // Manifest editing
        matchField: "path",
        matchValue: item.path,

        title: String(item.title || ""),
        status: String(item.status || ""),

        // Script-related (only used if applicable)
        isScript: fullFilename.toLowerCase().endsWith(".js"),
        scriptPath: `/patterns/${category}/${fullFilename}`,
        helpKey: helpKey
      };

      const menuItems = await getPatternsCaptionMenuItems(info);
      menuManager.open(menuItems, anchor);
    }
  });

} // end updatePatternsCaption


/* ============================================================
   createPatternThumbnail(info)
   ------------------------------------------------------------
   Captures the current canvas, crops it to the artwork's bounds
   while maintaining aspect ratio, and saves it as a thumbnail.
   ============================================================ */
export async function createPatternThumbnail(info) {
  const canvas = document.querySelector("#sketchpad canvas");
  if (!canvas) {
    console.error("createPatternThumbnail: No canvas found");
    return;
  }

  try {
    // 1. Generate the cropped, aspect-ratio-aware base64 data
    const base64Data = buildCanvasThumbnailBase64(canvas, 50, 50);

    const baseName = info.filename.replace(/\.js$/i, "");
    const { nodeDispatch } = await import("../nodeLayer.js");

    // 2. Prepare payload and send to the service
    const result = await nodeDispatch("writePatternThumbnail", {
      category: info.category,
      filename: baseName,
      pngBase64: base64Data
    });

    if (result.status === "ok") {
      // 3. Refresh the UI grid
      const { renderPatternThumbGrid } = await import("./patternsDisplay.js");
      setTimeout(() => {
        renderPatternThumbGrid(info.category);
      }, 100);
    }
  } catch (err) {
    console.error("createPatternThumbnail failed:", err);
  }
} // end createPatternThumbnail


/* ============================================================
   archivePatternsItem(info)
   ============================================================ */
export async function archivePatternsItem(info) {
  const confirm = window.confirm(`Archive "${info.title || info.filename}"?`);
  if (!confirm) return;

  const category     = info.category;
  const currentIndex = uiState.patterns.activeItem;

  // 1. Ensure the manifest cache is warm before reading from it
  const { ensurePatternsManifestLoaded } = await import("../patterns.js");
  await ensurePatternsManifestLoaded();

  const list = manifest.cache.patterns?.[category] ?? [];

  // 2. Calculate where to navigate after removal
  const stayInPatternView = list.length > 1;
  let nextIndex = currentIndex;
  if (currentIndex >= list.length - 1) {
    nextIndex = Math.max(0, currentIndex - 1);
  }

  // 3. Perform the archive (moves file on disk)
  await archiveItem({
    payload: { manifestPath: info.manifestPath, filename: info.filename },
    showAlert: false
  });

  // 4. Clear the stale cache so the next load hits disk
  if (manifest.cache) delete manifest.cache.patterns;

  // 5. Navigate immediately without waiting for a page reload
  const { initPatternsTab, restorePatternsTab } = await import("../patterns.js");
  await ensurePatternsManifestLoaded();

  if (stayInPatternView) {
    const newList = manifest.cache.patterns?.[category] ?? [];
    const safeIndex = Math.min(nextIndex, Math.max(0, newList.length - 1));

    uiState.patterns.activeItem = safeIndex;
    uiState.patterns.saved = {
      view: "pattern",
      activeCategory: category,
      activeItem: safeIndex
    };

    await restorePatternsTab();
  } else {
    // Category now empty Ã¢â‚¬â€ go back to category list
    uiState.patterns.activeCategory = null;
    uiState.patterns.activeItem     = null;
    uiState.patterns.saved = {
      view: "categories",
      activeCategory: null,
      activeItem: null
    };

    await initPatternsTab(false);
  }
} // end archivePatternsItem


/* ============================================================
   showPatternScript(info)
   ============================================================ */
export async function showPatternScript(info) {
  if (!info || !info.isScript) return;
  const label = info.filename || info.title || "(untitled)";
  showScriptOffcanvas(String(info.scriptPath), String(label));
}


/* ============================================================
   editPatternsManifestItem(info)
   ============================================================ */
export async function editPatternsManifestItem(info) {
  const ok = await openEditManifestDialog({
    dialogTitle:   "Edit Manifest",
    manifestPath:  info.manifestPath,
    matchField:    info.matchField,
    matchValue:    info.matchValue,
    fileLabel:     info.filename || info.matchValue,
    initialTitle:  info.title || "",
    initialStatus: info.status || "",
    statusPresets: ["new", "working", "current", "favorite"],
    allowCustomStatus: true,
    allowClearStatus:  true
  });

  if (!ok) return;

  // 1. Clear the stale cache so the refresh hits the updated disk file
  if (manifest.cache) delete manifest.cache.patterns;

  // 2. Import the lifecycle hooks
  const { initPatternsTab, restorePatternsTab } = await import("../patterns.js");

  // 3. Selective Refresh: if viewing a pattern, restore to stay there
  if (uiState.patterns?.saved?.view === "pattern") {
    await restorePatternsTab();
  } else {
    await initPatternsTab(true);
  }
} // end editPatternsManifestItem


/* ============================================================
   getPatternsCaptionMenuItems(info)
   ============================================================ */
export async function getPatternsCaptionMenuItems(info) {
  if (!info) throw new Error("getPatternsCaptionMenuItems: info missing");

  return [
    await makeHelpItem("patterns", info.helpKey),
    makeShowScriptItem(info, showScriptOffcanvas),
    makeThumbnailItem(() => createPatternThumbnail(info)),
    makeEditManifestItem(() => editPatternsManifestItem(info)),
    makeArchiveItem(() => archivePatternsItem(info))
  ];
} // end getPatternsCaptionMenuItems


/* ============================================================
   buildPatternsOffcanvasHtml()
   ============================================================ */
function buildPatternsOffcanvasHtml() {
  return `
    <div class="cmdButtonRow">
      <button id="patternsRebuildValidateButton" class="cmdButton" type="button">
        Rebuild &amp; Validate
      </button>
    </div>

    <div class="cmdButtonRow">
      <button id="patternsHelpButton" class="cmdButton" type="button">
        Help
      </button>
    </div>

    <div class="buttonSeparator"></div>

    <div id="patternsRebuildReport" class="patternsRebuildReport"></div>
  `;
} // end buildPatternsOffcanvasHtml


/* ============================================================
   wirePatternsCommandsButton()
   ============================================================ */
export function wirePatternsCommandsButton() {

  setCommandsButtonHandler(() => {

    showCommandsOffcanvas({
      title: "Patterns Maintenance",
      buildBody(offcanvasBodyEl) {

        if (!offcanvasBodyEl) {
          throw new Error("Patterns Commands: offcanvasBodyEl missing");
        }

        offcanvasBodyEl.innerHTML = buildPatternsOffcanvasHtml();

        const btn = document.getElementById("patternsRebuildValidateButton");
        if (!btn) throw new Error("wirePatternsCommandsButton: button missing");

        btn.addEventListener("click", async () => {

          const out = document.getElementById("patternsRebuildReport");
          if (!out) throw new Error("wirePatternsCommandsButton: report div missing");

          out.textContent = "Running Global Rebuild...";

          // 1. Maintain disk via Node service
          const report = await nodeRebuildAndValidateManifests();

          // 2. Perform the Global Sync (Wipes cache + Invalidates other tab saved-states)
          const { syncSystemStateAfterRebuild } = await import("/ui/uiUtilities.js");
          await syncSystemStateAfterRebuild();

          // 3. Re-load the local patterns cache BEFORE restoring
          const { ensurePatternsManifestLoaded, restorePatternsTab } = await import("../patterns.js");
          await ensurePatternsManifestLoaded();

          // 4. RESTORE instead of INIT
          await restorePatternsTab();

          out.textContent = formatRebuildReportShared(report);

        }); // end click handler

        const helpBtn = document.getElementById("patternsHelpButton");
        if (!helpBtn) throw new Error("wirePatternsCommandsButton: patternsHelpButton missing");

        helpBtn.addEventListener("click", () => {
          // Close offcanvas
          const closeBtn = document.querySelector('[data-bs-dismiss="offcanvas"]');
          if (closeBtn) closeBtn.click();
          openHelpHomeOverlay();
        });

      } // end buildBody
    });

  });

} // end wirePatternsCommandsButton
