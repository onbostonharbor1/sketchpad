/* figuresMenuCmds.js
   ============================================================
   Figures Tab — Caption Bar and Menu Items
   ============================================================
   Role:
     Owns everything related to building the caption bar and
     constructing menu items for figure operations.

     Also contains the menu command implementations (save,
     reset order, archive, edit manifest, show script).

   Architectural rules:
     • Does NOT own lifecycle (init/restore/save). Those live
       in figures.js.
     • Does NOT render figures or navigate. Those live in
       figuresDisplay.js and figuresNav.js.
     • Uses dynamic imports for runner functions to avoid
       circular dependencies.

   Exports:
     setFiguresCaption(name, context)
     getFiguresCaptionMenuItems(info)
     saveFigureState(context)
     archiveFigureItem(info)
     editFigureManifestItem(info)
   ============================================================ */

import { setCaptionBar }          from "/ui/caption.js";
import { menuManager }            from "/ui/menuManager.js";
import { manifest }               from "/ui/manifest.js";
import { archiveItem }            from "/ui/menuCmds.js";
import { showScriptOffcanvas }    from "/ui/menuCmds.js";
import { openEditManifestDialog } from "/ui/menuCmds.js";
import {
  makeHelpItem,
  makeShowScriptItem,
  makeEditManifestItem,
  makeArchiveItem
} from "/ui/menuCmds.js";
import { setCommandsButton, setCommandsButtonLabel, setCommandsButtonHandler, showCommandsOffcanvas, formatRebuildReportShared } from "/ui/uiUtilities.js";
import { nodeRebuildAndValidateManifests } from "/ui/nodeLayer.js";
import { openHelpHomeOverlay }    from "/ui/help.js";
import { getFiguresRegistry }     from "./figuresState.js";
import {
  renderSubtabs,
  switchToCategories
}                                 from "/ui/figures/figuresNav.js";
import { renderCategories }       from "/ui/categories.js";
import {
  collectRegistryEntries,
  groupEntriesByCategory
}                                 from "/ui/draw/drawCategories.js";
import { buildSingleControl }     from "/ui/controls/rendering/renderer.js";


/* ============================================================
   openCreateFigureDialog()
   ============================================================
   Entry point for the Create Figure wizard.
   Opens a "Create Figure" subtab and renders Phase 1 into
   the text div: figure name field + category selection.
   ============================================================ */
export function openCreateFigureDialog() {

  const TAB_ID = "tab-create-figure";

  /* -- Register the wizard tab in uiState ------------------- */
  uiState.figures.tabs[TAB_ID] = {
    type:         "create-figure",
    name:         "Create Figure",
    wizardData:   { figureName: "", category: "", isNewCategory: false }
  };
  uiState.figures.activeSubtab = TAB_ID;
  renderSubtabs();

  /* -- Caption: title left, Next + Cancel right ------------- */
  _buildCreateFigureCaption(TAB_ID);

  /* -- Phase 1 form in #text -------------------------------- */
  _renderPhase1Form(TAB_ID);

} // end openCreateFigureDialog


/* ============================================================
   _buildCreateFigureCaption(tabId)
   ============================================================
   Builds the caption bar for the Create Figure wizard.
   Title on left, Next and Cancel on right.
   ============================================================ */
function _buildCreateFigureCaption(tabId) {

  const el = document.getElementById("caption");
  if (!el) return;

  el.innerHTML = "";
  el.style.display        = "flex";
  el.style.justifyContent = "space-between";
  el.style.alignItems     = "center";

  /* Left: title */
  const title = document.createElement("span");
  title.className   = "caption-title";
  title.textContent = "Create Figure";
  el.appendChild(title);

  /* Right: buttons */
  const btnRow = document.createElement("div");
  btnRow.className = "caption-buttons";
  el.appendChild(btnRow);

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next";
  nextBtn.onclick     = () => _onPhase1Next(tabId);
  btnRow.appendChild(nextBtn);

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.onclick     = () => _cancelCreateFigure(tabId);
  btnRow.appendChild(cancelBtn);

  /* Disabled menu button to match standard caption layout */
  const menuBtn = document.createElement("button");
  menuBtn.textContent   = "v";
  menuBtn.disabled      = true;
  menuBtn.style.opacity = "0.4";
  menuBtn.style.cursor  = "default";
  btnRow.appendChild(menuBtn);

} // end _buildCreateFigureCaption


