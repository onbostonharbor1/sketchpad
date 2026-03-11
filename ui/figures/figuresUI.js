/* figuresUI.js
   ------------------------------------------------------------
   Figures UI: Overlay Buttons in Sidebar
   ------------------------------------------------------------
   NOTE: Button styles defined in wrapper.css
*/

import {
  getActiveOverlays,
  setActiveOverlayIndex,
  moveOverlayToBack,
  getActiveOverlayIndex
}                from "/ui/figuresRunner.js";


/* ============================================================
   initFigureOverlays
   ============================================================ */
export function initFigureOverlays() {
  window.updateFigureOverlayButtons = updateFigureOverlayButtons;
} // end initFigureOverlays


/* ============================================================
   updateFigureOverlayButtons
   ============================================================ */
export function updateFigureOverlayButtons() {

  const sidebar = document.getElementById("figure-sidebar");
  if (!sidebar) return;

  sidebar.innerHTML = "";

  const overlays    = getActiveOverlays();
  const activeIndex = getActiveOverlayIndex();

  overlays.forEach((overlay, index) => {
    const btn = document.createElement("button");
    btn.className  = "figure-overlay-btn";
    btn.textContent = index + 1;

    if (index === activeIndex) btn.classList.add("active");

    btn.onclick = (e) => {
      e.stopPropagation();
      setActiveOverlayIndex(index);
    };

    btn.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      moveOverlayToBack(index);
    };

    const tooltip = document.createElement("div");
    tooltip.className   = "figure-tooltip";
    tooltip.textContent = getParameterDiff(overlay) || "No changes";
    btn.appendChild(tooltip);

    sidebar.appendChild(btn);
  });

} // end updateFigureOverlayButtons


/* ============================================================
   getParameterDiff
   ============================================================ */
function getParameterDiff(overlay) {

  if (!overlay.defaultParams || !overlay.params) return "";

  const diffs = [];
  for (const key in overlay.params) {
    if (JSON.stringify(overlay.params[key]) !== JSON.stringify(overlay.defaultParams[key])) {
      diffs.push(`${key}: ${overlay.params[key]}`);
    }
  }

  return diffs.length > 0 ? "Changes:\n" + diffs.join("\n") : "";

} // end getParameterDiff
