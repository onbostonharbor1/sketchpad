/* ui/menuCmds.js
    ------------------------------------------------------------
    Shared menu-item factories
    ------------------------------------------------------------
    Purpose:
      - Build the menu items every tab's caption and Commands menus
        share: Help, Show Script, Thumbnail, Edit Manifest, Archive,
        Notes. Each factory takes a handler from the tab.
      - This file knows nothing about tabs.

    Moved out (see their headers):
      - archiveItem()           ui/archiveItem.js
      - Edit Manifest dialog    ui/editManifestDialog.js
      - showScriptOffcanvas()   ui/scriptView.js
      - Draw export requests    ui/draw/drawExport.js
*/

import { nodeDispatch } from "./nodeLayer.js";
import { showNotesOverlay, closeNotesOverlay } from "./overlay.js";
import { extractHeaderNotes, reflowNotes } from "./notes.js";
import { showScriptOffcanvas } from "./scriptView.js";


/* ============================================================
   MENU ITEM FACTORIES
   ============================================================
   Each factory returns a single menu item descriptor:
     { label, disabled, tooltip, onClick }

   Factories know nothing about which tab is calling them.
   Tab-specific behaviour (post-action navigation, cache
   clearing) is passed in via the handler argument.

   This is the single place to change label text, tooltip
   copy, or disabled logic for each action type.
   ============================================================ */


/* ------------------------------------------------------------
   makeHelpItem(tabName, helpKey, options)
   ------------------------------------------------------------
   Returns a Help menu item.
     • If helpKey is provided, delegates to menuManager.buildHelpItem
       which resolves the help file and opens the overlay.
     • If no helpKey, returns a disabled placeholder.

   Arguments:
     tabName  — e.g. "patterns", "gallery", "figures"
     helpKey  — item-specific help file key, or null/undefined
     options  — passed through to buildHelpItem (e.g. { subdirs })
   ------------------------------------------------------------ */
export async function makeHelpItem(tabName, helpKey, options = {}) {
  if (helpKey) {
    const { menuManager } = await import("./menuManager.js");
    return menuManager.buildHelpItem(tabName, helpKey, options);
  }
  return { label: "Help", disabled: true, tooltip: "No help available", onClick: () => {} };
} // end makeHelpItem


/* ------------------------------------------------------------
   makeShowScriptItem(info, handler)
   ------------------------------------------------------------
   Returns a Show Script menu item.
     • Disabled when info.isScript is falsy or info.scriptPath missing.
     • handler is called with (scriptPath, label) when clicked.

   Arguments:
     info    — { isScript, scriptPath, filename, title }
     handler — fn(scriptPath, label) — typically showScriptOffcanvas
   ------------------------------------------------------------ */
export function makeShowScriptItem(info, handler) {
  const scriptPath = info.scriptPath || "";
  const enabled    = !!(info.isScript && scriptPath);
  const label      = info.filename || info.title || info.file || scriptPath || "(untitled)";

  return {
    label:    "Show Script",
    disabled: !enabled,
    tooltip:  "View the source code for this item",
    onClick:  () => { if (enabled) handler(scriptPath, label); }
  };
} // end makeShowScriptItem


/* ------------------------------------------------------------
   makeThumbnailItem(handler)
   ------------------------------------------------------------
   Returns a Create Thumbnail menu item.
     • Always enabled — handler is responsible for checking canvas.

   Arguments:
     handler — async fn() — tab-specific thumbnail creation
   ------------------------------------------------------------ */
export function makeThumbnailItem(handler) {
  return {
    label:    "Create Thumbnail",
    disabled: false,
    tooltip:  "Generate a thumbnail from the current canvas",
    onClick:  () => { handler(); }
  };
} // end makeThumbnailItem


/* ------------------------------------------------------------
   makeEditManifestItem(handler)
   ------------------------------------------------------------
   Returns an Edit Manifest menu item.
     • Always enabled — handler validates its own preconditions.

   Arguments:
     handler — async fn() — tab-specific manifest edit + refresh
   ------------------------------------------------------------ */
export function makeEditManifestItem(handler) {
  return {
    label:    "Edit Manifest",
    disabled: false,
    tooltip:  "Edit title, status, and other metadata",
    onClick:  async () => { await handler(); }
  };
} // end makeEditManifestItem


/* ------------------------------------------------------------
   makeArchiveItem(handler)
   ------------------------------------------------------------
   Returns an Archive menu item.
     • Always enabled — handler shows its own confirm dialog.

   Arguments:
     handler — async fn() — tab-specific archive + navigation
   ------------------------------------------------------------ */
export function makeArchiveItem(handler) {
  return {
    label:    "Archive",
    disabled: false,
    tooltip:  "Move this item to the archive folder",
    onClick:  async () => { await handler(); }
  };
} // end makeArchiveItem


/* ------------------------------------------------------------
   makeNotesItem(scriptPath, label)
   ------------------------------------------------------------
   Returns a Notes menu item for a source file.
     * Fetches the file and extracts its header notes.
     * Grayed out (disabled) when the file has no notes, the same
       way Help is grayed out when it has no help page.
     * The popup offers Show Script (closes the popup first) and
       Open in VS Code.

   Arguments:
     scriptPath - URL path of the source, e.g. "/drawRegistry/cycloid.js"
     label      - display name for the popup title
   ------------------------------------------------------------ */
export async function makeNotesItem(scriptPath, label) {

  let notes = "";
  try {
    if (!scriptPath) throw new Error("no script path");
    const resp = await fetch(scriptPath);
    if (resp.ok) notes = extractHeaderNotes(await resp.text());
  } catch (e) {
    notes = "";
  }

  const enabled = notes !== "";

  const openIn = (editor) => async () => {
    try {
      const result = await nodeDispatch("openInEditor", { editor, file: scriptPath });
      return (result && result.status === "ok") ? "" : "Could not open the editor.";
    } catch (e) {
      // nodeDispatch errors embed the server's JSON; show just its message
      const m = /"error"\s*:\s*"([^"]+)"/.exec(String(e.message || e));
      return m ? m[1] : String(e.message || e);
    }
  };

  return {
    label:    "Notes",
    disabled: !enabled,
    tooltip:  enabled ? "Notes about this file" : "No notes in this file",
    onClick:  () => {
      if (!enabled) return;
      showNotesOverlay((label || scriptPath) + " Notes", reflowNotes(notes), [
        { label: "Show Script",     onClick: () => { closeNotesOverlay(); showScriptOffcanvas(scriptPath, label); } },
        { label: "Open in VS Code", onClick: openIn("vscode") }
      ]);
    }
  };

} // end makeNotesItem