/* ============================================================
   _renderPhase1Form(tabId)
   ============================================================
   Renders the Phase 1 form into #text:
     - Figure Name input
     - Existing Categories radio list
     - New Category text input
   Mutual exclusivity: selecting an existing category clears
   the new category input and vice versa.
   ============================================================ */
function _renderPhase1Form(tabId) {

  const textDiv = document.getElementById("text");
  if (!textDiv) return;

  /* Collect category names: union of drawRegistry + figures registry */
  const drawCats    = _getDrawRegistryCategories();
  const figuresCats = getFiguresRegistry() || [];
  const allCats     = [...new Set([...drawCats, ...figuresCats])].sort();

  /* Build form HTML */
  let catRadios = allCats.map(cat => `
    <label class="create-figure-cat-label">
      <input type="radio" name="existingCategory" value="${cat}">
      ${cat}
    </label>
  `).join("");

  textDiv.innerHTML = `
    <div class="create-figure-form">

      <div class="create-figure-field">
        <label for="createFigureName">Figure Name</label>
        <input type="text" id="createFigureName" placeholder="Enter figure name"
               autocomplete="off">
        <div id="createFigureNameMsg" class="create-figure-msg"></div>
      </div>

      <div class="create-figure-field">
        <label>Existing Categories</label>
        <div id="existingCategoriesList" class="create-figure-cat-list">
          ${catRadios}
        </div>
      </div>

      <div class="create-figure-field">
        <label>
          <input type="radio" name="existingCategory" value="__new__"
                 id="newCategoryRadio">
          New Category
        </label>
        <input type="text" id="newCategoryName" placeholder="Enter new category name"
               autocomplete="off" style="margin-top:4px;">
      </div>

    </div>
  `;

  /* Wire mutual exclusivity */
  const nameInput    = document.getElementById("createFigureName");
  const newCatInput  = document.getElementById("newCategoryName");
  const newCatRadio  = document.getElementById("newCategoryRadio");
  const catList      = document.getElementById("existingCategoriesList");

  /* Typing in New Category selects its radio and clears existing selection */
  newCatInput.addEventListener("input", () => {
    newCatRadio.checked = true;
    catList.querySelectorAll("input[type=radio]").forEach(r => r.checked = false);
    _savePhase1State(tabId);
  });

  /* Selecting an existing category clears new category input */
  catList.addEventListener("change", () => {
    newCatRadio.checked = false;
    newCatInput.value   = "";
    _savePhase1State(tabId);
  });

  /* Save name on input */
  nameInput.addEventListener("input", () => _savePhase1State(tabId));

  nameInput.focus();

} // end _renderPhase1Form


/* ============================================================
   _getDrawRegistryCategories()
   ============================================================
   Returns a sorted array of unique category strings from
   window.drawRegistry.
   ============================================================ */
function _getDrawRegistryCategories() {
  if (!window.drawRegistry) return [];
  return [...new Set(
    Object.values(window.drawRegistry)
      .map(e => e.category)
      .filter(Boolean)
  )].sort();
} // end _getDrawRegistryCategories


/* ============================================================
   _savePhase1State(tabId)
   ============================================================
   Reads the current form values and stores them in wizardData.
   ============================================================ */
