/* patternsMenuCmds.js
   ------------------------------------------------------------
   Patterns Tab — Menu Commands
   ------------------------------------------------------------
   Commands:
     • editPatternItemTitle()
     • addPatternThumbnail()
   ------------------------------------------------------------
*/

import { nodeDispatch } from "./nodeLayer.js";
import { manifest } from "./manifest.js";
import { overlayManager } from "./overlay.js";
import { renderPatternThumbGrid } from "./patterns.js";

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
   addPatternThumbnail()
   ------------------------------------------------------------
   Captures the CURRENT displayed canvas image, scales to 36x36,
   and asks the Node service to write:

     ./patterns/<category>/images/thumb_<filename>.png
=========================================================== */
export async function addPatternThumbnail() {

  const itemInfo = derivePatternsContext();

  if (!itemInfo.item) {
    throw new Error("addPatternThumbnail: no active pattern item");
  }

  if (!window.drawCanvas) {
    throw new Error("addPatternThumbnail: window.drawCanvas missing");
  }

  const pngBase64 = buildCanvasThumbnailBase64(window.drawCanvas, 36, 36);

  const result = await nodeDispatch("writePatternThumbnail", {
    category: itemInfo.category,
    filename: itemInfo.filename,
    pngBase64
  });

  if (!result) {
    throw new Error("addPatternThumbnail: writePatternThumbnail returned nothing");
  }

  if (result.status !== "ok") {
    throw new Error(
      "addPatternThumbnail: writePatternThumbnail failed: " + JSON.stringify(result)
    );
  }

    const patternsMod = await import("./patterns.js");
  await patternsMod.PatternsController.showSelectedPattern(
    itemInfo.category,
    itemInfo.index
  );

  renderPatternThumbGrid(itemInfo.category);

} // end addPatternThumbnail


/* ============================================================
   buildCanvasThumbnailBase64(sourceCanvas, w, h)
   ------------------------------------------------------------
   Returns BASE64 ONLY (no data: prefix).
=========================================================== */
/* ============================================================
   buildCanvasThumbnailBase64(sourceCanvas, w, h)
   ------------------------------------------------------------
   Crops excess whitespace by finding the bounding box of
   non-transparent pixels, then scales the cropped region to
   w x h.

   Returns BASE64 ONLY (no data: prefix).

   Notes:
     - Uses alpha > 0 as "drawn".
     - If canvas is blank, falls back to scaling full canvas.
     - Adds small padding so strokes don't touch the edge.
=========================================================== */
function buildCanvasThumbnailBase64(sourceCanvas, w, h) {

  /* ---- validate inputs ---- */
  if (!sourceCanvas) throw new Error("buildCanvasThumbnailBase64: sourceCanvas missing");
  if (typeof w !== "number" || w <= 0) throw new Error("buildCanvasThumbnailBase64: invalid w");
  if (typeof h !== "number" || h <= 0) throw new Error("buildCanvasThumbnailBase64: invalid h");

  const sw = sourceCanvas.width;
  const sh = sourceCanvas.height;

  if (typeof sw !== "number" || typeof sh !== "number") {
    throw new Error("buildCanvasThumbnailBase64: sourceCanvas has no width/height");
  }

  /* ---- read pixels from source ---- */
  const scanCanvas = document.createElement("canvas");
  scanCanvas.width = sw;
  scanCanvas.height = sh;

  const scanCtx = scanCanvas.getContext("2d");
  if (!scanCtx) throw new Error("buildCanvasThumbnailBase64: scanCtx null");

  scanCtx.clearRect(0, 0, sw, sh);
  scanCtx.drawImage(sourceCanvas, 0, 0);

  const img = scanCtx.getImageData(0, 0, sw, sh);
  const data = img.data;

  /* ---- find bounding box of alpha>0 ---- */
  let minX = sw, minY = sh, maxX = -1, maxY = -1;

  for (let y = 0; y < sh; y++) {
    const row = y * sw * 4;
    for (let x = 0; x < sw; x++) {
      const a = data[row + x * 4 + 3]; // alpha
      if (a !== 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  /* ---- if blank canvas, fall back to full canvas ---- */
  let cropX = 0;
  let cropY = 0;
  let cropW = sw;
  let cropH = sh;

  if (maxX >= 0 && maxY >= 0) {
    cropX = minX;
    cropY = minY;
    cropW = (maxX - minX + 1);
    cropH = (maxY - minY + 1);
  }

  /* ---- add padding (in source pixels), clamp to canvas ---- */
  const pad = 4; // tweak if you want (e.g. 2, 4, 6)
  cropX = cropX - pad;
  cropY = cropY - pad;
  cropW = cropW + pad * 2;
  cropH = cropH + pad * 2;

  if (cropX < 0) { cropW += cropX; cropX = 0; }
  if (cropY < 0) { cropH += cropY; cropY = 0; }
  if (cropX + cropW > sw) cropW = sw - cropX;
  if (cropY + cropH > sh) cropH = sh - cropY;

  if (cropW <= 0 || cropH <= 0) {
    throw new Error("buildCanvasThumbnailBase64: computed invalid crop region");
  }

  /* ---- draw cropped region into a crop canvas ---- */
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;

  const cropCtx = cropCanvas.getContext("2d");
  if (!cropCtx) throw new Error("buildCanvasThumbnailBase64: cropCtx null");

  cropCtx.clearRect(0, 0, cropW, cropH);
  cropCtx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  /* ---- scale cropped region into final thumb canvas ---- */
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;

  const tctx = tmp.getContext("2d");
  if (!tctx) throw new Error("buildCanvasThumbnailBase64: tmp.getContext returned null");

  tctx.clearRect(0, 0, w, h);
  tctx.drawImage(cropCanvas, 0, 0, cropW, cropH, 0, 0, w, h);

  const dataUrl = tmp.toDataURL("image/png");

  const prefix = "data:image/png;base64,";
  if (!dataUrl.startsWith(prefix)) {
    throw new Error("buildCanvasThumbnailBase64: unexpected data URL prefix");
  }

  return dataUrl.slice(prefix.length);

} // end buildCanvasThumbnailBase64


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

  /* ---------------------------------------------------------
     Update the live in-memory item (the one Patterns is using)
     and redraw. Do NOT clear/reload manifest caches here yet.
  --------------------------------------------------------- */
  itemInfo.item.title = newTitle;
  itemInfo.currentTitle = newTitle;

  closeFormsOverlay();

  uiState.patterns.activeCategory = itemInfo.category;
  uiState.patterns.activeItem     = itemInfo.index;

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
