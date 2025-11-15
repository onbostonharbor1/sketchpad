/* utilities.js
   ------------------------------------------------------------
   Utilities tab controller.
   Displays executable scripts organized under Tools and Lab.
   Each subtab loads manifests from ./utilities/<subtab>.
   ------------------------------------------------------------ */
import { uiState } from "./uiState.js";

import {
  initOffcanvasHandler,
  showSharedOffcanvas,
  clearDivs,
  loadManifestGroup,
  loadManifest,
  loadDirectoryRegistry,
    renderCategories,
    setCaptionBar,
} from "./ui_utilities.js";

// ============================================================
// Constants
// ============================================================
const TOOLS = "Tools";
const LAB = "Lab";
const RESULT = "Result";

/* ------------------------------------------------------------
   initUtilityTab()
------------------------------------------------------------ */
export async function initUtilityTab() {
  console.log("⚙️ initUtilityTab() called");
  clearDivs();
  setUtilitySubtabs();

  const created = Object.keys(uiState.utilitiesTabs || {});
  if (created.length === 0) {
    setUtilitySubtabs();
  }

  const tabId = uiState.activeUtilityTab || "tab-tools";
  uiState.activeUtilityTab = tabId;
  await switchUtilityTab(tabId);

  console.log(`✅ initUtilityTab restored ${tabId}`);
} // end initUtilityTab

/* ------------------------------------------------------------
   setUtilitySubtabs()
   REWRITE: remove invented id, use #subtabs ul
------------------------------------------------------------ */
function setUtilitySubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setUtilitySubtabs: #subtabs not found");

  el.innerHTML = "";

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs utility-subtabs";
  el.appendChild(bar);

  function makeSubtab(name, active = false) {
    const li = document.createElement("li");
    li.className = "nav-item";

    const btn = document.createElement("button");
    btn.className = "nav-link" + (active ? " active" : "");
    btn.dataset.tabId = "tab-" + name.toLowerCase();
    btn.textContent = name;
    btn.addEventListener("click", () => switchUtilityTab(btn.dataset.tabId));

    li.appendChild(btn);
    bar.appendChild(li);
  } // end makeSubtab

  makeSubtab(TOOLS, true);
  makeSubtab(LAB);
  makeSubtab(RESULT);
} // end setUtilitySubtabs

/* ===========================================================
   onUtilityItemClick()
=========================================================== */
async function onUtilityItemClick(item) {
  console.log("Clicked:", item.name, "from", item.subtab, "category:", item.category);

  uiState.lastUtilitySubtab = item.subtab;
  await switchUtilityTab("tab-result");

  const scriptPath = `/utilities/${item.subtab}/${item.entry.path}`;
  console.log("Loading utility script:", scriptPath);

  try {
    // Load as ES module (same as Gallery)
    const mod = await import(scriptPath + `?t=${Date.now()}`);

    if (typeof mod.runPattern !== "function") {
      displayUtilityResult(`runPattern() not found in ${item.entry.filename}`);
      return;
    }

    // If LAB: prepare drawing canvas
    if (item.subtab === LAB) {
      const sketchDiv = document.getElementById("sketchpad");
      sketchDiv.innerHTML = "";
      sketchDiv.appendChild(window.drawCanvas);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
    }

    // Execute the script
    const result = await mod.runPattern();

    setUtilityCaption({
      title: item.entry.title || item.entry.filename || "(untitled)",
      path: item.entry.path,
      subtab: item.subtab
    });

    if (item.subtab === LAB) {
      console.log("🎨 Lab drawing complete");
    } else {
      displayUtilityResult(result);
    }

  } catch (err) {
    console.error(`Error executing ${scriptPath}:`, err);
    displayUtilityResult(`Error executing ${scriptPath}: ${err.message}`);
  }
} // end onUtilityItemClick

/* ------------------------------------------------------------
   setUtilityCategories(which)
------------------------------------------------------------ */
async function setUtilityCategories(which) {
  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("setUtilityCategories: #text not found");
  textDiv.innerHTML = `<p>Loading ${which} categories...</p>`;

  try {
    let dirs = [];
    if (which === TOOLS) {
      dirs = (await loadDirectoryRegistry(`/utilities/${TOOLS}`)) || [];
    } else if (which === LAB) {
      dirs = (await loadDirectoryRegistry(`/utilities/${LAB}`)) || [];
    }

    async function buildItemsArray(basePath, subdir, labelSuffix) {
      const manifest = (await loadManifest(basePath, subdir)) || [];
      return manifest.map((entry) => ({
        name: entry.title || entry.filename || "(untitled)",
        entry,
        subtab: labelSuffix,
        category: subdir
      }));
    } // end buildItemsArray

    const categoriesData = [];
    for (const d of dirs) {
      categoriesData.push({
        title: d,
        items: await buildItemsArray(`/utilities/${which}`, d, which)
      });
    }

    function onExpandClick(item) {
      console.log("Expand clicked:", item.name);
    } // end onExpandClick

    renderCategories("text", categoriesData, onUtilityItemClick, onExpandClick);
    console.log(`✅ ${which} categories displayed`);
  } catch (err) {
    console.error(`Failed to load ${which} categories:`, err);
    textDiv.innerHTML = `<p style="color:red;">Error loading ${which} categories</p>`;
  }
} // end setUtilityCategories

