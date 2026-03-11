/* categories.js
   ------------------------------------------------------------
   Category Rendering System (Final Architecture)
   ------------------------------------------------------------
   Responsibilities:
     - Render category frames using a single universal descriptor
       format supplied by tabs.
     - ZERO knowledge of manifests, tabs, patterns, gallery, etc.
     - Fail-fast on invalid descriptor structure.
     - Purely a DOM builder.

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

   targetId   - DOM id of the container (e.g., "text")
   descriptor - array of category frames, each containing:
                  title: string
                  items: [ { name, onClick, hasSubitems? }, ... ]
============================================================ */
export function renderCategories(targetId, descriptor) {

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

  // ------------------------------------------------------------
  // Sort categories by title (case-insensitive)
  // ------------------------------------------------------------
  const frames = descriptor.slice();
  frames.sort((a, b) => {
    if (!a || typeof a !== "object") {
      throw new Error("renderCategories: invalid frame descriptor");
    }
    if (!b || typeof b !== "object") {
      throw new Error("renderCategories: invalid frame descriptor");
    }

    const at = (a.title || "").toString().toLowerCase();
    const bt = (b.title || "").toString().toLowerCase();

    if (at < bt) return -1;
    if (at > bt) return 1;
    return 0;
  });

  // Render each category frame
  frames.forEach((frameDesc) => {

    const items = frameDesc.items || [];
    if (!Array.isArray(items)) {
      throw new Error(
        "renderCategories: frame.items must be an array"
      );
    }

    /* Skip empty frames — no items means nothing to show. */
    if (items.length === 0) return;

    const { frame, header, content } =
      buildCategoryFrameElement(frameDesc.title, items.length);

    // ----------------------------------------------------------
    // Sort items by name (case-insensitive)
    // ----------------------------------------------------------
    let sortedItems = items.slice();

    const shouldSortItems =
      frameDesc.sortItems === undefined ? true : !!frameDesc.sortItems;

    if (shouldSortItems) {
      sortedItems.sort((a, b) => {
        if (!a || typeof a !== "object") {
          throw new Error("renderCategories: invalid item descriptor");
        }
        if (!b || typeof b !== "object") {
          throw new Error("renderCategories: invalid item descriptor");
        }
        if (typeof a.name !== "string") {
          throw new Error("renderCategories: item.name must be a string");
        }
        if (typeof b.name !== "string") {
          throw new Error("renderCategories: item.name must be a string");
        }

        const an = a.name.toLowerCase();
        const bn = b.name.toLowerCase();

        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    }

    sortedItems.forEach((itemDesc) => {
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
        itemDesc.hasSubitems,
        itemDesc.secondaryAction
      );

      itemEl.setAttribute("data-key", itemDesc.name);

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
   buildCategoryDescriptor(groups, itemLabelFn, onClickFn)
   ------------------------------------------------------------
   Helper function to build a category descriptor array from a
   grouped data structure.

   This is a convenience function for the common pattern where
   you have data organized as { categoryName: [entries] } and
   need to convert it to the descriptor format that
   renderCategories() expects.

   Arguments:
     groups      - Object with category names as keys, arrays as values
                   e.g. { "Curves": [...], "Polygons": [...] }

     itemLabelFn - Function that extracts the display name from an entry
                   e.g. (entry) => entry.title || entry.filename

     onClickFn   - Function called when an item is clicked
                   Receives: (categoryName, sortedList, entry, index)
                   This signature allows access to both the category
                   context and the entry's position in the sorted list

   Returns:
     Array in descriptor format ready for renderCategories()

   Example:
     const descriptor = buildCategoryDescriptor(
       manifest.cache.patterns,
       (entry) => entry.title || entry.filename,
       (category, list, entry, idx) => {
         showPattern(category, idx);
       }
     );
     renderCategories("text", descriptor);
============================================================ */
export function buildCategoryDescriptor(groups, itemLabelFn, onClickFn) {
  return Object.keys(groups).sort().map(category => {
    const list = groups[category] || [];
    const sorted = [...list].sort(itemLabelFn);

    return {
      title: category,
      items: sorted.map((entry, idx) => ({
        name: itemLabelFn(entry),
        hasSubitems: false,
        onClick: () => onClickFn(category, sorted, entry, idx)
      }))
    };
  });
} // end buildCategoryDescriptor


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
function buildCategoryFrameElement(title, count) {
  const frame = document.createElement("div");
  frame.className = "category-frame";

  const header = document.createElement("div");
  header.className = "category-header";

  const safeTitle = title || "";
  const safeCount =
    typeof count === "number" ? ` (${count})` : "";

  header.textContent = safeTitle + safeCount;

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
function buildCategoryItemElement(name, hasSubitems, secondaryAction) {
  const itemEl = document.createElement("div");
  itemEl.className = "item";
  itemEl.style.display = "flex";
  itemEl.style.alignItems = "center";
  itemEl.style.justifyContent = "space-between";

  const label = document.createElement("span");
  label.textContent = name;
  label.style.flexGrow = "1";
  itemEl.appendChild(label);

  if (typeof secondaryAction === "function") {
    const btn = document.createElement("button");
    btn.textContent = ">";
    // minimal styling to fit
    btn.className = "btn btn-sm btn-light secondary-action-btn";
    btn.style.marginRight = "8px";
    btn.style.padding = "0px 6px";
    btn.style.lineHeight = "1.2";

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      secondaryAction();
    });

    itemEl.appendChild(btn);
  }

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
   Rarely used -- included for completeness.
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
