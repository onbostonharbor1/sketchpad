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

   Caption menu, top to bottom:
     Help, Notes          the shared items every tab has; grayed when
                          there is nothing to show
     Hit radius (N px)... how close a points-mode click must be
     Delete selected point   points mode, with a disc selected
     Break apart          Phase 7c, not in points mode
     Show Script, Copy, Archive, Reset    grayed: not built yet, shown
                                          so the menu has its final shape

   The caption bar itself also carries the Line and Parabola buttons
   and the active layer's name and Show checkbox. Those are added by
   addCaptionTools() in figuresNav.js after setFiguresCaption() has
   built the bar.

   Exports:
     wireFiguresCommandsButton()
     setFiguresCaption(title, withMenu)
     getFiguresCaptionMenuItems(title)
   ============================================================ */

import { setCaptionBar }            from "/ui/caption.js";
import { menuManager }              from "/ui/menuManager.js";
import { makeHelpItem, makeNotesItem } from "/ui/menuCmds.js";
import { setCommandsButtonLabel, setCommandsButtonHandler } from "/ui/commandsButton.js";
import { showOffcanvas } from "/ui/offcanvas.js";
import { formatRebuildReportShared } from "/ui/rebuildSync.js";
import { nodeRebuildAndValidateManifests } from "/ui/nodeLayer.js";
import { openHelpHomeOverlay }      from "/ui/help.js";
import { uiState }                  from "/ui/uiState.js";
import { redrawFigure, canBreakApart, breakApartLayer } from "./figureLayers.js";
import { deletePoint }              from "./figurePoints.js";


/* ============================================================
   wireFiguresCommandsButton()
   ------------------------------------------------------------
   The Commands button at the top left opens a slide-in panel
   ("offcanvas", a Bootstrap term) with two buttons:
     Rebuild & Validate  asks the Node service to rebuild every
                         manifest, then reloads this tab
     Help                closes the panel and opens the help overlay
   ============================================================ */
export function wireFiguresCommandsButton() {

  setCommandsButtonHandler(() => {
    showOffcanvas({
      title: "Figures Commands",
      // buildBody is called with the panel's body element once the
      // panel exists; it fills the body and wires the buttons.
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

            // import() inside a function loads the module only when it is
            // needed, here only after a rebuild. It also avoids an import
            // loop at load time (figures.js imports this file).
            const { syncSystemStateAfterRebuild } = await import("/ui/rebuildSync.js");
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

   The menu items are built fresh each time the "v" is pressed
   (getFiguresCaptionMenuItems below), so a grayed or enabled item
   always reflects the moment it is opened -- for instance, "Delete
   selected point" is live only if a disc is selected right then.
   ============================================================ */
export function setFiguresCaption(title = "Figures", withMenu = false) {

  setCommandsButtonLabel("Figures Commands");

  setCaptionBar({
    targetId: "caption",
    title,
    // "a ? b : c" is if-else as an expression: a function on a figure
    // subtab, null (no menu button) on the Categories subtab.
    onMenu: withMenu ? async (anchor) => {
      const items = await getFiguresCaptionMenuItems(title);
      menuManager.open(items, anchor);
    } : null
  });

} // end setFiguresCaption


/* ============================================================
   getFiguresCaptionMenuItems(title)
   ------------------------------------------------------------
   Returns the menu as an array of items. Each item is a plain
   object the shared menuManager understands:
     { label, onClick, disabled?, tooltip? }
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

  // A plain browser prompt box, checked for a sensible number. The
  // label shows the current value because the menu is rebuilt on
  // every opening.
  const hitRadiusItem = {
    label:   "Hit radius (" + uiState.figures.hitRadius + " px)...",
    tooltip: "How close a click must be to pick a point in points mode",
    onClick: () => {
      const answer = window.prompt(
        "Hit radius in canvas pixels (1 to 50):", String(uiState.figures.hitRadius));
      if (answer === null) return;             // Cancel pressed
      const n = Number(answer);
      if (Number.isFinite(n) && n >= 1 && n <= 50) uiState.figures.hitRadius = n;
    }
  };

  // Usable only in points mode with a disc selected (the menu is rebuilt
  // each time it opens, so this is read fresh).
  const ts0 = activeTab();
  const deletePointItem = {
    label:    "Delete selected point",
    // "!=" (not "!==") on purpose: true for both null and undefined.
    disabled: !(ts0 && ts0.mode === "points" && ts0.selectedPoint != null),
    tooltip:  "Removes the selected disc (points mode). Its number is never reused.",
    onClick: () => {
      const ts = activeTab();
      if (!ts || !ts.figure || ts.selectedPoint == null) return;
      deletePoint(ts.figure, ts.selectedPoint);   // also drops it from any weld
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
    deletePointItem,
    breakApartItem,
    later("Show Script"),
    later("Copy"),
    later("Archive"),
    later("Reset")
  ];

} // end getFiguresCaptionMenuItems

// end figuresCommands.js