function _savePhase1State(tabId) {

  const tab = uiState.figures.tabs[tabId];
  if (!tab) return;

  const nameInput   = document.getElementById("createFigureName");
  const newCatInput = document.getElementById("newCategoryName");
  const newCatRadio = document.getElementById("newCategoryRadio");
  const selected    = document.querySelector("input[name=existingCategory]:checked");

  tab.wizardData.figureName = nameInput ? nameInput.value.trim() : "";

  if (newCatRadio && newCatRadio.checked && newCatInput && newCatInput.value.trim()) {
    tab.wizardData.category      = newCatInput.value.trim();
    tab.wizardData.isNewCategory = true;
  } else if (selected && selected.value !== "__new__") {
    tab.wizardData.category      = selected.value;
    tab.wizardData.isNewCategory = false;
  } else {
    tab.wizardData.category      = "";
    tab.wizardData.isNewCategory = false;
  }

} // end _savePhase1State


/* ============================================================
   _onPhase1Next(tabId)
   ============================================================
   Validates Phase 1 and advances to Step 4 (draw object
   selection). For now just logs — Step 3 stores data.
   ============================================================ */
function _onPhase1Next(tabId) {

  _savePhase1State(tabId);

  const tab  = uiState.figures.tabs[tabId];
  const data = tab ? tab.wizardData : null;
  if (!data) return;

  if (!data.figureName) {
    document.getElementById("createFigureNameMsg").textContent =
      "Please enter a figure name.";
    return;
  }

  if (!data.category) {
    document.getElementById("createFigureNameMsg").textContent =
      "Please select or enter a category.";
    return;
  }

  /* Advance to Phase 2 */
  _renderPhase2Caption(tabId);
  _renderPhase2Form(tabId);

} // end _onPhase1Next


/* ============================================================
   _renderPhase2Caption(tabId)
   ============================================================
   Caption: "FigureName (Category)" left, Prev/Next/Cancel right.
   ============================================================ */
function _renderPhase2Caption(tabId) {

  const tab  = uiState.figures.tabs[tabId];
  const data = tab.wizardData;

  const el = document.getElementById("caption");
  if (!el) return;

  el.innerHTML = "";
  el.style.display        = "flex";
  el.style.justifyContent = "space-between";
  el.style.alignItems     = "center";

  const title = document.createElement("span");
  title.className   = "caption-title";
  title.textContent = `${data.figureName} (${data.category})`;
  el.appendChild(title);

  const btnRow = document.createElement("div");
  btnRow.className = "caption-buttons";
  el.appendChild(btnRow);

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Prev";
  prevBtn.onclick     = () => {
    _buildCreateFigureCaption(tabId);
    _renderPhase1Form(tabId);
  };
  btnRow.appendChild(prevBtn);

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next";
  nextBtn.onclick     = () => _onPhase2Next(tabId);
  btnRow.appendChild(nextBtn);

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.onclick     = () => _cancelCreateFigure(tabId);
  btnRow.appendChild(cancelBtn);

  const menuBtn = document.createElement("button");
  menuBtn.textContent   = "v";
  menuBtn.disabled      = true;
  menuBtn.style.opacity = "0.4";
  menuBtn.style.cursor  = "default";
  btnRow.appendChild(menuBtn);

} // end _renderPhase2Caption


/* ============================================================
   _renderPhase2Form(tabId)
   ============================================================
   Renders the draw object selection screen into #text:
     - Chip strip at top showing selected items
     - Category frames from drawRegistry below
   ============================================================ */
function _renderPhase2Form(tabId) {

  const tab = uiState.figures.tabs[tabId];
  if (!tab.wizardData.selectedObjects) {
    tab.wizardData.selectedObjects = [];
  }

  const textDiv = document.getElementById("text");
  if (!textDiv) return;

  /* Chip strip container at top */
  textDiv.innerHTML = `
    <div id="selectionChips" class="create-figure-chips"></div>
    <div id="phase2Categories"></div>
  `;

  _renderChips(tabId);

  /* Build category frames directly — bypasses renderCategories so
     setActiveItem never fires and we own all class management.    */
  const entries = collectRegistryEntries();
  const groups  = groupEntriesByCategory(entries);
  const catContainer = document.getElementById("phase2Categories");

  const outer = document.createElement("div");
  outer.id = "categories";
  catContainer.appendChild(outer);

  Object.keys(groups).sort().forEach(category => {
    const frame = document.createElement("div");
    frame.className = "category-frame";

    const header = document.createElement("div");
    header.className = "category-header";
    header.textContent = `${category} (${groups[category].length})`;
    frame.appendChild(header);

    const content = document.createElement("div");
    content.className = "category-content";
    frame.appendChild(content);

    groups[category].forEach(desc => {
      const itemEl = document.createElement("div");
      itemEl.className = "item";
      itemEl.setAttribute("data-key", desc.name);

      const label = document.createElement("span");
      label.textContent = desc.name;
      itemEl.appendChild(label);

      itemEl.addEventListener("click", () => {
        _toggleSelection(tabId, desc.key, desc.name);
      });

      content.appendChild(itemEl);
    });

    outer.appendChild(frame);
  });

  /* Re-apply active class to any already-selected items */
  _reapplyActiveItems(tabId);

} // end _renderPhase2Form


