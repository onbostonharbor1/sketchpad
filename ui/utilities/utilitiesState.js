/* utilitiesState.js
   ============================================================
   Utilities Tab — Shared Module State
   ============================================================
   Role:
     Owns the module-level state that tracks the Utilities tab's
     current navigation position and manifest cache.

     Before this file existed, these were private `let` variables
     inside utilities.js. Once split into multiple files, each
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
     utilities.js         — init/reset, rehydrate, cache loading
     utilitiesNav.js      — read/write tab state, hasRunUtility flag
     utilitiesDisplay.js  — read cache, display utilities
     utilitiesMenuCmds.js — read current utility context

   Variable glossary:
     utilitiesCache      — Manifest data shaped as:
                           { Tools: { category: [entries] },
                             Lab:   { category: [entries] } }
                           Null when not yet loaded or cleared.

     currentDomain       — "Tools" or "Lab" (currently active subtab)
                           Null when in Result view or not initialized.

     currentCategory     — Category string currently shown.
                           Null when in categories view.

     currentList         — Array of entries in current category.
                           Empty when in categories view.

     currentIndex        — Index within currentList.
                           0 when in categories view.

     hasRunUtility       — Boolean flag tracking whether any utility
                           has been run (controls Result tab visibility).
   ============================================================ */

/* ============================================================
   Module-level state variables
   ============================================================ */
let utilitiesCache  = null;
let currentDomain   = null;
let currentCategory = null;
let currentList     = [];
let currentIndex    = 0;
let hasRunUtility   = false;


/* ============================================================
   Getters
   ============================================================ */

export function getUtilitiesCache() {
  return utilitiesCache;
}

export function getCurrentDomain() {
  return currentDomain;
}

export function getCurrentCategory() {
  return currentCategory;
}

export function getCurrentList() {
  return currentList;
}

export function getCurrentIndex() {
  return currentIndex;
}

export function getHasRunUtility() {
  return hasRunUtility;
}


/* ============================================================
   Setters
   ============================================================ */

export function setUtilitiesCache(cache) {
  utilitiesCache = cache;
}

export function setCurrentDomain(domain) {
  currentDomain = domain;
}

export function setCurrentCategory(category) {
  currentCategory = category;
}

export function setCurrentList(list) {
  currentList = list;
}

export function setCurrentIndex(index) {
  currentIndex = index;
}

export function setHasRunUtility(value) {
  hasRunUtility = !!value;
}


/* ============================================================
   Reset (used by init)
   ============================================================
   NOTE: Does NOT clear utilitiesCache - that cache persists
   across navigation and is only cleared by explicit cache
   invalidation (e.g. after rebuild). This function only
   resets the navigation pointers.
   
   hasRunUtility is also preserved - once true, it stays true
   for the session to keep the Result tab visible.
   ============================================================ */

export function resetUtilitiesState() {
  currentDomain   = null;
  currentCategory = null;
  currentList     = [];
  currentIndex    = 0;
  // Note: utilitiesCache and hasRunUtility are NOT reset
}
