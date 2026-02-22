/* utilitiesMenuCmds.js
   ============================================================
   Utilities Tab â€” Caption Bar and Menu Items
   ============================================================
   Role:
     Owns everything related to building the caption bar and
     constructing menu items for utility operations.

     Also contains the menu command implementations (show script,
     edit manifest, archive).

   Architectural rules:
     â€¢ Does NOT own lifecycle (init/restore/save). Those live
       in utilities.js.
     â€¢ Does NOT render utilities or navigate. Those live in
       utilitiesDisplay.js and utilitiesNav.js.
     â€¢ Uses dynamic imports for lifecycle functions to avoid
       circular dependencies.

   Exports:
     updateUtilitiesCaption(options)    â€” build caption bar
     getUtilitiesCaptionMenuItems(info) â€” build menu items
     showUtilitiesScript(info)          â€” show script offcanvas
     editUtilitiesManifestItem(info)    â€” edit manifest dialog
     archiveUtilitiesItem(info)         â€” archive utility
   ============================================================ */

import { setCaptionBar } from "../caption.js";
import { menuManager } from "../menuManager.js";
import { manifest } from "../manifest.js";
import { archiveItem } from "../menuCmds.js";
import { showScriptOffcanvas } from "../menuCmds.js";
import { openEditManifestDialog } from "../menuCmds.js";
import {
  makeHelpItem,
  makeShowScriptItem,
  makeEditManifestItem,
  makeArchiveItem
} from "../menuCmds.js";


/* ============================================================
   updateUtilitiesCaption(options)
   ------------------------------------------------------------
   Builds the caption bar for a utility.
   
   This function performs three jobs:
   1) Caption rendering â€” computes and sets the visible title
   2) Execution context â€” derives scriptPath for menu operations
   3) Menu-context bundling â€” builds canonical info object
   
   Arguments:
     options = {
       title:        display title
       path:         category/filename (for display)
       subtab:       "Tools" or "Lab"
       category:     category name
       manifestPath: full path to manifest.json
       entryPath:    entry.path (canonical identifier)
       status:       entry status
     }
   ============================================================ */
export function updateUtilitiesCaption({ title, path, subtab, category, manifestPath, entryPath, status }) {

  /* ----------------------------------------------------------
     1) Caption rendering
     -------------------------------------------------------- */
  const finalTitle =
    (category && category.trim() !== "")
      ? (category + ": " + (title || "(untitled)"))
      : (title || "(untitled)");

  /* ----------------------------------------------------------
     2) Execution context derivation
     -------------------------------------------------------- */
  const scriptPath =
    (subtab && category && entryPath)
      ? `/utilities/${subtab}/${category}/${entryPath}`
      : "";

  setCaptionBar({
    targetId: "caption",
    title: finalTitle,
    onPrev: null,
    onNext: null,

    /* --------------------------------------------------------
       3) Menu-context bundling
       ------------------------------------------------------ */
    onMenu: async (anchor) => {

      if (!manifestPath) {
        throw new Error("updateUtilitiesCaption: manifestPath missing");
      }
      if (!entryPath) {
        throw new Error("updateUtilitiesCaption: entryPath missing");
      }

      // Canonical info object
      const info = {
        // Help / identification
        helpKey: `utilities/${subtab}/${category}/${entryPath}`,

        // Script viewing / execution
        isScript: true,
        scriptPath: scriptPath,

        // Manifest operations (Edit, Archive)
        manifestPath: manifestPath,
        matchField: "path",
        matchValue: entryPath,

        // Canonical file identifier
        filename: entryPath,

        // Display metadata only
        title: title || "",
        status: status || ""
      };

      const items = await getUtilitiesCaptionMenuItems(info);
      menuManager.open(items, anchor);
    }
  });

} // end updateUtilitiesCaption


/* ============================================================
   getUtilitiesCaptionMenuItems(info)
   ============================================================ */
export async function getUtilitiesCaptionMenuItems(info) {

  if (!info) throw new Error("getUtilitiesCaptionMenuItems: info missing");

  return [
    await makeHelpItem("utilities", info.helpKey),
    makeShowScriptItem(info, showScriptOffcanvas),
    makeEditManifestItem(() => editUtilitiesManifestItem(info)),
    makeArchiveItem(() => archiveUtilitiesItem(info))
  ];

} // end getUtilitiesCaptionMenuItems


/* ============================================================
   editUtilitiesManifestItem(info)
   ============================================================ */
async function editUtilitiesManifestItem(info) {

  if (!info) throw new Error("editUtilitiesManifestItem: info missing");

  if (!info.manifestPath) {
    throw new Error("editUtilitiesManifestItem: manifestPath missing");
  }

  if (!info.matchField) {
    throw new Error("editUtilitiesManifestItem: matchField missing");
  }

  if (!info.matchValue) {
    throw new Error("editUtilitiesManifestItem: matchValue missing");
  }

  const ok = await openEditManifestDialog({
    dialogTitle:   "Edit Manifest",
    manifestPath:  String(info.manifestPath),
    matchField:    String(info.matchField),
    matchValue:    String(info.matchValue),

    fileLabel:     String(info.filename || info.title || info.matchValue),

    initialTitle:  String(info.title  || ""),
    initialStatus: String(info.status || ""),

    statusPresets: ["new", "working", "current", "favorite"],
    allowCustomStatus: true,
    allowClearStatus:  true
  });

  if (!ok) return;

  // Clear cache and refresh
  if (manifest && typeof manifest.clearCache === "function") {
    manifest.clearCache();
  }
  if (manifest.cache) delete manifest.cache.utilities;

  const { refreshUtilitiesFromManifestEdit } = await import("../utilities.js");
  await refreshUtilitiesFromManifestEdit();

} // end editUtilitiesManifestItem


/* ============================================================
   archiveUtilitiesItem(info)
   ============================================================ */
async function archiveUtilitiesItem(info) {

  if (!info) throw new Error("archiveUtilitiesItem: info missing");
  if (!info.manifestPath) throw new Error("archiveUtilitiesItem: manifestPath missing");
  if (!info.filename) throw new Error("archiveUtilitiesItem: filename missing");

  const payload = {
    manifestPath: info.manifestPath,
    filename: info.filename
  };

  await archiveItem({
    payload,
    showAlert: true,

    onSuccess: async () => {

      if (manifest && typeof manifest.clearCache === "function") {
        manifest.clearCache();
      }
      if (manifest.cache) delete manifest.cache.utilities;

      const { refreshUtilitiesFromManifestEdit } = await import("../utilities.js");
      await refreshUtilitiesFromManifestEdit();

    }
  });

} // end archiveUtilitiesItem
