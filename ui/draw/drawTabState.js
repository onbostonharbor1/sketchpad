/* drawTabState.js
   ============================================================
   Draw Tab -- Shared Module State
   ============================================================
   Role:
     Owns the module-level variables shared across the Draw tab's
     split files. Currently this is a single variable -- the Set
     of drawRegistry IDs that have secondary objects on disk.

   Design rules:
     * No logic -- only variable declarations, getters, and setters.
     * No imports -- zero dependencies so any draw sub-module can
       import this without creating circular references.

   Variable glossary:
     idsWithSecondaries -- A Set<string> of drawRegistry IDs for
                           which at least one secondary object file
                           exists on disk. Populated (and refreshed)
                           by updateSecondariesDiscovery() in
                           drawNav.js. Used by renderDrawCategories()
                           in drawCategories.js to decide whether to
                           render a secondary-action button alongside
                           each category item.
                           Starts as an empty Set so that category
                           rendering works immediately on cold start,
                           before the async discovery completes.
   ============================================================ */

let idsWithSecondaries = new Set();


/* ============================================================
   Getter
   ============================================================ */
export function getIdsWithSecondaries() {
  return idsWithSecondaries;
} // end getIdsWithSecondaries


/* ============================================================
   Setter
   ============================================================ */
export function setIdsWithSecondaries(newSet) {
  idsWithSecondaries = newSet;
} // end setIdsWithSecondaries
