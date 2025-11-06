/* utility.js
   ------------------------------------------------------------
   Utilities tab controller.
   Displays executable scripts organized under Tools and Lab.
   Each subtab loads manifests from ./utilities/<subtab>.
   ------------------------------------------------------------ */

// ============================================================
// Constants
// ============================================================
const TOOLS = "Tools";
const LAB = "Lab";
const RESULT = "Result";

/* ------------------------------------------------------------
   initUtilityTab()
------------------------------------------------------------ */
async function initUtilityTab() {
  console.log("⚙️ initUtilityTab() called");
  clearDivs();
  setUtilitySubtabs();

  const created = Object.keys(uiState.utilitiesTabs || {});
  if (created.length === 0) {
    setUtilitySubtabs(); // builds all three subtabs
  }

  // Force Tools as default on first open
  const tabId = uiState.activeUtilityTab || "tab-tools";
  uiState.activeUtilityTab = tabId; // ensure state
  await switchUtilityTab(tabId);

  console.log(`✅ initUtilityTab restored ${tabId}`);
} // end initUtilityTab

/* ------------------------------------------------------------
   setUtilitySubtabs()
------------------------------------------------------------ */
function setUtilitySubtabs() {
  const el = document.getElementById("subtabs");
  if (!el) throw new Error("setUtilitySubtabs: #subtabs not found");

  let bar = document.getElementById("utilitySubtabBar");
  if (bar) return;

  el.innerHTML = "";
  bar = document.createElement("ul");
  bar.className = "nav nav-tabs utility-subtabs";
  bar.id = "utilitySubtabBar";
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
//
/* ===========================================================
   onUtilityItemClick()
   Handles clicks from either Tools or Lab category items.
   - Tools scripts: show text output in #text
   - Lab scripts: draw on shared canvas inside #sketchpad
=========================================================== */
async function onUtilityItemClick(item) {
  console.log(
    "Clicked:",
    item.name,
    "from",
    item.subtab,
    "category:",
    item.category
  );

  uiState.lastUtilitySubtab = item.subtab;
  await switchUtilityTab("tab-result");

  const scriptPath = `./utilities/${item.subtab}/${item.entry.path}`;
  console.log("Loading utility script:", scriptPath);

  try {
    // === STEP 1: Load script ===
    const response = await fetch(scriptPath);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const code = await response.text();

    // === STEP 2: Prepare display ===
    if (item.subtab === LAB) {
      // --- same as patterns.js loadAndRunPattern() ---
      const sketchDiv = document.getElementById("sketchpad");
      sketchDiv.innerHTML = "";
      sketchDiv.appendChild(window.drawCanvas);

      const localCtx = ctx;
      localCtx.fillStyle = "#ffffff";
      localCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
    } else {
      // Tools scripts still use #text
      const textDiv = document.getElementById("text");
      textDiv.innerHTML = "<p>Running script...</p>";
    }

    // === STEP 3: Execute script ===
    (0, eval)(code);

    const fnName = item.entry.filename;
    if (typeof window[fnName] === "function") {
      const output = window[fnName]();
      setUtilityCaption({
        title: item.entry.title || item.entry.filename || "(untitled)",
        path: item.entry.path, // e.g., "Backgrounds/background.js" or "validateDrawRegistry.js"
        subtab: item.subtab, // "Lab" or "Tools" (may be undefined for Tools)
      });

      // === STEP 4: Display output ===
      if (item.subtab === LAB) {
        // Lab functions draw directly, no text output
        console.log("🎨 Lab drawing complete on shared canvas");
      } else {
        displayUtilityResult(output);
      }
    } else {
      displayUtilityResult(`Function ${fnName} not found after loading.`);
      console.error(`Function ${fnName} not found after eval`);
    }
  } catch (err) {
    console.error(`Error loading or running ${scriptPath}:`, err);
    displayUtilityResult(
      `Error loading or running ${scriptPath}: ${err.message}`
    );
  }
} // end onUtilityItemClick

/* ------------------------------------------------------------
   setUtilityCategories(which)
   Builds category frames for the specified Utilities subtab
   (either Tools or Lab). Each frame corresponds to a subdirectory
   listed in that subtab’s directory registry.
------------------------------------------------------------ */
async function setUtilityCategories(which) {
  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("setUtilityCategories: #text not found");
  textDiv.innerHTML = `<p>Loading ${which} categories...</p>`;

  try {
    // Load only the selected directory registry
    let dirs = [];
    if (which === TOOLS) {
      dirs = (await loadDirectoryRegistry(`./utilities/${TOOLS}`)) || [];
    } else if (which === LAB) {
      dirs = (await loadDirectoryRegistry(`./utilities/${LAB}`)) || [];
    } else {
      console.warn("setUtilityCategories: unknown tab key", which);
      dirs = [];
    }

    // Helper to build one category frame’s items array
    async function buildItemsArray(basePath, subdir, labelSuffix) {
      const manifest = (await loadManifest(basePath, subdir)) || [];
      return manifest.map((entry) => ({
        name: entry.title || entry.filename || "(untitled)",
        entry,
        subtab: labelSuffix,
        category: subdir,
      }));
    } // end buildItemsArray

    // Build categoriesData: one frame per subdirectory for the selected group
    const categoriesData = [];
    for (const d of dirs) {
      categoriesData.push({
        title: d,
        items: await buildItemsArray(`./utilities/${which}`, d, which),
      });
    }

    function onExpandClick(item) {
      console.log("Expand clicked:", item.name);
    } // end onExpandClick

    // Render via shared utility
    renderCategories("text", categoriesData, onUtilityItemClick, onExpandClick);

    console.log(`✅ ${which} categories displayed`);
  } catch (err) {
    console.error(`Failed to load ${which} categories:`, err);
    textDiv.innerHTML = `<p style="color:red;">Error loading ${which} categories</p>`;
  }
} // end setUtilityCategories

/* ------------------------------------------------------------
   addUtilityHandler(tab, container)
   Not needed when using renderCategories (handlers are passed in).
   Kept as a no-op placeholder for parity with gallery.js.
------------------------------------------------------------ */
function addUtilityHandler(tab, container) {
  // no-op: renderCategories already wires onItemClick/onExpandClick
} // end addUtilityHandler

/* ------------------------------------------------------------
   switchUtilityTab()
   Stub for now; will call setUtilityCategories() for Tools/Lab,
   and simply show last result for Result.
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
    // Later: restore last output shown (text or canvas)
  }

  // Update active button highlighting
  const buttons = document.querySelectorAll("#utilitySubtabBar .nav-link");
  buttons.forEach((b) => b.classList.remove("active"));
  const activeBtn = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (activeBtn) activeBtn.classList.add("active");
} // end switchUtilityTab

/* ------------------------------------------------------------
   executeUtilityScript(entry, subtab)
   Loads and executes a .js file from the Utilities directories.
   The script itself contains its own alert or draw logic.
------------------------------------------------------------ */
async function executeUtilityScript(entry, subtab) {
  const scriptPath = `./utilities/${subtab}/${entry.path}`;
  console.log(`Loading utility script: ${scriptPath}`);

  try {
    const resp = await fetch(`${scriptPath}?t=${Date.now()}`); // cache-buster
    if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${scriptPath}`);

    const code = await resp.text();
    eval(code); // execute the script’s contents (runs its own alert)
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
   displayUtilityResult(textOrArray)
   Clears the text div and displays returned data.
   - Strings: shown as-is
   - Arrays: each element on its own line
------------------------------------------------------------ */
function displayUtilityResult(textOrArray) {
  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("displayUtilityResult: #text not found");

  textDiv.innerHTML = "";

  const pre = document.createElement("pre");
  pre.style.whiteSpace = "pre-wrap";
  pre.style.fontFamily = "monospace";

  if (Array.isArray(textOrArray)) {
    pre.textContent = textOrArray.map((line) => String(line)).join("\n");
  } else {
    pre.textContent = textOrArray ?? "(no output)";
  }

  textDiv.appendChild(pre);
} // end displayUtilityResult

function setUtilityCaption(entry) {
  const title = entry.title || entry.filename || "(untitled)";
  const path = entry.path;
  const subtab = entry.subtab || TOOLS; // <-- default to Tools to keep Tools working

  // Hand stable values to setCaptionBar and ignore its callback args;
  // use the captured title/path/subtab instead.
  setCaptionBar("caption", { title, path, subtab }, async () => {
    try {
      // If path already includes "Tools/" or "Lab/", don't double-prefix
      let scriptPath;
      if (/^(Tools|Lab)\//.test(path)) {
        scriptPath = `./utilities/${path}`;
      } else {
        scriptPath = `./utilities/${subtab}/${path}`;
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

const utilityDivs = {
  activeDivs: ["subtabs"],
  theme: "theme-utilities",
  action: setUtilityAction,
  buttons: setUtilityButtons,
  caption: setUtilityCaption,
  sketchpad: setUtilitySketchpad,
  subtabs: setUtilitySubtabs,
  text: setUtilityText,
}; // end utilityDivs

// Placeholder stubs (unchanged from skeleton)
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
