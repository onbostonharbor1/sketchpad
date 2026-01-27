/* patternsMenuCmds.js
   ------------------------------------------------------------
   Patterns Tab — Menu Commands (Adapter Only)
   ------------------------------------------------------------
   Rules:
     • NO uiState-derived context
     • ALL commands consume explicit `info`
     • menuCmds.js remains generic
------------------------------------------------------------ */

import { manifest }               from "./manifest.js";
import { menuManager }            from "./menuManager.js";
import { showScriptOffcanvas }    from "./menuCmds.js";
import { archiveItem }            from "./menuCmds.js";
import { openEditManifestDialog } from "./menuCmds.js";
import { PatternsController }     from "./patterns.js";


/* ============================================================
   archivePatternItem(info)
   ------------------------------------------------------------
   Archive current item, then deterministically return to
   Patterns Category view (NOT Home).
=========================================================== */
export async function archivePatternItem(info) {

  if (!info) throw new Error("archivePatternItem: info missing");
  if (!info.manifestPath) throw new Error("archivePatternItem: manifestPath missing");
  if (!info.filename) throw new Error("archivePatternItem: filename missing");
  if (!info.category) throw new Error("archivePatternItem: category missing");

  const payload = {
    manifestPath: info.manifestPath,
    filename: info.filename
  };

  console.log("archivePatternItem → archiveItem payload:", payload);

  await archiveItem({
    payload,
    showAlert: true,

    onSuccess: async () => {

      // Ensure we are on the correct top-level tab.
      // (Use your real tab switch function name if different.)
      setUI("patterns");

      // Force Patterns to show its Category view (your agreed behavior).
      // Use the controller method that does "category frame" display.
      await PatternsController.showCategoryFrame();

    }
  });

} // end archivePatternItem


/* ============================================================
   showPatternScript(info)
=========================================================== */
export async function showPatternScript(info) {

  if (!info) throw new Error("showPatternScript: info missing");
  if (!info.isScript) return;

  const scriptPath = info.scriptPath;
  const label =
    info.filename ||
    info.title ||
    "(untitled)";

  if (!scriptPath) {
    throw new Error("showPatternScript: scriptPath missing");
  }

  showScriptOffcanvas(String(scriptPath), String(label));

} // end showPatternScript

/* ============================================================
   editPatternsManifestItem(info)
=========================================================== */
export async function editPatternsManifestItem(info) {

  if (!info) throw new Error("editPatternsManifestItem: info missing");
  if (!info.manifestPath) throw new Error("editPatternsManifestItem: manifestPath missing");
  if (!info.matchField) throw new Error("editPatternsManifestItem: matchField missing");
  if (!info.matchValue) throw new Error("editPatternsManifestItem: matchValue missing");
  if (!info.category) throw new Error("editPatternsManifestItem: category missing");

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

  // Match Gallery behavior exactly:
  // 1) drop cache
  // 2) rebuild from saved uiState via tab restore

  if (manifest && typeof manifest.clearCache === "function") {
    manifest.clearCache();
  }
  if (manifest.cache) delete manifest.cache.patterns;

  // Instead of calling a global setUI, import it dynamically:
    const { setUI } = await import("./setUI.js");

  // Force Patterns tab restore (same role as refreshGalleryFromManifestEdit)
  setUI("patterns");

} // end editPatternsManifestItem



/* ============================================================
   getPatternsCaptionMenuItems(info)
=========================================================== */
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

} // end getPatternsCaptionMenuItems

// end patternsMenuCmds.js
