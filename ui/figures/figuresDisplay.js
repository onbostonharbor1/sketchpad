/* figuresDisplay.js
   ============================================================
   Figures Tab â€” Category Loading and Figure Display
   ============================================================
   Role:
     Owns everything related to loading the category list and
     loading individual figures (both base figures and saved
     figure states).

     This file handles the async data fetching (registry,
     manifests, saved states) and coordinates with figuresRunner.js
     to execute the figure scripts.

   Architectural rules:
     â€¢ Does NOT build or activate subtabs. That is figuresNav.js.
     â€¢ Does NOT build the caption bar. That is figuresMenuCmds.js.
     â€¢ Does NOT execute figure scripts directly. Uses figuresRunner.js.
     â€¢ Reads and writes figuresState.js via getters and setters.

   Exports:
     loadFiguresCategories()
     loadFigure(figureId, directory, name)
     loadSavedFigure(savedId, directory, name, ownerId)
   ============================================================ */

import { renderCategories } from "../categories.js";
import { getFiguresRegistry, setFiguresRegistry } from "./figuresState.js";
import { runFigureScript } from "../figuresRunner.js";


/* ============================================================
   loadFiguresCategories()
   ------------------------------------------------------------
   Loads the directory registry and all category manifests,
   then renders the category frames into #text.
   ============================================================ */
export async function loadFiguresCategories() {
  try {
    // Load the main directory registry
    const res = await fetch("/figures/directoryRegistry.json");
    if (!res.ok) throw new Error("Failed to load directoryRegistry");
    const registry = await res.json();

    // Cache the registry
    setFiguresRegistry(registry);

    const categories = [];

    // Load each category's manifest
    for (const key in registry) {
      const cat = registry[key];
      const dirPath = `/figures/${cat.directory}`;

      try {
        const manRes = await fetch(`${dirPath}/manifest.json`);
        if (manRes.ok) {
          const manifest = await manRes.json();
          const items = [];

          // Base figures
          for (const figKey in manifest) {
            const fig = manifest[figKey];
            items.push({
              name: fig.name,
              hasSubitems: false,
              onClick: () => loadFigure(figKey, cat.directory, fig.name)
            });
          }

          // Saved figures
          try {
            const savedRes = await fetch(`${dirPath}/saved/manifest.json`);
            if (savedRes.ok) {
              const savedManifest = await savedRes.json();
              for (const savedKey in savedManifest) {
                const savedFig = savedManifest[savedKey];
                items.push({
                  name: `${savedFig.name} >`,
                  hasSubitems: false,
                  onClick: () => loadSavedFigure(
                    savedKey,
                    cat.directory,
                    savedFig.name,
                    savedFig.ownerId
                  )
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
} // end loadFiguresCategories


/* ============================================================
   loadFigure(figureId, directory, name)
   ------------------------------------------------------------
   Loads a base figure and opens it in a new tab.
   If the tab already exists, just switches to it.
   ============================================================ */
export async function loadFigure(figureId, directory, name) {
  const path = `/figures/${directory}/${figureId}.js`;
  const tabId = `tab-${figureId}`;

  // Check if already open
  if (!uiState.figures.tabs[tabId]) {
    // Run script to init state
    await runFigureScript(path, figureId);

    // Ensure name and manifest context are stored
    if (uiState.figures.tabs[tabId]) {
      uiState.figures.tabs[tabId].name         = name;
      uiState.figures.tabs[tabId].directory    = directory;
      uiState.figures.tabs[tabId].manifestPath = `/figures/${directory}/manifest.json`;
      uiState.figures.tabs[tabId].matchField   = "id";
      uiState.figures.tabs[tabId].matchValue   = figureId;
      uiState.figures.tabs[tabId].scriptPath   = path;
    }
  }

  // Switch to the tab
  const { switchToFigureTab } = await import("./figuresNav.js");
  switchToFigureTab(tabId);
} // end loadFigure


/* ============================================================
   loadSavedFigure(savedId, directory, name, ownerId)
   ------------------------------------------------------------
   Loads a saved figure state and opens it in a new tab.
   ============================================================ */
export async function loadSavedFigure(savedId, directory, name, ownerId) {
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

    // Switch to the tab
    const { switchToFigureTab } = await import("./figuresNav.js");
    switchToFigureTab(tabId);

  } catch (e) {
    console.error("Error loading saved figure:", e);
    alert("Failed to load saved figure.");
  }
} // end loadSavedFigure
