/* galleryState.js
   ============================================================
   Gallery Tab -- Shared Module State
   ============================================================
   Role:
     Owns the module-level variables that track the Gallery tab's
     current navigation position and cached manifest data.

   Design rules:
     * This file contains NO logic -- only variable declarations
       and their getters/setters.
     * No imports. Must remain a pure data store with zero
       dependencies to avoid circular references.
     * All mutation goes through the setter functions so that
       there is one clear place to add debugging or validation.

   Variable glossary:
     galleryCache    -- The full manifest data, shaped as:
                          { Ideabook: { cat: [entries] },
                            Patterns: { cat: [entries] },
                            Scripts:  { cat: [entries] } }
                        Null when cache has been cleared or not yet loaded.
     currentDomain   -- The domain string currently shown in the
                        Results view ("Ideabook", "Patterns", "Scripts").
                        Null when in Categories view.
     currentCategory -- The category string currently shown in the
                        Results view. Null when in Categories view.
     currentList     -- The array of manifest entries for the active
                        category. Empty array when not in Results view.
     currentIndex    -- The zero-based index of the active entry
                        within currentList. 0 when not in Results view.
   ============================================================ */

let galleryCache    = null;
let currentDomain   = null;
let currentCategory = null;
let currentList     = [];
let currentIndex    = 0;


/* ============================================================
   Getters
   ============================================================ */
export function getGalleryCache()    { return galleryCache;    }
export function getCurrentDomain()   { return currentDomain;   }
export function getCurrentCategory() { return currentCategory; }
export function getCurrentList()     { return currentList;     }
export function getCurrentIndex()    { return currentIndex;    }


/* ============================================================
   Setters
   ============================================================ */
export function setGalleryCache(value)    { galleryCache    = value; }
export function setCurrentDomain(value)   { currentDomain   = value; }
export function setCurrentCategory(value) { currentCategory = value; }
export function setCurrentList(value)     { currentList     = value; }
export function setCurrentIndex(value)    { currentIndex    = value; }


/* ============================================================
   resetGalleryState()
   ============================================================ */
export function resetGalleryState() {
  galleryCache    = null;
  currentDomain   = null;
  currentCategory = null;
  currentList     = [];
  currentIndex    = 0;
} // end resetGalleryState
