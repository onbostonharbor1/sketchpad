/* menuManager.js
   ------------------------------------------------------------
   Caption Menu Manager (global UI component)
   ------------------------------------------------------------
   Responsibilities:
     • Create/destroy a floating menu anchored to the caption bar
     • Populate menu items dynamically per tab
     • Close on: click outside, ESC, tab switch
     • Fail-fast on invalid arguments

   This file is UI-only. It has **zero** knowledge of patterns,
   gallery, draw, or utilities. Tabs supply menu item arrays.

   STRUCTURE:
     menuManager.open(items, anchorElement)
       - Creates menu (div) under #wrapper
       - Positions below the anchor
       - items = [ {label, onClick}, … ]

     menuManager.close()
       - Removes menu from DOM

     menuManager.clear()
       - Alias for close()

   Expected CSS:
     .caption-menu {
         position: absolute;
         background: white;
         border: 1px solid #ccc;
         border-radius: 4px;
         padding: 4px 0;
         z-index: 9999;
         box-shadow: 0 2px 6px rgba(0,0,0,0.2);
     }
     .caption-menu-item {
         padding: 4px 16px;
         cursor: pointer;
         white-space: nowrap;
     }
     .caption-menu-item:hover {
         background: #e8e8e8;
     }
------------------------------------------------------------ */
import { showHelpOverlay } from "./overlay.js";
import helpManifest from "../help/helpManifest.json";

export const menuManager = (() => {
  let menuEl = null; // Currently open menu <div>, or null
  let outsideHandler = null;
  let escHandler = null;

// ----------------------------------------------------------
// ensureArray(value)
// Fail-fast: items must be an array.
// ----------------------------------------------------------
function ensureArray(value, msg = "menuManager: expected array") {
  if (!Array.isArray(value)) {
    throw new Error(`${msg}. Received: ${typeof value}`);
  }
  return value;
} // end ensureArray


// ----------------------------------------------------------
// validateItems(items)
// Verifies each item has the required structure:
//   { label: string, disabled?: boolean, onClick?: function }
// ----------------------------------------------------------
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


// ----------------------------------------------------------
// createMenuItem(label, onClick, disabled=false)
// Factory to reduce tab-side boilerplate.
// Tabs can use this instead of hand-building objects.
// ----------------------------------------------------------
function createMenuItem(label, onClick, disabled = false) {
  if (typeof label !== "string") {
    throw new Error("createMenuItem: label must be string");
  }
  return { label, onClick, disabled };
} // end createMenuItem


// ----------------------------------------------------------
// positionMenu(anchor, menuEl)
// Computes absolute position beneath the anchor element.
// This isolates geometry, removes duplication, and
// makes menuManager.open() cleaner.
// ----------------------------------------------------------
function positionMenu(anchor, menuEl) {
  const rect = anchor.getBoundingClientRect();
  const scrollLeft = window.pageXOffset;
  const scrollTop = window.pageYOffset;

  menuEl.style.position = "absolute";
  menuEl.style.left = `${rect.left + scrollLeft}px`;
  menuEl.style.top = `${rect.bottom + scrollTop + 4}px`;
} // end positionMenu


  // ----------------------------------------------------------
  // close()
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // open(items, anchor)
  // ----------------------------------------------------------
  /*
     items  – array of { label: string, onClick: function }
     anchor – DOM element whose bottom-left will anchor menu
  */
  function open(items, anchor) {
    if (!Array.isArray(items))
      throw new Error("menuManager.open: items must be an array");

    if (!anchor || !(anchor instanceof HTMLElement))
      throw new Error("menuManager.open: anchor must be a DOM element");

    // Ensure only one menu at a time
    close();

    // Create menu container
    menuEl = document.createElement("div");
    menuEl.className = "caption-menu";

    // Build menu items
    // Build items (now supports disabled)
    items.forEach((item) => {
      if (!item || typeof item.label !== "string")
        throw new Error("menuManager: item.label missing");

      const el = document.createElement("div");
      el.className = "caption-menu-item";
      el.textContent = item.label;

      // Handle disabled items
      if (item.disabled) {
        el.classList.add("disabled");
      } else {
        if (typeof item.onClick !== "function")
          throw new Error("menuManager: item.onClick must be function");

        el.addEventListener("click", () => {
          close();
          item.onClick();
        });
      }

      menuEl.appendChild(el);
    });


    // Insert into document
    const wrapper = document.getElementById("wrapper");
    if (!wrapper) throw new Error("menuManager: #wrapper not found");

    wrapper.appendChild(menuEl);

    // Position below anchor
    const rect = anchor.getBoundingClientRect();
    const scrollLeft = window.pageXOffset;
    const scrollTop = window.pageYOffset;

    menuEl.style.position = "absolute";
    menuEl.style.left = `${rect.left + scrollLeft}px`;
    menuEl.style.top = `${rect.bottom + scrollTop + 4}px`;

    // Click outside → close
    outsideHandler = (ev) => {
      if (menuEl && !menuEl.contains(ev.target) && ev.target !== anchor) {
        close();
      }
    };
    document.addEventListener("mousedown", outsideHandler);

    // ESC closes menu
    escHandler = (ev) => {
      if (ev.key === "Escape") close();
    };
    document.addEventListener("keydown", escHandler);
  } // end open


  // ----------------------------------------------------------
  // clear()
  // ----------------------------------------------------------
  function clear() {
    close();
  } // end clear

async function buildHelpItem(tabName, itemName) {
  const exists =
    helpManifest[tabName] &&
    helpManifest[tabName].includes(itemName);

  const helpPath = `./help/${tabName}/${itemName}.html`;

  if (!exists) {
    return {
      label: "Help",
      disabled: true,
      onClick: () => {}
    };
  }

  return {
    label: "Help",
    onClick: () => showHelpOverlay(helpPath, itemName)
  };
} // end buildHelpItem



  // ----------------------------------------------------------
  // Public interface
  // ----------------------------------------------------------
  return {
    open,
    close,
    clear,
    buildHelpItem
  };
})(); // end menuManager IIFE
