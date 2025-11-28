/* categories.js
   ------------------------------------------------------------
   Category Rendering System (Final Architecture)
   ------------------------------------------------------------
   Responsibilities:
     • Render category frames using a single universal descriptor
       format supplied by tabs.
     • ZERO knowledge of manifests, tabs, patterns, gallery, etc.
     • Fail-fast on invalid descriptor structure.
     • Purely a DOM builder.

   Descriptor Format (required):
     [
       {
         title: "Category Name",
         items: [
           {
             name: "Item Name",
             onClick: function,     // required
             hasSubitems: boolean   // optional
           },
           ...
         ]
       },
       ...
     ]

   All logic determining titles, items, handlers, or category
   grouping is performed by the calling tab.  This module only
   renders the provided structure.
------------------------------------------------------------ */


/* ============================================================
   renderCategories(targetId, descriptor)
   ------------------------------------------------------------
   Render an array of category frames into the specified target
   container.

   targetId   – DOM id of the container (e.g., "text")
   descriptor – array of category frames, each containing:
                  title: string
                  items: [ { name, onClick, hasSubitems? }, ... ]
============================================================ */
export function renderCategories(targetId, descriptor) {
  console.log("renderCategories:", targetId, descriptor);

  // Fail-fast container check
  const container = document.getElementById(targetId);
  if (!container) {
    throw new Error(
      "renderCategories: targetId '" + targetId + "' not found"
    );
  }

  // Fail-fast descriptor validation
  if (!Array.isArray(descriptor)) {
    throw new Error(
      "renderCategories: descriptor must be an array"
    );
  }

  // Clear region
  container.innerHTML = "";

  // Create outer wrapper
  const outer = document.createElement("div");
  outer.id = "categories";
  container.appendChild(outer);

  // Render each category frame
  descriptor.forEach((frameDesc) => {
    if (!frameDesc || typeof frameDesc !== "object") {
      throw new Error("renderCategories: invalid frame descriptor");
    }

    const { frame, header, content } =
      buildCategoryFrameElement(frameDesc.title);

    // Items for this frame
    const items = frameDesc.items || [];
    if (!Array.isArray(items)) {
      throw new Error(
        "renderCategories: frame.items must be an array"
      );
    }

    items.forEach((itemDesc) => {
      if (
        !itemDesc ||
        typeof itemDesc !== "object" ||
        typeof itemDesc.name !== "string" ||
        typeof itemDesc.onClick !== "function"
      ) {
        throw new Error(
          "renderCategories: item must have name:string and onClick:function"
        );
      }

      const itemEl = buildCategoryItemElement(
        itemDesc.name,
        itemDesc.hasSubitems
      );

      // Highlight support
      itemEl.setAttribute("data-key", itemDesc.name);

      // Attach item handler
      itemEl.addEventListener("click", () => {
        setActiveItem(targetId, itemDesc.name);
        itemDesc.onClick();
      });

      content.appendChild(itemEl);
    });

    outer.appendChild(frame);
  });
} // end renderCategories



/* ============================================================
   setActiveItem(targetId, itemKey)
   ------------------------------------------------------------
   Marks the clicked item as active within the rendered frame.
============================================================ */
export function setActiveItem(targetId, itemKey) {
  const container = document.getElementById(targetId);
  if (!container) {
    throw new Error(
      "setActiveItem: targetId '" + targetId + "' not found"
    );
  }

  const items = container.querySelectorAll(".item");
  items.forEach((el) => {
    const key = el.getAttribute("data-key");
    if (key === itemKey) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });
} // end setActiveItem



/* ============================================================
   DOM Building Helpers
============================================================ */

// buildCategoryFrameElement(title)
// ------------------------------------------------------------
// <div class="category-frame">
//   <div class="category-header">title</div>
//   <div class="category-content"></div>
// </div>
// ------------------------------------------------------------
function buildCategoryFrameElement(title) {
  const frame = document.createElement("div");
  frame.className = "category-frame";

  const header = document.createElement("div");
  header.className = "category-header";
  header.textContent = title || "";

  const content = document.createElement("div");
  content.className = "category-content";

  frame.appendChild(header);
  frame.appendChild(content);

  return { frame, header, content };
} // end buildCategoryFrameElement



// buildCategoryItemElement(name, hasSubitems)
// ------------------------------------------------------------
// <div class="item">
//   <span>name</span>
//   [chevron icon if hasSubitems]
// </div>
// ------------------------------------------------------------
function buildCategoryItemElement(name, hasSubitems) {
  const itemEl = document.createElement("div");
  itemEl.className = "item";

  const label = document.createElement("span");
  label.textContent = name;
  itemEl.appendChild(label);

  if (hasSubitems) {
    const icon = document.createElement("i");
    icon.className = "bi bi-chevron-right";
    itemEl.appendChild(icon);
  }

  return itemEl;
} // end buildCategoryItemElement



/* ============================================================
   clearCategoryFrame(targetId)
   ------------------------------------------------------------
   Utility: clear a category region entirely.
============================================================ */
export function clearCategoryFrame(targetId) {
  const container = document.getElementById(targetId);
  if (container) {
    container.innerHTML = "";
  }
} // end clearCategoryFrame



/* ============================================================
   buildCategoryFrame(targetId)
   ------------------------------------------------------------
   Utility: create outer #categories wrapper manually.
   Rarely used — included for completeness.
============================================================ */
export function buildCategoryFrame(targetId) {
  const container = document.getElementById(targetId);
  if (!container) {
    throw new Error(
      "buildCategoryFrame: targetId '" + targetId + "' not found"
    );
  }

  container.innerHTML = "";

  const outer = document.createElement("div");
  outer.id = "categories";
  container.appendChild(outer);

  return outer;
} // end buildCategoryFrame
