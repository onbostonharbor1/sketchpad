/* ============================================================
   patternsMenuCmds.js — Patterns Tab Menu Commands
   ============================================================ */

import { manifest }            from "./manifest.js";
import { menuManager }         from "./menuManager.js";
import { showScriptOffcanvas } from "./menuCmds.js";
import { archiveItem }         from "./menuCmds.js";
import { openEditManifestDialog } from "./menuCmds.js";
import { PatternsController }  from "./patterns.js";

/* ============================================================
   createPatternThumbnail(info)
   ============================================================ */
/* patternsMenuCmds.js */

export async function createPatternThumbnail(info) {
  const canvas = document.querySelector("#sketchpad canvas");
  if (!canvas) {
    console.error("createPatternThumbnail: No canvas found");
    return;
  }

  // 1. Create 50x50 thumbnail
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = 50;
  thumbCanvas.height = 50;
  const tCtx = thumbCanvas.getContext("2d");
  tCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 50, 50);

  // 2. Prepare payload
  const dataUrl = thumbCanvas.toDataURL("image/png");
  const base64Data = dataUrl.split(",")[1];
  const baseName = info.filename.replace(/\.js$/i, "");

  try {
    const { nodeDispatch } = await import("./nodeLayer.js");

    const result = await nodeDispatch("writePatternThumbnail", {
      category: info.category,
      filename: baseName,
      pngBase64: base64Data
    });

    if (result.status === "ok") {
      console.log("Thumbnail written to disk.");

      // 3. RECREATE THUMBNAIL IN ACTION AREA
      // We wait 100ms to ensure the OS has flushed the file to disk
      // so the browser doesn't load a cached or empty version.
      setTimeout(() => {
        PatternsController.renderPatternThumbGrid(info.category);
      }, 100);
    }
  } catch (err) {
    console.error("createPatternThumbnail failed:", err);
  }
}

/* ============================================================
   archivePatternItem(info)
   ============================================================ */
export async function archivePatternItem(info) {
  if (!info) throw new Error("archivePatternItem: info missing");

  const payload = {
    manifestPath: info.manifestPath,
    filename: info.filename
  };

  // Calls the generic tool in menuCmds.js
  await archiveItem({
    payload,
    showAlert: true,
    onSuccess: async () => {
      // Drop local cache
      if (manifest.cache) delete manifest.cache.patterns;

      // FIX: Ensure we use showCategoryList as exported in patterns.js
      await PatternsController.showCategoryList();
    }
  });
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

  if (manifest.cache) delete manifest.cache.patterns;

  // Re-run patterns init to refresh view
  const { initPatternsTab } = await import("./patterns.js");
  await initPatternsTab(true);
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
    onClick: () => archivePatternItem(info)
  });

  return items;
}
