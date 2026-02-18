/* drawCategories.js
   ============================================================
   Draw Tab — Category View Rendering
   ============================================================
   Role:
     Owns the category view for the Draw tab — reading from
     window.drawRegistry, grouping entries by category, and
     rendering the category frames into #text via categories.js.

     Each category item optionally shows a secondary-action
     button (the ">" chevron) when the registry ID has saved
     secondary objects on disk. That button opens the secondary
     objects offcanvas, handled by drawNav.js.

   Architectural rules:
     • Does NOT manage subtabs or tab switching. drawNav.js.
     • Does NOT build caption bars or commands panels. drawMenuCmds.js.
     • Does NOT own TabSpec, init(), or restore(). draw.js.
     • Reads idsWithSecondaries via getter from drawState.js.
     • The secondaryAction callback delegates to showSecondaryOffcanvas()
       in drawNav.js via import — keeping rendering logic clean.

   Exports:
     setDrawText()              — TabSpec region builder entry point
     collectRegistryEntries()   — reads window.drawRegistry into a flat list
     groupEntriesByCategory()   — groups and sorts the flat list
     renderDrawCategories()     — builds descriptor and calls renderCategories()
   ============================================================ */

import { renderCategories } from "../categories.js";
import { getIdsWithSecondaries } from "./drawState.js";


/* ============================================================
   setDrawText()
   ============================================================
   TabSpec region builder for #text. Called by DrawTabSpec and
   by switchTab() in drawNav.js when activating the Categories
   subtab.

   Simply delegates to renderDrawCategories() since the only
   content for #text in the Draw tab is the category list.
   ============================================================ */
export function setDrawText() {
  renderDrawCategories();
} // end setDrawText


/* ============================================================
   collectRegistryEntries()
   ============================================================
   Reads window.drawRegistry and returns a flat array of entry
   descriptor objects, one per registered draw object.

   Each descriptor includes:
     key      — the registry key string (e.g. "mysticRose")
     name     — display name (entry.name or falls back to key)
     category — category string (entry.category or "uncategorized")
     entry    — the full registry entry object

   Returns:
     Array of { key, name, category, entry }
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
   ============================================================
   Groups a flat list of registry entry descriptors into a map
   keyed by category, with both categories and items within
   each category sorted alphabetically.

   Arguments:
     list — array of { key, name, category, entry } descriptors
            (as returned by collectRegistryEntries)

   Returns:
     { categoryName: [descriptor, ...], ... }
     Both the outer keys and inner arrays are sorted alphabetically.
   ============================================================ */
export function groupEntriesByCategory(list = []) {

  /* Group into unsorted map first. */
  const grouped = {};
  list.forEach((it) => {
    if (!grouped[it.category]) grouped[it.category] = [];
    grouped[it.category].push(it);
  });

  /* Rebuild with sorted keys and sorted items within each group. */
  const sorted = {};
  Object.keys(grouped).sort().forEach((cat) => {
    sorted[cat] = grouped[cat].sort((a, b) => a.name.localeCompare(b.name));
  });

  return sorted;

} // end groupEntriesByCategory


/* ============================================================
   renderDrawCategories()
   ============================================================
   Builds the category descriptor array from window.drawRegistry
   and renders it into #text via renderCategories().

   Each item in the descriptor has:
     name            — the entry display name
     hasSubitems     — false (Draw items open in a new subtab)
     onClick         — opens a new Draw subtab for this entry
     secondaryAction — opens the secondary objects offcanvas,
                       present only if this ID has secondaries

   The secondaryAction is wired via a dynamic import of
   drawNav.js to avoid a static circular dependency
   (drawNav.js imports drawCategories.js for renderDrawCategories).
   ============================================================ */
export function renderDrawCategories() {

  const idsWithSecondaries = getIdsWithSecondaries();

  const grouped    = groupEntriesByCategory(collectRegistryEntries());
  const descriptor = Object.entries(grouped).map(([cat, items]) => ({
    title: cat,
    items: items.map((it) => ({
      name:        it.name,
      hasSubitems: false,

      /* Opening a draw object creates a new subtab. */
      onClick: () => {
        import("./drawNav.js").then((m) => {
          m.addDrawSubtab({ name: it.name, entry: it.entry });
        });
      },

      /* Secondary action button — only shown when secondaries exist. */
      secondaryAction: idsWithSecondaries.has(it.key)
        ? () => {
            import("./drawNav.js").then((m) => {
              m.showSecondaryOffcanvas(it.key);
            });
          }
        : null
    }))
  }));

  renderCategories("text", descriptor);

} // end renderDrawCategories
