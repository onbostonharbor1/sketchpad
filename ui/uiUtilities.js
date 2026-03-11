import { overlayManager }      from "./overlay.js";
import { canvasLayerManager } from "./canvasLayerManager.js";
import { manifest } from "./manifest.js";
import { uiState } from "/ui/uiState.js";

/* ------------------------------------------------------------
   clearDivs(args="")
   Empties the core divs shared by all tabs.

   Arguments:
     args - optional string id of an extra div to clear in addition
------------------------------------------------------------ */
function clearDivs(args = "") {
    // 1. Clear standard regions
    let ids = ["action", "caption", "text", "sketchpad"];
    if (args !== "") {
        ids.push(args);
    }

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = "";
            el.style.display = "";
        }
    });

    // 1b. Hide/Clear Layout-specific Elements
    const sidebar = document.getElementById("figure-sidebar");
    if (sidebar) {
        sidebar.innerHTML = "";
        sidebar.style.display = "none";
    }

    const ifc = document.getElementById("interface-controls");
    if (ifc) {
        ifc.innerHTML = "";
        // CSS :empty rule handles display:none, or we can force it:
        // ifc.style.display = "none";
    }

    // Hide sketchpad wrapper by default (tabs must explicitly show it)
    const wrapper = document.getElementById("sketchpad-wrapper");
    if (wrapper) wrapper.style.display = "none";

    // 2. Clear canvas overlay layers (pixels + HTML)
    canvasLayerManager.clearAll();

    // 3. Clear main canvas pixels (prevent ghosting)
    const canvas = window.drawCanvas;
    if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    // 4. Disarm interactor
    if (window.disarmInteractor) {
        window.disarmInteractor();
    }
} // end clearDivs


/**
 * Global Sync: Wipes the manifest cache and sets needsUpdate for all tabs.
 * * This is the "Passive" partner to the Node "Active" rebuild.
 */
export async function syncSystemStateAfterRebuild() {
  // 1. Wipe the central ManifestManager memory singleton
  manifest.clearCache();

  // 2. Mark 'needsUpdate' for all tabs.
  // This ensures setUI.js runs init() with restored=true on next visit.
  const allTabs = ["home", "draw", "patterns", "gallery", "utilities", "figures"];
  allTabs.forEach(key => {
    if (uiState[key]) {
      uiState[key].needsUpdate = true;
    }
  });

} // end syncSystemStateAfterRebuild

/**
 * MASTER REBUILD:
 * 1. Wipes stale cache.
 * 2. Parallel re-fetch of ALL manifests from disk.
 * 3. Resets Home module variables.
 * 4. Resets all tab 'saved' states to force Cold Start.
 */
export async function rebuildAllSystemCaches() {
  // 1. Wipe memory
  manifest.clearCache();

  // 2. Proactive Fetch (The "Immaterial Time" parallel approach)
  const paths = [
    "home",
    "patterns",
    "gallery/Ideabook",
    "gallery/Patterns",
    "gallery/Scripts",
    "utilities/Tools",
    "utilities/Lab"
  ];

  // Fire all requests at once
  await Promise.all(paths.map(p => manifest.get(p)));

  // 3. Clear Home's private grouping logic (Dynamic Import)
  try {
    const homeMod = await import("/ui/home/home.js");
    if (homeMod && typeof homeMod.clearHomeLocalState === "function") {
      homeMod.clearHomeLocalState();
    }
  } catch (err) {
    console.warn("rebuildAllSystemCaches: Home state reset skipped", err);
  }

  // 4. Delete 'saved' states for all tabs
  const tabKeys = ["home", "patterns", "gallery", "utilities", "figures"];
  tabKeys.forEach(key => {
    if (uiState[key]) delete uiState[key].saved;
  });
} // end rebuildAllSystemCaches


/**
 * Set the Commands button label for the active top-level tab.
 *
 * Assumptions (fail-fast):
 * - #commandsButton exists in the DOM
 * - caller supplies a non-empty string
 *
 * @param {string} label - Full label text (e.g. "Draw Commands")
 */
export function setCommandsButtonLabel(label) {
  if (!label) {
    throw new Error("setCommandsButtonLabel: label is required");
  }

  const btn = document.getElementById("commandsButton");
  if (!btn) {
    throw new Error("setCommandsButtonLabel: #commandsButton not found");
  }

  btn.textContent = label;
} // end setCommandsButtonLabel



////////////////////////////////////////////////////////////////
// clearOverlaysForTabSwitch()
////////////////////////////////////////////////////////////////
function clearOverlaysForTabSwitch() {
  document.getElementById("overlayContainer").style.display = "none";
  overlayManager.clearAll();
} // end clearOverlaysForTabSwitch

export {
  clearDivs,
  clearOverlaysForTabSwitch
};



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
   buildCategoryDescriptor
   ------------------------------------------------------------
   Re-exported from categories.js for backward compatibility.

   This function has been moved to categories.js where it
   belongs (it builds descriptors for renderCategories).

   New code should import directly from categories.js:
     import { buildCategoryDescriptor } from "./categories.js"

   This re-export maintains compatibility with existing code.
============================================================ */
export { buildCategoryDescriptor } from "./categories.js";


