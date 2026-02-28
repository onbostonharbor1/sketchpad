/* figuresNav.js
   ============================================================
   Figures Tab: Subtab Construction and Navigation
   ============================================================
   Role:
     Owns everything related to building the Figures subtab bar,
     switching between tabs, and managing tab lifecycle (open/close).

     This file sits between the lifecycle layer (figures.js) and
     the display layer (figuresDisplay.js). Its job is to manage
     the subtab UI and coordinate view transitions.

   Architectural rules:
     â€¢ Does NOT own the TabSpec, init(), restore(), or save().
       Those live in figures.js.
     â€¢ Does NOT render figure content or execute figure scripts.
       That lives in figuresDisplay.js and figuresRunner.js.
     â€¢ Does NOT build caption bars or menu items.
       Those live in figuresMenuCmds.js.
     â€¢ Reads figuresRegistry via getters from figuresState.js.
       Never imports the raw variable directly.

   Exports:
     setFiguresSubtabs()         â€” build empty subtab bar
     renderSubtabs()             â€” render all current tabs
     switchToCategories()        â€” switch to categories view
     switchToFigureTab(tabId)    â€” switch to a specific figure tab
     closeTab(tabId)             â€” close a figure tab
   ============================================================ */

import {
  getCurrentTabId,
  setCurrentTabId
} from "./figuresState.js";


/* ============================================================
   setFiguresSubtabs()
   ------------------------------------------------------------
   Builds an empty subtab bar inside #subtabs.
   The actual tabs are rendered by renderSubtabs().
   ============================================================ */
export function setFiguresSubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) {
    throw new Error("setFiguresSubtabs: #subtabs not found");
  }

  el.innerHTML = "";

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs figure-subtabs";
  el.appendChild(bar);
} // end setFiguresSubtabs


/* ============================================================
   renderSubtabs()
   ------------------------------------------------------------
   Renders all current tabs into the subtab bar.
   Called after any tab state change (open/close/switch).
   ============================================================ */
export function renderSubtabs() {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) return;

  bar.innerHTML = "";

  const activeTabId = uiState.figures.activeSubtab;

  // Categories Tab (always present)
  const catLi = document.createElement("li");
  catLi.className = "nav-item";

  const catBtn = document.createElement("button");
  catBtn.className = "nav-link";
  if (activeTabId === "tab-categories") catBtn.classList.add("active");
  catBtn.textContent = "Categories";
  catBtn.onclick = () => switchToCategories();

  catLi.appendChild(catBtn);
  bar.appendChild(catLi);

  // Other Tabs (figure tabs)
  for (const tabId in uiState.figures.tabs) {
    if (tabId === "tab-categories") continue;

    const tab = uiState.figures.tabs[tabId];

    const li = document.createElement("li");
    li.className = "nav-item";

    const btn = document.createElement("button");
    btn.className = "nav-link";
    if (activeTabId === tabId) btn.classList.add("active");

    const name = tab.name || tabId.replace("tab-", "");

    // Create label span
    const label = document.createElement("span");
    label.textContent = name;
    btn.appendChild(label);

    // Close button
    const close = document.createElement("span");
    close.textContent = " ×";
    close.style.cursor = "pointer";
    close.style.marginLeft = "5px";
    close.onclick = (e) => {
      e.stopPropagation();
      closeTab(tabId);
    };
    btn.appendChild(close);

    btn.onclick = () => switchToFigureTab(tabId);

    li.appendChild(btn);
    bar.appendChild(li);
  }
} // end renderSubtabs


/* ============================================================
   switchToCategories()
   ------------------------------------------------------------
   Switches view to the categories list.
   Hides the sketchpad and sidebar, shows the text region.
   ============================================================ */
export function switchToCategories() {
  setCurrentTabId("tab-categories");
  uiState.figures.activeSubtab = "tab-categories";
  renderSubtabs();

  document.getElementById("text").style.display = "block";

  // Hide sketchpad wrapper (contains sidebar + canvas)
  const wrapper = document.getElementById("sketchpad-wrapper");
  if (wrapper) wrapper.style.display = "none";

  document.getElementById("action").style.display = "none";

  // Import and call setFiguresCaption from figuresMenuCmds
  import("./figuresMenuCmds.js").then(m => m.setFiguresCaption());

  // Clear overlay buttons and hide sidebar
  const btnContainer = document.getElementById("figure-sidebar");
  if (btnContainer) {
    btnContainer.innerHTML = "";
    btnContainer.style.display = "none";
  }

  // Reload categories if needsUpdate flag is set (e.g., after saving secondary)
  if (uiState.figures.needsUpdate) {
    uiState.figures.needsUpdate = false;
    import("./figuresDisplay.js").then(m => m.loadFiguresCategories());
  }
} // end switchToCategories


/* ============================================================
   switchToFigureTab(tabId)
   ------------------------------------------------------------
   Switches view to a specific figure tab.
   Shows the sketchpad and sidebar, hides the text region.
   ============================================================ */
export function switchToFigureTab(tabId) {
  const tabState = uiState.figures.tabs[tabId];
  if (!tabState) return;

  setCurrentTabId(tabId);
  uiState.figures.activeSubtab = tabId;
  renderSubtabs();

  document.getElementById("text").style.display = "none";

  // Show sketchpad wrapper
  const wrapper = document.getElementById("sketchpad-wrapper");
  if (wrapper) wrapper.style.display = "flex";

  // Show sidebar
  const sidebar = document.getElementById("figure-sidebar");
  if (sidebar) sidebar.style.display = "flex";

  document.getElementById("action").style.display = "block";

  // Redraw using stored state
  import("../figuresRunner.js").then(m => {
    m.drawFigures();
    m.updateActionPanel();
  });

  // Update overlay buttons
  import("../figuresUI.js").then(m => m.updateFigureOverlayButtons());

  // Set caption
  import("./figuresMenuCmds.js").then(m => {
    m.setFiguresCaption(tabState.name, {
      figureId: tabState.figureId,
      name: tabState.name,
      path: tabState.path
    });
  });
} // end switchToFigureTab


/* ============================================================
   closeTab(tabId)
   ------------------------------------------------------------
   Closes a figure tab and removes it from state.
   If the closed tab was active, switches to categories.
   ============================================================ */
export function closeTab(tabId) {
  delete uiState.figures.tabs[tabId];

  if (uiState.figures.activeSubtab === tabId) {
    switchToCategories();
  } else {
    renderSubtabs();
  }
} // end closeTab
