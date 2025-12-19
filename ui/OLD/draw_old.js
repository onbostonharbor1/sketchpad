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

      // 🔹 Click handler → open subtab and draw object
      btn.addEventListener("click", () => {
        console.log(`Selected draw object: ${entry.name}`);

        // Open new subtab and render the selected object
        handleCategorySelection(entry.name, key);
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

  // 0️⃣ Clear categories display (main grid)
  grid.innerHTML = "";

  // 0️⃣ Optionally draw the item (placeholder for now)
  const canvasLayer = CanvasManager.ensureCanvas("drawMain");
  if (canvasLayer && entry.draw) {
    CanvasManager.clear("#ffffff");
    entry.draw(entry.params || {}); // later we’ll pass a StringThing object
  }

  // 🧹 Clear control area before adding detail view
  controlArea.innerHTML = "";

  // 1️⃣ Breadcrumb button
  const breadcrumbBtn = document.createElement("button");
  breadcrumbBtn.id = "breadcrumbButton";
    breadcrumbBtn.className = "breadcrumb-btn";

//  breadcrumbBtn.className = "btn btn-link p-0 mb-2 small text-start";
  breadcrumbBtn.textContent = `${category.replace(/_/g, " ")} > ${entry.name}`;
  // (Inactive for now; wired in step 5)
  controlArea.appendChild(breadcrumbBtn);

  // 2️⃣ Mini 3-button grid
  const miniGrid = document.createElement("div");
  miniGrid.id = "miniButtonRow";
  miniGrid.className = "d-grid mb-3";
  miniGrid.style.gridTemplateColumns = "repeat(3, 1fr)";
  miniGrid.style.gap = "4px";

  for (let i = 1; i <= 3; i++) {
    const btn = document.createElement("button");
    btn.className = "btn btn-sm btn-outline-secondary";
    btn.textContent = i.toString();
    miniGrid.appendChild(btn);
  }

  controlArea.appendChild(miniGrid);

  // Placeholder note until controls are added
  const placeholder = document.createElement("div");
  placeholder.className = "text-muted small";
  placeholder.textContent = "UI controls for this item will appear here.";
  controlArea.appendChild(placeholder);

  // Keep track of current selection
  gl.currentSelection = { category, entry };
}


function renderControlsFor(entry, thing) {
  const controlArea = document.getElementById("drawControl");
  if (!controlArea) {
    console.warn("renderControlsFor: drawControl not found");
    return;
  }

  // Remove any previous control section
  const oldControls = controlArea.querySelector(".controls-section");
  if (oldControls) oldControls.remove();

  // Create a new section for parameter controls
  const controlsDiv = document.createElement("div");
  controlsDiv.className = "controls-section mt-3";

  const title = document.createElement("div");
  title.textContent = "Controls";
  title.className = "fw-bold small mb-2 border-bottom pb-1";
  controlsDiv.appendChild(title);

  // Generate controls for each parameter
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
}  // end renderControlsFor


function redraw(entry, thing) {
  clearCanvas();
  entry.draw(thing);
} // end redraw