/* ============================================================
   _toggleSelection(tabId, key, name)
   ============================================================
   Toggles an item in/out of wizardData.selectedObjects and
   updates the chip strip and item highlight.
   ============================================================ */
function _toggleSelection(tabId, key, name) {

  const tab      = uiState.figures.tabs[tabId];
  const selected = tab.wizardData.selectedObjects;
  const idx      = selected.findIndex(s => s.key === key);

  if (idx === -1) {
    selected.push({ key, name });
  } else {
    selected.splice(idx, 1);
  }

  _reapplyActiveItems(tabId);
  _renderChips(tabId);

} // end _toggleSelection


/* ============================================================
   _reapplyActiveItems(tabId)
   ============================================================
   Sets the active class on all selected items in the category
   frames, clearing it from unselected ones.
   ============================================================ */
function _reapplyActiveItems(tabId) {

  const tab      = uiState.figures.tabs[tabId];
  const selected = tab.wizardData.selectedObjects;
  const names    = new Set(selected.map(s => s.name));

  const container = document.getElementById("phase2Categories");
  if (!container) return;

  container.querySelectorAll(".item").forEach(el => {
    const k = el.getAttribute("data-key");
    el.classList.toggle("active", names.has(k));
    if (names.has(k)) console.log("set active on:", k, el.className);
  });

} // end _reapplyActiveItems


/* ============================================================
   _renderChips(tabId)
   ============================================================
   Renders the selection chips at the top of #text.
   Each chip shows the item name with an × to remove it.
   ============================================================ */
function _renderChips(tabId) {

  const tab      = uiState.figures.tabs[tabId];
  const selected = tab.wizardData.selectedObjects;
  const strip    = document.getElementById("selectionChips");
  if (!strip) return;

  strip.innerHTML = "";

  selected.forEach(({ key, name }) => {
    const chip = document.createElement("div");
    chip.className = "create-figure-chip";

    const label = document.createElement("span");
    label.textContent = name;
    chip.appendChild(label);

    const del = document.createElement("span");
    del.className   = "create-figure-chip-del";
    del.textContent = "×";
    del.onclick     = () => _toggleSelection(tabId, key, name);
    chip.appendChild(del);

    strip.appendChild(chip);
  });

} // end _renderChips


/* ============================================================
   _onPhase2Next(tabId)
   ============================================================
   Validates at least one object selected before proceeding.
   ============================================================ */
function _onPhase2Next(tabId) {

  const tab  = uiState.figures.tabs[tabId];
  const data = tab.wizardData;

  if (!data.selectedObjects || data.selectedObjects.length === 0) {
    /* Flash a message in the chip strip area */
    const strip = document.getElementById("selectionChips");
    if (strip) {
      strip.innerHTML =
        `<span class="create-figure-msg">Please select at least one draw object.</span>`;
    }
    return;
  }

  /* Advance to Phase 3 — review screen */
  _renderPhase3Caption(tabId);
  _renderPhase3Form(tabId);

} // end _onPhase2Next


/* ============================================================
   _renderPhase3Caption(tabId)
   ============================================================
   Caption: figure name left, OK and Cancel right.
   ============================================================ */
