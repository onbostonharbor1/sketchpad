/* galleryMenuCmds.js   (ui/gallery/galleryMenuCmds.js)
   ============================================================
   Gallery Tab â€” Caption Bar, Menu Commands, and Maintenance
   ============================================================
   Role:
     Owns three related concerns that all sit at the boundary
     between the user's actions and the underlying data:

     1. Caption bar â€” builds the title, prev/next callbacks, and
        the per-item context menu for whatever item is currently
        displayed in the Results view.

     2. Menu command handlers â€” the functions invoked when the
        user selects Archive, Edit Manifest, or Show Script from
        the caption menu.

     3. Commands offcanvas â€” the "Gallery Commands" maintenance
        panel, including the Rebuild & Validate button and its
        post-rebuild refresh sequence.

   Architectural rules:
     â€¢ Does NOT render category frames or subtabs. galleryNav.js.
     â€¢ Does NOT display images or execute scripts. galleryResults.js.
     â€¢ Does NOT own TabSpec, init(), or restore(). gallery.js.
     â€¢ Reads currentCategory from galleryState.js via getter.
       Never touches the raw variable directly.
     â€¢ refreshGalleryFromManifestEdit() is the single re-entry
       point after any manifest mutation (edit or archive).

   Exports:
     updateGalleryCaption(domain, categoryLabel)
     getGalleryCaptionMenuItems(info)
     archiveGalleryItem(info)
     wireGalleryCommandsButton()
     refreshGalleryFromManifestEdit()
     formatRebuildReport(report)
   ============================================================ */

import { manifest }                          from "../manifest.js";
import { setCaptionBar }                     from "../caption.js";
import { menuManager }                       from "../menuManager.js";
import { openHelpHomeOverlay }               from "../help.js";
import { nodeRebuildAndValidateManifests }   from "../nodeLayer.js";
import { showScriptOffcanvas }               from "../menuCmds.js";
import { openEditManifestDialog }            from "../menuCmds.js";
import {
  formatRebuildReportShared,
  syncSystemStateAfterRebuild,
  setCommandsButton,
  setCommandsButtonHandler,
  showCommandsOffcanvas
} from "../uiUtilities.js";
import {
  getGalleryCache,
  setGalleryCache,
  getCurrentCategory
} from "./galleryState.js";
import {
  showPrevGalleryItem,
  showNextGalleryItem,
  normalizeGalleryEntryPath
} from "./galleryResults.js";
import { initGalleryTab } from "../gallery.js";


/* ============================================================
   Constants â€” must stay in sync with gallery.js
   ============================================================ */
const DOMAIN_SCRIPTS = "Scripts";


/* ============================================================
   updateGalleryCaption(domain, categoryLabel)
   ============================================================
   Builds and renders the caption bar for the currently active
   gallery item.

   The caption bar shows:
     â€¢ A title in the form "CategoryLabel: ItemTitle"
     â€¢ Prev / Next navigation arrows
     â€¢ A menu button that opens the per-item context menu

   The context menu is built lazily (on menu button click) via
   getGalleryCaptionMenuItems(). This avoids building the info
   object on every navigation step â€” only when the user actually
   opens the menu.

   Arguments:
     domain        â€” "Ideabook", "Patterns", or "Scripts"
     categoryLabel â€” the category string shown in the title
   ============================================================ */
