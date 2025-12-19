/* draw.js
   Handles Draw tab: populates registry list, builds parameter controls,
   and manages live redraws.
*/

// 🟢 Data preparation helper
function getDrawCategories({ sort = true, filterFn = null } = {}) {
  const categories = {};

  // Build the category map
  for (const [key, entry] of Object.entries(window.drawRegistry)) {
    if (!entry) continue;
    if (filterFn && !filterFn(entry)) continue;

    const category = entry.category || "uncategorized";
    if (!categories[category]) categories[category] = [];
    categories[category].push({ key, entry });
  }

  // Optional alphabetical sort of category names
  if (sort) {
    return Object.fromEntries(
      Object.entries(categories).sort(([a], [b]) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      )
    );
  }

  return categories;
} // end getDrawCategories


// 🔵 Renderer (unchanged visually)
function renderDrawObjects(options = {}) {
  const grid = document.getElementById("drawGrid");
  if (!grid) return;

  // 🧹 Clear existing content
  grid.innerHTML = "";

  // 🧩 Get category data (sorted and/or filtered)
  const categories = getDrawCategories(options);

  // 🟣 Create category frames
  Object.entries(categories).forEach(([category, items]) => {
    const frame = document.createElement("div");
    frame.className = "category-frame";

    const header = document.createElement("div");
    header.className = "category-header";
    header.textContent = category.replace(/_/g, " ").toUpperCase();
    frame.appendChild(header);

    const content = document.createElement("div");
    content.className = "category-content";

    // 🟠 Add buttons for each object in this category
    items.forEach(({ key, entry }) => {
      const btn = document.createElement("button");
      btn.textContent = entry.name || key;
      btn.className = "btn btn-sm btn-outline-secondary w-100 mb-1";

      // 🔹 Add the click handler (this is the right place)
      btn.addEventListener("click", () => {
        console.log(`Selected draw object: ${entry.name}`);

        // 🟢 Create a new subtab for this object (no Bootstrap)
        addDrawObjectTab(entry.name, entry);

        // 👉 Show the canvas when a draw object is selected
        const canvas = document.getElementById("sharedCanvas");
        if (canvas) canvas.style.display = "block";

        renderDrawDetail(category, entry);
      });

      content.appendChild(btn);
    });

    frame.appendChild(content);
    grid.appendChild(frame);
  });

  console.log("Draw categories populated:", Object.keys(categories));
} // end renderDrawObjects


// ------------------------------------------------------------
// Detail view: when a Draw item is selected
// ------------------------------------------------------------
function renderDrawDetail(category, entry) {
  const grid = document.getElementById("drawGrid");
  const controlArea = document.getElementById("drawControl");
  if (!grid || !controlArea) {
    console.warn("renderDrawDetail: missing grid or control area");
    return;
  }

  // 🧹 Clear main grid display
  grid.innerHTML = "";

  // 🎯 Record the current selection in uiState
  uiState.currentSelection = { category, entry };

  // 🖌️ Draw the selected item using centralized renderer
  renderCurrent();

  // 🧼 Clear control panel before rebuilding
  controlArea.innerHTML = "";

  // 🧭 Breadcrumb button
  const breadcrumbBtn = document.createElement("button");
  breadcrumbBtn.id = "breadcrumbButton";
  breadcrumbBtn.className = "breadcrumb-btn";
  breadcrumbBtn.textContent = `${category.replace(/_/g, " ")} > ${entry.name}`;
  breadcrumbBtn.addEventListener("click", () => {
    renderDrawObjects();
  });
  controlArea.appendChild(breadcrumbBtn);

  // 🔘 Mini 3-button grid (Prev / Next / Save placeholders)
  const miniGrid = document.createElement("div");
  miniGrid.id = "miniButtonRow";
  miniGrid.className = "d-grid mb-3";
  miniGrid.style.gridTemplateColumns = "repeat(3, 1fr)";
  miniGrid.style.gap = "4px";

  ["Prev", "Next", "Save"].forEach((label) => {
    const btn = document.createElement("button");
    btn.className = "btn btn-sm btn-outline-secondary";
    btn.textContent = label;
    miniGrid.appendChild(btn);
  });
  controlArea.appendChild(miniGrid);

  // 🧩 Add placeholder note
  const placeholder = document.createElement("div");
  placeholder.className = "text-muted small";
  placeholder.textContent = "UI controls for this item will appear here.";
  controlArea.appendChild(placeholder);

  uiState.currentSelection = { category, entry };
} // end renderDrawDetail


