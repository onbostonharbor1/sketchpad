/* galleryMenuCmds.js
   ============================================================
   Gallery Tab -- Caption Bar, Menu Commands, and Maintenance
   ============================================================
   Role:
     Owns three related concerns at the boundary between the
     user's actions and the underlying data:

     1. Caption bar -- builds the title, prev/next callbacks,
        and the per-item context menu for the active Results item.
     2. Menu command handlers -- Archive, Edit Manifest, Show Script.
     3. Commands offcanvas -- the "Gallery Commands" maintenance
        panel including Rebuild & Validate.

   Architectural rules:
     * Does NOT render category frames or subtabs. galleryNav.js.
     * Does NOT display images or execute scripts. galleryResults.js.
     * Does NOT own TabSpec, init(), or restore(). gallery.js.
     * Reads currentCategory from galleryState.js via getter.

   Exports:
     updateGalleryCaption(domain, categoryLabel)
     getGalleryCaptionMenuItems(info)
     archiveGalleryItem(info)
     wireGalleryCommandsButton()
     refreshGalleryFromManifestEdit()
   ============================================================ */

import { manifest }                        from "/ui/manifest.js";
import { setCaptionBar }                   from "/ui/caption.js";
import { menuManager }                     from "/ui/menuManager.js";
import { openHelpHomeOverlay }             from "/ui/help.js";
import { nodeRebuildAndValidateManifests } from "/ui/nodeLayer.js";
import {
  showScriptOffcanvas,
  openEditManifestDialog,
  makeHelpItem,
  makeShowScriptItem,
  makeEditManifestItem,
  makeArchiveItem
}                                          from "/ui/menuCmds.js";
import {
  formatRebuildReportShared,
  setCommandsButtonHandler,
  showCommandsOffcanvas
}                                          from "/ui/uiUtilities.js";
import { getCurrentCategory }              from "./galleryState.js";
import {
  showPrevGalleryItem,
  showNextGalleryItem,
  normalizeGalleryEntryPath
}                                          from "./galleryResults.js";


/* ============================================================
   Constants
   ============================================================ */
const DOMAIN_SCRIPTS = "Scripts";


/* ============================================================
   updateGalleryCaption(domain, categoryLabel)
   ============================================================ */
export function updateGalleryCaption(domain, categoryLabel) {

  const item = uiState.gallery.activeItem;
  if (!item)
    throw new Error("updateGalleryCaption: uiState.gallery.activeItem missing");

  if (typeof categoryLabel !== "string" || categoryLabel.trim() === "")
    throw new Error("updateGalleryCaption: categoryLabel missing or empty");

  const isScript        = (domain === DOMAIN_SCRIPTS);
  const overlayTargetId = isScript ? "sketchpad-wrapper" : "text";
  const rawTitle        = item.title || item.filename || item.path || "(untitled)";
  const title           = categoryLabel + ": " + rawTitle;

  const onPrev = () => showPrevGalleryItem(domain);
  const onNext = () => showNextGalleryItem(domain);

  const onMenu = async (anchor) => {
    const category = getCurrentCategory();
    if (!category)
      throw new Error("updateGalleryCaption onMenu: currentCategory missing");

    const fileId = isScript
      ? String(item.path)
      : String(normalizeGalleryEntryPath(category, item));

    if (!fileId || !fileId.includes("."))
      throw new Error("updateGalleryCaption onMenu: invalid fileId: " + fileId);

    const info = {
      domain,
      category,
      manifestPath: `/gallery/${domain}/${category}/manifest.json`,
      matchField:   "path",
      matchValue:   fileId,
      filename:     fileId,
      title:        item.title  || "",
      status:       item.status || "",
      isScript,
      scriptPath:   isScript ? `/gallery/Scripts/${category}/${fileId}` : "",
      helpKey:      fileId,
      helpSubdirs:  [domain, category]
    };

    const menuItems = await getGalleryCaptionMenuItems(info);
    menuManager.open(menuItems, anchor);
  };

  setCaptionBar({
    targetId: "caption",
    title,
    onPrev,
    onNext,
    onMenu,
    overlayTargetId
  });

} // end updateGalleryCaption


/* ============================================================
   getGalleryCaptionMenuItems(info)
   ============================================================ */
export async function getGalleryCaptionMenuItems(info) {

  if (!info) throw new Error("getGalleryCaptionMenuItems: info missing");

  return [
    await makeHelpItem("gallery", info.helpKey, { subdirs: info.helpSubdirs }),
    makeShowScriptItem(info, (path, label) => showGalleryScriptSource({ ...info, scriptPath: path })),
    makeEditManifestItem(() => editGalleryManifestItem(info)),
    makeArchiveItem(() => archiveGalleryItem(info))
  ];

} // end getGalleryCaptionMenuItems


