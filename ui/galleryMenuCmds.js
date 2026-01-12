import { showScriptOffcanvas } from "./menuCmds.js";
import { openEditManifestDialog } from "./menuCmds.js";
import { refreshGalleryFromManifestEdit } from "./gallery.js";
import { menuManager } from "./menuManager.js";



/* ============================================================
   getGalleryCaptionMenuItems(info)
   ------------------------------------------------------------
   Matches Home + Patterns style:
     - caller passes an "info" object describing the active item
     - this returns an array for menuManager.open()
=========================================================== */
export async function getGalleryCaptionMenuItems(info) {

  if (!info) throw new Error("getGalleryCaptionMenuItems: info missing");

  const items = [];

  /* ----------------------------------------------------------
     Help (optional)
     -------------------------------------------------------- */
  const helpKey = info.helpKey || null;
  if (helpKey) {
    const helpItem = await menuManager.buildHelpItem("gallery", helpKey);
    items.push(helpItem);
  } else {
    items.push({
      label: "Help",
      disabled: true,
      onClick: () => {}
    });
  }

  /* ----------------------------------------------------------
     Show Script
     -------------------------------------------------------- */
  const isScript = !!info.isScript;
  const scriptPath = info.scriptPath || "";

  const label =
    info.filename ||
    info.title ||
    info.matchValue ||
    scriptPath ||
    "(untitled)";

  items.push({
    label: "Show Script",
    disabled: !isScript,
    onClick: () => {
      if (!isScript) return;
      showScriptOffcanvas(scriptPath, label);
    } // end onClick
  });

  /* ----------------------------------------------------------
     Edit Manifest
     -------------------------------------------------------- */
  items.push({
    label: "Edit Manifest",
    disabled: false,
    onClick: async () => {
      await editGalleryManifestItem(info);
    } // end onClick
  });

  return items;

} // end getGalleryCaptionMenuItems


/* ============================================================
   editGalleryManifestItem(info)
=========================================================== */
export async function editGalleryManifestItem(info) {

  if (!info) throw new Error("editGalleryManifestItem: info missing");

  const manifestPath = info.manifestPath;
  const matchField   = info.matchField;
  const matchValue   = info.matchValue;

  if (!manifestPath) throw new Error("editGalleryManifestItem: manifestPath missing");
  if (!matchField)   throw new Error("editGalleryManifestItem: matchField missing");
  if (!matchValue)   throw new Error("editGalleryManifestItem: matchValue missing");

  const ok = await openEditManifestDialog({
    dialogTitle:   "Edit Manifest",
    manifestPath:  String(manifestPath),
    matchField:    String(matchField),
    matchValue:    String(matchValue),

    fileLabel:     String(info.filename || info.title || matchValue),

    initialTitle:  String(info.title || ""),
    initialStatus: String(info.status || ""),

    statusPresets: ["new", "working", "current", "favorite"],

    allowCustomStatus: true,
    allowClearStatus:  true
  });

  if (!ok) return;

  await refreshGalleryFromManifestEdit();

} // end editGalleryManifestItem


// end galleryMenuCmds.js
