import { overlayManager } from "./overlay.js";
import { manifest } from "./manifest.js";
import { uiState } from "./uiState.js";

/* ------------------------------------------------------------
   clearDivs(args="")
   Empties the core divs shared by all tabs.

   Arguments:
     args â€“ optional string id of an extra div to clear in addition
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
            // Reset inline display style to allow CSS to control visibility
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
    for (const name in overlayManager.canvasLayers) {
        const layer = overlayManager.canvasLayers[name];

        // Clear HTML elements
        layer.innerHTML = "";

        // Clear canvas pixels
        const ctx = layer.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, layer.width, layer.height);
        }
    }

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
    const homeMod = await import("./home.js");
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

/* ------------------------------------------------------------
   showOffcanvas(title, text)
   Displays text in the existing #offcanvasPanel.
   Used for viewing script source.
------------------------------------------------------------ */
function showOffcanvas(title, text) {
  const panel = document.getElementById("offcanvasPanel");
  const hdr = panel.querySelector(".offcanvas-title");
  const body = panel.querySelector(".offcanvas-body");

  hdr.textContent = title;

  const pre = document.createElement("pre");
  pre.style.whiteSpace = "pre-wrap";
  pre.textContent = text;

  body.innerHTML = "";
  body.appendChild(pre);

  const off = bootstrap.Offcanvas.getOrCreateInstance(panel);
  off.show();
} // end showOffcanvas


/* ------------------------------------------------------------
   initOffcanvasHandler()
   Initializes the shared offcanvas panel used by Gallery
   and Utility tabs. Creates or reuses Bootstrap instance.
------------------------------------------------------------ */
function initOffcanvasHandler() {
  const panel = document.getElementById("offcanvasPanel");
  if (!panel) {
    console.warn("initOffcanvasHandler: #offcanvasPanel not found");
    return;
  }

  // initialize Bootstrap offcanvas once
  const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(panel);

  // close button already uses data-bs-dismiss="offcanvas"
  // this ensures Esc key and backdrop click also work
  panel.addEventListener("hidden.bs.offcanvas", () => {
    console.log("Offcanvas closed");
  });

  // optional: expose global reference
  window.sharedOffcanvas = offcanvas;
} // end initOffcanvasHandler

/* ------------------------------------------------------------
   showSharedOffcanvas(title, text)
   ------------------------------------------------------------
   Displays text (e.g., script source, manifest entry, or notes)
   inside the shared offcanvas panel. Used by multiple tabs.
------------------------------------------------------------ */
function showSharedOffcanvas(title, text) {
  const panel = document.getElementById("offcanvasPanel");
  if (!panel) throw new Error("showSharedOffcanvas: #offcanvasPanel not found");

  const titleEl = panel.querySelector(".offcanvas-title");
  const body = panel.querySelector(".offcanvas-body");
  if (!titleEl || !body) return;

  titleEl.textContent = title || "(untitled)";
  body.innerHTML = `<pre style="white-space:pre-wrap;">${
    text || "(empty)"
  }</pre>`;

  try {
    const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(panel);
    offcanvas.show();
  } catch (err) {
    panel.classList.add("show");
    panel.style.visibility = "visible";
    panel.style.opacity = "1";
  }
} // end showSharedOffcanvas

function wrapIndex(i, len) {
  return (i + len) % len;
} // end wrapIndex


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
  clearOverlaysForTabSwitch,
  showOffcanvas,
  initOffcanvasHandler,
  showSharedOffcanvas,
  wrapIndex
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
  const startTime = performance.now();
  console.time('renderThumbnailGrid (DOM creation)');
  
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

  // Track image loading
  let loadedCount = 0;
  const totalImages = items.length;
  const imageLoadStart = performance.now();

  items.forEach((item, idx) => {
    const box = document.createElement("div");
    box.className = "thumb-box";

    const img = document.createElement("img");
    img.className = "thumb-image";
    img.alt = item.title || item.filename;
    img.src = buildSrc(item, idx);

    // Measure actual image loading time
    img.addEventListener("load", () => {
      loadedCount++;
      if (loadedCount === 1) {
        const firstImageTime = performance.now() - imageLoadStart;
        console.log(`  └─ First image loaded in ${firstImageTime.toFixed(1)}ms`);
      }
      if (loadedCount === totalImages) {
        const allImagesTime = performance.now() - imageLoadStart;
        console.log(`  └─ All ${totalImages} images loaded in ${allImagesTime.toFixed(1)}ms`);
        const totalTime = performance.now() - startTime;
        console.log(`  └─ Total time (DOM + images): ${totalTime.toFixed(1)}ms`);
      }
    });

    img.addEventListener("error", () => {
      console.warn(`  └─ Failed to load image: ${img.src}`);
      loadedCount++;
    });

    img.addEventListener("click", () => onClick(item, idx));

    box.appendChild(img);
    panel.appendChild(box);
  });

  target.appendChild(panel);
  
  console.timeEnd('renderThumbnailGrid (DOM creation)');
  console.log(`  └─ ${items.length} thumbnail DOM elements created`);
  console.log(`  └─ Waiting for images to load...`);
}

