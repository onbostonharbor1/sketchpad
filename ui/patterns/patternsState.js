/* patternsState.js
   ============================================================
   Patterns Tab — Shared Module State
   ============================================================
   Role:
     Owns the module-level state that tracks the Patterns tab's
     current navigation position and manifest cache.

     Before this file existed, these were private `let` variables
     inside patterns.js. Once split into multiple files, each
     sub-module needs access to the same state. Rather than passing
     through every function call, they are centralized here.

   Design rules:
     • This file contains NO logic — only variable declarations
       and their getters/setters.
     • No imports. Must remain a pure data store with zero
       dependencies to avoid circular references.
     • All mutation goes through setter functions for debugging
       and validation.

   Consumers:
     patterns.js         — init/reset, rehydrate, cache loading
     patternsNav.js      — read/write category state
     patternsDisplay.js  — read/write all state during display
     patternsMenuCmds.js — read currentCategory for menu context

   Variable glossary:
     patternsCache     — Manifest data shaped as:
                         { categoryName: [entries], ... }
                         Null when not yet loaded or cleared.

     currentCategory   — Category string currently shown in
                         Pattern view (e.g. "Chladni").
                         Null when in Categories view.

     currentIndex      — Index of the currently displayed pattern
                         within currentCategory's entry list.
                         Null when in Categories view.
   ============================================================ */

/* ============================================================
   Module-level state variables
   ============================================================ */
let patternsCache   = null;
let currentCategory = null;
let currentIndex    = null;


/* ============================================================
   Getters
   ============================================================ */

export function getPatternsCache() {
  return patternsCache;
}

export function getCurrentCategory() {
  return currentCategory;
}

export function getCurrentIndex() {
  return currentIndex;
}


/* ============================================================
   Setters
   ============================================================ */

export function setPatternsCache(cache) {
  patternsCache = cache;
}

export function setCurrentCategory(category) {
  currentCategory = category;
}

export function setCurrentIndex(index) {
  currentIndex = index;
}


/* ============================================================
   Reset (used by init)
   ============================================================
   NOTE: Does NOT clear patternsCache - that cache persists
   across navigation and is only cleared by explicit cache
   invalidation (e.g. after rebuild). This function only
   resets the navigation pointers.
   ============================================================ */

export function resetPatternsState() {
  currentCategory = null;
  currentIndex    = null;
}