/*************************************************************
   setCommandsButtonHandler(onClick)
   -----------------------------------------------------------
   Replaces the Commands button click handler deterministically.
*************************************************************/
export function setCommandsButtonHandler(onClick) {

  const btn = document.getElementById("commandsButton");
  if (!btn) throw new Error("setCommandsButtonHandler: #commandsButton not found");

  if (typeof onClick !== "function") {
    throw new Error("setCommandsButtonHandler: onClick must be a function");
  }

  // Deterministic: overwrite any previous handler.
  btn.onclick = onClick;

} // end setCommandsButtonHandler


/*************************************************************
   showCommandsOffcanvas({ title, buildBody })
   -----------------------------------------------------------
   Uses the permanent offcanvas shell (#offcanvasPanel).
   Dynamically populates the body and shows it.
*************************************************************/
/* ============================================================
   showOffcanvas({ title, buildBody?, bodyHtml? })
   ============================================================
   Unified offcanvas display function. Accepts either:

     buildBody (function) — called with the body element,
       used when the caller needs to wire event handlers after
       inserting HTML (Commands panels).

     bodyHtml (string) — injected directly as innerHTML,
       used for simple content display (thumbnails, scripts).

   Exactly one of buildBody or bodyHtml must be provided.
   ============================================================ */
export function showOffcanvas({ title, buildBody, bodyHtml }) {

  const panel = document.getElementById("offcanvasPanel");
  if (!panel) throw new Error("showOffcanvas: #offcanvasPanel not found");

  const titleEl = panel.querySelector(".offcanvas-title");
  if (!titleEl) throw new Error("showOffcanvas: .offcanvas-title not found");

  const bodyEl = panel.querySelector(".offcanvas-body");
  if (!bodyEl) throw new Error("showOffcanvas: .offcanvas-body not found");

  if (!buildBody && !bodyHtml && bodyHtml !== "") {
    throw new Error("showOffcanvas: either buildBody or bodyHtml is required");
  }

  titleEl.textContent = title || "";
  bodyEl.innerHTML = "";

  if (typeof buildBody === "function") {
    buildBody(bodyEl);
  } else {
    bodyEl.innerHTML = bodyHtml || "";
  }

  if (!window.bootstrap || !window.bootstrap.Offcanvas) {
    throw new Error("showOffcanvas: Bootstrap Offcanvas not available on window.bootstrap");
  }

  const oc = window.bootstrap.Offcanvas.getOrCreateInstance(panel);
  oc.show();

} // end showOffcanvas


/* ============================================================
   Backward-compatibility aliases
   ============================================================
   showCommandsOffcanvas and showOffcanvasPanel both delegate
   to showOffcanvas. Callers can migrate at their own pace.
   ============================================================ */
export function showCommandsOffcanvas({ title, buildBody }) {
  return showOffcanvas({ title, buildBody });
}

export function showOffcanvasPanel({ title, bodyHtml }) {
  return showOffcanvas({ title, bodyHtml });
}


/* ===========================================================
   setCommandsButton(label, onClick)
=========================================================== */
export function setCommandsButton(label, onClick) {

  const btn = document.getElementById("commandsButton");
  if (!btn) throw new Error("setCommandsButton: #commandsButton not found");

  btn.textContent = label || "Commands";

  // Deterministic: remove prior handler by cloning the node.
  const fresh = btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh, btn);

  fresh.addEventListener("click", () => {
    if (!onClick) throw new Error("setCommandsButton: onClick missing");
    onClick();
  });

} // end setCommandsButton



export function formatRebuildReportShared(report) {

  if (!report) throw new Error("formatRebuildReportShared: report missing");

  if (report.request !== "manifestMaintenance") {
    throw new Error("formatRebuildReportShared: unexpected request: " + String(report.request));
  }

  const lines = [];

  lines.push("Log: " + (report.logName || "(none)"));
  lines.push("");

  // ----------------------------------------------------------
  // Writes summary
  // ----------------------------------------------------------
  const manifestsWritten = Array.isArray(report.manifestsWritten)
    ? report.manifestsWritten
    : [];

  const homeWritten = !!report.homeWritten;

  lines.push("Writes:");
  lines.push("  Manifests written: " + manifestsWritten.length);
  lines.push("  Home manifest written: " + (homeWritten ? "yes" : "no"));
  lines.push("");

  // ----------------------------------------------------------
  // ADDED files (the part you actually care about)
  // ----------------------------------------------------------
  const addedFiles = Array.isArray(report.addedFiles) ? report.addedFiles : [];

  if (addedFiles.length) {
    lines.push("Added files:");
    for (const p of addedFiles) {
      lines.push("- " + p);
    }
    lines.push("");
  }

  // ----------------------------------------------------------
  // BROKEN items (optional)
  // ----------------------------------------------------------
  const brokenFiles = Array.isArray(report.brokenFiles) ? report.brokenFiles : [];

  if (brokenFiles.length) {
    lines.push("Broken files:");
    for (const p of brokenFiles) {
      lines.push("- " + p);
    }
    lines.push("");
  }

  // ----------------------------------------------------------
  // Nothing happened
  // ----------------------------------------------------------
  if (!manifestsWritten.length && !homeWritten && !addedFiles.length && !brokenFiles.length) {
    lines.push("No Added or Broken items.");
  }

  return lines.join("\n");

} // end formatRebuildReportShared


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

/* syncOverlayToCanvas has moved to canvasLayerManager.js as syncLayerToCanvas().
   Re-exported here for backward compatibility. */
export { syncLayerToCanvas as syncOverlayToCanvas } from "./canvasLayerManager.js";

export function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
} // end escapeHtml
