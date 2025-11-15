/* gallery.js
   ------------------------------------------------------------
   Gallery tab controller.
   Displays visual collections: Ideabook, Patterns, and Scripts.
   Each category loads images and manifests from ./gallery/<type>
   directories defined by directoryRegistry.json.
   ------------------------------------------------------------ */

// addGalleryHandler(tab, container)       – attach click handlers for category frames
// addGallerySubtab(item)                  – create new Gallery subtab button
// drawGalleryThumbnails(tab, category, manifest) – build unified thumbnail panel
// initGalleryTab()                        – initialize Gallery tab and restore subtabs
// loadManifestGroup(basePath)             – load all manifests for one gallery type
// renderGalleryCategories(container, data)– display Ideabook/Patterns/Scripts frames
// renderGalleryThumbnails(tab, category)  – load thumbnails for given tab/category
// renderGalleryScripts()                  – list executable scripts, no thumbnails
// showGalleryScript(entry)                – execute selected script and display output
// setActiveItem(category, entry)   – record active gallery item in uiState
// setGalleryCategories()                  – populate Categories view for Gallery tab
// setGallerySubtabs()                     – create or reuse subtab bar with "Categories"
// showGalleryImage(tab, category, path)   – display selected image in #sketchpad
// showNextGalleryItem(tab)                – show next image for given subtab
// showPrevGalleryItem(tab)                – show previous image for given subtab
// switchGalleryTab(tabId)                 – switch between Gallery subtabs
// updateGalleryCaption(tab)               – render caption + navigation + Show Script
// setGalleryAction(), setGalleryButtons(), setGalleryCaption(),
// setGallerySketchpad(), setGallerySubtabs(), setGalleryText()
//                                          – clear corresponding divs

import { renderCategories, showSharedOffcanvas, clearDivs,
         loadDirectoryRegistry, loadManifest, loadManifestGroup,
         setActiveItem, setCaptionBar }
                      from "./ui_utilities.js";
import { uiState }    from "./uiState.js";
import { printTitle } from "../draw/draw_utilities.js";
import { Line, Point, StringThing }
                      from "../classes/classes.js";
const IDEABOOK = "Ideabook";
const PATTERNS = "Patterns";
const SCRIPTS  = "Scripts";

/* ------------------------------------------------------------
   initGalleryTab()
------------------------------------------------------------ */

export async function initGalleryTab() {
  clearDivs();
  setGallerySubtabs();

  // --- Recreate previously created subtabs ---
  const createdTabs = Object.keys(uiState.galleryTabs);
  if (createdTabs.length > 0) {
    createdTabs.forEach(tabId => {
      const item = uiState.galleryTabs[tabId];
      addGallerySubtab({ name: item.name });
    });
  } else {
    // default to all three available types
    [IDEABOOK, PATTERNS, SCRIPTS].forEach(key => {
      const data = uiState.manifests.gallery[key];
      if (data) addGallerySubtab({ name: key });
    });
  }

  // --- Restore last active subtab or fallback to Categories ---
  const tabId = uiState.activeGalleryTab || "tab-categories";
  await switchGalleryTab(tabId);

  console.log(`✅ initGalleryTab restored ${tabId}`);
} // end initGalleryTab


/* ------------------------------------------------------------
   setGallerySubtabs()
   Creates the Gallery subtab bar if missing.
------------------------------------------------------------ */
function setGallerySubtabs() {
  let el = document.getElementById("subtabs");
  if (!el) throw new Error("setGallerySubtabs: #subtabs not found");

  // Always rebuild to avoid phantom id issues
  el.innerHTML = "";

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs gallery-subtabs";
  el.appendChild(bar);

  // create and attach the Categories button
  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className = "nav-link active";
  btn.dataset.tabId = "tab-categories";
  btn.textContent = "Categories";
  btn.addEventListener("click", () => switchGalleryTab("tab-categories"));

  li.appendChild(btn);
  bar.appendChild(li);
} // end setGallerySubtabs


