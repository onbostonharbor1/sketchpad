/* menuManager.js
   ------------------------------------------------------------
   Caption Menu Manager (non-IIFE, lazy-init capable)
   ------------------------------------------------------------
*/

// import { showHelpOverlay }  from "./overlay.js";
// import { fileLayer }        from "./fileLayer.js";
// import { manifest }         from "./manifest.js";
// import { loadHelpManifest } from "./help.js";
import { buildHelpItem }    from "./help.js";

let menuEl = null;
let outsideHandler = null;
let escHandler = null;
let ready = false;

export function initMenuManager() {
  ready = true;
} // end initMenuManager

function ensureReady() {
  if (!ready) {
    throw new Error("menuManager: not initialized (call initMenuManager first)");
  }
} // end ensureReady

function ensureArray(value, msg = "menuManager: expected array") {
  if (!Array.isArray(value)) {
    throw new Error(`${msg}. Received: ${typeof value}`);
  }
  return value;
} // end ensureArray


function validateItems(items) {
  ensureArray(items, "menuManager: items must be an array");

  items.forEach((item, idx) => {
    if (!item || typeof item.label !== "string") {
      throw new Error(`menuManager: item[${idx}] missing label`);
    }
    if (!item.disabled && typeof item.onClick !== "function") {
      throw new Error(
        `menuManager: item[${idx}].onClick must be function for enabled items`
      );
    }
  });

  return items;
} // end validateItems

function createMenuItem(label, onClick, disabled = false) {
  if (typeof label !== "string") {
    throw new Error("createMenuItem: label must be string");
  }
  return { label, onClick, disabled };
} // end createMenuItem

function positionMenu(anchor, menuEl) {
  const rect = anchor.getBoundingClientRect();
  const scrollLeft = window.pageXOffset;
  const scrollTop = window.pageYOffset;

  menuEl.style.position = "absolute";
  menuEl.style.left = `${rect.left + scrollLeft}px`;
  menuEl.style.top = `${rect.bottom + scrollTop + 4}px`;
} // end positionMenu

function close() {
  if (menuEl && menuEl.parentNode) {
    menuEl.parentNode.removeChild(menuEl);
  }
  menuEl = null;

  if (outsideHandler) {
    document.removeEventListener("mousedown", outsideHandler);
    outsideHandler = null;
  }
  if (escHandler) {
    document.removeEventListener("keydown", escHandler);
    escHandler = null;
  }
} // end close

function open(items, anchor) {
  ensureReady();

  if (!Array.isArray(items))
    throw new Error("menuManager.open: items must be an array");

  if (!anchor || !(anchor instanceof HTMLElement))
    throw new Error("menuManager.open: anchor must be a DOM element");

  validateItems(items);
  close();

  menuEl = document.createElement("div");
  menuEl.className = "caption-menu";

  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "caption-menu-item";
    el.textContent = item.label;

    if (item.disabled) {
      el.classList.add("disabled");
    } else {
      el.addEventListener("click", () => {
        close();
        item.onClick();
      });
    }

    menuEl.appendChild(el);
  });

  const wrapper = document.getElementById("wrapper");
  if (!wrapper) throw new Error("menuManager: #wrapper not found");
  wrapper.appendChild(menuEl);

  positionMenu(anchor, menuEl);

  outsideHandler = (ev) => {
    if (menuEl && !menuEl.contains(ev.target) && ev.target !== anchor) {
      close();
    }
  };
  document.addEventListener("mousedown", outsideHandler);

  escHandler = (ev) => {
    if (ev.key === "Escape") close();
  };
  document.addEventListener("keydown", escHandler);
} // end open

function clear() {
  close();
} // end clear





export const menuManager = {
  open,
  close,
  clear,
  createMenuItem,
  buildHelpItem,
  isReady() {
    return ready;
  }
}; // end menuManager
