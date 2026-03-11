/* drawNav.js
   ============================================================
   Draw Tab -- Subtab Management and Secondary Objects
   ============================================================
   Role:
     Owns everything related to the Draw tab's subtab bar --
     creating, switching, and deleting subtabs -- and the
     secondary objects system (discovery, offcanvas, loading).

     The Draw tab has a more complex subtab model than other
     tabs: subtabs are created dynamically as the user opens
     draw objects, and secondary objects (saved parameter
     variations) can be loaded into those subtabs.

   Architectural rules:
     * Does NOT own the TabSpec, init(), or restore(). draw.js.
     * Does NOT render category frames. drawCategories.js.
     * Does NOT build caption bars, menu items, or commands.
       drawMenuCmds.js.
     * Reads and writes idsWithSecondaries via drawTabState.js.
     * updateDrawCaption(), setDrawAction(), and clearDrawCaption()
       are called here but live in drawMenuCmds.js -- imported
       statically since drawMenuCmds.js does NOT import drawNav.js
       (no cycle).

   Exports:
     setDrawSubtabs()
     addDrawSubtab(item)
     deleteTab(tabId)
     switchTab(tabId)
     markTabDirty(tabId)
     markTabClean(tabId)
     validateOpenSecondaryTabs()
     updateSecondariesDiscovery()
     showSecondaryOffcanvas(primaryId)
     loadSecondaryObjectInTab(primaryId, item, list, index)
   ============================================================ */

import { clearDivs, showOffcanvasPanel, renderThumbnailGrid } from "/ui/uiUtilities.js";
import { getIDsWithSecondaries, listSecondaries, loadSecondary } from "/ui/draw/secondaryObjects.js";
import { drawActiveTab }                                        from "/ui/drawRunner.js";
import { getIdsWithSecondaries, setIdsWithSecondaries }        from "./drawTabState.js";
import { renderDrawCategories }                                from "./drawCategories.js";
import {
  updateDrawCaption,
  clearDrawCaption,
  setDrawAction
}                                                              from "./drawMenuCmds.js";


/* ============================================================
   Constants
   ============================================================ */
const DEFAULT_DRAW_SUBTAB = "tab-categories";


/* ============================================================
   setDrawSubtabs()
   ============================================================ */
export function setDrawSubtabs() {

  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setDrawSubtabs: #subtabs not found");

  el.innerHTML = "";

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs draw-subtabs";
  el.appendChild(bar);

  const ids = Object.keys(uiState.draw.tabs || {});

  if (!ids.length) {
    addDrawSubtab({ name: "Categories" });
    return;
  }

  ids.forEach((id) => {
    const info = uiState.draw.tabs[id];
    const name = (info.type === "categories")
      ? "Categories"
      : (info.drawRegistry?.name || id.replace(/^tab-/, ""));
    addDrawSubtab({ name, entry: info.drawRegistry });
  });

} // end setDrawSubtabs


/* ============================================================
   addDrawSubtab(item)
   ============================================================ */
export function addDrawSubtab(item) {

  clearDivs();

  const bar = document.querySelector("#subtabs ul");
  if (!bar) throw new Error("addDrawSubtab: #subtabs ul not found");

  const tabId = "tab-" + item.name.replace(/\s+/g, "-").toLowerCase();

  bar.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));

  const li  = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className     = "nav-link active";
  btn.dataset.tabId = tabId;
  btn.addEventListener("click", () => switchTab(tabId));

  const label = document.createElement("span");
  label.className   = "tab-label";
  label.textContent = item.name;
  btn.appendChild(label);

  if (item.name !== "Categories") {
    const closeBtn = document.createElement("span");
    closeBtn.textContent = "×";
    closeBtn.className   = "tab-close";
    closeBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      deleteTab(tabId);
    });
    btn.appendChild(closeBtn);
  }

  li.appendChild(btn);
  bar.appendChild(li);

  if (item.name === "Categories") {

    uiState.draw.tabs[tabId]  = { type: "categories" };
    uiState.draw.activeSubtab = tabId;
    renderDrawCategories();
    clearDrawCaption();
    setDrawAction();

  } else {

    const entry = item.entry;
    entry.init();

    if (entry.interactive && entry.params.points) {
      if (window.armInteractor)    window.armInteractor(entry);
      if (window.interactor?.draw) window.interactor.draw();
    }

    uiState.draw.tabs[tabId] = {
      type:         "object",
      drawRegistry: entry,
      dirty:        false,
      parameters:   entry.params,
      showControls: false
    };

    uiState.draw.activeSubtab = tabId;
    setDrawAction();
    drawActiveTab();
    updateDrawCaption(entry);
  }

} // end addDrawSubtab


/* ============================================================
   deleteTab(tabId)
   ============================================================ */
export function deleteTab(tabId) {

  const bar  = document.querySelector("#subtabs ul");
  if (!bar) throw new Error("deleteTab: #subtabs ul not found");

  const btns = Array.from(bar.querySelectorAll(".nav-link"));
  const idx  = btns.findIndex((b) => b.dataset.tabId === tabId);
  if (idx === -1) return;

  btns[idx].parentElement.remove();
  delete uiState.draw.tabs[tabId];

  const neighbor = btns[idx + 1] || btns[idx - 1];
  neighbor ? switchTab(neighbor.dataset.tabId) : setDrawSubtabs();

} // end deleteTab


/* ============================================================
   switchTab(tabId)
   ============================================================ */
