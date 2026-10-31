/* ===========================================================
   thumbnails.js
   -----------------------------------------------------------
   Thumbnail grids (draw, mark the selected one) and making a cropped canvas thumbnail.
   =========================================================== */

export function markSelectedThumbnail(actionDivId, selectedIndex) {
  const panel = document.getElementById(actionDivId);
  if (!panel) throw new Error("markSelectedThumbnail: panel not found: " + actionDivId);

  const thumbs = panel.querySelectorAll("img.thumb-image");
  if (!thumbs.length) throw new Error("markSelectedThumbnail: no .thumb-image found in " + actionDivId);

  thumbs.forEach((img, i) => {
    if (i === selectedIndex) img.classList.add("thumb-selected");
    else img.classList.remove("thumb-selected");
  });
} // end markSelectedThumbnail


export function renderThumbnailGrid(targetId, items, buildSrc, onClick) {
  const target = document.getElementById(targetId);
  if (!target)
    throw new Error("renderThumbnailGrid: targetId not found: " + targetId);

  if (!Array.isArray(items))
    throw new Error("renderThumbnailGrid: items must be an array");

  if (typeof buildSrc !== "function")
    throw new Error("renderThumbnailGrid: buildSrc must be a function");

  if (typeof onClick !== "function")
    throw new Error("renderThumbnailGrid: onClick must be a function");

  target.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "thumb-panel";

  items.forEach((item, idx) => {
    const box = document.createElement("div");
    box.className = "thumb-box";

    const img = document.createElement("img");
    img.className = "thumb-image";
    img.alt = item.title || item.filename;
    img.src = buildSrc(item, idx);

    img.addEventListener("click", () => onClick(item, idx));

    box.appendChild(img);
    panel.appendChild(box);
  });

  target.appendChild(panel);
}

/* ============================================================
   buildCanvasThumbnailBase64(sourceCanvas, w, h)
   ------------------------------------------------------------
   Crops excess whitespace and scales the result to fit within
   w x h while MAINTAINING ASPECT RATIO.

   Returns BASE64 ONLY (no data: prefix).
=========================================================== */
export function buildCanvasThumbnailBase64(sourceCanvas, w, h) {
  if (!sourceCanvas) throw new Error("buildCanvasThumbnailBase64: sourceCanvas missing");

  const sw = sourceCanvas.width;
  const sh = sourceCanvas.height;

  // 1. Scan for bounding box of non-white pixels
  const scanCanvas = document.createElement("canvas");
  scanCanvas.width = sw;
  scanCanvas.height = sh;
  const scanCtx = scanCanvas.getContext("2d");
  scanCtx.drawImage(sourceCanvas, 0, 0);

  const data = scanCtx.getImageData(0, 0, sw, sh).data;
  const WHITE_CUTOFF = 245;

  let minX = sw, minY = sh, maxX = -1, maxY = -1;

  for (let y = 0; y < sh; y++) {
    const row = y * sw * 4;
    for (let x = 0; x < sw; x++) {
      const i = row + x * 4;
      if (data[i + 3] === 0) continue; // skip transparent
      const isNearWhite = (data[i] >= WHITE_CUTOFF && data[i+1] >= WHITE_CUTOFF && data[i+2] >= WHITE_CUTOFF);

      if (!isNearWhite) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Fallback if blank
  let cropX = 0, cropY = 0, cropW = sw, cropH = sh;
  if (maxX >= 0 && maxY >= 0) {
    const pad = 4;
    cropX = Math.max(0, minX - pad);
    cropY = Math.max(0, minY - pad);
    cropW = Math.min(sw - cropX, (maxX - minX + 1) + pad * 2);
    cropH = Math.min(sh - cropY, (maxY - minY + 1) + pad * 2);
  }

  // 2. Calculate Aspect Ratio Scaling
  // Scale defines how much we shrink the crop to fit the target thumb
  const scale = Math.min(w / cropW, h / cropH);
  const finalW = cropW * scale;
  const finalH = cropH * scale;

  // 3. Center the result in the w x h thumbnail
  const offsetX = (w - finalW) / 2;
  const offsetY = (h - finalH) / 2;

  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = w;
  thumbCanvas.height = h;
  const tctx = thumbCanvas.getContext("2d");

  // Fill background with white (optional, ensures consistency)
  tctx.fillStyle = "white";
  tctx.fillRect(0, 0, w, h);

  // Draw scaled and centered
  tctx.drawImage(
    sourceCanvas,
    cropX, cropY, cropW, cropH, // Source region
    offsetX, offsetY, finalW, finalH // Destination region
  );

  const dataUrl = thumbCanvas.toDataURL("image/png");
  return dataUrl.split(",")[1];
} // end buildCanvasThumbnailBase64
