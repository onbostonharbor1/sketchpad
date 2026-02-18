/* utilitiesNav.js
   ============================================================
   Utilities Tab — Subtab Construction and Navigation
   ============================================================
   Role:
     Owns everything related to building the Utilities subtab bar
     and switching between tabs (Tools / Lab / Result).

     This file sits between the lifecycle layer (utilities.js) and
     the display layer (utilitiesDisplay.js). Its job is to put
     the correct UI on screen based on the active tab.

   Architectural rules:
     • Does NOT own the TabSpec, init(), restore(), or save().
       Those live in utilities.js.
     • Does NOT render utility content or execute utility scripts.
       That lives in utilitiesDisplay.js.
     • Does NOT build caption bars or menu items.
       Those live in utilitiesMenuCmds.js.
     • Reads state via getters from utilitiesState.js.
       Never imports the raw variable directly.

   Exports:
     setUtilitySubtabs()           — build the subtab bar
     activateUtilitySubtab(tabId)  — activate a specific subtab
     switchUtilityTab(tabId)       — switch to a tab and render content
   ============================================================ */

import {
  setCommandsButtonLabel
} from "../uiUtilities.js";
import {
  getHasRunUtility
} from "./utilitiesState.js";


/* ============================================================
   setUtilitySubtabs()
   ------------------------------------------------------------
   Builds the Utilities subtab bar inside #subtabs.
   
   Creates:
     • Tools tab (always present)
     • Lab tab (always present)
     • Result tab (only if hasRunUtility is true)
   ============================================================ */
export async function setUtilitySubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setUtilitySubtabs: #subtabs not found");

  el.innerHTML = "";

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs utilities-subtabs";
  el.appendChild(bar);

  function makeSubtab(name, id) {
    const li = document.createElement("li");
    li.className = "nav-item";

    const btn = document.createElement("button");
    btn.className = "nav-link";
    btn.dataset.tabId = id;
    btn.textContent = name;

    btn.addEventListener("click", async () => {
      setCommandsButtonLabel("Utilities Commands");
      await switchUtilityTab(id);
    });

    li.appendChild(btn);
    bar.appendChild(li);
  }

  makeSubtab("Tools",  "tab-tools");
  makeSubtab("Lab",    "tab-lab");
  
  // Only create Result tab if a utility has been run
  const hasRun = getHasRunUtility();
  if (hasRun) {
    makeSubtab("Result", "tab-result");
  }
} // end setUtilitySubtabs


/* ============================================================
   activateUtilitySubtab(tabId)
   ------------------------------------------------------------
   Highlights the specified subtab button as active.
   Called after switching tabs to update the UI.
   ============================================================ */
export function activateUtilitySubtab(tabId) {
  const bar = document.querySelector("#subtabs ul.utilities-subtabs");
  if (!bar) throw new Error("activateUtilitySubtab: ul.utilities-subtabs not found");

  bar.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));

  const btn = bar.querySelector(`[data-tab-id="${tabId}"]`);
  if (!btn) throw new Error("activateUtilitySubtab: button not found for " + tabId);

  btn.classList.add("active");
} // end activateUtilitySubtab


/* ============================================================
   switchUtilityTab(tabId)
   ------------------------------------------------------------
   Switches to the specified tab and renders its content.
   
   Delegates to utilitiesDisplay.js for actual content rendering:
     • tab-tools  → setUtilityCategories("Tools")
     • tab-lab    → setUtilityCategories("Lab")
     • tab-result → runUtilityEntry() with saved state
   ============================================================ */
export async function switchUtilityTab(tabId) {
  if (!tabId) throw new Error("switchUtilityTab: tabId missing");
  
  uiState.utilities.activeUtilityTabId = tabId;

  // Clear all regions
  const { clearDivs } = await import("../uiUtilities.js");
  clearDivs();

  if (tabId === "tab-tools") {
    const { setUtilityCategories } = await import("./utilitiesDisplay.js");
    await setUtilityCategories("Tools");
  } else if (tabId === "tab-lab") {
    const { setUtilityCategories } = await import("./utilitiesDisplay.js");
    await setUtilityCategories("Lab");
  } else if (tabId === "tab-result") {
    const subtab   = uiState.utilities.lastUtilitySubtab;
    const entry    = uiState.utilities.activeUtilityItem;
    const category = uiState.utilities.activeUtilityCategory;

    if (!subtab || !entry || !category) {
      throw new Error(
        "switchUtilityTab(tab-result): missing subtab/category/entry"
      );
    }

    const { runUtilityEntry } = await import("./utilitiesDisplay.js");
    await runUtilityEntry(subtab, category, entry);
  }

  // Activate the clicked subtab
  activateUtilitySubtab(tabId);

} // end switchUtilityTab
