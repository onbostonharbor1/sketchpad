/* galleryState.js
   ============================================================
   Gallery Tab — Shared Module State
   ============================================================
   Role:
     Owns the module-level variables that track the Gallery tab's
     current navigation position and cached manifest data.

     Before this file existed, these variables lived as private
     `let` declarations inside gallery.js. Once the Gallery tab
     was split into multiple files (galleryNav.js, galleryResults.js,
     galleryMenuCmds.js), each file needed access to the same
     variables. Rather than passing them as arguments through every
     function call, they are centralised here and shared via
     named exports.

   Design rules:
     • This file contains NO logic — only variable declarations
       and their getters/setters.
     • No imports. This file must remain a pure data store with
       zero dependencies so it can be imported by any gallery
       sub-module without creating circular references.
     • All mutation goes through the setter functions so that
       there is one clear place to add debugging or validation
       in the future if needed.

   Consumers:
     gallery.js         — init/reset, rehydrate
     galleryNav.js      — read cache, read/write domain & category
     galleryResults.js  — read/write all state during result display
     galleryMenuCmds.js — read currentCategory for caption info object

   Variable glossary:
     galleryCache    — The full manifest data, shaped as:
                         { Ideabook: { cat: [entries] },
                           Patterns: { cat: [entries] },
                           Scripts:  { cat: [entries] } }
                       Null when cache has been cleared or not yet loaded.

     currentDomain   — The domain string currently shown in the
                       Results view ("Ideabook", "Patterns", "Scripts").
                       Null when in Categories view.

     currentCategory — The category string currently shown in the
                       Results view (e.g. "curve_stitch").
                       Null when in Categories view.

     currentList     — The array of manifest entries for the active
                       category. Used by prev/next navigation.
                       Empty array when not in Results view.

     currentIndex    — The zero-based index of the active entry
                       within currentList.
                       0 when not in Results view.
   ============================================================ */


/* ------------------------------------------------------------
   Raw state variables
   These are the single source of truth for gallery navigation.
   Do not import and mutate these directly from other modules —
   use the setters below so mutation is traceable.
------------------------------------------------------------ */
let galleryCache    = null;
let currentDomain   = null;
let currentCategory = null;
let currentList     = [];
let currentIndex    = 0;


/* ============================================================
   Getters
   ============================================================ */

/* getGalleryCache()
   -----------------
   Returns the full cache object or null if not yet loaded.
   Callers should check for null before reading domain keys. */
export function getGalleryCache()    { return galleryCache;    }

/* getCurrentDomain()
   ------------------
   Returns the domain string active in the Results view,
   or null when the tab is showing a category list. */
export function getCurrentDomain()   { return currentDomain;   }

/* getCurrentCategory()
   --------------------
   Returns the category string active in the Results view,
   or null when the tab is showing a category list. */
export function getCurrentCategory() { return currentCategory; }

/* getCurrentList()
   ----------------
   Returns the manifest entry array for the active category.
   Always an array (never null); empty when not in Results view. */
export function getCurrentList()     { return currentList;     }

/* getCurrentIndex()
   -----------------
   Returns the zero-based index of the active entry in currentList.
   0 when not in Results view. */
export function getCurrentIndex()    { return currentIndex;    }


/* ============================================================
   Setters
   ============================================================ */

/* setGalleryCache(value)
   ----------------------
   Replaces the entire cache object.
   Pass null to mark the cache as stale and force a reload on
   the next call to ensureGalleryCacheLoaded(). */
export function setGalleryCache(value)    { galleryCache    = value; }

/* setCurrentDomain(value)
   -----------------------
   Sets the active domain. Should be one of the DOMAIN_* constants
   defined in gallery.js, or null when leaving Results view. */
export function setCurrentDomain(value)   { currentDomain   = value; }

/* setCurrentCategory(value)
   -------------------------
   Sets the active category string, or null when leaving Results view. */
export function setCurrentCategory(value) { currentCategory = value; }

/* setCurrentList(value)
   ---------------------
   Replaces the active entry array. Pass [] when leaving Results view. */
export function setCurrentList(value)     { currentList     = value; }

/* setCurrentIndex(value)
   ----------------------
   Sets the active index. Should always be a valid index within
   currentList, or 0 when resetting. */
export function setCurrentIndex(value)    { currentIndex    = value; }


/* ============================================================
   resetGalleryState()
   ============================================================
   Convenience function that resets all state variables to their
   initial values in a single call.

   Called by:
     initGalleryTab()  — on every cold start to ensure stale
                         state from a previous session does not
                         leak into the new one.
   ============================================================ */
export function resetGalleryState() {
  galleryCache    = null;
  currentDomain   = null;
  currentCategory = null;
  currentList     = [];
  currentIndex    = 0;
} // end resetGalleryState
