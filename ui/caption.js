/* ============================================================
   captions.js
   ------------------------------------------------------------
   Unified Caption Bar Builder
   ------------------------------------------------------------
   Layout (exact and permanent):
       LEFT:   Title
       RIGHT:  Prev | Next | v(menu)

   Behavior:
     â€¢ "v" ALWAYS exists
     â€¢ If menuManager reports zero actions â†’ v-button disabled
     â€¢ Title remains left-aligned, flexible width
     â€¢ Button cluster right-aligned
     â€¢ Prev/Next provided by caller (if needed)
     â€¢ v-button is created here, but menuManager controls open/close

   Dependencies:
     â€¢ menuManager.js
     â€¢ nextPrevOverlay.js
============================================================ */

import { menuManager } from "./menuManager.js";
import {
  enableNextPrevOverlay,
  disableNextPrevOverlay
} from "./nextPrevOverlay.js";

/* ------------------------------------------------------------
   setCaptionBar(config)
   ------------------------------------------------------------
   Builds the caption bar.

   Arguments:
     config = {
       targetId:  "caption"      (DOM ID)
       title:     <string>       (title to display)
       onPrev:    <function>     (optional)
       onNext:    <function>     (optional)
       onMenu:    <function>     (optional)
       overlayTargetId: <string> (optional: "text" or
                                 "sketchpad-wrapper")
     }

   Notes:
     â€¢ Caption bar is cleared on each call.
     â€¢ Buttons only appear if callbacks are provided.
     â€¢ This function also controls the Next/Prev click-zone
       overlay automatically.
------------------------------------------------------------ */
export function setCaptionBar(config) {

  const {
    targetId,
    title,
    onPrev,
    onNext,
    onMenu,
    overlayTargetId
  } = config;

  const el = document.getElementById(targetId);
  if (!el) throw new Error(`setCaptionBar: #${targetId} not found`);

  el.innerHTML = "";
  el.style.display        = "flex";
  el.style.justifyContent = "space-between";
  el.style.alignItems     = "center";

  // ----------------------------------------------------------
  // NextPrev overlay (automatic on/off switch)
  // ----------------------------------------------------------
  if (
    typeof onPrev === "function" &&
    typeof onNext === "function" &&
    overlayTargetId
  ) {

    const targetEl = document.getElementById(overlayTargetId);
    if (!targetEl) {
      throw new Error(
        "setCaptionBar: overlayTargetId not found: #" + overlayTargetId
      );
    }

    enableNextPrevOverlay({
      targetEl,
      onPrev,
      onNext
    });

  } else {
    disableNextPrevOverlay();
  }

  // ----------------------------------------------------------
  // Left side: title
  // ----------------------------------------------------------
  const titleSpan = document.createElement("span");
  titleSpan.className = "caption-title";
  titleSpan.textContent = title || "";
  el.appendChild(titleSpan);

  // ----------------------------------------------------------
  // Right side: Prev / Next / v
  // ----------------------------------------------------------
  const btnRow = document.createElement("div");
  btnRow.className = "caption-buttons";
  el.appendChild(btnRow);

  if (typeof onPrev === "function") {
    const bPrev = document.createElement("button");
    bPrev.textContent = "Prev";
    bPrev.onclick = onPrev;
    btnRow.appendChild(bPrev);
  }

  if (typeof onNext === "function") {
    const bNext = document.createElement("button");
    bNext.textContent = "Next";
    bNext.onclick = onNext;
    btnRow.appendChild(bNext);
  }

  // ----------------------------------------------------------
  // Menu button (always exists)
  // ----------------------------------------------------------
  const bMenu = document.createElement("button");
  bMenu.textContent = "v";
  btnRow.appendChild(bMenu);

  if (typeof onMenu === "function") {
    bMenu.onclick = (ev) => onMenu(bMenu, ev);
  } else {
    bMenu.disabled = true;
    bMenu.style.opacity = "0.4";
    bMenu.style.cursor = "default";
  }

} // end setCaptionBar


/* ============================================================
   normalizeCaptionEntry(raw)
   ------------------------------------------------------------
   Purpose:
     Produce a predictable, normalized caption entry object
     regardless of whether the tab provides:
       â€¢ title
       â€¢ name
       â€¢ filename
       â€¢ category

   Arguments:
     raw (object) â€“ tab-specific metadata

   Returns:
     {
       title:    <string>,
       filename: <string|null>,
       category: <string|null>
     }
============================================================ */
export function normalizeCaptionEntry(raw = {}) {
  return {
    title: raw.title || raw.name || "(untitled)",
    filename: raw.filename || null,
    category: raw.category || null
  };
} // end normalizeCaptionEntry


/* ============================================================
   buildMenuHandler(tabName, context)
   ------------------------------------------------------------
   Purpose:
     Construct a safe onMenu handler for setCaptionBar that uses
     menuManager.open(tabName, context).
============================================================ */
export function buildMenuHandler(tabName, context = {}) {
  return function onMenuClick(btn, ev) {
    menuManager.open(tabName, context);
  };
} // end buildMenuHandler


/* ============================================================
   rebuildCaption(config)
   ------------------------------------------------------------
   Purpose:
     Clear the target caption element and rebuild it via
     setCaptionBar(config) in one call.
============================================================ */
export function rebuildCaption(config) {
  const el = document.getElementById(config.targetId);
  if (!el) throw new Error(`rebuildCaption: #${config.targetId} not found`);

  el.innerHTML = "";
  setCaptionBar(config);
} // end rebuildCaption