export function updateGalleryCaption(domain, categoryLabel) {

  const item = uiState.gallery.activeItem;
  if (!item) {
    throw new Error("updateGalleryCaption: uiState.gallery.activeItem missing");
  }

  if (typeof categoryLabel !== "string" || categoryLabel.trim() === "") {
    throw new Error("updateGalleryCaption: categoryLabel missing or empty");
  }

  const isScript = (domain === DOMAIN_SCRIPTS);

  /* Scripts render into the sketchpad wrapper; images into #text. */
  const overlayTargetId = isScript ? "sketchpad-wrapper" : "text";

  /* Caption title combines category and item title. */
  const rawTitle = item.title || item.filename || item.path || "(untitled)";
  const title    = categoryLabel + ": " + rawTitle;

  /* Prev / Next delegate to galleryResults.js. */
  const onPrev = () => showPrevGalleryItem(domain);
  const onNext = () => showNextGalleryItem(domain);

  /* Menu button â€” builds the info object and opens the context menu. */
  const onMenu = async (anchor) => {

    const category = getCurrentCategory();
    if (!category) {
      throw new Error("updateGalleryCaption onMenu: currentCategory missing");
    }

    /* Resolve the canonical file identifier for this entry.
       Scripts use their path field; images use the normalised path. */
    const fileId = isScript
      ? String(item.path)
      : String(normalizeGalleryEntryPath(category, item));

    if (!fileId || !fileId.includes(".")) {
      throw new Error("updateGalleryCaption onMenu: invalid fileId: " + fileId);
    }

    /* The info object is the canonical identity passed to all
       command handlers. It must be complete enough for archive,
       edit, and help commands to operate without additional lookups. */
    const info = {
      domain:       domain,
      category:     category,
      manifestPath: `/gallery/${domain}/${category}/manifest.json`,
      matchField:   "path",
      matchValue:   fileId,
      filename:     fileId,
      title:        item.title  || "",
      status:       item.status || "",
      isScript:     isScript,
      scriptPath:   isScript ? `/gallery/Scripts/${category}/${fileId}` : "",
      helpKey:      fileId,
      helpSubdirs:  [domain, category]
    };

    const menuItems = await getGalleryCaptionMenuItems(info);
    menuManager.open(menuItems, anchor);

  }; // end onMenu

  setCaptionBar({
    targetId:        "caption",
    title,
    onPrev,
    onNext,
    onMenu,
    overlayTargetId
  });

} // end updateGalleryCaption


/* ============================================================
   getGalleryCaptionMenuItems(info)
   ============================================================
   Builds the array of menu item descriptors for the caption
   context menu. Called by the onMenu handler above.

   Menu items:
     Help          â€” opens the help overlay for this item
     Show Script   â€” shows script source (disabled for images)
     Edit Manifest â€” opens the manifest edit dialog
     Archive       â€” moves the item to the archive folder

   Arguments:
     info â€” the canonical identity object built by updateGalleryCaption

   Returns:
     Array of menu item descriptors for menuManager.open()
   ============================================================ */