export function buildCategoryDescriptor(groups, itemLabelFn, onClickFn) {
  return Object.keys(groups).sort().map(category => {
    const list = groups[category] || [];
    const sorted = [...list].sort(itemLabelFn);

    return {
      title: category,
      items: sorted.map((entry, idx) => ({
        name: itemLabelFn(entry),
        hasSubitems: false,
        onClick: () => onClickFn(category, sorted, entry, idx)
      }))
    };
  });
}


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
export function showCommandsOffcanvas({ title, buildBody }) {

  const panel = document.getElementById("offcanvasPanel");
  if (!panel) throw new Error("showCommandsOffcanvas: #offcanvasPanel not found");

  const titleEl = panel.querySelector(".offcanvas-title");
  if (!titleEl) throw new Error("showCommandsOffcanvas: .offcanvas-title not found");

  const bodyEl = panel.querySelector(".offcanvas-body");
  if (!bodyEl) throw new Error("showCommandsOffcanvas: .offcanvas-body not found");

  if (typeof buildBody !== "function") {
    throw new Error("showCommandsOffcanvas: buildBody must be a function");
  }

  titleEl.textContent = title || "Commands";

  bodyEl.innerHTML = "";
  buildBody(bodyEl);

  if (!window.bootstrap || !window.bootstrap.Offcanvas) {
    throw new Error("showCommandsOffcanvas: Bootstrap Offcanvas not available on window.bootstrap");
  }

  const oc = window.bootstrap.Offcanvas.getOrCreateInstance(panel);
  oc.show();

} // end showCommandsOffcanvas

/* ===========================================================
   Commands button wiring + Offcanvas helper
=========================================================== */

export function setCommandsButton(label, onClick) {

  const btn = document.getElementById("commandsButton");
  if (!btn) throw new Error("setCommandsButton: #commandsButton not found");

  btn.textContent = label || "Commands";

  // fail-fast: remove prior handler cleanly by cloning
  const fresh = btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh, btn);

  fresh.addEventListener("click", () => {
    if (!onClick) throw new Error("setCommandsButton: onClick missing");
    onClick();
  });

} // end setCommandsButton


export function showOffcanvasPanel({ title, bodyHtml }) {

  const panel = document.getElementById("offcanvasPanel");
  if (!panel) throw new Error("showOffcanvasPanel: #offcanvasPanel not found");

  const titleEl = panel.querySelector(".offcanvas-title");
  const bodyEl  = panel.querySelector(".offcanvas-body");

  if (!titleEl) throw new Error("showOffcanvasPanel: .offcanvas-title not found");
  if (!bodyEl)  throw new Error("showOffcanvasPanel: .offcanvas-body not found");

  titleEl.textContent = title || "";
  bodyEl.innerHTML = bodyHtml || "";

  // Bootstrap is already loaded (bundle). Fail-fast if not.
  const oc = bootstrap.Offcanvas.getOrCreateInstance(panel);
  oc.show();

} // end showOffcanvasPanel



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
      lines.push("â€¢ " + p);
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
      lines.push("â€¢ " + p);
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

export function syncOverlayToCanvas(layerName, referenceCanvas) {
  const layer = overlayManager.getCanvasLayer(layerName);
  if (!layer) return;

  layer.innerHTML = ""; // Clear old contents
  layer.style.position = "absolute";
  layer.style.left = "0px";
  layer.style.top = "0px";
  layer.style.width = referenceCanvas.width + "px";
  layer.style.height = referenceCanvas.height + "px";
  layer.style.pointerEvents = "none";
  layer.style.display = "block";
}

export function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
} // end escapeHtml

/* ============================================================
   escapeAttr(text)
   ------------------------------------------------------------
   Escape text for safe use in HTML attributes
============================================================ */
export function escapeAttr(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
} // end escapeAttr


/* ============================================================
   DIALOG UTILITIES
   ============================================================
   Simple, reusable dialog helpers using the overlay system.
============================================================ */