/* ------------------------------------------------------------
   setGalleryCategories()
------------------------------------------------------------ */
async function setGalleryCategories() {
  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("setGalleryCategories: #text not found");

  textDiv.innerHTML = "<p>Loading Gallery categories...</p>";

  // --- load manifests for Ideabook and Patterns ---
  const ideabookData = await loadManifestGroup(`./gallery/${IDEABOOK}`);
  const patternsData = await loadManifestGroup(`./gallery/${PATTERNS}`);

  // --- load Scripts manifest (single manifest file) ---
  const scriptsList = await loadManifest("./gallery", "Scripts") || [];

  // --- combine all data sets ---
  const data = {
    Ideabook: Object.keys(ideabookData),
    Patterns: Object.keys(patternsData),
    Scripts: scriptsList
  };

  // --- render and hook up UI ---
  renderGalleryCategories(textDiv, data);
  addGalleryHandler(IDEABOOK, textDiv);
  addGalleryHandler(PATTERNS, textDiv);
  addGalleryHandler(SCRIPTS, textDiv);

  console.log("✅ Gallery categories displayed");
} // end setGalleryCategories


/* ------------------------------------------------------------
   renderGalleryCategories(container, data)
------------------------------------------------------------ */
function renderGalleryCategories(container, data) {
  container.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.id = "categories";

  function addFrame(title, list) {
    const frame = document.createElement("div");
    frame.className = "category-frame";

    const header = document.createElement("div");
    header.className = "category-header";
    header.textContent = title;
    frame.appendChild(header);

    const content = document.createElement("div");
    content.className = "category-content";

    const itemsArray = Array.isArray(list) ? list : Object.keys(list || {});
    if (!itemsArray || itemsArray.length === 0) {
      const empty = document.createElement("div");
      empty.className = "item";
      empty.textContent = "(empty)";
      content.appendChild(empty);
    } else {
      itemsArray.forEach(entry => {
        const row = document.createElement("div");
        row.className = "item";

        if (typeof entry === "object" && entry !== null) {
          row.textContent = entry.title || entry.filename || "(untitled)";
          row.dataset.filename = entry.filename || "";
        } else {
          row.textContent = entry;
          row.dataset.filename = entry;
        }

        content.appendChild(row);
      });
    }

    frame.appendChild(content);
    wrapper.appendChild(frame);
  } // end addFrame

  addFrame(IDEABOOK, data.Ideabook);
  addFrame(PATTERNS, data.Patterns);
  addFrame(SCRIPTS, data.Scripts);

  container.appendChild(wrapper);
} // end renderGalleryCategories

/* ------------------------------------------------------------
   addGalleryHandler(tab, container)
------------------------------------------------------------ */
function addGalleryHandler(tab, container) {
  const index = (tab === IDEABOOK) ? 1 : (tab === PATTERNS) ? 2 : 3;
  const frame = container.querySelector(`.category-frame:nth-child(${index})`);
  if (!frame) return;

  frame.querySelectorAll(".item").forEach(row => {
    row.addEventListener("click", async () => {
      const cat = row.textContent.trim();
      if (!cat || cat === "(empty)") return;

      const textDiv = document.getElementById("text");
      if (textDiv) textDiv.innerHTML = "";

      addGallerySubtab({ name: tab });

      if (tab === SCRIPTS) {
        const scriptName = row.dataset.filename || row.textContent.trim();
        await renderGalleryScripts(scriptName);
      } else {
        renderGalleryThumbnails(tab, cat);
      }
    });
  });

} // end addGalleryHandler


/* ------------------------------------------------------------
   addGallerySubtab(item)
------------------------------------------------------------ */
function addGallerySubtab(item) {
  const bar = document.querySelector("#subtabs ul");
  if (!bar) throw new Error("addGallerySubtab: subtab bar not found");

  const tabId = "tab-" + item.name.toLowerCase();
  let btn = bar.querySelector(`[data-tab-id="${tabId}"]`);

  if (!btn) {
    const li = document.createElement("li");
    li.className = "nav-item";
    btn = document.createElement("button");
    btn.className = "nav-link";
    btn.dataset.tabId = tabId;
    btn.textContent = item.name;
    btn.addEventListener("click", () => switchGalleryTab(tabId));
    li.appendChild(btn);
    bar.appendChild(li);

    uiState.galleryTabs[tabId] = { name: item.name };
  }

  bar.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  uiState.activeGalleryTab = tabId;
} // end addGallerySubtab


