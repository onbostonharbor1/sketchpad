/* utilitiesDisplay.js
   ============================================================
   Utilities Tab -- Category Display and Utility Execution
   ============================================================
   Role:
     Owns everything related to displaying utility categories
     and executing utility scripts.

   Architectural rules:
     * Does NOT build or activate subtabs. That is utilitiesNav.js.
     * Does NOT build the caption bar. That is utilitiesMenuCmds.js.
     * Reads and writes utilitiesState.js via getters and setters.

   Exports:
     setUtilityCategories(which)
     runUtilityEntry(subtab, category, entry)
     onUtilityItemClick(item)
     displayUtilityResult(html)
   ============================================================ */

import { renderCategories }     from "/ui/categories.js";
import { runScriptByPath }      from "/ui/scriptRunner.js";
import { manifest }             from "/ui/manifest.js";
import {
  setHasRunUtility,
  getHasRunUtility
}                               from "./utilitiesState.js";
import { updateUtilitiesCaption } from "./utilitiesMenuCmds.js";
import {
  setUtilitySubtabs,
  activateUtilitySubtab
}                               from "./utilitiesNav.js";


/* ============================================================
   setUtilityCategories(which)
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
    const items   = entries.map((entry) => ({
      name:     entry.title || entry.filename || "(untitled)",
      onClick:  () => onUtilityItemClick({ entry, subtab: which, category: subdir }),
      entry,
      subtab:   which,
      category: subdir
    }));
    return { title: subdir, items };
  });

  textDiv.innerHTML = "";
  renderCategories("text", frames);

} // end setUtilityCategories


/* ============================================================
   onUtilityItemClick(item)
   ============================================================ */
export async function onUtilityItemClick(item) {

  if (!item)          throw new Error("onUtilityItemClick: item missing");
  if (!item.subtab)   throw new Error("onUtilityItemClick: item.subtab missing");
  if (!item.entry)    throw new Error("onUtilityItemClick: item.entry missing");
  if (!item.category) throw new Error("onUtilityItemClick: item.category missing");

  uiState.utilities.lastUtilitySubtab      = item.subtab;
  uiState.utilities.activeUtilityItem      = item.entry;
  uiState.utilities.activeUtilityCategory  = item.category;
  uiState.utilities.activeUtilityTabId     = "tab-result";

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
   ============================================================ */
export async function runUtilityEntry(subtab, category, entry) {

  if (!subtab)       throw new Error("runUtilityEntry: subtab missing");
  if (!category)     throw new Error("runUtilityEntry: category missing");
  if (!entry)        throw new Error("runUtilityEntry: entry missing");
  if (!entry.path)   throw new Error("runUtilityEntry: entry.path missing");

  const scriptPath = `/utilities/${subtab}/${category}/${entry.path}`;

  try {
    const textDiv   = document.getElementById("text");
    const actionDiv = document.getElementById("action");
    const sketchDiv = document.getElementById("sketchpad");

    if (!textDiv)   throw new Error("runUtilityEntry: #text not found");
    if (!actionDiv) throw new Error("runUtilityEntry: #action not found");
    if (!sketchDiv) throw new Error("runUtilityEntry: #sketchpad not found");

    textDiv.innerHTML   = "";
    actionDiv.innerHTML = "";
    sketchDiv.innerHTML = "";

    let result = null;

    if (subtab === "Lab") {
      result = await runScriptByPath(scriptPath, "canvas", {
        canvasRegionId:   "sketchpad",
        controlsRegionId: "action",
        enableControls:   true
      });

    } else if (subtab === "Tools") {
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
      title:        entry.title || entry.filename || "(untitled)",
      path:         category + "/" + entry.path,
      subtab,
      category,
      manifestPath: `/utilities/${subtab}/${category}/manifest.json`,
      entryPath:    entry.path,
      status:       entry.status || ""
    });

    if (subtab === "Tools" && result !== null && result !== undefined) {
      displayUtilityResult(result);
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
   ============================================================ */
export function displayUtilityResult(html) {

  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("displayUtilityResult: #text not found");

  textDiv.innerHTML = "";
  const box         = document.createElement("div");
  box.className     = "utility-result-box";
  box.innerHTML     = html || "";
  textDiv.appendChild(box);

} // end displayUtilityResult