/* ============================================================
   openInputDialog(title, label, defaultValue)
   ------------------------------------------------------------
   Simple input dialog - returns a Promise that resolves with
   the input value (or null if cancelled).
   
   Usage:
     const name = await openInputDialog(
       "Save Secondary Object",
       "Name for this variation:",
       ""
     );
     if (name) { ... }
============================================================ */
export function openInputDialog(title, label, defaultValue = "") {
  
  return new Promise((resolve) => {
    
    const container = document.getElementById("overlayContainer");
    if (!container) throw new Error("openInputDialog: overlayContainer missing");
    
    const titleEl = document.getElementById("overlayTitle");
    if (!titleEl) throw new Error("openInputDialog: overlayTitle missing");
    
    container.style.display = "block";
    titleEl.textContent = title || "Input";
    
    const html = `
      <div style="padding: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: bold;">
          ${escapeHtml(label)}
        </label>
        <input id="inputDialogValue" 
               type="text" 
               value="${escapeAttr(defaultValue)}"
               style="width: 100%; padding: 6px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px;" />
        <div style="margin-top: 20px; text-align: right;">
          <button id="inputDialogCancel" type="button" style="margin-right: 8px; padding: 6px 16px;">Cancel</button>
          <button id="inputDialogOk" type="button" style="padding: 6px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">OK</button>
        </div>
      </div>
    `;
    
    overlayManager.show("forms", html);
    
    const inputEl = document.getElementById("inputDialogValue");
    const okBtn = document.getElementById("inputDialogOk");
    const cancelBtn = document.getElementById("inputDialogCancel");
    
    if (!inputEl || !okBtn || !cancelBtn) {
      throw new Error("openInputDialog: form elements missing");
    }
    
    // Focus the input
    setTimeout(() => inputEl.focus(), 50);
    
    // Enter key submits
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        okBtn.click();
      }
    });
    
    okBtn.addEventListener("click", () => {
      const value = inputEl.value.trim();
      closeOverlay();
      resolve(value || null);
    });
    
    cancelBtn.addEventListener("click", () => {
      closeOverlay();
      resolve(null);
    });
    
    // Close button
    const closeBtn = document.getElementById("overlayClose");
    if (closeBtn) {
      closeBtn.onclick = () => {
        closeOverlay();
        resolve(null);
      };
    }
    
    // Background click
    const bg = document.getElementById("overlayBackground");
    if (bg) {
      bg.onclick = () => {
        closeOverlay();
        resolve(null);
      };
    }
    
  }); // end Promise
  
} // end openInputDialog


/* ============================================================
   showMessageDialog(title, message)
   ------------------------------------------------------------
   Simple message dialog - returns a Promise that resolves
   when user clicks OK.
   
   Usage:
     await showMessageDialog(
       "Success",
       "Secondary object 'Variation 1' created."
     );
============================================================ */
export function showMessageDialog(title, message) {
  
  return new Promise((resolve) => {
    
    const container = document.getElementById("overlayContainer");
    if (!container) throw new Error("showMessageDialog: overlayContainer missing");
    
    const titleEl = document.getElementById("overlayTitle");
    if (!titleEl) throw new Error("showMessageDialog: overlayTitle missing");
    
    container.style.display = "block";
    titleEl.textContent = title || "Message";
    
    const html = `
      <div style="padding: 20px;">
        <p style="margin: 0 0 20px 0; font-size: 14px;">
          ${escapeHtml(message)}
        </p>
        <div style="text-align: right;">
          <button id="messageDialogOk" type="button" style="padding: 6px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">OK</button>
        </div>
      </div>
    `;
    
    overlayManager.show("forms", html);
    
    const okBtn = document.getElementById("messageDialogOk");
    if (!okBtn) throw new Error("showMessageDialog: OK button missing");
    
    okBtn.addEventListener("click", () => {
      closeOverlay();
      resolve();
    });
    
    // Close button
    const closeBtn = document.getElementById("overlayClose");
    if (closeBtn) {
      closeBtn.onclick = () => {
        closeOverlay();
        resolve();
      };
    }
    
    // Background click
    const bg = document.getElementById("overlayBackground");
    if (bg) {
      bg.onclick = () => {
        closeOverlay();
        resolve();
      };
    }
    
  }); // end Promise
  
} // end showMessageDialog


/* ============================================================
   closeOverlay()
   ------------------------------------------------------------
   Helper to close the overlay container
============================================================ */
function closeOverlay() {
  const container = document.getElementById("overlayContainer");
  if (container) {
    container.style.display = "none";
  }
  overlayManager.clearAll();
} // end closeOverlay

