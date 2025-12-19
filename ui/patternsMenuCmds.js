/* patternsMenuCmds.js
   ------------------------------------------------------------
   Patterns Tab — Menu Commands
   ------------------------------------------------------------
   First command:
     • editPatternItemTitle()
   ------------------------------------------------------------
*/

import { nodeDispatch } from "./nodeLayer.js";
import { manifest } from "./manifest.js";
import { overlayManager } from "./overlay.js";

/* ============================================================
   editPatternItemTitle()
=========================================================== */
export async function editPatternItemTitle() {

  const itemInfo = derivePatternsContext();

  if (!itemInfo.item) {
    throw new Error("editPatternItemTitle: no active pattern item");
  }

  openEditTitleOverlay(itemInfo);

} // end editPatternItemTitle


/* ============================================================
   derivePatternsContext()
=========================================================== */
function derivePatternsContext() {

  if (!window.uiState) {
    throw new Error("derivePatternsContext: window.uiState missing");
  }

  const category = uiState.patterns.activeCategory;
  const index    = uiState.patterns.activeItem;

  if (!category || typeof index !== "number") {
    return {
      category: null,
      index: null,
      item: null,
      filename: null,
      manifestPath: null,
      currentTitle: ""
    };
  }

  const cache = manifest.cache.patterns;
  if (!cache) {
    throw new Error("derivePatternsContext: manifest.cache.patterns missing");
  }

  const list = cache[category];
  if (!Array.isArray(list)) {
    throw new Error("derivePatternsContext: category not found: " + category);
  }

  const item = list[index];
  if (!item) {
    throw new Error("derivePatternsContext: item not found");
  }

  const filename = item.filename;
  if (!filename) {
    throw new Error("derivePatternsContext: filename missing");
  }

  return {
    category,
    index,
    item,
    filename,
    manifestPath: "/patterns/" + category + "/manifest.json",
    currentTitle: item.title || ""
  };

} // end derivePatternsContext


/* ============================================================
   openEditTitleOverlay(itemInfo)
=========================================================== */
function openEditTitleOverlay(itemInfo) {

  const container = document.getElementById("overlayContainer");
  if (!container) throw new Error("openEditTitleOverlay: overlayContainer missing");

  const titleEl = document.getElementById("overlayTitle");
  if (!titleEl) throw new Error("openEditTitleOverlay: overlayTitle missing");

  container.style.display = "block";
  titleEl.textContent = "Edit Manifest Title";

  const html =
    "<div class='overlayForm'>" +
      "<div class='ctrl-field'>" +
        "<label class='ctrl-label'>Title:</label>" +
        "<input id='editTitleInput' class='ctrl-text' type='text' />" +
      "</div>" +
      "<div style='margin-top:10px; display:flex; gap:10px;'>" +
        "<button id='editTitleApply'>Apply</button>" +
        "<button id='editTitleCancel'>Cancel</button>" +
      "</div>" +
    "</div>";

  overlayManager.show("forms", html);

  const input = document.getElementById("editTitleInput");
  input.value = itemInfo.currentTitle || "";
  input.focus();

  document.getElementById("editTitleApply").onclick = async () => {
    await applyEditTitle(itemInfo);
  };

  document.getElementById("editTitleCancel").onclick = () => {
    closeFormsOverlay();
  };

  input.addEventListener("keydown", async (ev) => {
    if (ev.key === "Enter") {
      await applyEditTitle(itemInfo);
    }
  });

} // end openEditTitleOverlay


/* ============================================================
   applyEditTitle(itemInfo)
=========================================================== */
async function applyEditTitle(itemInfo) {

  const input = document.getElementById("editTitleInput");
  const newTitle = String(input.value);
  const oldTitle = itemInfo.currentTitle || "";

  if (newTitle === oldTitle) {
    closeFormsOverlay();
    return;
  }
alert("stop here");
//  await nodeDispatch("editPackageScript", {
//    manifestPath: itemInfo.manifestPath,
//    filename: itemInfo.filename,
//    title: newTitle
//  });

  closeFormsOverlay();

  manifest.cache.patterns = null;

  const patternsMod = await import("./patterns.js");
  await patternsMod.PatternsController.showSelectedPattern(
    itemInfo.category,
    itemInfo.index
  );

} // end applyEditTitle


/* ============================================================
   closeFormsOverlay()
=========================================================== */
function closeFormsOverlay() {

  const container = document.getElementById("overlayContainer");
  if (!container) throw new Error("closeFormsOverlay: overlayContainer missing");

  overlayManager.clearLayer("forms");
  container.style.display = "none";

} // end closeFormsOverlay

// end patternsMenuCmds.js
