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

  return [
    await makeHelpItem("figures", null),
    await makeNotesItem(null, title),
    later("Show Script"),
    later("Copy"),
    later("Archive"),
    later("Reset")
  ];

} // end getFiguresCaptionMenuItems

// end figuresCommands.js
