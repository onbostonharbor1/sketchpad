// clearDivs(args)              – clear core divs (optionally one more)
// initOffCanvasHandler
// loadJSON
// showOffCanvas
// showSharedOffCanvas

import { overlayManager } from "./overlay.js";

/* ------------------------------------------------------------
   clearDivs(args="")
   Empties the core divs shared by all tabs.

   Arguments:
     args – optional string id of an extra div to clear in addition
------------------------------------------------------------ */
function clearDivs(args = "") {
    // Existing regions you already clear
    let ids = ["action", "caption", "text", "sketchpad"];
    if (args !== "")
        ids.push(args);

    // Clear each region
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
    });

    // Clear all canvas-overlay layers (interaction, bbox, nodes, guides)
    for (const name in overlayManager.canvasLayers) {
        const layer = overlayManager.canvasLayers[name];
        layer.innerHTML = "";
    }
} // end clearDivs



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

/* helpManifest.js
   ------------------------------------------------------------
   Loads help/manifest.json ONCE and caches it globally.
   Used by all tabs.
   ------------------------------------------------------------
*/

export let helpManifest = null;

export async function loadHelpManifest() {
  if (helpManifest !== null) return helpManifest;  // cached

  const resp = await fetch("/help/manifest.json");
  if (!resp.ok) {
    throw new Error("Missing or unreadable /help/manifest.json");
  }

  const data = await resp.json();

  if (typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Help manifest must be an object keyed by tab names");
  }

  helpManifest = data;
  return helpManifest;
} // end loadHelpManifest

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
   (ADD to ui_utilities.js)
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


export function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
} // end escapeHtml

