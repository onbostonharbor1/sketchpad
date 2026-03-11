/* utilitiesState.js
   ============================================================
   Utilities Tab -- Shared Module State
   ============================================================
   Role:
     Owns the module-level state that tracks the Utilities tab's
     current navigation position.

   Design rules:
     * This file contains NO logic -- only variable declarations
       and their getters/setters.
     * No imports. Must remain a pure data store with zero
       dependencies to avoid circular references.
     * All mutation goes through setter functions.

   Variable glossary:
     currentDomain   -- "Tools" or "Lab" (currently active subtab).
                        Null when not initialized.
     currentCategory -- Category string currently shown.
                        Null when in categories view.
     currentList     -- Array of entries in current category.
                        Empty when in categories view.
     currentIndex    -- Index within currentList. 0 when in categories view.
     hasRunUtility   -- Boolean flag tracking whether any utility has been
                        run (controls Result tab visibility).
   ============================================================ */

let currentDomain   = null;
let currentCategory = null;
let currentList     = [];
let currentIndex    = 0;
let hasRunUtility   = false;


/* ============================================================
   Getters
   ============================================================ */
export function getCurrentDomain()   { return currentDomain;   }
export function getCurrentCategory() { return currentCategory; }
export function getCurrentList()     { return currentList;     }
export function getCurrentIndex()    { return currentIndex;    }
export function getHasRunUtility()   { return hasRunUtility;   }


/* ============================================================
   Setters
   ============================================================ */
export function setCurrentDomain(domain)     { currentDomain   = domain;   }
export function setCurrentCategory(category) { currentCategory = category; }
export function setCurrentList(list)         { currentList     = list;     }
export function setCurrentIndex(index)       { currentIndex    = index;    }
export function setHasRunUtility(value)      { hasRunUtility   = !!value;  }


/* ============================================================
   resetUtilitiesState()
   ============================================================
   NOTE: hasRunUtility is NOT reset -- it persists for the session
   to keep the Result tab visible.
   ============================================================ */
export function resetUtilitiesState() {
  currentDomain   = null;
  currentCategory = null;
  currentList     = [];
  currentIndex    = 0;
} // end resetUtilitiesState