function _renderPhase3Caption(tabId) {

  const tab  = uiState.figures.tabs[tabId];
  const data = tab.wizardData;

  const el = document.getElementById("caption");
  if (!el) return;

  el.innerHTML = "";
  el.style.display        = "flex";
  el.style.justifyContent = "space-between";
  el.style.alignItems     = "center";

  const title = document.createElement("span");
  title.className   = "caption-title";
  title.textContent = `${data.figureName} (${data.category})`;
  el.appendChild(title);

  const btnRow = document.createElement("div");
  btnRow.className = "caption-buttons";
  el.appendChild(btnRow);

  const okBtn = document.createElement("button");
  okBtn.id          = "createFigureOkBtn";
  okBtn.textContent = "OK";
  okBtn.onclick     = () => _onPhase3Ok(tabId);
  btnRow.appendChild(okBtn);

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.onclick     = () => _cancelCreateFigure(tabId);
  btnRow.appendChild(cancelBtn);

  const menuBtn = document.createElement("button");
  menuBtn.textContent   = "v";
  menuBtn.disabled      = true;
  menuBtn.style.opacity = "0.4";
  menuBtn.style.cursor  = "default";
  btnRow.appendChild(menuBtn);

} // end _renderPhase3Caption


/* ============================================================
   _renderPhase3Form(tabId)
   ============================================================
   Renders the review list into #text.
   Each row: × | Object Name | count input
   ============================================================ */
function _renderPhase3Form(tabId) {

  const tab  = uiState.figures.tabs[tabId];
  const data = tab.wizardData;

  /* Ensure each selected object has a count */
  data.selectedObjects.forEach(obj => {
    if (!obj.count) obj.count = 1;
  });

  const textDiv = document.getElementById("text");
  if (!textDiv) return;

  textDiv.innerHTML = `
    <div class="create-figure-review">
      <div class="create-figure-review-title">${data.figureName}</div>
      <div id="reviewList" class="create-figure-review-list"></div>
    </div>
  `;

  _renderReviewList(tabId);

} // end _renderPhase3Form


/* ============================================================
   _renderReviewList(tabId)
   ============================================================
   Renders the review rows — called on initial render and
   after any row removal.
   ============================================================ */
function _renderReviewList(tabId) {

  const tab     = uiState.figures.tabs[tabId];
  const data    = tab.wizardData;
  const listDiv = document.getElementById("reviewList");
  if (!listDiv) return;

  listDiv.innerHTML = "";

  data.selectedObjects.forEach((obj, idx) => {

    const row = document.createElement("div");
    row.className = "create-figure-review-row";

    /* × button */
    const removeBtn = document.createElement("button");
    removeBtn.className   = "create-figure-review-remove";
    removeBtn.textContent = "×";
    removeBtn.onclick     = () => {
      data.selectedObjects.splice(idx, 1);
      _renderReviewList(tabId);
      _updateOkButton();
    };
    row.appendChild(removeBtn);

    /* Object name */
    const name = document.createElement("span");
    name.className   = "create-figure-review-name";
    name.textContent = obj.name;
    row.appendChild(name);

    /* Count — number widget via parameterControls pipeline */
    const countParams = { count: obj.count };
    const countInfo   = {
      parameters:    countParams,
      redrawHandler: () => { obj.count = countParams.count; }
    };
    const countDef = { widget: "number", label: "Copies", min: 1 };
    const countField = buildSingleControl(
      countInfo, "count", countDef, obj.count, "review"
    );
    if (countField) {
      countField.classList.add("create-figure-review-count-field");
      row.appendChild(countField);
    }

    listDiv.appendChild(row);
  });

  _updateOkButton();

} // end _renderReviewList


/* ============================================================
   _updateOkButton()
   ============================================================
   Disables OK if the review list is empty.
   ============================================================ */
function _updateOkButton() {
  const okBtn = document.getElementById("createFigureOkBtn");
  if (!okBtn) return;
  const listDiv = document.getElementById("reviewList");
  okBtn.disabled = !listDiv || listDiv.children.length === 0;
} // end _updateOkButton


