/* homeState.js
   ============================================================
   Home Tab -- Shared Module State
   ============================================================
   Role:
     Owns the module-level variables that the Home tab subsystem
     shares across its split files.

   Design rules:
     * No logic -- only variable declarations, getters, and setters.
     * No imports -- zero dependencies so any home sub-module can
       import this file without creating circular references.
     * All mutation goes through the setter functions.

   Variable glossary:
     homeManifestGrouped    -- The manifest data reshaped into a map:
                               { statusKey: [entry, ...], ... }
                               Null until groupHomeEntriesByStatus() runs.
     homeResultsRenderToken -- An incrementing integer used to detect
                               stale async renders.
   ============================================================ */

let homeManifestGrouped    = null;
let homeResultsRenderToken = 0;


/* ============================================================
   Getters
   ============================================================ */
export function getHomeManifestGrouped()    { return homeManifestGrouped;    }
export function getHomeResultsRenderToken() { return homeResultsRenderToken; }


/* ============================================================
   Setters
   ============================================================ */
export function setHomeManifestGrouped(value) { homeManifestGrouped = value; }

export function incrementHomeResultsRenderToken() {
  homeResultsRenderToken += 1;
  return homeResultsRenderToken;
} // end incrementHomeResultsRenderToken


/* ============================================================
   resetHomeState()
   ============================================================
   NOTE: homeResultsRenderToken is intentionally NOT reset to 0
   here -- resetting it could cause a stale in-flight render
   from the previous session to match the new token.
   ============================================================ */
export function resetHomeState() {
  homeManifestGrouped = null;
} // end resetHomeState
