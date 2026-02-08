/* figures.js
   ------------------------------------------------------------
   Figures Tab Controller
   ------------------------------------------------------------
*/

import { uiState } from "./uiState.js";
import { renderCategories } from "./categories.js";
import { clearDivs, setCommandsButtonLabel } from "./uiUtilities.js";
import { runFigureScript, drawFigures, initFiguresInteraction, getActiveOverlays, updateActionPanel } from "./figuresRunner.js";
import { initFigureOverlays, updateFigureOverlayButtons } from "./figuresUI.js";
import { setCaptionBar } from "./caption.js";
import { menuManager } from "./menuManager.js";
import { getFiguresCaptionMenuItems } from "./figuresMenuCmds.js";

/* ============================================================
   initFiguresTab
============================================================ */
export function initFiguresTab(restored = false) {
  // Ensure default state if missing
  if (!uiState.figures) {
      uiState.figures = {
          activeSubtab: "tab-categories",
          tabs: {
              "tab-categories": { type: "categories" }
          },
          saved: null
      };
  }

  setFiguresAction();
  setFiguresSubtabs();
  setFiguresCaption();
  setFiguresText();
  setFiguresSketchpad();

  // Initialize Overlay UI
  initFigureOverlays();

  // Initialize Interaction
  initFiguresInteraction();

  // Load Categories (always refresh categories for now)
  loadFiguresCategories();

  // Restore active tab
  const activeId = uiState.figures.activeSubtab;

  // Render subtabs first
  renderSubtabs();

  if (activeId && activeId !== "tab-categories") {
      // Check if tab exists
      if (uiState.figures.tabs[activeId]) {
          switchToFigureTab(activeId);
      } else {
          switchToCategories();
      }
  } else {
      switchToCategories();
  }
}

/* ============================================================
   Placeholder setters for each UI region
============================================================ */
function setFiguresAction() {
  const el = document.getElementById("action");
  if (el) el.innerHTML = "Select an overlay to view controls. ";
}

function setFiguresSubtabs() {
  const el = document.getElementById("subtabs");
  if (el) el.innerHTML = "";

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs figure-subtabs";
  el.appendChild(bar);

  // renderSubtabs called in init
}

