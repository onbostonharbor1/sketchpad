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
function clearDivs(args="") {
    let ids = ["buttons", "action", "caption", "text","sketchpad"];
    if (args != "")
        ids.push(args);
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
    });
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


/* ------------------------------------------------------------
   showScriptOffcanvas(scriptPath, titleText)
   Fetches script source and displays it inside the Bootstrap
   offcanvas panel. Offcanvas is appropriate for long, scrollable
   text that should not block the app.
------------------------------------------------------------ */
export function showScriptOffcanvas(scriptPath, titleText) {

  fetch(scriptPath)
    .then(resp => resp.text())
    .then(text => {

      const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      const panel = document.getElementById("offcanvasPanel");
      if (!panel)
        throw new Error("showScriptOffcanvas: offcanvasPanel not found");

      const body = panel.querySelector(".offcanvas-body");
      if (!body)
        throw new Error("showScriptOffcanvas: .offcanvas-body missing");

      const titleEl = panel.querySelector(".offcanvas-title");
      if (titleEl)
        titleEl.textContent = titleText + " Script";

      body.innerHTML = "";

      const pre = document.createElement("pre");
      pre.style.whiteSpace = "pre-wrap";
      pre.style.fontSize = "0.85rem";
      pre.textContent = escaped;

      body.appendChild(pre);

      const bsCanvas = new bootstrap.Offcanvas(panel);
      bsCanvas.show();
    });
} // end showScriptOffcanvas


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
