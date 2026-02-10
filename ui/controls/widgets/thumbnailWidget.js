/* controls/widgets/thumbnailWidget.js
   ============================================================
   THUMBNAIL WIDGET
   ============================================================ */

import { CONTROL_CLASSES } from "../shared/constants.js";

export function setThumbnailGridControl(field, label, def, value, info, key, tabId) {

  const options = def.options || [];

  // Full-width wrapper
  const wrap = document.createElement("div");
  wrap.className = "ctrl-thumb-grid-wrap";
  wrap.style.gridColumn = "1 / -1";

  if (def.label) {
    const lbl = document.createElement("div");
    lbl.className = "ctrl-thumb-grid-label";
    lbl.textContent = def.label;
    lbl.style.marginBottom = "4px";
    wrap.appendChild(lbl);
  }

  const grid = document.createElement("div");
  grid.className = "ctrl-thumb-grid";
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(6, 1fr)";
  grid.style.gap = "4px";
  grid.style.width = "100%";

  options.forEach((opt) => {
    const img = document.createElement("img");
    img.src = opt.src || "";
    img.title = opt.label || String(opt.value);
    img.style.width = "100%";
    img.style.aspectRatio = "1 / 1";
    img.style.cursor = "pointer";
    img.style.objectFit = "cover";

    // Selection state
    const isSelected = (String(value) === String(opt.value));
    img.style.border = isSelected ? "2px solid #0d6efd" : "1px solid #ccc"; // Bootstrap primary blue
    if (isSelected) img.style.boxSizing = "border-box";

    img.addEventListener("click", () => {
      // Update value
      info.parameters[key] = opt.value;

      if (typeof info.onParamChange === "function") info.onParamChange();

      // Update UI selection immediately (if no rebuild)
      Array.from(grid.children).forEach(c => {
        c.style.border = "1px solid #ccc";
      });
      img.style.border = "2px solid #0d6efd";

      // Trigger redraw/action
      info.redrawHandler();

      if (def.rebuildControls) {
        const data = buildDrawParameterData(info);
        renderParameterControls(info, data, tabId);
      }
    });

    grid.appendChild(img);
  });

  wrap.appendChild(grid);
  field.appendChild(wrap);

} // end setThumbnailGridControl


