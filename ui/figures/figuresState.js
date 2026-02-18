/* figuresState.js
   ============================================================
   Figures Tab — Shared Module State
   ============================================================
   Role:
     Owns the module-level state that tracks the Figures tab's
     current navigation position and registry cache.

     Before this file existed, these were managed within
     figures.js. Once split into multiple files, each sub-module
     needs access to the same state. Rather than passing through
     every function call, they are centralized here.

   Design rules:
     • This file contains NO logic — only variable declarations
       and their getters/setters.
     • No imports. Must remain a pure data store with zero
       dependencies to avoid circular references.
     • All mutation goes through setter functions for debugging
       and validation.

   Consumers:
     figures.js          — init/reset, rehydrate, registry loading
     figuresNav.js       — read/write tab state
     figuresDisplay.js   — load and switch between figures
     figuresMenuCmds.js  — read current figure context

   Variable glossary:
     figuresRegistry   — Registry data shaped as:
                         { key: { name, directory }, ... }
                         Null when not yet loaded or cleared.

     currentTabId      — Currently active tab ID (e.g., "tab-categories" 
                         or "tab-figureId").
                         Null when not initialized.
   ============================================================ */

/* ============================================================
   Module-level state variables
   ============================================================ */
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
   NOTE: Does NOT clear figuresRegistry - that cache persists
   across navigation and is only cleared by explicit cache
   invalidation (e.g. after rebuild). This function only
   resets the navigation pointer.
   ============================================================ */

export function resetFiguresState() {
  currentTabId = null;
}
