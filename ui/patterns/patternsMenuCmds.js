/* patternsMenuCmds.js
   ============================================================
   Patterns Tab -- Caption Bar, Menu Items, and Maintenance
   ============================================================
   Role:
     Owns everything related to building the caption bar,
     constructing menu items, and wiring the maintenance
     commands offcanvas panel.

     Also contains the menu command implementations (archive,
     edit manifest, create thumbnail, show script).

   Architectural rules:
     * Does NOT own lifecycle (init/restore/save). Those live
       in patterns.js.
     * Does NOT render patterns or navigate. Those live in
       patternsDisplay.js.
     * Uses dynamic imports for lifecycle functions to avoid
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

import { manifest }                   from "/ui/manifest.js";
import { menuManager }                from "/ui/menuManager.js";
import { setCaptionBar }              from "/ui/caption.js";
import { openHelpHomeOverlay }        from "/ui/help.js";
import { nodeRebuildAndValidateManifests } from "/ui/nodeLayer.js";
import {
  showScriptOffcanvas,
  archiveItem,
  openEditManifestDialog,
  makeHelpItem,
  makeShowScriptItem,
  makeThumbnailItem,
  makeEditManifestItem,
  makeArchiveItem
}                                     from "/ui/menuCmds.js";
import {
  buildCanvasThumbnailBase64,
  setCommandsButtonHandler,
  showCommandsOffcanvas,
  formatRebuildReportShared
}                                     from "/ui/uiUtilities.js";
import { onPrev, onNext }             from "./patternsDisplay.js";


/* ============================================================
   updatePatternsCaption(category, item, helpKey)
   ------------------------------------------------------------
   Title rule: "{category}: {title}"
   ============================================================ */
export function updatePatternsCaption(category, item, helpKey) {

  if (typeof category !== "string" || category.trim() === "")
    throw new Error("updatePatternsCaption: category missing");

  if (!item)
    throw new Error("updatePatternsCaption: item missing");

  if (typeof item.path !== "string" || item.path.trim() === "")
    throw new Error("updatePatternsCaption: item.path missing");

  const fullFilename = item.path.split("/").pop();
  const rawTitle     = item.title || fullFilename || "(untitled)";
  const title        = category + ": " + rawTitle;

  setCaptionBar({
    targetId:        "caption",
    title,
    onPrev:          () => onPrev(),
    onNext:          () => onNext(),
    overlayTargetId: "sketchpad-wrapper",

    onMenu: async (anchor) => {
      const info = {
        manifestPath: `/patterns/${category}/manifest.json`,
        filename:     fullFilename,
        category,
        matchField:   "path",
        matchValue:   item.path,
        title:        String(item.title  || ""),
        status:       String(item.status || ""),
        isScript:     fullFilename.toLowerCase().endsWith(".js"),
        scriptPath:   `/patterns/${category}/${fullFilename}`,
        helpKey
      };

      const menuItems = await getPatternsCaptionMenuItems(info);
      menuManager.open(menuItems, anchor);
    }
  });

} // end updatePatternsCaption


/* ============================================================
   createPatternThumbnail(info)
   ============================================================ */
export async function createPatternThumbnail(info) {

  const canvas = document.querySelector("#sketchpad canvas");
  if (!canvas) {
    console.error("createPatternThumbnail: No canvas found");
    return;
  }

  try {
    const base64Data = buildCanvasThumbnailBase64(canvas, 50, 50);
    const baseName   = info.filename.replace(/\.js$/i, "");

    const { nodeDispatch } = await import("/ui/nodeLayer.js");
    const result = await nodeDispatch("writePatternThumbnail", {
      category:  info.category,
      filename:  baseName,
      pngBase64: base64Data
    });

    if (result.status === "ok") {
      const { renderPatternThumbGrid } = await import("/ui/patterns/patternsDisplay.js");
      setTimeout(() => renderPatternThumbGrid(info.category), 100);
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

  const { ensurePatternsManifestLoaded } = await import("/ui/patterns/patterns.js");
  await ensurePatternsManifestLoaded();

  const list = manifest.cache.patterns?.[category] ?? [];

  const stayInPatternView = list.length > 1;
  let nextIndex = currentIndex;
  if (currentIndex >= list.length - 1) {
    nextIndex = Math.max(0, currentIndex - 1);
  }

  await archiveItem({
    payload:   { manifestPath: info.manifestPath, filename: info.filename },
    showAlert: false
  });

  manifest.clearCache();

  const { initPatternsTab, restorePatternsTab } = await import("/ui/patterns/patterns.js");
  await ensurePatternsManifestLoaded();

  if (stayInPatternView) {
    const newList   = manifest.cache.patterns?.[category] ?? [];
    const safeIndex = Math.min(nextIndex, Math.max(0, newList.length - 1));

    uiState.patterns.activeItem = safeIndex;
    uiState.patterns.saved = {
      view:           "pattern",
      activeCategory: category,
      activeItem:     safeIndex
    };

    await restorePatternsTab();
  } else {
    uiState.patterns.activeCategory = null;
    uiState.patterns.activeItem     = null;
    uiState.patterns.saved = {
      view:           "categories",
      activeCategory: null,
      activeItem:     null
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
} // end showPatternScript


/* ============================================================
   editPatternsManifestItem(info)
   ============================================================ */
export async function editPatternsManifestItem(info) {

  const ok = await openEditManifestDialog({
    dialogTitle:       "Edit Manifest",
    manifestPath:      info.manifestPath,
    matchField:        info.matchField,
    matchValue:        info.matchValue,
    fileLabel:         info.filename || info.matchValue,
    initialTitle:      info.title  || "",
    initialStatus:     info.status || "",
    statusPresets:     ["new", "working", "current", "favorite"],
    allowCustomStatus: true,
    allowClearStatus:  true
  });

  if (!ok) return;

  manifest.clearCache();

  const { initPatternsTab, restorePatternsTab } = await import("/ui/patterns/patterns.js");

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

        if (!offcanvasBodyEl)
          throw new Error("Patterns Commands: offcanvasBodyEl missing");

        offcanvasBodyEl.innerHTML = buildPatternsOffcanvasHtml();

        const btn = document.getElementById("patternsRebuildValidateButton");
        if (!btn) throw new Error("wirePatternsCommandsButton: button missing");

        btn.addEventListener("click", async () => {
          const out = document.getElementById("patternsRebuildReport");
          if (!out) throw new Error("wirePatternsCommandsButton: report div missing");

          out.textContent = "Running Global Rebuild...";

          const report = await nodeRebuildAndValidateManifests();

          const { syncSystemStateAfterRebuild } = await import("/ui/uiUtilities.js");
          await syncSystemStateAfterRebuild();

          const { ensurePatternsManifestLoaded, restorePatternsTab } = await import("/ui/patterns/patterns.js");
          await ensurePatternsManifestLoaded();
          await restorePatternsTab();

          out.textContent = formatRebuildReportShared(report);
        });

        const helpBtn = document.getElementById("patternsHelpButton");
        if (!helpBtn) throw new Error("wirePatternsCommandsButton: patternsHelpButton missing");

        helpBtn.addEventListener("click", () => {
          const closeBtn = document.querySelector('[data-bs-dismiss="offcanvas"]');
          if (closeBtn) closeBtn.click();
          openHelpHomeOverlay();
        });
      }
    });
  });

} // end wirePatternsCommandsButton
