/* galleryMenuCmds.js
   ------------------------------------------------------------
   Gallery Tab — Menu Commands (Scripts only)
   ------------------------------------------------------------
   Commands:
     • editGalleryScriptTitle()
   ------------------------------------------------------------
*/

import { nodeDispatch } from "./nodeLayer.js";
import { overlayManager } from "./overlay.js";
import { updateGalleryCaption } from "./gallery.js";

/* ============================================================
   editGalleryScriptTitle()
=========================================================== */
export async function editGalleryScriptTitle() {

  const itemInfo = deriveGalleryScriptsContext();

  if (!itemInfo.item) {
    throw new Error("editGalleryScriptTitle: no active Scripts item");
  }

  openEditTitleOverlay(itemInfo);

} // end editGalleryScriptTitle


/* ============================================================
   deriveGalleryScriptsContext()
=========================================================== */
function deriveGalleryScriptsContext() {

  if (!window.uiState) {
    throw new Error("deriveGalleryScriptsContext: window.uiState missing");
  }

  if (!uiState.gallery || !uiState.gallery.saved) {
    throw new Error("deriveGalleryScriptsContext: uiState.gallery missing");
  }

  if (uiState.gallery.saved.domain !== "Scripts") {
    return {
      index: null,
      item: null,
      filename: null,
      manifestPath: null,
      currentTitle: ""
    };
  }

  const index = uiState.gallery.saved.index;
  if (typeof index !== "number") {
    throw new Error("deriveGalleryScriptsContext: saved.index missing/invalid");
  }

  const item = uiState.gallery.activeItem;
  if (!item) {
    throw new Error("deriveGalleryScriptsContext: activeItem missing");
  }

  const filename = item.filename;
  if (!filename) {
    throw new Error("deriveGalleryScriptsContext: item.filename missing");
  }

  return {
    index,
    item,
    filename,
    manifestPath: "/gallery/Scripts/manifest.json",
    currentTitle: item.title || ""
  };

} // end deriveGalleryScriptsContext


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
        "<button id='editTitleApply'>OK</button>" +
        "<button id='editTitleCancel'>Cancel</button>" +
      "</div>" +
    "</div>";

  overlayManager.show("forms", html);

  const input = document.getElementById("editTitleInput");
  if (!input) throw new Error("openEditTitleOverlay: editTitleInput missing");

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
  if (!input) throw new Error("applyEditTitle: editTitleInput missing");

  const newTitle = String(input.value);
  const oldTitle = itemInfo.currentTitle || "";

  if (newTitle === oldTitle) {
    closeFormsOverlay();
    return;
  }

  const result = await nodeDispatch("editPackageScript", {
    manifestPath: itemInfo.manifestPath,
    filename: itemInfo.filename,
    title: newTitle
  });

  if (!result) {
    throw new Error("applyEditTitle: editPackageScript returned nothing");
  }

  if (result.status !== "ok") {
    throw new Error(
      "applyEditTitle: editPackageScript failed: " + JSON.stringify(result)
    );
  }

  // Update in-memory item
  itemInfo.item.title = newTitle;
  itemInfo.currentTitle = newTitle;

  closeFormsOverlay();

  // Patterns-style: rebuild caption directly, no navigation hacks
  updateGalleryCaption("Scripts");

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

// end galleryMenuCmds.js