/* ------------------------------------------------------------
   switchGalleryTab(tabId)
------------------------------------------------------------ */
async function switchGalleryTab(tabId) {
  uiState.activeGalleryTab = tabId;
  clearDivs();

  if (tabId === "tab-categories") {
    await setGalleryCategories();
    return;
  }

  const key = tabId.replace("tab-", "");

  let manifestInfo = uiState.manifests.gallery[key];
  if (!manifestInfo) {
    console.log("Loading new manifest for", key);

    switch (key) {
      case "ideabook":
        manifestInfo = await loadManifestGroup(`./gallery/${IDEABOOK}`);
        break;

      case "patterns":
        manifestInfo = await loadManifestGroup(`./gallery/${PATTERNS}`);
        break;

      case "scripts":
        manifestInfo = await loadManifest("./gallery", "Scripts") || [];
        break;

      default:
        console.warn("Unknown gallery key:", key);
        manifestInfo = [];
        break;
    }

    uiState.manifests.gallery[key] = manifestInfo;
  } else {
    console.log("Using cached manifest for", key);
  }

  if (key === "ideabook") {
    addGallerySubtab({ name: IDEABOOK });
    renderGalleryThumbnails(IDEABOOK, Object.keys(manifestInfo)[0]);
  } else if (key === "patterns") {
    addGallerySubtab({ name: PATTERNS });
    renderGalleryThumbnails(PATTERNS, Object.keys(manifestInfo)[0]);
  } else if (key === "scripts") {
    addGallerySubtab({ name: SCRIPTS });
    await renderGalleryScripts();
  }

  const bar = document.querySelector("#subtabs ul");
  if (bar) {
    bar.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
    const activeBtn = bar.querySelector(`[data-tab-id="${tabId}"]`);
    if (activeBtn) activeBtn.classList.add("active");
  }
} // end switchGalleryTab


/* ------------------------------------------------------------
   renderGalleryThumbnails(tab, category)
------------------------------------------------------------ */
async function renderGalleryThumbnails(tab, category) {
  const actDiv = document.getElementById("action");
  actDiv.innerHTML = "<p>Loading thumbnails...</p>";

  let cached;
  if (tab === IDEABOOK)
    cached = uiState.manifests.gallery.ideabook?.[category];
  else
    cached = uiState.manifests.gallery.patterns?.[category];

  if (cached) {
    console.log("Using cached manifest for", category);
    uiState.activeManifest = cached;
    drawGalleryThumbnails(tab, category, cached);
    return;
  }

  try {
    const manifest = await loadManifest(`./gallery/${tab}`, category);
    if (!Array.isArray(manifest) || manifest.length === 0) {
      actDiv.innerHTML = `<p>No images found for ${category}</p>`;
      return;
    }

    if (tab === IDEABOOK) {
      uiState.manifests.gallery.ideabook ??= {};
      uiState.manifests.gallery.ideabook[category] = manifest;
    } else {
      uiState.manifests.gallery.patterns ??= {};
      uiState.manifests.gallery.patterns[category] = manifest;
    }

    uiState.activeManifest = manifest;
    drawGalleryThumbnails(tab, category, manifest);

  } catch (err) {
    actDiv.innerHTML = `<p style="color:red;">Error loading thumbnails for ${category}</p>`;
    console.error("renderGalleryThumbnails failed:", err);
  }
} // end renderGalleryThumbnails


