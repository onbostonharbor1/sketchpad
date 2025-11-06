/* ------------------------------------------------------------
   renderCategories(containerId, categoriesData, onItemClick, onExpandClick)
   containerId: string — where to insert the categories (e.g., "text")
   categoriesData: array of { title: string, items: array of { name: string, hasSubitems?: bool } }
   onItemClick(item): function — called when text is clicked
   onExpandClick(item): function — called when arrow is clicked
------------------------------------------------------------ */
function renderCategories(containerId, categoriesData, onItemClick, onExpandClick) {
  const target = document.getElementById(containerId);
  if (!target) return;

  // clear and set up categories container
  target.innerHTML = "";
  const categoriesDiv = document.createElement("div");
  categoriesDiv.id = "categories";
  target.appendChild(categoriesDiv);

  // create each category frame
  categoriesData.forEach(category => {
    const frame = document.createElement("div");
    frame.className = "category-frame";

    // header
    const header = document.createElement("div");
    header.className = "category-header";
    header.textContent = category.title;
    frame.appendChild(header);

    // content area
    const content = document.createElement("div");
    content.className = "category-content";

    // add items
    category.items.forEach(item => {
      const row = document.createElement("div");
      row.className = "item-row";

      const label = document.createElement("span");
      label.className = "item-label";
      label.textContent = item.name;

      // arrow marker — shown only if item.hasSubitems
      const arrow = document.createElement("span");
      arrow.className = "item-expand";
      arrow.textContent = item.hasSubitems ? "›" : "";

      // attach handlers
      label.addEventListener("click", () => onItemClick?.(item));
      arrow.addEventListener("click", (ev) => {
	  console.log("Arrow clicked for", item.name);

        ev.stopPropagation();
        if (onExpandClick) onExpandClick(item);
      });

      row.appendChild(label);
      row.appendChild(arrow);
      content.appendChild(row);
    });

    frame.appendChild(content);
    categoriesDiv.appendChild(frame);
  });
} // end renderCategories


/* ------------------------------------------------------------
   clearDivs(args="")
   Empties the core divs shared by all tabs.

   Arguments:
     args – optional string id of an extra div to clear in addition
------------------------------------------------------------ */
function clearDivs(args="") {
    let ids = ["buttons", "action", "caption", "text","sketchpad"];
    if (args != "")
        ids.push(args);
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
    });
} // end clearDivs

/* ------------------------------------------------------------
   Generic JSON file loader
   ------------------------------------------------------------ */
async function loadJSON(path) {
  try {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${path}`);
    return await resp.json();
  } catch (err) {
    console.error(`Error loading JSON from ${path}:`, err);
    return null;
  }
} // end loadJSON

/* ------------------------------------------------------------
   Specialized wrappers
   ------------------------------------------------------------ */
async function loadDirectoryRegistry(basePath) {
  return await loadJSON(`${basePath}/directoryRegistry.json`);
} // end loadDirectoryRegistry

async function loadManifest(basePath, category) {
  return await loadJSON(`${basePath}/${category}/manifest.json`);
} // end loadManifest

/* ------------------------------------------------------------
   loadManifestGroup(basePath)
   Loads all manifest.json files within a gallery subdirectory.

   Arguments:
     basePath – relative path to gallery subdir (e.g., ./gallery/Ideabook)

   Returns:
     Object mapping category → manifest array.
------------------------------------------------------------ */
async function loadManifestGroup(basePath) {
  try {
    const dirs = await loadDirectoryRegistry(basePath);
    if (!dirs) throw new Error("Missing or invalid directoryRegistry.json");

    const allData = await Promise.all(
      dirs.map(async cat => {
        const manifest = await loadManifest(basePath, cat);
        return { category: cat, items: manifest || [] };
      })
    );

    const grouped = {};
    allData.forEach(group => {
      grouped[group.category] = group.items;
    });
    return grouped;

  } catch (err) {
    console.error(`Failed to load manifest group for ${basePath}:`, err);
    return {};
  }
} // end loadManifestGroup

/* ------------------------------------------------------------
   showOffcanvas(title, text)
   Displays text in the existing #offcanvasPanel.
   Used for viewing script source.
------------------------------------------------------------ */
function showOffcanvas(title, text) {
  const panel = document.getElementById("offcanvasPanel");
  const hdr = panel.querySelector(".offcanvas-title");
  const body = panel.querySelector(".offcanvas-body");

  hdr.textContent = title;

  const pre = document.createElement("pre");
  pre.style.whiteSpace = "pre-wrap";
  pre.textContent = text;

  body.innerHTML = "";
  body.appendChild(pre);

  const off = bootstrap.Offcanvas.getOrCreateInstance(panel);
  off.show();
} // end showOffcanvas

/* ------------------------------------------------------------
   showOffcanvas(title, text)
   Displays text in the existing #offcanvasPanel.
   Used for viewing script source.
------------------------------------------------------------ */
function showOffcanvas(title, text) {
  const panel = document.getElementById("offcanvasPanel");
  const hdr = panel.querySelector(".offcanvas-title");
  const body = panel.querySelector(".offcanvas-body");

  hdr.textContent = title;

  const pre = document.createElement("pre");
  pre.style.whiteSpace = "pre-wrap";
  pre.textContent = text;

  body.innerHTML = "";
  body.appendChild(pre);

  const off = bootstrap.Offcanvas.getOrCreateInstance(panel);
  off.show();
} // end showOffcanvas

/* ------------------------------------------------------------
   setActiveItem(category, entry)
   Records the active gallery category and current item.
------------------------------------------------------------ */
function setActiveItem(category, entry) {
  uiState.activeCategory = category;
  uiState.activeGalleryItem = entry;
} // end setActiveItem


