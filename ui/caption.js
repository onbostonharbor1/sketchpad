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
  const { targetId, title, onPrev, onNext } = config;

  const el = document.getElementById(targetId);
  if (!el) throw new Error(`setCaptionBar: #${targetId} not found`);

  /* Clear current content */
  el.innerHTML = "";
  el.style.display = "flex";
  el.style.flexDirection = "row";
  el.style.justifyContent = "space-between";
  el.style.alignItems = "center";
  el.style.gap = "8px";

  /* ----------------------------------------------------------
     LEFT: TITLE
  ---------------------------------------------------------- */
  const titleSpan = document.createElement("span");
  titleSpan.className = "caption-title";
  titleSpan.textContent = title || "";
  titleSpan.style.flex = "1 1 auto";
  el.appendChild(titleSpan);

  /* ----------------------------------------------------------
     RIGHT: BUTTON CLUSTER (Prev → Next → v)
  ---------------------------------------------------------- */
  const btnRow = document.createElement("div");
  btnRow.className = "caption-buttons";
  btnRow.style.display = "flex";
  btnRow.style.flexDirection = "row";
  btnRow.style.gap = "6px";

  /* Prev button */
  if (typeof onPrev === "function") {
    const bPrev = document.createElement("button");
    bPrev.textContent = "Prev";
    bPrev.addEventListener("click", onPrev);
    btnRow.appendChild(bPrev);
  }

  /* Next button */
  if (typeof onNext === "function") {
    const bNext = document.createElement("button");
    bNext.textContent = "Next";
    bNext.addEventListener("click", onNext);
    btnRow.appendChild(bNext);
  }

  /* ----------------------------------------------------------
     MENU BUTTON  ("v" — always present)
  ---------------------------------------------------------- */
  const bMenu = document.createElement("button");
  bMenu.textContent = "v";
  bMenu.style.minWidth = "28px";

  /* Determine if this tab has menu actions */
  const hasMenu = menuManager.hasMenuItems();

  if (!hasMenu) {
    /* Disable visually and functionally */
    bMenu.disabled = true;
    bMenu.style.opacity = "0.4";
    bMenu.style.cursor = "default";
  } else {
    /* Normal behavior */
    bMenu.disabled = false;
    bMenu.style.opacity = "1.0";
    bMenu.style.cursor = "pointer";
    bMenu.addEventListener("click", () => menuManager.open());
  }

  btnRow.appendChild(bMenu);

  /* Attach right cluster */
  el.appendChild(btnRow);
} // end setCaptionBar
