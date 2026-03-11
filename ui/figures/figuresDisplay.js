/* figuresDisplay.js
   ============================================================
   Figures Tab -- Category Loading and Figure Display
   ============================================================
   Role:
     Owns everything related to loading the category list and
     loading individual figures.

   Architectural rules:
     * Does NOT build or activate subtabs. That is figuresNav.js.
     * Does NOT build the caption bar. That is figuresMenuCmds.js.
     * Does NOT execute figure scripts directly. Uses figuresRunner.js.
     * Reads and writes figuresState.js via getters and setters.

   Data formats:
     directoryRegistry.json -- plain array of category name strings
     manifest.json          -- plain array of entry objects

   Exports:
     loadFiguresCategories()
     loadFigure(filename, categoryName, title)
   ============================================================ */

import { renderCategories }    from "/ui/categories.js";
import { setFiguresRegistry }  from "./figuresState.js";
import { runFigureScript }     from "/ui/figuresRunner.js";


/* ============================================================
   loadFiguresCategories()
   ============================================================ */
export async function loadFiguresCategories() {

  try {
    const res = await fetch("/figures/directoryRegistry.json");
    if (!res.ok) throw new Error("Failed to load directoryRegistry");
    const registry = await res.json();

    setFiguresRegistry(registry);

    const categories = [];

    for (const categoryName of registry) {
      const dirPath = `/figures/${categoryName}`;

      try {
        const manRes = await fetch(`${dirPath}/manifest.json`);
        if (!manRes.ok) continue;

        const manifest = await manRes.json();
        const items    = [];

        for (const fig of manifest) {
          const { title, filename } = fig;
          items.push({
            name:        title,
            hasSubitems: false,
            onClick:     () => loadFigure(filename, categoryName, title)
          });
        }

        categories.push({ title: categoryName, items });

      } catch (err) {
        console.warn(`Failed to load manifest for ${categoryName}`, err);
      }
    }

    renderCategories("text", categories);

  } catch (e) {
    console.error("Error loading figures categories:", e);
    document.getElementById("text").innerHTML = "Error loading categories.";
  }

} // end loadFiguresCategories


/* ============================================================
   loadFigure(filename, categoryName, title)
   ============================================================ */
export async function loadFigure(filename, categoryName, title) {

  const path     = `/figures/${categoryName}/${filename}`;
  const figureId = filename.replace(/\.js$/, "");
  const tabId    = `tab-${figureId}`;

  if (!uiState.figures.tabs[tabId]) {
    await runFigureScript(path, figureId);

    if (uiState.figures.tabs[tabId]) {
      uiState.figures.tabs[tabId].title        = title;
      uiState.figures.tabs[tabId].categoryName = categoryName;
      uiState.figures.tabs[tabId].scriptPath   = path;
    }
  }

  const { switchToFigureTab } = await import("/ui/figures/figuresNav.js");
  switchToFigureTab(tabId);

} // end loadFigure
