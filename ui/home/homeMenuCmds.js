/* homeMenuCmds.js   (ui/home/homeMenuCmds.js)
   ============================================================
   Home Tab â€” Caption Bar, Menu Commands, and Maintenance
   ============================================================
   Role:
     Owns three related concerns that sit at the boundary between
     the user's actions and the underlying data:

     1. Caption bar â€” builds the caption for the Results view,
        including the full file path display and the per-item
        context menu (Show Script, Edit Manifest).

     2. Menu command handlers â€” the functions invoked when the
        user selects Show Script or Edit Manifest from the caption
        context menu.

     3. Commands offcanvas â€” the "Home Commands" maintenance panel,
        including the Rebuild & Validate button and its post-rebuild
        refresh sequence.

   Architectural rules:
     â€¢ Does NOT render category frames. homeNav.js.
     â€¢ Does NOT display results. homeResults.js.
     â€¢ Does NOT load the manifest. homeManifest.js.
     â€¢ Does NOT own TabSpec, init(), or restore(). home.js.
     â€¢ setHomeCaptionForResult() builds the bundle FRESH inside the
       onMenu closure â€” never captures a stale closure reference.
       This is important: if the user edits the manifest while
       Results is visible, the next menu open must show current values.

   Exports:
     clearHomeCaption()
     setHomeCaption(titleText)
     setHomeCaptionForResult(entry)
     getHomeCaptionMenuItems(info)
     editHomeManifestItem(homeItem)
     wireHomeCommandsButton()
     formatRebuildReport(report)
   ============================================================ */

import { menuManager }              from "../menuManager.js";
import { setCaptionBar }            from "../caption.js";
import { showScriptOffcanvas }      from "../menuCmds.js";
import { openEditManifestDialog }   from "../menuCmds.js";
import { openHelpHomeOverlay }      from "../help.js";
import { nodeRebuildAndValidateManifests } from "../nodeLayer.js";
import {
  formatRebuildReportShared,
  syncSystemStateAfterRebuild,
  setCommandsButton,
  setCommandsButtonHandler,
  showCommandsOffcanvas
} from "../uiUtilities.js";
import { getHomeCaptionMenuItems as _getHomeCaptionMenuItems } from "../homeMenuCmds.js";
import { refreshHomeCategoriesFromManifestEdit } from "./homeManifest.js";
import { isJsPath } from "./homeResults.js";


/* ============================================================
   clearHomeCaption()
   ============================================================
   Empties the #caption region.

   Called when entering the Categories view, where no item is
   selected and the caption bar should be blank.
   ============================================================ */
export function clearHomeCaption() {

  const el = document.getElementById("caption");
  if (!el) throw new Error("clearHomeCaption: #caption not found");
  el.innerHTML = "";

} // end clearHomeCaption


/* ============================================================
   setHomeCaption(titleText)
   ============================================================
   Builds a minimal caption bar with a title and no prev/next
   or menu button.

   Used during init as a placeholder caption and for any view
   that does not require interactive caption elements.

   Arguments:
     titleText â€” the string to display as the caption title
   ============================================================ */
export function setHomeCaption(titleText) {

  setCaptionBar({
    targetId: "caption",
    title:    titleText,
    onPrev:   null,
    onNext:   null,
    onMenu:   null
  });

} // end setHomeCaption


/* ============================================================
   setHomeCaptionForResult(entry)
   ============================================================
   Builds the full Results caption bar for the given entry.

   The caption shows the entry title and a menu button. The full
   rooted file path is also injected as a text span into the
   caption button bar, to the left of the menu button.

   The onMenu handler builds the info bundle FRESH each time
   the menu is opened, reading from uiState.home.saved.activeEntry
   rather than from the entry argument captured at construction
   time. This ensures that if the user edits the manifest while
   Results is still visible, the next menu open seeds the Edit
   dialog with the correct current values.

   Arguments:
     entry â€” the active manifest entry object (must have .path)
   ============================================================ */
