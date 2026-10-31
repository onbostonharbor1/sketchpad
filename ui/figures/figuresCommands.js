/* figuresCommands.js
   ============================================================
   Figures Tab -- Commands Button and Caption Bar
   ============================================================
   Role:
     Owns the "Figures Commands" side panel and the caption bar
     (title plus the "v" menu) for a figure subtab.

   Architectural rules:
     * Does NOT own lifecycle (init/restore/save). That is figures.js.
     * Does NOT build subtabs or switch them. That is figuresNav.js.

   Caption menu (no-ops until their features exist):
     Help, Notes, Show Script, Copy, Archive, Reset.
     Help and Notes follow the same grayed-out rule as the other
     tabs: gray when there is nothing to show.

   Exports:
     wireFiguresCommandsButton()
     setFiguresCaption(title, withMenu)
     getFiguresCaptionMenuItems(title)
   ============================================================ */

import { setCaptionBar }            from "/ui/caption.js";
import { menuManager }              from "/ui/menuManager.js";
import { makeHelpItem, makeNotesItem } from "/ui/menuCmds.js";
import {
  setCommandsButtonLabel,
  setCommandsButtonHandler,
  showCommandsOffcanvas,
  formatRebuildReportShared
}                                   from "/ui/uiUtilities.js";
import { nodeRebuildAndValidateManifests } from "/ui/nodeLayer.js";
import { openHelpHomeOverlay }      from "/ui/help.js";
import { uiState }                  from "/ui/uiState.js";
import { redrawFigure, canBreakApart, breakApartLayer } from "./figureLayers.js";
import { deletePoint }              from "./figurePoints.js";


/* ============================================================
   wireFiguresCommandsButton()
   ============================================================ */
export function wireFiguresCommandsButton() {

  setCommandsButtonHandler(() => {
    showCommandsOffcanvas({
      title: "Figures Commands",
      buildBody(offcanvasBodyEl) {

        offcanvasBodyEl.innerHTML = `
          <div class="cmdButtonRow">
            <button id="figuresRebuildValidateButton" class="cmdButton" type="button">
              Rebuild &amp; Validate
            </button>
          </div>
          <div class="cmdButtonRow">
            <button id="figuresHelpButton" class="cmdButton" type="button">
              Help
            </button>
          </div>
          <div class="buttonSeparator"></div>
          <div id="figuresRebuildReport"></div>
        `;

        document.getElementById("figuresRebuildValidateButton")
          .addEventListener("click", async () => {
            const out = document.getElementById("figuresRebuildReport");
            out.textContent = "Running Global Rebuild...";

            const report = await nodeRebuildAndValidateManifests();

            const { syncSystemStateAfterRebuild } = await import("/ui/uiUtilities.js");
            await syncSystemStateAfterRebuild();

            const { initFiguresTab } = await import("./figures.js");
            await initFiguresTab(false);

            out.textContent = formatRebuildReportShared(report);
          });

        document.getElementById("figuresHelpButton")
          .addEventListener("click", () => {
            const closeBtn = document.querySelector('[data-bs-dismiss="offcanvas"]');
            if (closeBtn) closeBtn.click();
            openHelpHomeOverlay();
          });
      }
    });
  });

} // end wireFiguresCommandsButton


/* ============================================================
   setFiguresCaption(title, withMenu)
   ------------------------------------------------------------
   title    - caption text (default "Figures")
   withMenu - true on a figure subtab: shows the "v" menu
   ============================================================ */
export function setFiguresCaption(title = "Figures", withMenu = false) {

  setCommandsButtonLabel("Figures Commands");

  setCaptionBar({
    targetId: "caption",
    title,
    onMenu: withMenu ? async (anchor) => {
      const items = await getFiguresCaptionMenuItems(title);
      menuManager.open(items, anchor);
    } : null
  });

} // end setFiguresCaption


/* ============================================================
   getFiguresCaptionMenuItems(title)
   ============================================================ */
export async function getFiguresCaptionMenuItems(title) {

  // Not built yet: shown grayed out so the menu has its final shape.
  const later = (label) => ({
    label,
    disabled: true,
    tooltip:  "Not available yet",
    onClick:  () => {}
  });

  // The active figure tab, read when the item is clicked.
  const activeTab = () => uiState.figures.tabs[uiState.figures.activeSubtab];

  const hitRadiusItem = {
    label:   "Hit radius (" + uiState.figures.hitRadius + " px)...",
    tooltip: "How close a click must be to pick a point in points mode",
    onClick: () => {
      const answer = window.prompt(
        "Hit radius in canvas pixels (1 to 50):", String(uiState.figures.hitRadius));
      if (answer === null) return;
      const n = Number(answer);
      if (Number.isFinite(n) && n >= 1 && n <= 50) uiState.figures.hitRadius = n;
    }
  };

  // Phase 8 next pass: how close a dropped handle must land to another
  // handle to weld. Same shape as the hit radius above.
  const snapRadiusItem = {
    label:   "Weld snap radius (" + uiState.figures.snapRadius + " px)...",
    tooltip: "How close a dropped handle must land to another handle to snap onto it and weld",
    onClick: () => {
      const answer = window.prompt(
        "Weld snap radius in canvas pixels (1 to 50):", String(uiState.figures.snapRadius));
      if (answer === null) return;
      const n = Number(answer);
      if (Number.isFinite(n) && n >= 1 && n <= 50) uiState.figures.snapRadius = n;
    }
  };

  // Usable only in points mode with a disc selected (the menu is rebuilt
  // each time it opens, so this is read fresh).
  const ts0 = activeTab();
  const deletePointItem = {
    label:    "Delete selected point",
    disabled: !(ts0 && ts0.mode === "points" && ts0.selectedPoint != null),
    tooltip:  "Removes the selected disc (points mode). Its number is never reused.",
    onClick: () => {
      const ts = activeTab();
      if (!ts || !ts.figure || ts.selectedPoint == null) return;
      deletePoint(ts.figure, ts.selectedPoint);
      ts.selectedPoint = null;
      redrawFigure(uiState.figures.activeSubtab);
    }
  };

  // The active layer's object comes apart into separate layers (Phase 7c).
  // Like Insert, not offered in points mode.
  const breakApartItem = {
    label:    "Break apart",
    disabled: !(ts0 && ts0.mode !== "points" && canBreakApart(uiState.figures.activeSubtab)),
    tooltip:  "Replaces the active object with its pieces, each on its own layer. The original is hidden.",
    onClick: () => breakApartLayer(uiState.figures.activeSubtab)
  };

  return [
    await makeHelpItem("figures", null),
    await makeNotesItem(null, title),
    hitRadiusItem,
    snapRadiusItem,
    deletePointItem,
    breakApartItem,
    later("Show Script"),
    later("Copy"),
    later("Archive"),
    later("Reset")
  ];

} // end getFiguresCaptionMenuItems

// end figuresCommands.js
