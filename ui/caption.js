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

/* ============================================================
   normalizeCaptionEntry(raw)
   ------------------------------------------------------------
   Purpose:
     Produce a predictable, normalized caption entry object
     regardless of whether the tab provides:
       • title
       • name
       • filename
       • category

   This is purely a convenience function so tabs do not need
   to build their own entry structs in slightly different ways.

   Arguments:
     raw (object) – tab-specific metadata (drawRegistry entry,
                    pattern entry, gallery entry, etc.)

   Returns:
     {
       title:    <string>,
       filename: <string|null>,
       category: <string|null>
     }

   Notes:
     • No tab-specific logic here.
     • Safe for ALL tabs (draw, patterns, gallery, utilities).
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

   This allows each tab to keep its menu logic extremely small.

   Arguments:
     tabName (string) – "draw", "patterns", "gallery", etc.
     context (object) – information needed by menuManager

   Returns:
     function – event handler that calls menuManager.open()

   Notes:
     • MenuManager handles all real menu logic.
     • Caption bar only needs a callback.
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

   Arguments:
     config (object)
       {
         targetId: "caption",
         title: <string>,
         onPrev: <function> (optional),
         onNext: <function> (optional),
         onMenu: <function> (optional)
       }

   Behavior:
     • Ensures old content is removed.
     • Delegates full construction to setCaptionBar().

   Notes:
     • This keeps tabs from directly manipulating the DOM.
     • Helps maintain consistent caption behavior across tabs.
============================================================ */
export function rebuildCaption(config) {
  const el = document.getElementById(config.targetId);
  if (!el) throw new Error(`rebuildCaption: #${config.targetId} not found`);

  el.innerHTML = "";
  setCaptionBar(config);
} // end rebuildCaption