/* ------------------------------------------------------------
   renderGalleryScripts()
------------------------------------------------------------ */
function renderGalleryScripts(scriptName = null) {
  const actDiv = document.getElementById("action");
  actDiv.innerHTML = "";

  (async function () {
    try {
      let manifest = uiState.manifests.gallery.scripts;
      if (!manifest) {
        manifest = await loadManifest("./gallery", "Scripts");
        if (!manifest) throw new Error("Missing or invalid Scripts manifest");
        uiState.manifests.gallery.scripts = manifest;
      }

      uiState.activeManifest = manifest;

      let idx = 0;
      if (scriptName) {
        idx = manifest.findIndex(e => e.filename === scriptName);
        if (idx < 0) idx = 0;
      } else {
        idx = uiState.galleryIndex?.scripts ?? 0;
      }

      const entry = manifest[idx] ?? manifest[0];
      if (!entry) {
        console.warn("No script entries found in manifest.");
        return;
      }

      setActiveItem("Scripts", entry);
      await showGalleryScript(entry);
      updateGalleryCaption(SCRIPTS);

    } catch (err) {
      console.error("renderGalleryScripts failed:", err);
      actDiv.innerHTML = `<p style="color:red;">
                          Error loading or executing Scripts manifest</p>`;
    }
  })();
} // end renderGalleryScripts


/* ------------------------------------------------------------
   drawGalleryThumbnails(tab, category, manifest)
------------------------------------------------------------ */
function drawGalleryThumbnails(tab, category, manifest) {
  const actDiv = document.getElementById("action");
  const panel = document.createElement("div");
  panel.className = "thumb-panel";

  manifest.forEach((entry, i) => {
    const { filename, path } = entry;
    const thumbBox = document.createElement("div");
    thumbBox.className = "thumb-box";

    const img = document.createElement("img");
    img.className = "thumb-image";
    img.src = `./gallery/${tab}/${category}/images/thumb_${filename}.png`;
    img.alt = filename;
    img.title = filename;

    img.addEventListener("click", () => {
      if (!uiState.galleryIndex)
        uiState.galleryIndex = { ideabook: 0, patterns: 0, scripts: 0 };
      uiState.galleryIndex[tab.toLowerCase()] = i;
      showGalleryImage(tab, category, path);
      setActiveItem(category, entry);
      updateGalleryCaption(tab);
    });

    thumbBox.appendChild(img);
    panel.appendChild(thumbBox);
  });

  actDiv.innerHTML = "";
  actDiv.appendChild(panel);

  const key = tab.toLowerCase();
  const idx = uiState.galleryIndex[key] ?? 0;
  const entry = manifest[idx] ?? manifest[0];
  if (entry?.path) {
    showGalleryImage(tab, category, entry.path);
    setActiveItem(category, entry);
  }

  updateGalleryCaption(tab);
} // end drawGalleryThumbnails


/* ------------------------------------------------------------
   showGalleryImage(tab, category, path)
------------------------------------------------------------ */
function showGalleryImage(tab, category, path) {
  const sketch = document.getElementById("sketchpad");
  sketch.innerHTML = "";

  const img = document.createElement("img");
  img.src = `./gallery/${tab}/${path}`;
  img.alt = path;
  img.style.display = "block";
  img.style.maxWidth = "100%";
  img.style.maxHeight = "100%";
  img.style.margin = "0 auto";

  sketch.appendChild(img);
} // end showGalleryImage


/* ------------------------------------------------------------
   showGalleryScript(entry)
------------------------------------------------------------ */
/* ------------------------------------------------------------
   showGalleryScript(entry)
   Now detects patternMeta/initPattern/drawPattern for controls.
------------------------------------------------------------ */
async function showGalleryScript(entry) {
  const sketchDiv = document.getElementById("sketchpad");
  sketchDiv.innerHTML = "";
  sketchDiv.appendChild(window.drawCanvas);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);

  try {
    const moduleUrl = `/gallery/Scripts/${entry.path}`;
    const mod = await import(moduleUrl);

    // --- NEW: parameterized script?
    if (mod.patternMeta && mod.initPattern && mod.drawPattern) {
      printTitle(mod.patternMeta.title || entry.title || entry.filename);

      const params = mod.initPattern();

      // build a simple control panel
      const actionDiv = document.getElementById("action");
      actionDiv.innerHTML = "";
      buildScriptControls(mod.patternMeta, params, actionDiv, () => {
        mod.drawPattern(params);
      });

      mod.drawPattern(params);
    }
    else {
      // legacy script
      if (!mod.runPattern)
        throw new Error(`runPattern() not found in ${moduleUrl}`);

      await mod.runPattern();
    }

  } catch (err) {
    console.error("Script execution error:", err);
    sketchDiv.innerHTML = `<p style="color:red;">
                 Error executing ${entry.filename}: ${err.message}</p>`;
    return;
  }

  uiState.activeScript = {
    filename: entry.filename,
    path: entry.path,
    title: entry.title || entry.filename
  };

  updateGalleryCaption("Scripts");
} // end showGalleryScript

