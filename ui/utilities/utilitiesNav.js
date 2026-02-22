/* utilitiesNav.js
   ============================================================
   Utilities Tab — Subtab Construction and Navigation
   ============================================================
   Role:
     Owns everything related to building the Utilities subtab
     bar and switching between tabs (Tools / Lab / Result).

     Shared subtab mechanics are delegated to
     resultsViewController.js. This file supplies the
     Utilities-specific adapter.

   Architectural rules:
     • Does NOT own the TabSpec, init(), restore(), or save().
       Those live in utilities.js.
     • Does NOT render utility content or execute scripts.
       That lives in utilitiesDisplay.js.
     • Does NOT build caption bars or menu items.
       Those live in utilitiesMenuCmds.js.
     • Reads state via getters from utilitiesState.js.

   Exports:
     setUtilitySubtabs()           — build the subtab bar
     activateUtilitySubtab(tabId)  — activate a specific subtab
     switchUtilityTab(tabId)       — switch to a tab and render
   ============================================================ */

import { buildSubtabBar, activateSubtab } from "../resultsViewController.js";
import { setCommandsButtonLabel }         from "/ui/uiUtilities.js";
import { getHasRunUtility }               from "./utilitiesState.js";


/* ============================================================
   Constants — subtab IDs
   ============================================================ */
const TAB_TOOLS  = "tab-tools";
const TAB_LAB    = "tab-lab";
const TAB_RESULT = "tab-result";
const CSS_CLASS  = "utilities-subtabs";


/* ============================================================
   buildUtilitiesAdapter()
   ============================================================
   Returns the RVCAdapter for the Utilities tab.

   The Result tab is conditional — only shown after a utility
   has been run (getHasRunUtility() returns true).
   ============================================================ */
function buildUtilitiesAdapter() {
  return {
    cssClass: CSS_CLASS,

    getActiveId() {
      return uiState.utilities?.activeUtilityTabId || TAB_TOOLS;
    },

    tabs: [
      {
        id:    TAB_TOOLS,
        label: "Tools",
        async onClick() {
          setCommandsButtonLabel("Utilities Commands");
          await switchUtilityTab(TAB_TOOLS);
        }
      },
      {
        id:    TAB_LAB,
        label: "Lab",
        async onClick() {
          setCommandsButtonLabel("Utilities Commands");
          await switchUtilityTab(TAB_LAB);
        }
      },
      {
        id:        TAB_RESULT,
        label:     "Result",
        condition: () => getHasRunUtility(),
        async onClick() {
          setCommandsButtonLabel("Utilities Commands");
          await switchUtilityTab(TAB_RESULT);
        }
      }
    ]
  };
} // end buildUtilitiesAdapter


/* ============================================================
   setUtilitySubtabs()
   ============================================================
   Builds the Utilities subtab bar inside #subtabs.
   ============================================================ */
export async function setUtilitySubtabs() {
  buildSubtabBar(buildUtilitiesAdapter());
} // end setUtilitySubtabs


/* ============================================================
   activateUtilitySubtab(tabId)
   ============================================================
   Highlights the specified subtab button as active.
   ============================================================ */
export function activateUtilitySubtab(tabId) {
  activateSubtab(CSS_CLASS, tabId);
} // end activateUtilitySubtab


/* ============================================================
   switchUtilityTab(tabId)
   ============================================================
   Switches to the specified tab and renders its content.
   ============================================================ */
export async function switchUtilityTab(tabId) {

  if (!tabId) throw new Error("switchUtilityTab: tabId missing");

  uiState.utilities.activeUtilityTabId = tabId;

  const { clearDivs } = await import("/ui/uiUtilities.js");
  clearDivs();

  if (tabId === TAB_TOOLS) {
    const { setUtilityCategories } = await import("./utilitiesDisplay.js");
    await setUtilityCategories("Tools");

  } else if (tabId === TAB_LAB) {
    const { setUtilityCategories } = await import("./utilitiesDisplay.js");
    await setUtilityCategories("Lab");

  } else if (tabId === TAB_RESULT) {
    const subtab   = uiState.utilities.lastUtilitySubtab;
    const entry    = uiState.utilities.activeUtilityItem;
    const category = uiState.utilities.activeUtilityCategory;

    if (!subtab || !entry || !category) {
      throw new Error("switchUtilityTab(tab-result): missing subtab/category/entry");
    }

    const { runUtilityEntry } = await import("./utilitiesDisplay.js");
    await runUtilityEntry(subtab, category, entry);
  }

  activateUtilitySubtab(tabId);

} // end switchUtilityTab
