/* utilitiesState.js
   ============================================================
   Utilities Tab â€” Shared Module State
   ============================================================
   Role:
     Owns the module-level state that tracks the Utilities tab's
     current navigation position.

     Before this file existed, these were private `let` variables
     inside utilities.js. Once split into multiple files, each
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
     utilities.js         â€” init/reset, rehydrate, cache loading
     utilitiesNav.js      â€” read/write tab state, hasRunUtility flag
     utilitiesDisplay.js  â€” read cache, display utilities
     utilitiesMenuCmds.js â€” read current utility context

   Variable glossary:
     utilitiesCache      â€” Manifest data shaped as:
                           { Tools: { category: [entries] },
                             Lab:   { category: [entries] } }
                           Null when not yet loaded or cleared.

     currentDomain       â€” "Tools" or "Lab" (currently active subtab)
                           Null when in Result view or not initialized.

     currentCategory     â€” Category string currently shown.
                           Null when in categories view.

     currentList         â€” Array of entries in current category.
                           Empty when in categories view.

     currentIndex        â€” Index within currentList.
                           0 when in categories view.

     hasRunUtility       â€” Boolean flag tracking whether any utility
                           has been run (controls Result tab visibility).
   ============================================================ */

/* ============================================================
   Module-level state variables
   ============================================================ */
let currentDomain   = null;
let currentCategory = null;
let currentList     = [];
let currentIndex    = 0;
let hasRunUtility   = false;


/* ============================================================
   Getters
   ============================================================ */

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
   Resets navigation pointers only.
   Manifest data lives in ManifestManager — cleared via manifest.clearCache().

   hasRunUtility is preserved — once true, it stays true
   for the session to keep the Result tab visible.
   ============================================================ */

export function resetUtilitiesState() {
  currentDomain   = null;
  currentCategory = null;
  currentList     = [];
  currentIndex    = 0;
  // Note: hasRunUtility is NOT reset (persists for session)
}