/* ------------------------------------------------------------
   updateGalleryCaption(tab)
------------------------------------------------------------ */
function updateGalleryCaption(tab) {
  const capDiv = document.getElementById("caption");
  capDiv.innerHTML = "";
  capDiv.style.display = "flex";

  const info = uiState.activeGalleryItem;
  const title = document.createElement("span");
  title.className = "caption-title";
  title.textContent = info?.title || info?.filename || "(untitled)";
  capDiv.appendChild(title);

  const btnGroup = document.createElement("div");
  btnGroup.className = "caption-buttons";

  const makeBtn = (label, handler) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.addEventListener("click", handler);
    return b;
  };

  btnGroup.appendChild(makeBtn("Prev", () => showPrevGalleryItem(tab)));
  btnGroup.appendChild(makeBtn("Next", () => showNextGalleryItem(tab)));

  if (tab === SCRIPTS) {
    btnGroup.appendChild(makeBtn("Show Script", async () => {
      const entry = uiState.activeGalleryItem;
      if (!entry) return;
      try {
        const res = await fetch(`./gallery/Scripts/${entry.path}`);
        if (res.ok) {
          const text = await res.text();
          showOffcanvas(entry.title || entry.filename, text);
        } else {
          showOffcanvas(entry.title || entry.filename,
                        `Unable to load script: HTTP ${res.status}`);
        }
      } catch (err) {
        showOffcanvas(entry.title || entry.filename, `Error: ${err.message}`);
      }
    }));
  }

  capDiv.appendChild(btnGroup);
} // end updateGalleryCaption


/* ------------------------------------------------------------
   showPrevGalleryItem(tab)
------------------------------------------------------------ */
async function showPrevGalleryItem(tab) {
    setGalleryAction();   // always clear action area on navigation

  const manifest = uiState.activeManifest;
  if (!manifest) return;

  const current = uiState.activeGalleryItem;
  const idx = manifest.findIndex(e => e.path === current?.path);
  const prevIdx = (idx <= 0) ? manifest.length - 1 : idx - 1;

  const entry = manifest[prevIdx];
  uiState.activeGalleryItem = entry;

  if (!uiState.galleryIndex)
    uiState.galleryIndex = { ideabook: 0, patterns: 0, scripts: 0 };
  uiState.galleryIndex[tab.toLowerCase()] = prevIdx;

  if (tab === SCRIPTS) {
    await showGalleryScript(entry);
  } else {
    showGalleryImage(tab, uiState.activeCategory, entry.path);
  }

  updateGalleryCaption(tab);
} // end showPrevGalleryItem


/* ------------------------------------------------------------
   showNextGalleryItem(tab)
------------------------------------------------------------ */
async function showNextGalleryItem(tab) {
    setGalleryAction();   // always clear action area on navigation

  const manifest = uiState.activeManifest;
  if (!manifest) return;

  const current = uiState.activeGalleryItem;
  const idx = manifest.findIndex(e => e.path === current?.path);
  const nextIdx = (idx >= manifest.length - 1) ? 0 : idx + 1;

  const entry = manifest[nextIdx];
  uiState.activeGalleryItem = entry;

  if (!uiState.galleryIndex)
    uiState.galleryIndex = { ideabook: 0, patterns: 0, scripts: 0 };
  uiState.galleryIndex[tab.toLowerCase()] = nextIdx;

  if (tab === SCRIPTS) {
    await showGalleryScript(entry);
  } else {
    showGalleryImage(tab, uiState.activeCategory, entry.path);
  }

  updateGalleryCaption(tab);
} // end showNextGalleryItem