/* ============================================================
   showGalleryScriptSource(info)
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
   ============================================================ */
async function editGalleryManifestItem(info) {

  if (!info)              throw new Error("editGalleryManifestItem: info missing");
  if (!info.manifestPath) throw new Error("editGalleryManifestItem: manifestPath missing");
  if (!info.matchField)   throw new Error("editGalleryManifestItem: matchField missing");
  if (!info.matchValue)   throw new Error("editGalleryManifestItem: matchValue missing");

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

  if (!ok) return;

  await refreshGalleryFromManifestEdit();

} // end editGalleryManifestItem


/* ============================================================
   archiveGalleryItem(info)
   ============================================================ */
export async function archiveGalleryItem(info) {

  if (!window.confirm(`Archive "${info.title || info.filename}"?`)) return;

  const { archiveItem } = await import("/ui/menuCmds.js");

  const result = await archiveItem({
    payload:   { manifestPath: info.manifestPath, filename: info.filename },
    showAlert: false
  });

  if (result?.status === "ok") {
    const { getGalleryCache } = await import("/ui/gallery/gallery.js");
    const cache = getGalleryCache();
    const list  = cache?.[info.domain]?.[info.category];

    if (list && list.length > 1) {
      const currentIndex = uiState.gallery.saved.index;
      const nextIndex    = (currentIndex === list.length - 1)
        ? currentIndex - 1
        : currentIndex;

      sessionStorage.setItem("sketchpad.gallery.saved", JSON.stringify({
        view:     "results",
        domain:   info.domain,
        category: info.category,
        index:    nextIndex
      }));
    } else {
      sessionStorage.removeItem("sketchpad.gallery.saved");
    }

    window.location.reload();
  }

} // end archiveGalleryItem


/* ============================================================
   refreshGalleryFromManifestEdit()
   ============================================================ */
export async function refreshGalleryFromManifestEdit() {

  if (manifest && typeof manifest.clearCache === "function") {
    manifest.clearCache();
  }

  const { ensureGalleryCacheLoaded, getGalleryCache } = await import("/ui/gallery/gallery.js");
  await ensureGalleryCacheLoaded();

  const cache    = getGalleryCache();
  const domain   = uiState.gallery.activeDomain;
  const category = uiState.gallery.activeCategory;
  const item     = uiState.gallery.activeItem;

  if (domain && category && item) {
    const list = cache[domain][category];

    const matchValue = (domain === DOMAIN_SCRIPTS)
      ? String(item.path)
      : String(normalizeGalleryEntryPath(category, item));

    const found = list.find((entry) => {
      const entryMatch = (domain === DOMAIN_SCRIPTS)
        ? String(entry.path)
        : String(normalizeGalleryEntryPath(category, entry));
      return entryMatch === matchValue;
    });

    if (!found) {
      uiState.gallery.activeItem = null;
      if (uiState.gallery.saved?.view === "results" && list.length > 0) {
        let idx = uiState.gallery.saved.index;
        if (idx >= list.length) idx = list.length - 1;
        uiState.gallery.saved.index = idx;
        uiState.gallery.activeItem  = list[idx];
        sessionStorage.setItem("sketchpad.gallery.saved", JSON.stringify(uiState.gallery.saved));
      }
    } else {
      uiState.gallery.activeItem = found;
    }
  }

  const { restoreGalleryTab } = await import("/ui/gallery/gallery.js");
  await restoreGalleryTab();

} // end refreshGalleryFromManifestEdit


/* ============================================================
   buildGalleryOffcanvasHtml()
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

        btn?.addEventListener("click", async () => {
          out.textContent = "Rebuilding...";

          const report = await nodeRebuildAndValidateManifests();

          const { syncSystemStateAfterRebuild } = await import("/ui/uiUtilities.js");
          await syncSystemStateAfterRebuild();

          const { initGalleryTab } = await import("/ui/gallery/gallery.js");
          await initGalleryTab(false);

          out.textContent = formatRebuildReportShared(report);
        });

        helpBtn?.addEventListener("click", () => {
          const panel = document.getElementById("offcanvasPanel");
          if (panel) {
            const oc = bootstrap.Offcanvas.getOrCreateInstance(panel);
            oc.hide();
          }
          openHelpHomeOverlay();
        });
      }
    });
  });

} // end wireGalleryCommandsButton
