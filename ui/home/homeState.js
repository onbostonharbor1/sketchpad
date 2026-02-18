/* homeState.js
   ============================================================
   Home Tab — Shared Module State
   ============================================================
   Role:
     Owns the module-level variables that the Home tab subsystem
     shares across its split files. Before this file existed,
     these variables lived as private `let` declarations inside
     the monolithic home.js. Once Home was split into multiple
     files (homeNav.js, homeManifest.js, homeResults.js,
     homeMenuCmds.js), each file needed access to the same
     variables without duplicating them.

   Design rules:
     • No logic — only variable declarations, getters, and setters.
     • No imports — zero dependencies so any home sub-module can
       import this file without creating circular references.
     • All mutation goes through the setter functions so there is
       one clear place to add debugging or validation if needed.

   Consumers:
     home.js          — reset on cold start via resetHomeState()
     homeManifest.js  — reads/writes manifest data and logged flag
     homeNav.js       — reads grouped data to render categories
     homeResults.js   — reads/writes the render token

   Variable glossary:
     homeManifestLogged   — Guards against repeated manifest loads
                            within a single session. Set to true on
                            the first load; reset on cold start.

     homeManifestData     — The raw flat array loaded from
                            /home/manifest.json. Null until loaded.

     homeManifestGrouped  — The manifest data reshaped into a map:
                              { statusKey: [entry, ...], ... }
                            Used by renderHomeCategories(). Null
                            until groupHomeEntriesByStatus() runs.

     homeResultsRenderToken — An incrementing integer used to
                            detect stale async renders. Incremented
                            each time renderHomeResults() starts.
                            Async renderers compare their captured
                            token against this value before writing
                            to the DOM; if mismatched, they abort.
   ============================================================ */


/* ------------------------------------------------------------
   Raw state variables
   Do not import and mutate these directly from other modules —
   use the setters below so mutation is traceable.
------------------------------------------------------------ */
let homeManifestLogged      = false;
let homeManifestData        = null;
let homeManifestGrouped     = null;
let homeResultsRenderToken  = 0;


/* ============================================================
   Getters
   ============================================================ */

/* getHomeManifestLogged()
   -----------------------
   Returns true if the manifest load has already been kicked
   for this session, false otherwise. */
export function getHomeManifestLogged()  { return homeManifestLogged;  }

/* getHomeManifestData()
   ---------------------
   Returns the raw flat manifest array, or null if not yet loaded. */
export function getHomeManifestData()    { return homeManifestData;    }

/* getHomeManifestGrouped()
   ------------------------
   Returns the grouped manifest map { status: [entries] },
   or null if not yet loaded and grouped. */
export function getHomeManifestGrouped() { return homeManifestGrouped; }

/* getHomeResultsRenderToken()
   ---------------------------
   Returns the current render token integer. */
export function getHomeResultsRenderToken() { return homeResultsRenderToken; }


/* ============================================================
   Setters
   ============================================================ */

/* setHomeManifestLogged(value)
   ----------------------------
   Set to true once the manifest load has been kicked.
   Set to false on cold start to allow reloading. */
export function setHomeManifestLogged(value)  { homeManifestLogged  = value; }

/* setHomeManifestData(value)
   --------------------------
   Replaces the raw manifest array. Pass null to clear. */
export function setHomeManifestData(value)    { homeManifestData    = value; }

/* setHomeManifestGrouped(value)
   ------------------------------
   Replaces the grouped manifest map. Pass null to clear. */
export function setHomeManifestGrouped(value) { homeManifestGrouped = value; }

/* incrementHomeResultsRenderToken()
   ----------------------------------
   Increments the render token and returns the new value.
   Called at the start of every renderHomeResults() invocation.
   The returned value is captured locally by the caller and
   compared against the module value before each DOM write. */
export function incrementHomeResultsRenderToken() {
  homeResultsRenderToken += 1;
  return homeResultsRenderToken;
} // end incrementHomeResultsRenderToken


/* ============================================================
   resetHomeState()
   ============================================================
   Resets all state variables to their initial values.

   Called by initHomeTab() on every cold start to ensure stale
   data from a previous session does not leak into the new one.

   Note: homeResultsRenderToken is intentionally NOT reset to 0
   here. Resetting it could cause a stale in-flight render from
   the previous session to match the new token. Leaving it at its
   current value means the old render's token will never match.
   ============================================================ */
export function resetHomeState() {
  homeManifestLogged  = false;
  homeManifestData    = null;
  homeManifestGrouped = null;
  /* homeResultsRenderToken is deliberately not reset — see note above. */
} // end resetHomeState
