/* patternsState.js
   ============================================================
   Patterns Tab -- Shared Module State
   ============================================================
   Role:
     Owns the module-level state that tracks the Patterns tab's
     current navigation position.

   Design rules:
     * This file contains NO logic -- only variable declarations
       and their getters/setters.
     * No imports. Must remain a pure data store with zero
       dependencies to avoid circular references.
     * All mutation goes through setter functions for debugging
       and validation.

   Variable glossary:
     currentCategory -- Category string currently shown in
                        Pattern view (e.g. "Chladni").
                        Null when in Categories view.
     currentIndex    -- Index of the currently displayed pattern
                        within currentCategory's entry list.
                        Null when in Categories view.
   ============================================================ */

let currentCategory = null;
let currentIndex    = null;


/* ============================================================
   Getters
   ============================================================ */
export function getCurrentCategory() {
  return currentCategory;
}

export function getCurrentIndex() {
  return currentIndex;
}


/* ============================================================
   Setters
   ============================================================ */
export function setCurrentCategory(category) {
  currentCategory = category;
}

export function setCurrentIndex(index) {
  currentIndex = index;
}


/* ============================================================
   Reset (used by init)
   ============================================================ */
export function resetPatternsState() {
  currentCategory = null;
  currentIndex    = null;
}
