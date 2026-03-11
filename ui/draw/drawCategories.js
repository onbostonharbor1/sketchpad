/* drawCategories.js
   ============================================================
   Draw Tab -- Category View Rendering
   ============================================================
   Role:
     Owns the category view for the Draw tab -- reading from
     window.drawRegistry, grouping entries by category, and
     rendering the category frames into #text via categories.js.

     Each category item optionally shows a secondary-action
     button (the ">" chevron) when the registry ID has saved
     secondary objects on disk. That button opens the secondary
     objects offcanvas, handled by drawNav.js.

   Architectural rules:
     * Does NOT manage subtabs or tab switching. drawNav.js.
     * Does NOT build caption bars or commands panels. drawMenuCmds.js.
     * Does NOT own TabSpec, init(), or restore(). draw.js.
     * Reads idsWithSecondaries via getter from drawTabState.js.
     * The secondaryAction callback delegates to showSecondaryOffcanvas()
       in drawNav.js via import -- keeping rendering logic clean.

   Exports:
     setDrawText()              -- TabSpec region builder entry point
     collectRegistryEntries()   -- reads window.drawRegistry into a flat list
     groupEntriesByCategory()   -- groups and sorts the flat list
     renderDrawCategories()     -- builds descriptor and calls renderCategories()
   ============================================================ */

import { renderCategories }      from "/ui/categories.js";
import { getIdsWithSecondaries } from "./drawTabState.js";


/* ============================================================
   setDrawText()
   ============================================================ */
export function setDrawText() {
  renderDrawCategories();
} // end setDrawText


/* ============================================================
   collectRegistryEntries()
   ============================================================ */
export function collectRegistryEntries() {

  return Object.entries(window.drawRegistry || {}).map(([key, entry]) => ({
    key,
    name:     entry.name     || key,
    category: entry.category || "uncategorized",
    entry
  }));

} // end collectRegistryEntries


/* ============================================================
   groupEntriesByCategory(list)
   ============================================================ */
export function groupEntriesByCategory(list = []) {

  const grouped = {};
  list.forEach((it) => {
    if (!grouped[it.category]) grouped[it.category] = [];
    grouped[it.category].push(it);
  });

  const sorted = {};
  Object.keys(grouped).sort().forEach((cat) => {
    sorted[cat] = grouped[cat].sort((a, b) => a.name.localeCompare(b.name));
  });

  return sorted;

} // end groupEntriesByCategory


/* ============================================================
   renderDrawCategories()
   ============================================================ */
export function renderDrawCategories() {

  const idsWithSecondaries = getIdsWithSecondaries();

  const grouped    = groupEntriesByCategory(collectRegistryEntries());
  const descriptor = Object.entries(grouped).map(([cat, items]) => ({
    title: cat,
    items: items.map((it) => ({
      name:        it.name,
      hasSubitems: false,

      onClick: () => {
        import("/ui/draw/drawNav.js").then((m) => {
          m.addDrawSubtab({ name: it.name, entry: it.entry });
        });
      },

      secondaryAction: idsWithSecondaries.has(it.key)
        ? () => {
            import("/ui/draw/drawNav.js").then((m) => {
              m.showSecondaryOffcanvas(it.key);
            });
          }
        : null
    }))
  }));

  renderCategories("text", descriptor);

} // end renderDrawCategories
