/* drawNav.js
   ============================================================
   Draw Tab — Subtab Management and Secondary Objects
   ============================================================
   Role:
     Owns everything related to the Draw tab's subtab bar —
     creating, switching, and deleting subtabs — and the
     secondary objects system (discovery, offcanvas, loading).

     The Draw tab has a more complex subtab model than other
     tabs: subtabs are created dynamically as the user opens
     draw objects, and secondary objects (saved parameter
     variations) can be loaded into those subtabs.

   Architectural rules:
     • Does NOT own the TabSpec, init(), or restore(). draw.js.
     • Does NOT render category frames. drawCategories.js.
     • Does NOT build caption bars, menu items, or commands.
       drawMenuCmds.js.
     • Reads and writes idsWithSecondaries via drawState.js.
     • setDrawCaption() and setDrawAction() are called here but
       live in drawMenuCmds.js — imported statically since
       drawMenuCmds.js does NOT import drawNav.js (no cycle).

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

import { clearDivs, showOffcanvasPanel, renderThumbnailGrid } from "../uiUtilities.js";
import { getIDsWithSecondaries, listSecondaries, loadSecondary } from "../secondaryObjects.js";
import { drawActiveTab } from "../drawRunner.js";
import { getIdsWithSecondaries, setIdsWithSecondaries } from "./drawState.js";
import { renderDrawCategories } from "./drawCategories.js";
import { setDrawCaption, setDrawAction, clearDrawCaption } from "../drawMenuCmds.js";


/* ============================================================
   Constants
   ============================================================ */
const DEFAULT_DRAW_SUBTAB = "tab-categories";


/* ============================================================
   setDrawSubtabs()
   ============================================================
   Builds the subtab bar from uiState.draw.tabs.

   If no tabs exist yet, creates a single Categories tab.
   Otherwise, recreates all existing tabs from uiState in order.

   Called by:
     initDrawTab()             — on cold start
     restoreDrawTab()          — on tab restore
     validateOpenSecondaryTabs() — after pruning stale tabs
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
    /* No tabs yet — create the default Categories tab. */
    addDrawSubtab({ name: "Categories" });
    return;
  }

  /* Recreate existing tabs from uiState. */
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
   ============================================================
   Creates a new subtab button in the bar and activates it.

   For Categories items:
     - Registers a { type: "categories" } entry in uiState.draw.tabs.
     - Renders the category list.
     - Clears caption and action.

   For draw object items:
     - Calls entry.init() to initialise the draw object.
     - Arms the interactor if the object is interactive.
     - Registers a full tab info object in uiState.draw.tabs.
     - Sets the action region (controls), executes the draw, and
       sets the caption.

   Arguments:
     item.name  — display name for the tab button
     item.entry — the drawRegistry entry object (omitted for Categories)
   ============================================================ */
export function addDrawSubtab(item) {

  clearDivs();

  const bar = document.querySelector("#subtabs ul");
  if (!bar) throw new Error("addDrawSubtab: #subtabs ul not found");

  const tabId = "tab-" + item.name.replace(/\s+/g, "-").toLowerCase();

  /* Deactivate all existing tabs. */
  bar.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));

  /* ── Build the tab button ───────────────────────────────── */
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

  /* Close button — not shown on the Categories tab. */
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

  /* ── Activate tab content ───────────────────────────────── */
  if (item.name === "Categories") {

    uiState.draw.tabs[tabId]  = { type: "categories" };
    uiState.draw.activeSubtab = tabId;
    renderDrawCategories();
    clearDrawCaption();
    setDrawAction();

  } else {

    const entry = item.entry;
    entry.init();

    /* Arm the interactor for interactive/point-based objects. */
    if (entry.interactive && entry.params.points) {
      if (window.armInteractor)        window.armInteractor(entry);
      if (window.interactor?.draw)     window.interactor.draw();
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
    setDrawCaption(entry);
  }

} // end addDrawSubtab


/* ============================================================
   deleteTab(tabId)
   ============================================================
   Removes a subtab button and its uiState entry, then
   activates the nearest remaining tab.

   If no neighbours exist after deletion, rebuilds the entire
   subtab bar (which will create a fresh Categories tab).

   Arguments:
     tabId — the tab ID to remove
   ============================================================ */
export function deleteTab(tabId) {

  const bar  = document.querySelector("#subtabs ul");
  if (!bar) throw new Error("deleteTab: #subtabs ul not found");

  const btns = Array.from(bar.querySelectorAll(".nav-link"));
  const idx  = btns.findIndex((b) => b.dataset.tabId === tabId);
  if (idx === -1) return;

  btns[idx].parentElement.remove();
  delete uiState.draw.tabs[tabId];

  /* Activate a neighbour tab, or rebuild from scratch if none. */
  const neighbor = btns[idx + 1] || btns[idx - 1];
  neighbor ? switchTab(neighbor.dataset.tabId) : setDrawSubtabs();

} // end deleteTab


/* ============================================================
   switchTab(tabId)
   ============================================================
   Activates an existing tab by ID.

   Disarms the interactor from the previous tab, clears regions,
   then restores the content for the new tab (categories or object).

   Arguments:
     tabId — the tab ID to activate
   ============================================================ */
