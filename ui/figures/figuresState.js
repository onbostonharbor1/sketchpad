/* figuresState.js
   ============================================================
   Figures Tab -- Shared Module State
   ============================================================
   Role:
     Owns the module-level state that tracks the Figures tab's
     current navigation position and registry cache.

   Design rules:
     * This file contains NO logic -- only variable declarations
       and their getters/setters.
     * No imports. Must remain a pure data store with zero
       dependencies to avoid circular references.
     * All mutation goes through setter functions for debugging
       and validation.

   Variable glossary:
     figuresRegistry -- Registry data shaped as plain array of
                        category name strings.
                        Null when not yet loaded or cleared.
     currentTabId    -- Currently active tab ID (e.g., "tab-categories"
                        or "tab-figureId").
                        Null when not initialized.

   Where this sits next to uiState:
     These two values are navigation bookkeeping for this module
     only. Everything that describes a figure (its layers, discs,
     welds, mode, selection) lives in uiState.figures, where every
     tab can see it and where it survives a tab switch. If a value
     here and a value in uiState ever seem to disagree, uiState is
     the one that counts: figuresNav.js sets both together.

   Who reads and writes:
     setFiguresRegistry   figuresDisplay.js, after loading the list
                          of saved-figure categories
     setCurrentTabId      figuresNav.js, on every subtab switch
     resetFiguresState    initialization (not called by Figures
                          code at present; kept for the pattern
                          the other tabs follow)
   ============================================================ */

// "let" at the top of a module: one copy for the whole program,
// private to this file. Other files can only reach these through
// the exported functions below. This is how the file keeps its
// "all mutation goes through setters" rule.
let figuresRegistry = null;
let currentTabId    = null;


/* ============================================================
   Getters
   ============================================================ */
export function getFiguresRegistry() {
  return figuresRegistry;
}

export function getCurrentTabId() {
  return currentTabId;
}


/* ============================================================
   Setters
   ============================================================ */
export function setFiguresRegistry(registry) {
  figuresRegistry = registry;
}

export function setCurrentTabId(tabId) {
  currentTabId = tabId;
}


/* ============================================================
   Reset (used by init)
   ============================================================
   NOTE: Does NOT clear figuresRegistry -- that cache persists
   across navigation and is only cleared by explicit cache
   invalidation (e.g. after rebuild). This function only
   resets the navigation pointer.
   ============================================================ */
export function resetFiguresState() {
  currentTabId = null;
}