/* ------------------------------------------------------------
   switchUtilityTab()
------------------------------------------------------------ */
async function switchUtilityTab(tabId) {
  uiState.activeUtilityTab = tabId;
  clearDivs();

  const key = tabId.replace("tab-", "");
  if (key === "tools") {
    await setUtilityCategories(TOOLS);
  } else if (key === "lab") {
    await setUtilityCategories(LAB);
  } else if (key === "result") {
    // restore last result: TBD
  }

  const bar = document.querySelector("#subtabs ul");
  if (bar) {
    bar.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
    const activeBtn = bar.querySelector(`[data-tab-id="${tabId}"]`);
    if (activeBtn) activeBtn.classList.add("active");
  }
} // end switchUtilityTab

/* ------------------------------------------------------------
   executeUtilityScript()
------------------------------------------------------------ */
async function executeUtilityScript(entry, subtab) {
  const scriptPath = `/utilities/${subtab}/${entry.path}`;
  console.log(`Loading utility script: ${scriptPath}`);

  try {
    const resp = await fetch(`${scriptPath}?t=${Date.now()}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${scriptPath}`);

    const code = await resp.text();
    eval(code);
    console.log(`✅ Executed ${entry.filename}`);
  } catch (err) {
    console.error(`❌ Failed to execute ${entry.filename}:`, err);
    const textDiv = document.getElementById("text");
    if (textDiv) {
      textDiv.innerHTML = `<p style="color:red;">Error executing ${entry.filename}</p>`;
    }
  }
} // end executeUtilityScript

/* ------------------------------------------------------------
   displayUtilityResult()
------------------------------------------------------------ */
function displayUtilityResult(textOrArray) {
  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("displayUtilityResult: #text not found");

  textDiv.innerHTML = "";

  const pre = document.createElement("pre");
  pre.style.whiteSpace = "pre-wrap";
  pre.style.fontFamily = "monospace";

  if (Array.isArray(textOrArray)) {
    pre.textContent = textOrArray.map(line => String(line)).join("\n");
  } else {
    pre.textContent = textOrArray ?? "(no output)";
  }

  textDiv.appendChild(pre);
} // end displayUtilityResult

/* ------------------------------------------------------------
   setUtilityCaption()
------------------------------------------------------------ */
function setUtilityCaption(entry) {
  const title = entry.title || entry.filename || "(untitled)";
  const path = entry.path;
  const subtab = entry.subtab || TOOLS;

  setCaptionBar("caption", { title, path, subtab }, async () => {
    try {
      let scriptPath;
      if (/^(Tools|Lab)\//.test(path)) {
        scriptPath = `/utilities/${path}`;
      } else {
        scriptPath = `/utilities/${subtab}/${path}`;
      }

      const resp = await fetch(scriptPath);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${scriptPath}`);
      const code = await resp.text();
      showSharedOffcanvas(title, code);
    } catch (err) {
      showSharedOffcanvas("Error", `Failed to load script: ${err.message}`);
    }
  });
} // end setUtilityCaption

export const utilityDivs = {
  activeDivs: ["subtabs"],
  theme: "theme-utilities",
  action: setUtilityAction,
  buttons: setUtilityButtons,
  caption: setUtilityCaption,
  sketchpad: setUtilitySketchpad,
  subtabs: setUtilitySubtabs,
  text: setUtilityText
}; // end utilityDivs

// ------------------------------------------------------------
// Minimal stubs (unchanged)
// ------------------------------------------------------------
function setActiveUtilityItem(category, entry) {} // end setActiveUtilityItem
function updateUtilityCaption(tab) {} // end updateUtilityCaption
function setUtilityAction() {
  const el = document.getElementById("action");
  if (el) el.innerHTML = "";
} // end setUtilityAction
function setUtilityButtons() {
  const el = document.getElementById("buttons");
  if (el) el.innerHTML = "";
} // end setUtilityButtons
function setUtilitySketchpad() {
  const el = document.getElementById("sketchpad");
  if (el) el.innerHTML = "";
} // end setUtilitySketchpad
function setUtilityText() {
  const el = document.getElementById("text");
  if (el) el.innerHTML = "";
} // end setUtilityText