function renderSubtabs() {
    const bar = document.querySelector("#subtabs ul");
    if (!bar) return;
    bar.innerHTML = "";

    // Categories Tab
    const catLi = document.createElement("li");
    catLi.className = "nav-item";
    const catBtn = document.createElement("button");
    catBtn.className = "nav-link";
    if (uiState.figures.activeSubtab === "tab-categories") catBtn.classList.add("active");
    catBtn.textContent = "Categories";
    catBtn.onclick = () => switchToCategories();
    catLi.appendChild(catBtn);
    bar.appendChild(catLi);

    // Other Tabs
    for (const tabId in uiState.figures.tabs) {
        if (tabId === "tab-categories") continue;
        const tab = uiState.figures.tabs[tabId];

        const li = document.createElement("li");
        li.className = "nav-item";
        const btn = document.createElement("button");
        btn.className = "nav-link";
        if (uiState.figures.activeSubtab === tabId) btn.classList.add("active");

        // Name from ID or stored? We should store name.
        const name = tab.name || tabId.replace("tab-", "");

        // Create label span
        const label = document.createElement("span");
        label.textContent = name;
        btn.appendChild(label);

        const close = document.createElement("span");
        close.textContent = " Ã—";
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
}

function switchToCategories() {
    uiState.figures.activeSubtab = "tab-categories";
    renderSubtabs();

    document.getElementById("text").style.display = "block";

    // Hide sketchpad wrapper (contains sidebar + canvas)
    const wrapper = document.getElementById("sketchpad-wrapper");
    if (wrapper) wrapper.style.display = "none";

    document.getElementById("action").style.display = "none";
    setFiguresCaption();

    // Clear overlay buttons and hide sidebar
    const btnContainer = document.getElementById("figure-sidebar");
    if (btnContainer) {
        btnContainer.innerHTML = "";
        btnContainer.style.display = "none";
    }

    // Reload categories if needsUpdate flag is set (e.g., after saving secondary)
    if (uiState.figures.needsUpdate) {
        uiState.figures.needsUpdate = false;
        loadFiguresCategories();
    }
}

function switchToFigureTab(tabId) {
    const tabState = uiState.figures.tabs[tabId];
    if (!tabState) return;

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
    drawFigures();
    updateActionPanel();
    // Update overlay buttons
    updateFigureOverlayButtons();

    setFiguresCaption(tabState.name, { figureId: tabState.figureId, name: tabState.name, path: tabState.path });
}

function closeTab(tabId) {
    delete uiState.figures.tabs[tabId];
    if (uiState.figures.activeSubtab === tabId) {
        switchToCategories();
    } else {
        renderSubtabs();
    }
}

function setFiguresCaption(name = "Figures", context = null) {
    const config = {
        targetId: "caption",
        title: name,
        onMenu: context ? async (anchor) => {
            const items = await getFiguresCaptionMenuItems(context);
            menuManager.open(items, anchor);
        } : null
    };
    setCaptionBar(config);
}

function showFiguresMenu(anchor, context) {
    const items = [
        { label: "Reset Order", onClick: () => {
             if (context.path) runFigureScript(context.path, context.figureId);
        }},
        { label: "Save", onClick: () => saveFigureState(context) }
    ];
    menuManager.open(items, anchor);
}

/* OLD CODE - Moved to figuresMenuCmds.js
function saveFigureState(context) {
    const overlays = getActiveOverlays();
    const saveData = {
        figureId: context.figureId,
        timestamp: Date.now(),
        overlays: overlays.map(o => {
            const safeParams = {};
            const controls = o.controls || {};
            for (const key in o.params) {
                if (controls[key] && controls[key].control) continue;
                safeParams[key] = o.params[key];
            }
            return {
                id: o.figureId,
                params: safeParams
            };
        })
    };

    const json = JSON.stringify(saveData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${context.name.replace(/\s+/g, "_")}_saved.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
*/

function setFiguresText() {
  const el = document.getElementById("text");
  if (el) el.innerHTML = "Loading categories...";
}

function setFiguresSketchpad() {
    // The structure is now permanent in index.html.
    // We just need to ensure the canvas is in the correct place if it was moved.

    const sketchpad = document.getElementById("sketchpad");
    const canvas = window.drawCanvas;

    if (sketchpad && canvas && !sketchpad.contains(canvas)) {
        sketchpad.appendChild(canvas);
        canvas.style.display = "block";
    }

    // Ensure wrapper is visible if we are in figures tab (handled by switchTo...)
    // But initially, setFiguresSketchpad is called during init.
    // Layout logic is mostly in switch functions now.
}


/* ============================================================
   Category Loading
============================================================ */
async function loadFiguresCategories() {
  try {
    const res = await fetch("/figures/directoryRegistry.json");
    if (!res.ok) throw new Error("Failed to load directoryRegistry");
    const registry = await res.json();

    const categories = [];

    for (const key in registry) {
      const cat = registry[key];
      const dirPath = `/figures/${cat.directory}`;

      try {
        const manRes = await fetch(`${dirPath}/manifest.json`);
        if (manRes.ok) {
           const manifest = await manRes.json();
           const items = [];

           for (const figKey in manifest) {
             const fig = manifest[figKey];
             items.push({
               name: fig.name,
               hasSubitems: false,
               onClick: () => loadFigure(figKey, cat.directory, fig.name)
             });
           }

           // Load Saved Figures
           try {
               const savedRes = await fetch(`${dirPath}/saved/manifest.json`);
               if (savedRes.ok) {
                   const savedManifest = await savedRes.json();
                   for (const savedKey in savedManifest) {
                       const savedFig = savedManifest[savedKey];
                       items.push({
                           name: `${savedFig.name} >`,
                           hasSubitems: false,
                           onClick: () => loadSavedFigure(savedKey, cat.directory, savedFig.name, savedFig.ownerId)
                       });
                   }
               }
           } catch (e) {
               // Ignore missing saved manifest
           }

           categories.push({
             title: cat.name,
             items: items
           });
        }
      } catch (err) {
        console.warn(`Failed to load manifest for ${cat.name}`, err);
      }
    }

    renderCategories("text", categories);

  } catch (e) {
    console.error("Error loading figures categories:", e);
    document.getElementById("text").innerHTML = "Error loading categories.";
  }
}

async function loadFigure(figureId, directory, name) {
    const path = `/figures/${directory}/${figureId}.js`;
    const tabId = `tab-${figureId}`;

    // Check if already open
    if (!uiState.figures.tabs[tabId]) {
        // Run script to init state
        await runFigureScript(path, figureId);

        // Ensure name is stored
        if (uiState.figures.tabs[tabId]) {
            uiState.figures.tabs[tabId].name = name;
        }
    }

    switchToFigureTab(tabId);
}

async function loadSavedFigure(savedId, directory, name, ownerId) {
    const path = `/figures/${directory}/${ownerId}.js`;
    const savedPath = `/figures/${directory}/saved/${savedId}.json`;
    const tabId = `tab-${savedId}`; // Use savedId for uniqueness

    try {
        const res = await fetch(savedPath);
        if (!res.ok) throw new Error("Failed to load saved figure state");
        const savedConfig = await res.json();

        // Run script with saved config
        // Pass savedId as figureId so it stores under tab-savedId
        await runFigureScript(path, savedId, savedConfig);

        if (uiState.figures.tabs[tabId]) {
            uiState.figures.tabs[tabId].name = name;
        }

        switchToFigureTab(tabId);

    } catch (e) {
        console.error("Error loading saved figure:", e);
        alert("Failed to load saved figure.");
    }
}


/* ============================================================
   TabSpec for setUI.js
============================================================ */
export const FiguresTabSpec = {
  theme: "theme-figures",

  init: initFiguresTab,
  save: () => ({}),

  action:    setFiguresAction,
  subtabs:   setFiguresSubtabs,
  caption:   setFiguresCaption,
  text:      setFiguresText,
  sketchpad: setFiguresSketchpad
};
