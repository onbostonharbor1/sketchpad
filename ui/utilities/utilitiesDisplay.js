/* utilitiesDisplay.js
   ============================================================
   Utilities Tab â€” Category Display and Utility Execution
   ============================================================
   Role:
     Owns everything related to displaying utility categories
     and executing utility scripts.

     This file handles both the categories view (Tools/Lab) and
     the utility execution (Result view).

   Architectural rules:
     â€¢ Does NOT build or activate subtabs. That is utilitiesNav.js.
     â€¢ Does NOT build the caption bar. That is utilitiesMenuCmds.js.
       This file calls updateUtilitiesCaption() after execution.
     â€¢ Reads and writes utilitiesState.js via getters and setters.
       Never declares its own copies of the shared variables.

   Exports:
     setUtilityCategories(which)              â€” render Tools or Lab categories
     runUtilityEntry(subtab, category, entry) â€” execute a utility script
     onUtilityItemClick(item)                 â€” handle category item click
     displayUtilityResult(html)               â€” display text result
   ============================================================ */

import { renderCategories } from "../categories.js";
import { runScriptByPath } from "../scriptRunner.js";
import { manifest } from "../manifest.js";
import {
  setHasRunUtility,
  getHasRunUtility
} from "./utilitiesState.js";
import {
  updateUtilitiesCaption
} from "./utilitiesMenuCmds.js";
import {
  setUtilitySubtabs,
  activateUtilitySubtab
} from "./utilitiesNav.js";


/* ============================================================
   setUtilityCategories(which)
   ------------------------------------------------------------
   Renders the category frames for either "Tools" or "Lab".
   
   Arguments:
     which â€” "Tools" or "Lab"
   ============================================================ */
export async function setUtilityCategories(which) {
  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("setUtilityCategories: #text not found");

  textDiv.innerHTML = `<p>Loading ${which}...</p>`;

  const cache = {
    Tools: manifest.getCategoryMap("utilities/Tools"),
    Lab:   manifest.getCategoryMap("utilities/Lab")
  };
  const sections =
    which === "Tools" ? cache?.Tools :
    which === "Lab"   ? cache?.Lab   :
    null;

  if (!sections) {
    textDiv.innerHTML = `<p style='color:red;'>No manifest data for ${which}</p>`;
    return;
  }

  const frames = Object.keys(sections).map((subdir) => {
    const entries = sections[subdir] || [];

    const items = entries.map((entry) => ({
      name: entry.title || entry.filename || "(untitled)",
      onClick: () => onUtilityItemClick({ entry, subtab: which, category: subdir }),
      entry,
      subtab: which,
      category: subdir
    }));

    return { title: subdir, items };
  });

  textDiv.innerHTML = "";
  renderCategories("text", frames);
} // end setUtilityCategories


/* ============================================================
   onUtilityItemClick(item)
   ------------------------------------------------------------
   Handles clicking a utility in the categories list.
   
   Updates state, potentially rebuilds subtabs to show Result,
   then executes the utility.
   ============================================================ */
export async function onUtilityItemClick(item) {
  if (!item) throw new Error("onUtilityItemClick: item missing");
  if (!item.subtab) throw new Error("onUtilityItemClick: item.subtab missing");
  if (!item.entry) throw new Error("onUtilityItemClick: item.entry missing");
  if (!item.category) throw new Error("onUtilityItemClick: item.category missing");

  uiState.utilities.lastUtilitySubtab  = item.subtab;
  uiState.utilities.activeUtilityItem  = item.entry;
  uiState.utilities.activeUtilityCategory = item.category;
  uiState.utilities.activeUtilityTabId = "tab-result";

  // If this is the first utility run, rebuild subtabs to show Result tab
  const wasFirstRun = !getHasRunUtility();
  setHasRunUtility(true);
  
  if (wasFirstRun) {
    await setUtilitySubtabs();
  }

  activateUtilitySubtab("tab-result");

  const { clearDivs } = await import("/ui/uiUtilities.js");
  clearDivs();
  
  await runUtilityEntry(item.subtab, item.category, item.entry);
} // end onUtilityItemClick


/* ============================================================
   runUtilityEntry(subtab, category, entry)
   ------------------------------------------------------------
   Executes a utility script using scriptRunner.
   
   Arguments:
     subtab   â€” "Tools" or "Lab"
     category â€” Category name (subdirectory)
     entry    â€” Manifest entry object with .path, .title, etc.
   ============================================================ */
export async function runUtilityEntry(subtab, category, entry) {
  if (!subtab) throw new Error("runUtilityEntry: subtab missing");
  if (!category) throw new Error("runUtilityEntry: category missing");
  if (!entry) throw new Error("runUtilityEntry: entry missing");
  if (!entry.path) throw new Error("runUtilityEntry: entry.path missing");

  const scriptPath = `/utilities/${subtab}/${category}/${entry.path}`;

  try {
    // Clear regions (Utilities convention)
    const textDiv = document.getElementById("text");
    const actionDiv = document.getElementById("action");
    const sketchDiv = document.getElementById("sketchpad");

    if (!textDiv) throw new Error("runUtilityEntry: #text not found");
    if (!actionDiv) throw new Error("runUtilityEntry: #action not found");
    if (!sketchDiv) throw new Error("runUtilityEntry: #sketchpad not found");

    textDiv.innerHTML = "";
    actionDiv.innerHTML = "";
    sketchDiv.innerHTML = "";

    let result = null;

    if (subtab === "Lab") {
      // Canvas execution (controls optional, built only if scriptInfo exists)
      result = await runScriptByPath(scriptPath, "canvas", {
        canvasRegionId: "sketchpad",
        controlsRegionId: "action",
        enableControls: true
      });
    } else if (subtab === "Tools") {
      // Text execution
      result = await runScriptByPath(scriptPath, "text", {
        textRegionId: "text"
      });

      if (typeof result === "string") {
        uiState.utilities.lastResult = result;
      }
    } else {
      throw new Error("runUtilityEntry: invalid subtab '" + String(subtab) + "'");
    }

    updateUtilitiesCaption({
      title: entry.title || entry.filename || "(untitled)",
      path: category + "/" + entry.path,
      subtab,
      category,
      manifestPath: `/utilities/${subtab}/${category}/manifest.json`,
      entryPath: entry.path,
      status: entry.status || ""
    });

    // Tools: keep Result box behavior consistent with existing Utilities UX
    if (subtab === "Tools") {
      if (result !== null && result !== undefined) {
        displayUtilityResult(result);
      }
    }

    return result;

  } catch (err) {
    console.error("Error executing " + scriptPath + ":", err);
    displayUtilityResult("Error executing " + scriptPath + ": " + err.message);
    throw err;
  }
} // end runUtilityEntry


/* ============================================================
   displayUtilityResult(html)
   ------------------------------------------------------------
   Displays a text result in a styled box within #text.
   Used by Tools utilities to show their output.
   ============================================================ */
export function displayUtilityResult(html) {
  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("displayUtilityResult: #text not found");

  textDiv.innerHTML = "";
  const box = document.createElement("div");
  box.className = "utility-result-box";
  box.innerHTML = html || "";

  textDiv.appendChild(box);
} // end displayUtilityResult