export function switchTab(tabId) {

  const bar = document.querySelector("#subtabs ul");
  if (!bar) return;

  bar.querySelectorAll(".nav-link").forEach((btn) => btn.classList.remove("active"));
  const btn = bar.querySelector(`[data-tab-id="${tabId}"]`);
  if (btn) btn.classList.add("active");

  uiState.draw.activeSubtab = tabId;

  if (window.disarmInteractor) window.disarmInteractor();
  if (window.interactor)       window.interactor.target = null;

  clearDivs();

  const info = uiState.draw.tabs[tabId];
  if (!info) return;

  if (info.type === "categories") {
    renderDrawCategories();
    clearDrawCaption();
    setDrawAction();
  } else {
    setDrawAction();
    drawActiveTab();
    const entry = info.drawRegistry;
    updateDrawCaption(entry);
    if (entry?.interactive && entry.params?.points) {
      if (window.armInteractor)    window.armInteractor(entry);
      if (window.interactor?.draw) window.interactor.draw();
    }
  }

} // end switchTab


/* ============================================================
   markTabDirty(tabId)
   ============================================================ */
export function markTabDirty(tabId) {

  const info = uiState.draw.tabs[tabId];
  if (!info || info.dirty) return;

  info.dirty = true;

  const btn   = document.querySelector(`[data-tab-id="${tabId}"]`);
  const label = btn?.querySelector(".tab-label");
  if (label && !label.textContent.endsWith(" *")) {
    label.textContent += " *";
  }

} // end markTabDirty


/* ============================================================
   markTabClean(tabId)
   ============================================================ */
export function markTabClean(tabId) {

  const info = uiState.draw.tabs[tabId];
  if (!info) return;

  info.dirty = false;

  const btn   = document.querySelector(`[data-tab-id="${tabId}"]`);
  const label = btn?.querySelector(".tab-label");
  if (label) label.textContent = label.textContent.replace(/\s\*$/, "");

} // end markTabClean


/* ============================================================
   validateOpenSecondaryTabs()
   ============================================================ */
export async function validateOpenSecondaryTabs() {

  const tabs   = uiState.draw.tabs;
  const tabIds = Object.keys(tabs);

  for (const tabId of tabIds) {
    const info = tabs[tabId];
    if (!info.secondary) continue;

    const { primaryId, filename } = info.secondary;

    if (!getIdsWithSecondaries().has(primaryId)) {
      console.log(`Closing tab ${tabId}: primary ${primaryId} has no secondaries.`);
      deleteTab(tabId);
      continue;
    }

    try {
      const list   = await listSecondaries(primaryId);
      const exists = list.some((item) => item.path === filename);

      if (!exists) {
        console.log(`Closing tab ${tabId}: secondary ${filename} not found.`);
        deleteTab(tabId);
      } else {
        info.secondary.list  = list;
        info.secondary.index = list.findIndex((item) => item.path === filename);
      }
    } catch (e) {
      console.warn(`Error verifying secondary tab ${tabId}`, e);
    }
  }

  setDrawSubtabs();

  if (!uiState.draw.tabs[uiState.draw.activeSubtab]) {
    switchTab(DEFAULT_DRAW_SUBTAB);
  }

} // end validateOpenSecondaryTabs


/* ============================================================
   updateSecondariesDiscovery()
   ============================================================ */
export async function updateSecondariesDiscovery() {

  try {
    const list = await getIDsWithSecondaries();
    setIdsWithSecondaries(new Set(list));
  } catch (e) {
    console.warn("updateSecondariesDiscovery failed", e);
  }

} // end updateSecondariesDiscovery


/* ============================================================
   showSecondaryOffcanvas(primaryId)
   ============================================================ */
export async function showSecondaryOffcanvas(primaryId) {

  try {
    const list = await listSecondaries(primaryId);

    if (!list || list.length === 0) {
      alert("No secondary objects found.");
      return;
    }

    showOffcanvasPanel({
      title:    "Secondary Objects (" + primaryId + ")",
      bodyHtml: `<div id="secondaryThumbGrid">Loading thumbnails...</div>`
    });

    const buildSrc = (item) => `/drawRegistry/${primaryId}/${item.thumb}`;

    const onClick = async (item, idx) => {
      await loadSecondaryObjectInTab(primaryId, item, list, idx);
      const closeBtn = document.querySelector('[data-bs-dismiss="offcanvas"]');
      if (closeBtn) closeBtn.click();
    };

    renderThumbnailGrid("secondaryThumbGrid", list, buildSrc, onClick);

  } catch (e) {
    console.error("showSecondaryOffcanvas error", e);
    alert("Error loading secondaries.");
  }

} // end showSecondaryOffcanvas


/* ============================================================
   loadSecondaryObjectInTab(primaryId, item, list, index)
   ============================================================ */
export async function loadSecondaryObjectInTab(primaryId, item, list, index) {

  const content = await loadSecondary(primaryId, item.path);

  if (!content) {
    alert("Failed to load object data.");
    return;
  }

  const primaryEntry = window.drawRegistry[primaryId];
  if (!primaryEntry) throw new Error("loadSecondaryObjectInTab: primary not found: " + primaryId);

  const mergedEntry        = Object.assign({}, primaryEntry);
  mergedEntry.params       = Object.assign({}, primaryEntry.params, content.params);
  mergedEntry.name         = content.name;

  addDrawSubtab({ name: content.name, entry: mergedEntry });

  const activeId = uiState.draw.activeSubtab;
  const info     = uiState.draw.tabs[activeId];

  info.secondary = {
    primaryId,
    filename:  item.path,
    name:      content.name,
    list,
    index
  };

  setDrawAction();
  updateDrawCaption(mergedEntry);

} // end loadSecondaryObjectInTab
