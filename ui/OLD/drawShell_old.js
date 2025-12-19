// drawShell.js
// ------------------------------------------------------------
// Purpose: Unified Draw workspace controller.
// Manages categories, object tabs, and render orchestration
// through drawRegistry_* definitions.
// ------------------------------------------------------------

// === INITIALIZATION ===
document.addEventListener("DOMContentLoaded", () => {
  initDrawTab();       // from ui_tabs.js
}); // end DOMContentLoaded


// === DRAW WORKSPACE SETUP ===

// === CATEGORY DISPLAY (restored card-style layout) ===
function populateDrawCategories() {
  const grid = document.getElementById("drawCategoryGrid");
  if (!grid) return;

  const categories = [
    "Curve Stitch",
    "Parametrics",
    "Geometry",
    "Test Figures"
  ];
  grid.innerHTML = "";

  categories.sort().forEach(cat => {
    const card = document.createElement("div");
    card.className = "category-card flex-grow-1";
    card.dataset.category = cat;

    // Card header
    const header = document.createElement("div");
    header.className = "category-title";
    header.textContent = cat.toUpperCase();
    card.appendChild(header);

    // Card list area (placeholder for items)
    const list = document.createElement("ul");
    list.className = "category-list";
    const items = getObjectsForCategory(cat);
    items.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      li.dataset.object = item;
      li.addEventListener("click", () => openDrawObject(item));
      list.appendChild(li);
    });
    card.appendChild(list);

    grid.appendChild(card);
  });
} // end populateDrawCategories


// === CATEGORY OBJECT DATA ===
function getObjectsForCategory(categoryName) {
  const base = {
    "Curve Stitch": ["RegularPolygon", "Parabola", "Ellipse"],
    "Parametrics": ["RoseCurve", "ButterflyCurve"],
    "Geometry": ["Polygon", "Circle", "Spiral"],
    "Test Figures": ["GridTest", "RandomLines"]
  };
  return base[categoryName] || [];
} // end getObjectsForCategory


// === OBJECT PANEL OPEN ===
function openDrawObject(objectName) {
  const tabId = `obj-${objectName.replace(/\s+/g, "_").toLowerCase()}`;
  addDrawTab(objectName, tabId); // from ui_tabs.js

  const panel = document.getElementById(`draw-panel-${tabId}`);
  if (!panel) return;

  panel.innerHTML = `
    <div class="row g-0">
      <div class="col-md-4 p-3 border-end" id="controls-${tabId}">
        <h6>${objectName} Controls</h6>
        <div id="controls-body-${tabId}">[controls TBD]</div>
      </div>
      <div class="col-md-8 p-3" id="canvas-${tabId}">
        <canvas id="canvasEl-${tabId}" width="600" height="400"
                class="border bg-dark"></canvas>
      </div>
    </div>
  `;

    const ctx = CanvasManager.getContext();

//  const ctx = document.getElementById(`canvasEl-${tabId}`).getContext("2d");

  // --- Registry lookup through centralized map ---
  const entry = findDrawRegistryEntry(objectName);

  if (!entry) {
    ctx.fillStyle = "red";
    ctx.font = "16px sans-serif";
    ctx.fillText(`No registry entry for ${objectName}`, 20, 40);
    return;
  }

  // Build and draw
  const params = entry.params || {};
  const thing = entry.create ? entry.create(params) : null;

  ctx.save();
  if (typeof entry.draw === "function") {
    entry.draw(thing);
    buildControlsForObject(objectName, tabId, entry, thing, ctx);
  } else {
    ctx.fillStyle = "lightgray";
    ctx.font = "16px sans-serif";
    ctx.fillText(`Missing draw() in registry: ${objectName}`, 20, 40);
  }
  ctx.restore();

  // Optional: UI note
  const label = document.createElement("div");
  label.className = "small text-muted mt-2";
  label.textContent = `Registry: ${entry.name || objectName}`;
  document.getElementById(`controls-body-${tabId}`).appendChild(label);
} // end openDrawObject


// === REGISTRY LOOKUP (using centralized map) ===
function findDrawRegistryEntry(objectName) {
  if (!window.drawRegistry) return null;
  const normalized = objectName.replace(/\s+/g, "").toLowerCase();

  for (const key in window.drawRegistry) {
    if (key.toLowerCase() === normalized) {
      return window.drawRegistry[key];
    }
  }
  return null;
} // end findDrawRegistryEntry



// ------------------------------------------------------------
// End of drawShell.js
// ------------------------------------------------------------