/* ============================================================
   _onPhase3Ok(tabId)
   ============================================================
   Dispatches to Node service. Step 6 will implement this.
   ============================================================ */
function _onPhase3Ok(tabId) {
  const tab  = uiState.figures.tabs[tabId];
  console.log("Phase 3 OK:", tab.wizardData);
} // end _onPhase3Ok


/* ============================================================
   _cancelCreateFigure(tabId)
   ============================================================
   Cancels the wizard, removes the tab, returns to categories.
   ============================================================ */
function _cancelCreateFigure(tabId) {
  delete uiState.figures.tabs[tabId];
  switchToCategories();
} // end _cancelCreateFigure


/* ============================================================
   wireFiguresCommandsButton()
   ============================================================ */
export function wireFiguresCommandsButton() {

  setCommandsButtonHandler(() => {
    showCommandsOffcanvas({
      title: "Figures Commands",
      buildBody(offcanvasBodyEl) {

        offcanvasBodyEl.innerHTML = `
          <div class="cmdButtonRow">
            <button id="figuresRebuildValidateButton" class="cmdButton" type="button">
              Rebuild &amp; Validate
            </button>
          </div>
          <div class="cmdButtonRow">
            <button id="figuresHelpButton" class="cmdButton" type="button">
              Help
            </button>
          </div>
          <div class="buttonSeparator"></div>
          <div id="figuresRebuildReport"></div>
        `;

        document.getElementById("figuresRebuildValidateButton")
          .addEventListener("click", async () => {
            const out = document.getElementById("figuresRebuildReport");
            out.textContent = "Running Global Rebuild...";

            const report = await nodeRebuildAndValidateManifests();

            const { syncSystemStateAfterRebuild } = await import("/ui/uiUtilities.js");
            await syncSystemStateAfterRebuild();

            const { initFiguresTab } = await import("./figures.js");
            await initFiguresTab(false);

            out.textContent = formatRebuildReportShared(report);
          });

        document.getElementById("figuresHelpButton")
          .addEventListener("click", () => {
            const closeBtn = document.querySelector('[data-bs-dismiss="offcanvas"]');
            if (closeBtn) closeBtn.click();
            openHelpHomeOverlay();
          });
      }
    });
  });

} // end wireFiguresCommandsButton


/* ============================================================
   setFiguresCaption(name, context)
   ============================================================
   Builds the caption bar for the figures tab.

   Arguments:
     name    — Display name for the caption (default: "Figures")
     context — Optional context object:
               { figureId, name, path, manifestPath,
                 matchField, matchValue, helpKey, scriptPath }
               If provided, enables the menu button.
   ============================================================ */
export function setFiguresCaption(name = "Figures", context = null) {

  setCommandsButtonLabel("Figures Commands");

  const config = {
    targetId: "caption",
    title: name,
    onMenu: context ? async (anchor) => {
      const items = await getFiguresCaptionMenuItems(context);
      menuManager.open(items, anchor);
    } : null
  };
  setCaptionBar(config);
} // end setFiguresCaption


/* ============================================================
   getFiguresCaptionMenuItems(info)
   ============================================================
   Returns menu items for the figures caption menu.

   Arguments:
     info = {
       figureId:     <string>
       name:         <string>
       path:         <string>  — script path (for Reset Order)
       scriptPath:   <string>  — same as path, for Show Script
       manifestPath: <string>  — path to the manifest.json
       matchField:   <string>  — field to match in manifest
       matchValue:   <string>  — value to match
       helpKey:      <string>  — optional help file key
     }
   ============================================================ */
export async function getFiguresCaptionMenuItems(info) {

  if (!info) throw new Error("getFiguresCaptionMenuItems: info missing");

  return [
    await makeHelpItem("figures", info.helpKey),
    makeShowScriptItem(info, showScriptOffcanvas),
    makeEditManifestItem(() => editFigureManifestItem(info)),
    makeArchiveItem(() => archiveFigureItem(info)),
    makeResetOrderItem(info),
    makeSaveItem(info)
  ];

} // end getFiguresCaptionMenuItems


