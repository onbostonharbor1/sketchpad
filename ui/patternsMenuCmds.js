/* ============================================================
   patternsMenuCmds.js â€” Patterns Tab Menu Commands
   ============================================================ */

import { manifest }                   from "./manifest.js";
import { menuManager }                from "./menuManager.js";
import { showScriptOffcanvas }        from "./menuCmds.js";
import { archiveItem }                from "./menuCmds.js";
import { openEditManifestDialog }     from "./menuCmds.js";
import { PatternsController }         from "./patterns.js";
import { buildCanvasThumbnailBase64 } from "./uiUtilities.js";

   /**
    * createPatternThumbnail
    * ------------------------------------------------------------
    * Captures the current canvas, crops it to the artwork's bounds
    * while maintaining aspect ratio, and saves it as a thumbnail.
    */
   export async function createPatternThumbnail(info) {
     const canvas = document.querySelector("#sketchpad canvas");
     if (!canvas) {
       console.error("createPatternThumbnail: No canvas found");
       return;
     }

     try {
       // 1. Generate the cropped, aspect-ratio-aware base64 data
       // This now uses the shared logic in uiUtilities.js
       const base64Data = buildCanvasThumbnailBase64(canvas, 50, 50);

       const baseName = info.filename.replace(/\.js$/i, "");
       const { nodeDispatch } = await import("./nodeLayer.js");

       // 2. Prepare payload and send to the service
       const result = await nodeDispatch("writePatternThumbnail", {
         category: info.category,
         filename: baseName,
         pngBase64: base64Data
       });

       if (result.status === "ok") {
         // 3. Refresh the UI grid
         // The 100ms delay ensures the OS file system has settled
         setTimeout(() => {
           if (window.PatternsController) {
              PatternsController.renderPatternThumbGrid(info.category);
           }
         }, 100);
       }
     } catch (err) {
       console.error("createPatternThumbnail failed:", err);
     }
   }

/* ============================================================
   archivePatternItem(info)
   ============================================================ */
export async function archivePatternsItem(info) {
  const confirm = window.confirm(`Archive "${info.title || info.filename}"?`);
  if (!confirm) return;

  const category     = info.category;
  const currentIndex = uiState.patterns.activeItem;

  // 1. Ensure the manifest cache is warm before reading from it.
  //    It may be cold if this is the first operation in a session,
  //    or if a previous action cleared it.
  const { ensurePatternsManifestLoaded } = await import("./patterns.js");
  await ensurePatternsManifestLoaded();

  const list = manifest.cache.patterns?.[category] ?? [];

  // 2. Calculate where to navigate after removal.
  //    Prefer showing the next item; if this was the last item,
  //    show the one before it; if the category will be empty,
  //    fall back to categories.
  const stayInPatternView = list.length > 1;
  let nextIndex = currentIndex;
  if (currentIndex >= list.length - 1) {
    nextIndex = Math.max(0, currentIndex - 1);
  }

  // 3. Perform the archive (moves file on disk).
  const { archiveItem } = await import("./menuCmds.js");
  await archiveItem({
    payload: { manifestPath: info.manifestPath, filename: info.filename },
    showAlert: false
  });

  // 4. Clear the stale cache so the next load hits disk.
  if (manifest.cache) delete manifest.cache.patterns;

  // 5. Navigate immediately without waiting for a page reload.
  //    Re-load the manifest fresh, then show the next item or categories.
  const { initPatternsTab, restorePatternsTab } = await import("./patterns.js");
  await ensurePatternsManifestLoaded();

  if (stayInPatternView) {
    const newList = manifest.cache.patterns?.[category] ?? [];
    // Clamp in case the list shrank more than expected
    const safeIndex = Math.min(nextIndex, Math.max(0, newList.length - 1));

    uiState.patterns.activeItem = safeIndex;
    uiState.patterns.saved = {
      view: "pattern",
      activeCategory: category,
      activeItem: safeIndex
    };

    await restorePatternsTab();
  } else {
    // Category now empty — go back to category list.
    uiState.patterns.activeCategory = null;
    uiState.patterns.activeItem     = null;
    uiState.patterns.saved = {
      view: "categories",
      activeCategory: null,
      activeItem: null
    };

    await initPatternsTab(false);
  }
}

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
  const { initPatternsTab, restorePatternsTab } = await import("./patterns.js");

  /**
   * 3. THE FIX: Selective Refresh
   * If we are currently looking at a pattern, use 'restore' to stay there
   * and update the caption/controls with the new title.
   * Otherwise, use 'init' to refresh the category list.
   */
  if (uiState.patterns?.saved?.view === "pattern") {
    await restorePatternsTab();
  } else {
    await initPatternsTab(true);
  }
}

/* ============================================================
   getPatternsCaptionMenuItems(info)
   ============================================================ */
export async function getPatternsCaptionMenuItems(info) {
  if (!info) throw new Error("getPatternsCaptionMenuItems: info missing");

  const items = [];

  // Help
  if (info.helpKey) {
    items.push(await menuManager.buildHelpItem("patterns", info.helpKey));
  } else {
    items.push({ label: "Help", disabled: true, onClick: () => {} });
  }

  // Show Script
  items.push({
    label: "Show Script",
    disabled: !info.isScript,
    onClick: () => showPatternScript(info)
  });

  // Create Thumbnail (Restored Command)
  items.push({
    label: "Create Thumbnail",
    disabled: false,
    onClick: () => createPatternThumbnail(info)
  });

  // Edit Manifest
  items.push({
    label: "Edit Manifest",
    disabled: false,
    onClick: () => editPatternsManifestItem(info)
  });

  // Archive
  items.push({
    label: "Archive",
    disabled: false,
    onClick: () => archivePatternsItem(info)
  });

  return items;
}
