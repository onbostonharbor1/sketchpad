/* homeMenuCmds.js
   ============================================================
   Home Tab -- Caption Bar, Menu Commands, and Maintenance
   ============================================================
   Role:
     1. Caption bar -- builds the caption for the Results view,
        including the full file path display and per-item context menu.
     2. Menu command handlers -- Show Script, Edit Manifest.
     3. Commands offcanvas -- the "Home Commands" maintenance panel.

   Architectural rules:
     * Does NOT render category frames. homeNav.js.
     * Does NOT display results. homeResults.js.
     * Does NOT load the manifest. homeManifest.js.
     * Does NOT own TabSpec, init(), or restore(). home.js.
     * setHomeCaptionForResult() builds the bundle FRESH inside the
       onMenu closure -- never captures a stale closure reference.

   Exports:
     clearHomeCaption()
     setHomeCaption(titleText)
     setHomeCaptionForResult(entry)
     getHomeCaptionMenuItems(info)
     editHomeManifestItem(homeItem)
     wireHomeCommandsButton()
   ============================================================ */

import { menuManager }                       from "/ui/menuManager.js";
import { setCaptionBar }                     from "/ui/caption.js";
import { openHelpHomeOverlay }               from "/ui/help.js";
import { nodeRebuildAndValidateManifests }   from "/ui/nodeLayer.js";
import {
  showScriptOffcanvas,
  openEditManifestDialog,
  makeHelpItem,
  makeShowScriptItem,
  makeEditManifestItem
}                                            from "/ui/menuCmds.js";
import {
  formatRebuildReportShared,
  setCommandsButtonHandler,
  showCommandsOffcanvas
}                                            from "/ui/uiUtilities.js";
import { refreshHomeCategoriesFromManifestEdit } from "./homeManifest.js";
import { isJsPath }                          from "./homeResults.js";


/* ============================================================
   clearHomeCaption()
   ============================================================ */
export function clearHomeCaption() {
  const el = document.getElementById("caption");
  if (!el) throw new Error("clearHomeCaption: #caption not found");
  el.innerHTML = "";
} // end clearHomeCaption


/* ============================================================
   setHomeCaption(titleText)
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
   ============================================================ */
export function setHomeCaptionForResult(entry) {

  if (!entry)                    throw new Error("setHomeCaptionForResult: entry missing");
  if (typeof entry !== "object") throw new Error("setHomeCaptionForResult: entry must be an object");

  const title    = entry.title || entry.file || "(untitled)";
  const fullPath = entry.path  || "";

  if (typeof fullPath !== "string" || !fullPath.length)
    throw new Error("setHomeCaptionForResult: entry.path missing");

  setCaptionBar({
    targetId: "caption",
    title,
    onMenu: async (anchor) => {
      const saved = uiState.home?.saved;
      if (!saved) throw new Error("setHomeCaptionForResult onMenu: uiState.home.saved missing");

      const active = saved.activeEntry;
      if (!active) throw new Error("setHomeCaptionForResult onMenu: activeEntry missing");

      const activePath = active.path;
      if (typeof activePath !== "string" || !activePath.length)
        throw new Error("setHomeCaptionForResult onMenu: activeEntry.path missing");

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
    }
  });

  /* Inject the full path into .caption-buttons */
  const btnBar = document.querySelector("#caption .caption-buttons");
  if (!btnBar) throw new Error("setHomeCaptionForResult: .caption-buttons not found");

  const old = btnBar.querySelector(".home-caption-path");
  if (old) old.remove();

  const span       = document.createElement("span");
  span.className   = "home-caption-path";
  span.innerHTML   = fullPath + "&nbsp;&nbsp;";

  const buttons = btnBar.querySelectorAll("button");
  if (!buttons.length) throw new Error("setHomeCaptionForResult: no buttons in .caption-buttons");
  btnBar.insertBefore(span, buttons[buttons.length - 1]);

} // end setHomeCaptionForResult


/* ============================================================
   getHomeCaptionMenuItems(info)
   ============================================================ */
export async function getHomeCaptionMenuItems(info) {

  if (!info) throw new Error("getHomeCaptionMenuItems: info missing");

  return [
    await makeHelpItem("home", info.helpKey),
    makeShowScriptItem(info, showScriptOffcanvas),
    makeEditManifestItem(() => editHomeManifestItem(info))
  ];

} // end getHomeCaptionMenuItems


/* ============================================================
   editHomeManifestItem(homeItem)
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

  if (!ok) return;

  await refreshHomeCategoriesFromManifestEdit();

} // end editHomeManifestItem


/* ============================================================
   buildHomeOffcanvasHtml()
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
   ============================================================ */
export function wireHomeCommandsButton() {

  setCommandsButtonHandler(() => {
    showCommandsOffcanvas({
      title: "Home Maintenance",
      buildBody(offcanvasBodyEl) {

        if (!offcanvasBodyEl)
          throw new Error("wireHomeCommandsButton buildBody: offcanvasBodyEl missing");

        offcanvasBodyEl.innerHTML = buildHomeOffcanvasHtml();

        const btn = document.getElementById("rebuildValidateButton");
        if (!btn) throw new Error("wireHomeCommandsButton: #rebuildValidateButton missing");

        const out = document.getElementById("homeRebuildReport");
        if (!out) throw new Error("wireHomeCommandsButton: #homeRebuildReport missing");

        btn.addEventListener("click", async () => {
          out.textContent = "Running Global Rebuild...";

          const report = await nodeRebuildAndValidateManifests();

          const { syncSystemStateAfterRebuild } = await import("/ui/uiUtilities.js");
          await syncSystemStateAfterRebuild();

          const { initHomeTab } = await import("/ui/home/home.js");
          initHomeTab(false);

          out.textContent = formatRebuildReportShared(report);
        });

        const helpBtn = document.getElementById("homeHelpButton");
        if (!helpBtn) throw new Error("wireHomeCommandsButton: #homeHelpButton missing");

        helpBtn.addEventListener("click", () => {
          const panel = document.getElementById("offcanvasPanel");
          if (!panel) throw new Error("wireHomeCommandsButton: #offcanvasPanel missing");
          const oc = bootstrap.Offcanvas.getOrCreateInstance(panel);
          oc.hide();
          openHelpHomeOverlay();
        });
      }
    });
  });

} // end wireHomeCommandsButton