//function redrawActiveScript() {
//  if (!window.scriptInfo || typeof window.scriptInfo.draw !== "function") return;
//  try {
//    window.scriptInfo.draw(window.scriptInfo.parameters);
//  } catch (err) {
//    console.error("redrawActiveScript failed:", err);
//  }
//} // end redrawActiveScript

function buildScriptControls(meta, params, panel, onChange) {
  const box = document.createElement("div");
  box.className = "script-controls";

  meta.parameters.forEach(def => {
    const row = document.createElement("div");
    row.className = "script-control-row";

    const label = document.createElement("label");
    label.textContent = def.label;

    let input;

    // ------------------------
    // widget: "range"
    // ------------------------
    if (def.widget === "range") {
      input = document.createElement("input");
      input.type = "range";
      input.min = def.min;
      input.max = def.max;
      input.step = def.step;
      input.value = params[def.key];

      // Add live number readout
      const readout = document.createElement("span");
      readout.className = "script-control-readout";
      readout.textContent = params[def.key];

      input.addEventListener("input", () => {
        params[def.key] = Number(input.value);
        readout.textContent = input.value;
        onChange();
      });

      row.appendChild(label);
      row.appendChild(input);
      row.appendChild(readout);
      box.appendChild(row);
      return; // skip remaining types for this param
    }

    // ------------------------
    // widget: "checkbox"
    // ------------------------
    if (def.widget === "checkbox") {
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = params[def.key];

      input.addEventListener("input", () => {
        params[def.key] = input.checked;
        onChange();
      });

      row.appendChild(label);
      row.appendChild(input);
      box.appendChild(row);
      return;
    }

    // ------------------------
    // widget: "select"
    // ------------------------
    if (def.widget === "select") {
      input = document.createElement("select");

      def.options.forEach(optVal => {
        const opt = document.createElement("option");
        opt.value = optVal;
        opt.textContent = optVal;
        if (optVal === params[def.key]) opt.selected = true;
        input.appendChild(opt);
      });

      input.addEventListener("input", () => {
        params[def.key] = input.value;
        onChange();
      });

      row.appendChild(label);
      row.appendChild(input);
      box.appendChild(row);
      return;
    }

    // ------------------------
    // fallback: plain text
    // ------------------------
    input = document.createElement("input");
    input.type = "text";
    input.value = params[def.key];

    input.addEventListener("input", () => {
      params[def.key] = input.value;
      onChange();
    });

    row.appendChild(label);
    row.appendChild(input);
    box.appendChild(row);
  });

  panel.appendChild(box);
} // end buildScriptControls


/* ------------------------------------------------------------
   galleryDivs
------------------------------------------------------------ */
export const galleryDivs = {
  activeDivs: ["subtabs"],
  theme: "theme-gallery",
  action: setGalleryAction,
  buttons: setGalleryButtons,
  caption: setGalleryCaption,
  sketchpad: setGallerySketchpad,
  subtabs: setGallerySubtabs,
  text: setGalleryText
}; // end galleryDivs


/* ------------------------------------------------------------
   Minimal placeholder setters
------------------------------------------------------------ */
function setGalleryAction() {
  const el = document.getElementById("action");
  if (el) el.innerHTML = "";
} // end setGalleryAction

function setGalleryButtons() {
  const el = document.getElementById("buttons");
  if (el) el.innerHTML = "";
} // end setGalleryButtons

function setGalleryCaption() {
  const el = document.getElementById("caption");
  if (el) el.innerHTML = "";
} // end setGalleryCaption

function setGallerySketchpad() {
  const el = document.getElementById("sketchpad");
  if (el) el.innerHTML = "";
} // end setGallerySketchpad

function setGalleryText() {
  const el = document.getElementById("text");
  if (el) el.innerHTML = "";
} // end setGalleryText
