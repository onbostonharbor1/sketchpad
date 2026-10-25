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

   Exports:
     loadFiguresCategories()
     loadFigure(filename, categoryName, title)
   ============================================================ */

import { renderCategories }    from "/ui/categories.js";
import { setFiguresRegistry }  from "./figuresState.js";


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
   ============================================================ */
export async function loadFigure(filename, categoryName, title) {

  console.warn(`loadFigure: saved figures cannot be opened yet (${categoryName}/${filename})`);

} // end loadFigure