function renderControlsFor(entry, thing) {
  const controlArea = document.getElementById("drawControl");
  if (!controlArea) {
    console.warn("renderControlsFor: drawControl not found");
    return;
  }

  const oldControls = controlArea.querySelector(".controls-section");
  if (oldControls) oldControls.remove();

  const controlsDiv = document.createElement("div");
  controlsDiv.className = "controls-section mt-3";

  const title = document.createElement("div");
  title.textContent = "Controls";
  title.className = "fw-bold small mb-2 border-bottom pb-1";
  controlsDiv.appendChild(title);

  Object.entries(entry.controls).forEach(([paramName, spec]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "controlWrapper mb-2";

    const label = document.createElement("label");
    label.textContent = spec.label;
    label.className = "form-label d-block mb-1 small";

    let input;
    switch (spec.widget) {
      case "slider":
        input = document.createElement("input");
        input.type = "range";
        input.min = spec.min;
        input.max = spec.max;
        input.step = spec.step;
        input.value = thing[paramName];
        input.className = "form-range";
        break;

      case "colorPicker":
        input = document.createElement("input");
        input.type = "color";
        input.value = thing[paramName];
        input.className = "form-control form-control-color";
        break;

      case "pointPicker":
        input = document.createElement("button");
        input.textContent = "Pick Point";
        input.className = "btn btn-sm btn-outline-secondary";
        break;
    }

    if (input && input.type !== "button") {
      input.addEventListener("input", () => {
        thing[paramName] =
          input.type === "range" ? parseFloat(input.value) : input.value;
        redraw(entry, thing);
      });
    }

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    controlsDiv.appendChild(wrapper);
  });

  controlArea.appendChild(controlsDiv);
} // end renderControlsFor


/* ------------------------------------------------------------
   Render current selection (centralized canvas renderer)
------------------------------------------------------------ */
function renderCurrent() {
  const { currentSelection } = uiState;
  if (!currentSelection || !currentSelection.entry) {
    console.warn("renderCurrent: nothing selected to draw");
    return;
  }

  const entry = currentSelection.entry;
  const thing = entry.params || {};

  const canvas = CanvasManager.ensureCanvas("drawMain");
  if (!canvas) {
    console.warn("renderCurrent: CanvasManager did not return a canvas");
    return;
  }

  const ctx = canvas.ctx;
  if (!ctx) {
    console.warn("renderCurrent: no 2D context available");
    return;
  }

  window.drawCanvas = canvas;
  window.drawCtx = ctx;
  window.ctx = ctx;

  CanvasManager.clear("#ffffff");

  if (typeof entry.draw === "function") {
    entry.draw(thing);
  } else {
    console.warn(`renderCurrent: entry.draw missing for ${entry.name}`);
  }
} // end renderCurrent


function addDrawObjectTab(objectName, entry) {
  const bar = document.getElementById("drawSubtabBar");
  const content = document.getElementById("drawSubtabContent");
  console.log("addDrawObjectTab called:", objectName, "bar=", bar, "content=", content);

  if (!bar || !content) {
    console.warn("addDrawObjectTab: tab containers missing");
    return;
  }

  const tabId = "tab-" + objectName.toLowerCase().replace(/\s+/g, "-");

  // 🔹 If it already exists, show it instead of creating new
  const existing = document.getElementById(tabId);
  if (existing) {
    showDrawSubtab(tabId, entry);
    return;
  }

  // 🟢 Create tab button
  const tabButton = document.createElement("button");
  tabButton.className = "subtab-btn";
  tabButton.textContent = objectName;
  tabButton.dataset.target = tabId;
  tabButton.onclick = () => showDrawSubtab(tabId, entry);
  bar.appendChild(tabButton);
  console.log("added button", tabButton);

  // 🔵 Create pane
  const pane = document.createElement("div");
  pane.id = tabId;
  pane.className = "subtab-pane";
  pane.style.display = "none";
  content.appendChild(pane);

  // 🖼️ Mount shared canvas only once per pane
  const existingCanvas = pane.querySelector("canvas");
  if (!existingCanvas) {
    const result = CanvasManager.ensureCanvas(pane.id);
    const realCanvas = result?.canvas || result;
    if (realCanvas instanceof HTMLElement && !pane.contains(realCanvas)) {
      pane.appendChild(realCanvas);
    }
  }

  // 🎨 Draw the object
  renderDrawDetail(entry.category || "unknown", entry);

  // 🚀 Activate the new tab
  showDrawSubtab(tabId, entry);
} // end addDrawObjectTab


// ------------------------------------------------------------
// Helper to show a subtab by ID (manual tab handling)
// ------------------------------------------------------------
function showDrawSubtab(tabId, entry = null) {
  console.log("showDrawSubtab:", tabId);

  // deactivate all buttons and panes
  document.querySelectorAll("#drawSubtabBar .subtab-btn").forEach(btn =>
    btn.classList.remove("active")
  );
  document.querySelectorAll("#drawSubtabContent .subtab-pane").forEach(pane => {
    pane.classList.remove("active");
    pane.style.display = "none";
  });

  // 🔁 If returning to Categories
  if (tabId === "categories") {
    console.log("Returning to categories view");
    const grid = document.getElementById("drawGrid");
    if (grid) grid.style.display = "block";
    renderDrawObjects();
    return;
  }

  // hide category grid for any object tab
  const grid = document.getElementById("drawGrid");
  if (grid) grid.style.display = "none";

  // activate the requested subtab
  const btn = document.querySelector(`#drawSubtabBar .subtab-btn[data-target="${tabId}"]`);
  const pane = document.getElementById(tabId);
  if (btn) btn.classList.add("active");
  if (pane) {
    pane.classList.add("active");
    pane.style.display = "block";
  }

  // 🎨 Redraw current object
  if (entry) {
    renderDrawDetail(entry.category || "unknown", entry);
  } else if (uiState.currentSelection?.entry) {
    renderDrawDetail(
      uiState.currentSelection.category,
      uiState.currentSelection.entry
    );
  }
} // end showDrawSubtab


function redraw(entry, thing) {
  clearCanvas();
  entry.draw(thing);
} // end redraw