/* ============================================================
   makeResetOrderItem(info)
   ============================================================
   Returns a Reset Order menu item — figures-specific.
   ============================================================ */
function makeResetOrderItem(info) {
  return {
    label:    "Reset Order",
    disabled: !info.path,
    tooltip:  "Reload figure and reset all overlays to default order",
    onClick:  async () => {
      if (info.path && info.figureId) {
        const { runFigureScript } = await import("/ui/figuresRunner.js");
        runFigureScript(info.path, info.figureId);
      }
    }
  };
} // end makeResetOrderItem


/* ============================================================
   makeSaveItem(info)
   ============================================================
   Returns a Save menu item — figures-specific.
   ============================================================ */
function makeSaveItem(info) {
  return {
    label:    "Save",
    disabled: false,
    tooltip:  "Save current overlay configuration",
    onClick:  () => { saveFigureState(info); }
  };
} // end makeSaveItem


/* ============================================================
   archiveFigureItem(info)
   ============================================================
   Confirms with the user then archives the active figure via
   the shared archiveItem command.

   After archiving, navigates back to the figures category list.

   Arguments:
     info — { name, manifestPath, matchField, matchValue }
   ============================================================ */
export async function archiveFigureItem(info) {

  if (!info) throw new Error("archiveFigureItem: info missing");

  if (!window.confirm(`Archive "${info.name || info.matchValue}"?`)) return;

  await archiveItem({
    payload:   { manifestPath: info.manifestPath, filename: info.matchValue },
    showAlert: false
  });

  /* Clear stale manifest cache. */
  if (manifest.cache) delete manifest.cache.figures;

  /* Navigate back to the figures category list. */
  const { initFiguresTab } = await import("./figures.js");
  await initFiguresTab(false);

} // end archiveFigureItem


/* ============================================================
   editFigureManifestItem(info)
   ============================================================
   Opens the Edit Manifest dialog for the active figure and,
   if confirmed, refreshes the figures tab.

   Arguments:
     info — { manifestPath, matchField, matchValue, name }
   ============================================================ */
export async function editFigureManifestItem(info) {

  if (!info)              throw new Error("editFigureManifestItem: info missing");
  if (!info.manifestPath) throw new Error("editFigureManifestItem: manifestPath missing");
  if (!info.matchField)   throw new Error("editFigureManifestItem: matchField missing");
  if (!info.matchValue)   throw new Error("editFigureManifestItem: matchValue missing");

  const ok = await openEditManifestDialog({
    dialogTitle:       "Edit Manifest",
    manifestPath:      String(info.manifestPath),
    matchField:        String(info.matchField),
    matchValue:        String(info.matchValue),
    fileLabel:         String(info.name || info.matchValue),
    initialTitle:      String(info.name  || ""),
    initialStatus:     String(info.status || ""),
    statusPresets:     ["new", "working", "current", "favorite"],
    allowCustomStatus: true,
    allowClearStatus:  true
  });

  if (!ok) return;

  /* Clear stale cache and restore. */
  if (manifest.cache) delete manifest.cache.figures;

  const { restoreFiguresTab } = await import("./figures.js");
  await restoreFiguresTab();

} // end editFigureManifestItem


/* ============================================================
   saveFigureState(context)
   ============================================================
   Saves the current figure overlay configuration as a
   downloadable JSON file.
   ============================================================ */
export async function saveFigureState(context) {

  const { getActiveOverlays } = await import("/ui/figuresRunner.js");

  const overlays = getActiveOverlays();
  const saveData = {
    figureId:  context.figureId,
    timestamp: Date.now(),
    overlays:  overlays.map(o => {
      const safeParams = {};
      const controls   = o.controls || {};
      for (const key in o.params) {
        if (controls[key] && controls[key].control) continue;
        safeParams[key] = o.params[key];
      }
      return { id: o.figureId, params: safeParams };
    })
  };

  console.log("Figure state to save:", saveData);

  const json = JSON.stringify(saveData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${context.name.replace(/\s+/g, "_")}_saved.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

} // end saveFigureState
