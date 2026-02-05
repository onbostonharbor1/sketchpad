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

   This version treats “background” as near-white pixels and
   crops to pixels that are NOT near-white.

   Returns BASE64 ONLY (no data: prefix).
=========================================================== */
function buildCanvasThumbnailBase64(sourceCanvas, w, h) {

  // ---- validate inputs ----
  if (!sourceCanvas) throw new Error("buildCanvasThumbnailBase64: sourceCanvas missing");
  if (typeof w !== "number" || w <= 0) throw new Error("buildCanvasThumbnailBase64: invalid w");
  if (typeof h !== "number" || h <= 0) throw new Error("buildCanvasThumbnailBase64: invalid h");

  const sw = sourceCanvas.width;
  const sh = sourceCanvas.height;

  if (typeof sw !== "number" || typeof sh !== "number") {
    throw new Error("buildCanvasThumbnailBase64: sourceCanvas has no width/height");
  }

  // ---- read pixels from source ----
  const scanCanvas = document.createElement("canvas");
  scanCanvas.width = sw;
  scanCanvas.height = sh;

  const scanCtx = scanCanvas.getContext("2d");
  if (!scanCtx) throw new Error("buildCanvasThumbnailBase64: scanCtx null");

  scanCtx.clearRect(0, 0, sw, sh);
  scanCtx.drawImage(sourceCanvas, 0, 0);

  const img = scanCtx.getImageData(0, 0, sw, sh);
  const data = img.data;

  // ---- find bounding box of NON-WHITE-ish pixels ----
  // Treat pixels as background if they are very close to white.
  // If you ever change the background color, adjust these numbers.
  const WHITE_CUTOFF = 245; // 245..255 are "near white"

  let minX = sw, minY = sh, maxX = -1, maxY = -1;

  for (let y = 0; y < sh; y++) {
    const row = y * sw * 4;

    for (let x = 0; x < sw; x++) {
      const i = row + x * 4;

      const r = data[i + 0];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // If truly transparent, ignore it (rare in your current setup)
      if (a === 0) continue;

      // Background test: "near white"
      const isNearWhite = (r >= WHITE_CUTOFF && g >= WHITE_CUTOFF && b >= WHITE_CUTOFF);

      if (!isNearWhite) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  // ---- if nothing found (blank or all-white), fall back to full canvas ----
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

  // ---- add padding (source pixels), clamp to canvas ----
  const pad = 4;
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

  // ---- draw cropped region into crop canvas ----
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;

  const cropCtx = cropCanvas.getContext("2d");
  if (!cropCtx) throw new Error("buildCanvasThumbnailBase64: cropCtx null");

  cropCtx.clearRect(0, 0, cropW, cropH);
  cropCtx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  // ---- scale to final thumb canvas ----
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

