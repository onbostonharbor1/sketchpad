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
         // Show success message
         alert("Thumbnail created successfully.");
         
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

  const category = info.category;
  const currentIndex = uiState.patterns.activeItem;
  const list = manifest.cache.patterns[category];

  // 1. Calculate the next item to show
  let nextIndex = currentIndex;
  let stayInPatternView = (list.length > 1);

  if (currentIndex === list.length - 1) {
    nextIndex = currentIndex - 1;
  }

  // 2. Perform the Archive
  const { archiveItem } = await import("./menuCmds.js");
  await archiveItem({
    payload: { manifestPath: info.manifestPath, filename: info.filename },
    showAlert: false
  });

  // 3. Clear the stale cache
  if (manifest.cache) delete manifest.cache.patterns;

  // 4. THE FIX: Update the "Bookmark" before the reload hits
  if (stayInPatternView) {
    const newState = {
      view: "pattern",
      activeCategory: category,
      activeItem: nextIndex
    };
    // Save this specifically so the reload puts us back in the SUBTAB
    sessionStorage.setItem("sketchpad.patterns.saved", JSON.stringify(newState));
  } else {
    // If the category is now empty, we HAVE to go back to categories
    sessionStorage.removeItem("sketchpad.patterns.saved");
  }

  // The server will now reload the page.
  // Because of the 'sessionStorage' bookmark above,
  // setUI will wake up and call restorePatternsTab,
  // keeping you on the Pattern subtab.
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