export async function getGalleryCaptionMenuItems(info) {

  if (!info) throw new Error("getGalleryCaptionMenuItems: info missing");

  const items = [];

  /* â”€â”€ Help â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if (info.helpKey) {
    const helpItem = await menuManager.buildHelpItem("gallery", info.helpKey, {
      subdirs: info.helpSubdirs
    });
    items.push(helpItem);
  } else {
    items.push({ label: "Help", disabled: true, onClick: () => {} });
  }

  /* â”€â”€ Show Script â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  items.push({
    label:   "Show Script",
    disabled: !info.isScript,
    tooltip: "View the source code for this gallery item",
    onClick: () => showGalleryScriptSource(info)
  });

  /* â”€â”€ Edit Manifest â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  items.push({
    label:   "Edit Manifest",
    disabled: false,
    tooltip: "Edit title, status, and other metadata",
    onClick: async () => { await editGalleryManifestItem(info); }
  });

  /* â”€â”€ Archive â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  items.push({
    label:   "Archive",
    disabled: false,
    tooltip: "Move this item to the archive folder",
    onClick: async () => { await archiveGalleryItem(info); }
  });

  return items;

} // end getGalleryCaptionMenuItems


/* ============================================================
   showGalleryScriptSource(info)
   ============================================================
   Opens the script source offcanvas for the active item.
   Only applicable when info.isScript is true.

   Arguments:
     info â€” canonical identity object; must have scriptPath set
   ============================================================ */
function showGalleryScriptSource(info) {

  if (!info) throw new Error("showGalleryScriptSource: info missing");
  if (!info.isScript) return;

  const scriptPath = info.scriptPath;
  const label      = info.filename || info.title || "(untitled)";

  if (!scriptPath) throw new Error("showGalleryScriptSource: scriptPath missing");

  showScriptOffcanvas(String(scriptPath), String(label));

} // end showGalleryScriptSource


/* ============================================================
   editGalleryManifestItem(info)
   ============================================================
   Opens the Edit Manifest dialog for the active item and,
   if the user confirms, triggers a manifest refresh so the
   UI reflects the updated title/status immediately.

   Arguments:
     info â€” canonical identity object
   ============================================================ */
async function editGalleryManifestItem(info) {

  if (!info)             throw new Error("editGalleryManifestItem: info missing");
  if (!info.manifestPath) throw new Error("editGalleryManifestItem: manifestPath missing");
  if (!info.matchField)  throw new Error("editGalleryManifestItem: matchField missing");
  if (!info.matchValue)  throw new Error("editGalleryManifestItem: matchValue missing");

  const ok = await openEditManifestDialog({
    dialogTitle:       "Edit Manifest",
    manifestPath:      String(info.manifestPath),
    matchField:        String(info.matchField),
    matchValue:        String(info.matchValue),
    fileLabel:         String(info.filename || info.title || info.matchValue),
    initialTitle:      String(info.title  || ""),
    initialStatus:     String(info.status || ""),
    statusPresets:     ["new", "working", "current", "favorite"],
    allowCustomStatus: true,
    allowClearStatus:  true
  });

  /* User cancelled â€” no changes to apply. */
  if (!ok) return;

  /* Re-sync the UI with the updated manifest data. */
  await refreshGalleryFromManifestEdit();

} // end editGalleryManifestItem


/* ============================================================
   archiveGalleryItem(info)
   ============================================================
   Confirms with the user, then moves the active item to the
   archive folder via the shared archiveItem command.

   After archiving, the session bookmark is updated to point at
   a neighbouring item (or cleared if the category is now empty),
   and the page reloads to the new bookmark.

   Arguments:
     info â€” canonical identity object
   ============================================================ */
export async function archiveGalleryItem(info) {

  if (!window.confirm(`Archive "${info.title || info.filename}"?`)) return;

  const { archiveItem } = await import("../menuCmds.js");

  /* Perform the server-side file move first. */
  const result = await archiveItem({
    payload:   { manifestPath: info.manifestPath, filename: info.filename },
    showAlert: false
  });

  if (result?.status === "ok") {

    const { domain, category } = info;
    const cache = getGalleryCache();
    const list  = cache?.[domain]?.[category];

    /* Calculate where to land after the archive. */
    if (list && list.length > 1) {
      const currentIndex = uiState.gallery.saved.index;
      /* Stay at the same index unless we were on the last item. */
      const nextIndex = (currentIndex === list.length - 1)
        ? currentIndex - 1
        : currentIndex;

      sessionStorage.setItem("sketchpad.gallery.saved", JSON.stringify({
        view:     "results",
        domain,
        category,
        index:    nextIndex
      }));
    } else {
      /* Category is now empty â€” clear the bookmark entirely. */
      sessionStorage.removeItem("sketchpad.gallery.saved");
    }

    /* Single reload brings the UI to the new bookmark cleanly. */
    window.location.reload();
  }

} // end archiveGalleryItem


/* ============================================================
   refreshGalleryFromManifestEdit()
   ============================================================
   Re-syncs the Gallery UI after a manifest has been mutated
   (edit title/status, or post-archive recovery).

   Sequence:
     1. Clear the central manifest cache so the next load
        reads fresh data from disk.
     2. Clear the local gallery cache.
     3. Reload the gallery cache from disk.
     4. Find the active item in the refreshed data.
     5. Restore the current view deterministically from uiState.

   If the active item can no longer be found (e.g. it was
   removed), the index is clamped and the view restores to
   the nearest available item.
   ============================================================ */
export async function refreshGalleryFromManifestEdit() {

  /* â”€â”€ 1 & 2. Invalidate both caches â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if (manifest && typeof manifest.clearCache === "function") {
    manifest.clearCache();
  }
  setGalleryCache(null);

  /* â”€â”€ 3. Reload from disk â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  /* ensureGalleryCacheLoaded is imported from gallery.js to
     avoid duplicating the load logic here. */
  const { ensureGalleryCacheLoaded } = await import("../gallery.js");
  await ensureGalleryCacheLoaded();

  /* â”€â”€ 4. Locate the active item in the fresh cache â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const cache    = getGalleryCache();
  const domain   = uiState.gallery.activeDomain;
  const category = uiState.gallery.activeCategory;
  const item     = uiState.gallery.activeItem;

  if (domain && category && item) {

    const list = cache[domain][category];

    /* Build the match value the same way updateGalleryCaption does. */
    const matchValue = (domain === DOMAIN_SCRIPTS)
      ? String(item.path)
      : String(normalizeGalleryEntryPath(category, item));

    let found = list.find((entry) => {
      const entryMatch = (domain === DOMAIN_SCRIPTS)
        ? String(entry.path)
        : String(normalizeGalleryEntryPath(category, entry));
      return entryMatch === matchValue;
    });

    if (!found) {
      /* Item gone â€” clamp index and restore with nearest neighbour. */
      uiState.gallery.activeItem = null;
      if (uiState.gallery.saved?.view === "results" && list.length > 0) {
        let idx = uiState.gallery.saved.index;
        if (idx >= list.length) idx = list.length - 1;
        uiState.gallery.saved.index = idx;
        uiState.gallery.activeItem  = list[idx];
        sessionStorage.setItem(
          "sketchpad.gallery.saved",
          JSON.stringify(uiState.gallery.saved)
        );
      }
    } else {
      uiState.gallery.activeItem = found;
    }
  }

  /* â”€â”€ 5. Restore the current view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const { restoreGalleryTab } = await import("../gallery.js");
  await restoreGalleryTab();

} // end refreshGalleryFromManifestEdit


/* ============================================================
   formatRebuildReport(report)
   ============================================================
   Formats the Node rebuild/validate response into a human-
   readable string for display in the offcanvas report area.

   Delegates to the shared formatter in uiUtilities.js so that
   all tabs display rebuild output in the same format.
   ============================================================ */
export function formatRebuildReport(report) {
  return formatRebuildReportShared(report);
} // end formatRebuildReport


/* ============================================================
   buildGalleryOffcanvasHtml()
   ============================================================
   Returns the HTML string for the Gallery Commands offcanvas
   body. IDs here must match the selectors in
   wireGalleryCommandsButton().
   ============================================================ */
function buildGalleryOffcanvasHtml() {
  return `
    <div class="cmdButtonRow">
      <button id="galleryRebuildValidateButton" class="cmdButton" type="button">
        Rebuild &amp; Validate
      </button>
    </div>
    <div class="cmdButtonRow">
      <button id="galleryHelpButton" class="cmdButton" type="button">
        Help
      </button>
    </div>
    <div class="buttonSeparator"></div>
    <div id="galleryRebuildReport" class="galleryRebuildReport"></div>
  `;
} // end buildGalleryOffcanvasHtml


/* ============================================================
   wireGalleryCommandsButton()
   ============================================================
   Attaches the click handler to the shared Commands button
   so that clicking it opens the Gallery Commands offcanvas.

   Rebuild & Validate sequence:
     1. Node rewrites manifests on disk.
     2. syncSystemStateAfterRebuild() wipes the central manifest
        cache and marks all other tabs as needing a refresh.
     3. Local galleryCache is nulled so the next load hits disk.
     4. initGalleryTab(false) cold-starts the tab with fresh data.
     5. The rebuild report is displayed in the offcanvas.

   Called by:
     initGalleryTab()    â€” on cold start
     restoreGalleryTab() â€” on restore
   ============================================================ */
export function wireGalleryCommandsButton() {

  setCommandsButtonHandler(() => {

    showCommandsOffcanvas({
      title: "Gallery Maintenance",
      buildBody(container) {

        if (!container) return;
        container.innerHTML = buildGalleryOffcanvasHtml();

        const btn     = document.getElementById("galleryRebuildValidateButton");
        const out     = document.getElementById("galleryRebuildReport");
        const helpBtn = document.getElementById("galleryHelpButton");

        /* â”€â”€ Rebuild & Validate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        btn?.addEventListener("click", async () => {
          out.textContent = "Rebuilding...";

          /* 1. Server-side manifest maintenance. */
          const report = await nodeRebuildAndValidateManifests();

          /* 2. Wipe central cache + mark all other tabs stale. */
          await syncSystemStateAfterRebuild();

          /* 3. Wipe local gallery cache so reload hits disk. */
          setGalleryCache(null);

          /* 4. Cold-start this tab with fresh data. */
          await initGalleryTab(false);

          /* 5. Show the rebuild summary. */
          out.textContent = formatRebuildReport(report);
        });

        /* â”€â”€ Help â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        helpBtn?.addEventListener("click", () => {
          /* Close the offcanvas before opening help overlay. */
          const panel = document.getElementById("offcanvasPanel");
          if (panel) {
            const oc = bootstrap.Offcanvas.getOrCreateInstance(panel);
            oc.hide();
          }
          openHelpHomeOverlay();
        });

      } // end buildBody
    });

  });

} // end wireGalleryCommandsButton