export function setHomeCaptionForResult(entry) {

  if (!entry)                   throw new Error("setHomeCaptionForResult: entry missing");
  if (typeof entry !== "object") throw new Error("setHomeCaptionForResult: entry must be an object");

  const title    = entry.title || entry.file || "(untitled)";
  const fullPath = entry.path  || "";

  if (typeof fullPath !== "string" || !fullPath.length) {
    throw new Error("setHomeCaptionForResult: entry.path missing");
  }

  /* â”€â”€ Build the caption bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  setCaptionBar({
    targetId: "caption",
    title,
    onMenu: async (anchor) => {

      /* Read the CURRENT active entry fresh on every menu open.
         Never rely on the entry argument captured at construction. */
      const saved = uiState.home?.saved;
      if (!saved) throw new Error("setHomeCaptionForResult onMenu: uiState.home.saved missing");

      const active = saved.activeEntry;
      if (!active) throw new Error("setHomeCaptionForResult onMenu: activeEntry missing");

      const activePath = active.path;
      if (typeof activePath !== "string" || !activePath.length) {
        throw new Error("setHomeCaptionForResult onMenu: activeEntry.path missing");
      }

      /* Build the info bundle with current values from uiState. */
      const bundle = {
        tabName:      "home",
        manifestPath: "/home/manifest.json",
        entryPath:    activePath,
        title:        active.title  || "",
        file:         active.file   || "",
        status:       (typeof active.status === "string") ? active.status : "",
        isScript:     isJsPath(activePath),
        scriptPath:   isJsPath(activePath) ? activePath : null,
        helpKey:      null
      };

      const items = await getHomeCaptionMenuItems(bundle);
      menuManager.open(items, anchor);

    } // end onMenu
  });

  /* â”€â”€ Inject the full path into .caption-buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  /* The path span is inserted to the left of the menu button
     so the user can see exactly which file is being displayed. */
  const btnBar = document.querySelector("#caption .caption-buttons");
  if (!btnBar) {
    throw new Error("setHomeCaptionForResult: .caption-buttons not found");
  }

  /* Remove any existing path span from a previous result. */
  const old = btnBar.querySelector(".home-caption-path");
  if (old) old.remove();

  const span = document.createElement("span");
  span.className  = "home-caption-path";
  span.innerHTML  = fullPath + "&nbsp;&nbsp;";

  /* Insert BEFORE the last button (the menu button). */
  const buttons = btnBar.querySelectorAll("button");
  if (!buttons.length) {
    throw new Error("setHomeCaptionForResult: no buttons in .caption-buttons");
  }
  btnBar.insertBefore(span, buttons[buttons.length - 1]);

} // end setHomeCaptionForResult


/* ============================================================
   getHomeCaptionMenuItems(info)
   ============================================================
   Builds the array of menu item descriptors for the caption
   context menu.

   Menu items:
     Show Script   â€” opens the script source offcanvas
                     (disabled for non-script entries)
     Edit Manifest â€” opens the manifest edit dialog

   Arguments:
     info â€” the bundle object built by setHomeCaptionForResult

   Returns:
     Array of menu item descriptors for menuManager.open()
   ============================================================ */
