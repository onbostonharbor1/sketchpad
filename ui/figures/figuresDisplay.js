/* figuresDisplay.js
   ============================================================
   Figures Tab -- Category Loading and Figure Display
   ============================================================
   Role:
     Owns everything related to loading the category list and
     loading individual figures.

   Architectural rules:
     * Does NOT build or activate subtabs. That is figuresNav.js.
     * Does NOT build the caption bar. That is figuresCommands.js.
     * Does NOT build figures. Saved figures open in Phase 10; until then
       a category item only reports that it cannot be opened yet.
     * Reads and writes figuresState.js via getters and setters.

   Data formats:
     directoryRegistry.json -- plain array of category name strings
     manifest.json          -- plain array of entry objects

   Where the files are:
     /figures/directoryRegistry.json        the list of categories
     /figures/<category>/manifest.json      the figures in one category,
                                            each { title, filename, ... }
     Both are kept by the local Node service (port 5174);
     node/createFigureService.mjs adds a category to the list. Until Save As
     exists (Phase 10) there are no saved figures, so the Categories
     subtab shows "No saved figures yet".

   Exports:
     loadFiguresCategories()
     loadFigure(filename, categoryName, title)
   ============================================================ */

import { renderCategories }    from "/ui/categories.js";
import { setFiguresRegistry }  from "./figuresState.js";


/* ============================================================
   loadFiguresCategories()
   ------------------------------------------------------------
   Reads the category list, then each category's manifest, and
   hands the result to the shared renderCategories() (ui/categories.js),
   which draws the same accordion list the other tabs show.

   "async" and "await": fetch() asks the local web server for a file
   and returns at once with a promise of the answer. "await" pauses
   this function (not the browser) until the answer arrives, so the
   code reads top to bottom like ordinary sequential code.
   ============================================================ */
export async function loadFiguresCategories() {

  try {
    const res = await fetch("/figures/directoryRegistry.json");
    if (!res.ok) throw new Error("Failed to load directoryRegistry");
    const registry = await res.json();

    setFiguresRegistry(registry);

    const categories = [];

    for (const categoryName of registry) {      // "for ... of" walks an array's values
      const dirPath = `/figures/${categoryName}`; // backquotes: ${...} is filled in

      // A missing or broken manifest skips that one category; it does
      // not stop the rest from loading.
      try {
        const manRes = await fetch(`${dirPath}/manifest.json`);
        if (!manRes.ok) continue;

        const manifest = await manRes.json();
        const items    = [];

        for (const fig of manifest) {
          const { title, filename } = fig;       // copies fig.title and fig.filename into two names
          items.push({
            name:        title,
            hasSubitems: false,
            // An arrow function: a small function written in place. It
            // remembers filename, categoryName and title from this
            // loop pass, so each item opens its own figure.
            onClick:     () => loadFigure(filename, categoryName, title)
          });
        }

        categories.push({ title: categoryName, items });

      } catch (err) {
        console.warn(`Failed to load manifest for ${categoryName}`, err);
      }
    }

    if (categories.length === 0) {
      document.getElementById("text").innerHTML =
        "<p style='padding:12px'>No saved figures yet. " +
        "Use Create Figure to start one.</p>";
    } else {
      renderCategories("text", categories);
    }

  } catch (e) {
    console.error("Error loading figures categories:", e);
    document.getElementById("text").innerHTML = "Error loading categories.";
  }

} // end loadFiguresCategories


/* ============================================================
   loadFigure(filename, categoryName, title)
   ------------------------------------------------------------
   Opening a saved figure arrives with Save As and reload
   (Phase 10). Until then there is nothing to open.

   When it is built, this will read the saved figure (plain data,
   see figureModel.js), open a new figure subtab for it, and rebuild
   one live instance per layer from each layer's id and params, the
   same way insertLayer() in figureLayers.js builds one today.
   ============================================================ */
export async function loadFigure(filename, categoryName, title) {

  console.warn(`loadFigure: saved figures cannot be opened yet (${categoryName}/${filename})`);

} // end loadFigure
