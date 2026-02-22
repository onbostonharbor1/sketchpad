/* patternsState.js
   ============================================================
   Patterns Tab â€” Shared Module State
   ============================================================
   Role:
     Owns the module-level state that tracks the Patterns tab's
     current navigation position.

     Before this file existed, these were private `let` variables
     inside patterns.js. Once split into multiple files, each
     sub-module needs access to the same state. Rather than passing
     through every function call, they are centralized here.

   Design rules:
     â€¢ This file contains NO logic â€” only variable declarations
       and their getters/setters.
     â€¢ No imports. Must remain a pure data store with zero
       dependencies to avoid circular references.
     â€¢ All mutation goes through setter functions for debugging
       and validation.

   Consumers:
     patterns.js         â€” init/reset, rehydrate, cache loading
     patternsNav.js      â€” read/write category state
     patternsDisplay.js  â€” read/write all state during display
     patternsMenuCmds.js â€” read currentCategory for menu context

   Variable glossary:
     patternsCache     â€” Manifest data shaped as:
                         { categoryName: [entries], ... }
                         Null when not yet loaded or cleared.

     currentCategory   â€” Category string currently shown in
                         Pattern view (e.g. "Chladni").
                         Null when in Categories view.

     currentIndex      â€” Index of the currently displayed pattern
                         within currentCategory's entry list.
                         Null when in Categories view.
   ============================================================ */

/* ============================================================
   Module-level state variables
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
   ============================================================
   Resets navigation pointers only.
   Manifest data lives in ManifestManager — cleared via manifest.clearCache().
   ============================================================ */

export function resetPatternsState() {
  currentCategory = null;
  currentIndex    = null;
}
