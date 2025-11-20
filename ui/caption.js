/* ============================================================
   captions.js
   ------------------------------------------------------------
   Unified Caption Bar Builder
   ------------------------------------------------------------
   Layout (exact and permanent):
       LEFT:   Title
       RIGHT:  Prev | Next | v(menu)

   Behavior:
     • "v" ALWAYS exists
     • If menuManager reports zero actions → v-button disabled
     • Title remains left-aligned, flexible width
     • Button cluster right-aligned
     • Prev/Next provided by caller (if needed)
     • v-button is created here, but menuManager controls open/close

   Dependencies:
     • menuManager.js (must expose: hasMenuItems(), openMenu())
============================================================ */

import { menuManager } from "./menuManager.js";

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
     }

   Notes:
     • Caption bar is cleared on each call.
     • Buttons only appear if callbacks are provided.
------------------------------------------------------------ */
export function setCaptionBar(config) {
  const { targetId, title, onPrev, onNext, onMenu } = config;

  const el = document.getElementById(targetId);
  if (!el) throw new Error(`setCaptionBar: #${targetId} not found`);

  el.innerHTML = "";
  el.style.display        = "flex";
  el.style.justifyContent = "space-between";
  el.style.alignItems     = "center";

  // Left side: title
  const titleSpan = document.createElement("span");
  titleSpan.className = "caption-title";
  titleSpan.textContent = title || "";
  el.appendChild(titleSpan);

  // Right side: Prev / Next / v
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

  // Menu button (always exists)
  const bMenu = document.createElement("button");
  bMenu.textContent = "v";
  btnRow.appendChild(bMenu);

  // Caller chooses whether menu opens or not
  if (typeof onMenu === "function") {
    bMenu.onclick = (ev) => onMenu(bMenu, ev);
  } else {
    bMenu.disabled = true;
    bMenu.style.opacity = "0.4";
    bMenu.style.cursor = "default";
  }
}