export async function getHomeCaptionMenuItems(info) {

  if (!info) throw new Error("getHomeCaptionMenuItems: info missing");

  const items = [];

  const isScript  = !!info.isScript;
  const scriptPath = info.scriptPath || "";

  const label =
    info.file      ||
    info.title     ||
    info.entryPath ||
    scriptPath     ||
    "(untitled)";

  /* â”€â”€ Show Script â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  items.push({
    label:    "Show Script",
    disabled: !isScript,
    tooltip:  "View the source code for this script",
    onClick:  () => {
      if (!isScript) return;
      showScriptOffcanvas(scriptPath, label);
    }
  });

  /* â”€â”€ Edit Manifest â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  items.push({
    label:    "Edit Manifest",
    disabled: false,
    tooltip:  "Edit title, status, and other metadata",
    onClick:  async () => {
      await editHomeManifestItem(info);
    }
  });

  return items;

} // end getHomeCaptionMenuItems


/* ============================================================
   editHomeManifestItem(homeItem)
   ============================================================
   Opens the Edit Manifest dialog for the active Home entry.
   After a confirmed edit, triggers refreshHomeCategoriesFromManifestEdit()
   to re-sync the UI with the updated manifest data.

   The refresh function (in homeManifest.js) handles all decision
   logic for whether to stay in Results or bounce to Categories.

   Arguments:
     homeItem â€” the info bundle from getHomeCaptionMenuItems
   ============================================================ */
export async function editHomeManifestItem(homeItem) {

  if (!homeItem)              throw new Error("editHomeManifestItem: homeItem missing");
  if (!homeItem.manifestPath) throw new Error("editHomeManifestItem: homeItem.manifestPath missing");
  if (!homeItem.entryPath)    throw new Error("editHomeManifestItem: homeItem.entryPath missing");

  const ok = await openEditManifestDialog({
    dialogTitle:       "Edit Manifest",
    manifestPath:      String(homeItem.manifestPath),
    matchField:        "path",
    matchValue:        String(homeItem.entryPath),
    fileLabel:         String(homeItem.file || homeItem.title || homeItem.entryPath),
    initialTitle:      String(homeItem.title  || ""),
    initialStatus:     String(homeItem.status || ""),
    statusPresets:     ["new", "working", "current", "favorite"],
    allowCustomStatus: true,
    allowClearStatus:  true
  });

  /* User cancelled â€” no changes to apply. */
  if (!ok) return;

  /* Re-sync the UI with the updated manifest. */
  await refreshHomeCategoriesFromManifestEdit();

} // end editHomeManifestItem


/* ============================================================
   formatRebuildReport(report)
   ============================================================
   Formats the Node rebuild/validate response into a human-
   readable string for display in the offcanvas report area.

   Delegates to the shared formatter in uiUtilities.js so all
   tabs display rebuild output in the same format.
   ============================================================ */
export function formatRebuildReport(report) {
  return formatRebuildReportShared(report);
} // end formatRebuildReport


/* ============================================================
   buildHomeOffcanvasHtml()
   ============================================================
   Returns the HTML string for the Home Commands offcanvas body.
   IDs here must match the selectors in wireHomeCommandsButton().
   ============================================================ */
function buildHomeOffcanvasHtml() {
  return `
    <div class="cmdButtonRow">
      <button id="rebuildValidateButton" class="cmdButton" type="button">
        Rebuild &amp; Validate
      </button>
    </div>
    <div class="cmdButtonRow">
      <button id="homeHelpButton" class="cmdButton" type="button">
        Help
      </button>
    </div>
    <div class="buttonSeparator"></div>
    <div id="homeRebuildReport" class="homeRebuildReport"></div>
  `;
} // end buildHomeOffcanvasHtml


/* ============================================================
   wireHomeCommandsButton()
   ============================================================
   Attaches the click handler to the shared Commands button so
   that clicking it opens the Home Commands offcanvas.

   Rebuild & Validate sequence:
     1. Node rewrites all manifests on disk.
     2. syncSystemStateAfterRebuild() wipes the central manifest
        cache and marks all other tabs as needing a refresh.
     3. initHomeTab(false) cold-starts the Home tab with fresh data.
     4. The rebuild report is displayed in the offcanvas.

   Called by:
     initHomeTab()    â€” on cold start
     restoreHomeTab() â€” on restore
   ============================================================ */
export function wireHomeCommandsButton() {

  setCommandsButtonHandler(() => {

    showCommandsOffcanvas({
      title: "Home Maintenance",
      buildBody(offcanvasBodyEl) {

        if (!offcanvasBodyEl) {
          throw new Error("wireHomeCommandsButton buildBody: offcanvasBodyEl missing");
        }

        offcanvasBodyEl.innerHTML = buildHomeOffcanvasHtml();

        const btn = document.getElementById("rebuildValidateButton");
        if (!btn) throw new Error("wireHomeCommandsButton: #rebuildValidateButton missing");

        const out = document.getElementById("homeRebuildReport");
        if (!out) throw new Error("wireHomeCommandsButton: #homeRebuildReport missing");

        /* â”€â”€ Rebuild & Validate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        btn.addEventListener("click", async () => {

          out.textContent = "Running Global Rebuild...";

          /* 1. Server-side manifest maintenance. */
          const report = await nodeRebuildAndValidateManifests();

          /* 2. Wipe central cache + mark all other tabs stale. */
          await syncSystemStateAfterRebuild();

          /* 3. Cold-start Home tab with fresh data.
             Import dynamically to avoid circular reference
             (home.js imports from this file). */
          const { initHomeTab } = await import("../home.js");
          initHomeTab(false);

          /* 4. Show the rebuild summary. */
          out.textContent = formatRebuildReport(report);

        }); // end click

        /* â”€â”€ Help â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        const helpBtn = document.getElementById("homeHelpButton");
        if (!helpBtn) throw new Error("wireHomeCommandsButton: #homeHelpButton missing");

        helpBtn.addEventListener("click", () => {
          const panel = document.getElementById("offcanvasPanel");
          if (!panel) throw new Error("wireHomeCommandsButton: #offcanvasPanel missing");
          const oc = bootstrap.Offcanvas.getOrCreateInstance(panel);
          oc.hide();
          openHelpHomeOverlay();
        }); // end click

      } // end buildBody
    });

  });

} // end wireHomeCommandsButton