export function switchTab(tabId) {

  const bar = document.querySelector("#subtabs ul");
  if (!bar) return;

  /* Visual activation. */
  bar.querySelectorAll(".nav-link").forEach((btn) => btn.classList.remove("active"));
  const btn = bar.querySelector(`[data-tab-id="${tabId}"]`);
  if (btn) btn.classList.add("active");

  uiState.draw.activeSubtab = tabId;

  /* Disarm the previous tab's interactor. */
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
    setDrawCaption(entry);
    /* Re-arm interactor if the object is interactive. */
    if (entry?.interactive && entry.params?.points) {
      if (window.armInteractor)    window.armInteractor(entry);
      if (window.interactor?.draw) window.interactor.draw();
    }
  }

} // end switchTab


/* ============================================================
   markTabDirty(tabId)
   ============================================================
   Marks a tab as having unsaved changes and appends " *" to
   its label as a visual indicator.

   Called by drawRunner.js and parameter controls when the user
   modifies a draw object's parameters.

   Arguments:
     tabId — the tab ID to mark dirty
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
   ============================================================
   Clears the dirty flag and removes the " *" suffix from the
   tab label.

   Called after a successful save operation.

   Arguments:
     tabId — the tab ID to mark clean
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
   ============================================================
   Checks all open secondary tabs against the current disk state
   and closes any whose primary or secondary file no longer exists.

   Called after updateSecondariesDiscovery() completes during
   a Refresh & Restore init, so the Set is guaranteed to be
   fresh before this runs.

   After validation, rebuilds the subtab bar and falls back to
   the default tab if the active tab was removed.
   ============================================================ */
export async function validateOpenSecondaryTabs() {

  const tabs   = uiState.draw.tabs;
  const tabIds = Object.keys(tabs);

  for (const tabId of tabIds) {
    const info = tabs[tabId];
    if (!info.secondary) continue;

    const { primaryId, filename } = info.secondary;

    /* 1. Check if the primary still has any secondaries at all. */
    if (!getIdsWithSecondaries().has(primaryId)) {
      console.log(`Closing tab ${tabId}: primary ${primaryId} has no secondaries.`);
      deleteTab(tabId);
      continue;
    }

    /* 2. Check if the specific secondary file still exists on disk. */
    try {
      const list   = await listSecondaries(primaryId);
      const exists = list.some((item) => item.path === filename);

      if (!exists) {
        console.log(`Closing tab ${tabId}: secondary ${filename} not found.`);
        deleteTab(tabId);
      } else {
        /* Keep the list and index in sync with the current disk state. */
        info.secondary.list  = list;
        info.secondary.index = list.findIndex((item) => item.path === filename);
      }
    } catch (e) {
      console.warn(`Error verifying secondary tab ${tabId}`, e);
    }
  }

  /* Rebuild the subtab bar to reflect any deletions. */
  setDrawSubtabs();

  /* If the active tab was deleted, fall back to default. */
  if (!uiState.draw.tabs[uiState.draw.activeSubtab]) {
    switchTab(DEFAULT_DRAW_SUBTAB);
  }

} // end validateOpenSecondaryTabs


/* ============================================================
   updateSecondariesDiscovery()
   ============================================================
   Queries the server for the set of drawRegistry IDs that have
   secondary object files, and updates drawState accordingly.

   Called at the start of initDrawTab() so the category list
   can show secondary-action buttons for the right items.
   Errors are caught and logged rather than thrown, because a
   failed discovery should degrade gracefully (no buttons shown)
   rather than breaking the whole tab.
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
   ============================================================
   Opens a thumbnail offcanvas listing all secondary objects
   for the given primary ID.

   Clicking a thumbnail loads that secondary into the active tab
   and closes the offcanvas.

   Arguments:
     primaryId — the drawRegistry key (e.g. "mysticRose")
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
      /* Close the offcanvas after loading. */
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
   ============================================================
   Loads a secondary object into the current active draw tab.

   Merges the secondary's saved params over the primary entry's
   defaults, then opens a new subtab with the merged entry.
   The secondary metadata is stored in the tab's info object so
   caption nav (prev/next) and save/archive commands can use it.

   Arguments:
     primaryId — the drawRegistry key of the parent object
     item      — the secondary object descriptor { path, thumb, ... }
     list      — the full list of secondaries for this primary
     index     — the index of item within list
   ============================================================ */
export async function loadSecondaryObjectInTab(primaryId, item, list, index) {

  const content = await loadSecondary(primaryId, item.path);

  if (!content) {
    alert("Failed to load object data.");
    return;
  }

  const primaryEntry = window.drawRegistry[primaryId];
  if (!primaryEntry) throw new Error("loadSecondaryObjectInTab: primary not found: " + primaryId);

  /* Merge secondary params over primary defaults. */
  const mergedEntry        = Object.assign({}, primaryEntry);
  mergedEntry.params       = Object.assign({}, primaryEntry.params, content.params);
  mergedEntry.name         = content.name;

  addDrawSubtab({ name: content.name, entry: mergedEntry });

  /* Store secondary metadata on the new tab so caption nav works. */
  const activeId = uiState.draw.activeSubtab;
  const info     = uiState.draw.tabs[activeId];

  info.secondary = {
    primaryId: primaryId,
    filename:  item.path,
    name:      content.name,
    list:      list,
    index:     index
  };

  setDrawAction();
  setDrawCaption(mergedEntry);

} // end loadSecondaryObjectInTab
