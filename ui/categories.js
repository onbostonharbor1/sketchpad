/* categories.js
   ------------------------------------------------------------
   Category Rendering System
   - Provides general, reusable DOM builders for category lists.
   - Produces markup compatible with categories.css:
       #categories, .category-frame, .category-header,
       .category-content, .item
   - Used by Draw, Patterns, Gallery, Figures, Utility, etc.
   ------------------------------------------------------------ */

/* ============================================================
   Public API
   ============================================================ */

// renderCategories(targetId, categories, onItemSelect, onCategorySelect)
// ------------------------------------------------------------
// Renders a set of category frames into the specified target div.
//
// targetId:
//   - id of the container div (e.g., "text")
//
// categories: array of objects:
//   [
//     {
//       title: "circles",
//       items: [
//         { name: "basic circle", hasSubitems: false, onClick: fn },
//         ...
//       ]
//     },
//     ...
//   ]
//
// onItemSelect(item)        – optional; called when any item is clicked
// onCategorySelect(category) – optional; called when a category header is clicked
// ------------------------------------------------------------
export function renderCategories(targetId, categories, onItemSelect, onCategorySelect) {
  var container = document.getElementById(targetId);
  if (!container) {
    throw new Error("renderCategories: targetId '" + targetId + "' not found");
  }

  // Clear container
  container.innerHTML = "";

  // Outer container for all categories (matches #categories CSS)
  var outer = document.createElement("div");
  outer.id = "categories";
  container.appendChild(outer);

  // Build each category frame
  (categories || []).forEach(function (cat) {
    if (!cat) return;

    var frame = buildCategoryFrameElement(cat.title);

    // Optional: click on header selects the category
    if (typeof onCategorySelect === "function") {
      frame.header.addEventListener("click", function () {
        onCategorySelect(cat);
      });
    }

    // Build items list
    (cat.items || []).forEach(function (item) {
      var itemEl = buildCategoryItemElement(item.name, item.hasSubitems);

      // Store a simple key for later lookup (used by setActiveItem)
      itemEl.setAttribute("data-key", item.name);

        itemEl.addEventListener("click", function () {
            // Optional: highlight the selected item
          if (targetId) {
              setActiveItem(targetId, item);
          }
            if (item.onClick) {
               item.onClick();
          }
          if (typeof onItemSelect === "function") {
             onItemSelect(item);
        }
    });


      frame.content.appendChild(itemEl);
    });

    outer.appendChild(frame.frame);
  });
} // end renderCategories


// setActiveItem(targetId, itemKey)
// ------------------------------------------------------------
// Marks an item inside the rendered categories as active.
// The key corresponds to item.name (stored in data-key).
// ------------------------------------------------------------
export function setActiveItem(targetId, itemKey) {
  var container = document.getElementById(targetId);
  if (!container) {
    throw new Error("setActiveItem: targetId '" + targetId + "' not found");
  }

  var items = container.querySelectorAll(".item");
  for (var i = 0; i < items.length; i += 1) {
    var el = items[i];
    var key = el.getAttribute("data-key");
    if (key === itemKey) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  }
} // end setActiveItem


/* ============================================================
   General Category Builders
   ============================================================ */

// buildCategoryFrameElement(title)
// ------------------------------------------------------------
// Creates a category frame structure:
//
// <div class="category-frame">
//   <div class="category-header">title</div>
//   <div class="category-content"></div>
// </div>
//
// Returns { frame, header, content }.
// ------------------------------------------------------------
function buildCategoryFrameElement(title) {
  var frame = document.createElement("div");
  frame.className = "category-frame";

  var header = document.createElement("div");
  header.className = "category-header";
  header.textContent = title || "";

  var content = document.createElement("div");
  content.className = "category-content";

  frame.appendChild(header);
  frame.appendChild(content);

  return {
    frame: frame,
    header: header,
    content: content
  };
} // end buildCategoryFrameElement


// buildCategoryItemElement(name, hasSubitems)
// ------------------------------------------------------------
// Creates a single item entry.
//
// <div class="item">
//   <span>name</span>
//   [<i class="bi bi-chevron-right"></i>]  // optional
// </div>
// ------------------------------------------------------------
function buildCategoryItemElement(name, hasSubitems) {
  var itemEl = document.createElement("div");
  itemEl.className = "item";

  var label = document.createElement("span");
  label.textContent = name || "";
  itemEl.appendChild(label);

  if (hasSubitems) {
    var icon = document.createElement("i");
    icon.className = "bi bi-chevron-right";
    itemEl.appendChild(icon);
  }

  return itemEl;
} // end buildCategoryItemElement


/* ============================================================
   Utility functions
   ============================================================ */

// clearCategoryFrame(targetId)
// ------------------------------------------------------------
// Clears the contents of the target container.
// ------------------------------------------------------------
export function clearCategoryFrame(targetId) {
  var container = document.getElementById(targetId);
  if (container) {
    container.innerHTML = "";
  }
} // end clearCategoryFrame


// buildCategoryFrame(targetId)
// ------------------------------------------------------------
// Ensures the target container exists and is empty, then creates
// and returns the outer #categories element.
//
// This is a convenience if a caller wants to populate categories
// manually rather than using renderCategories().
// ------------------------------------------------------------
export function buildCategoryFrame(targetId) {
  var container = document.getElementById(targetId);
  if (!container) {
    throw new Error("buildCategoryFrame: targetId '" + targetId + "' not found");
  }

  container.innerHTML = "";

  var outer = document.createElement("div");
  outer.id = "categories";
  container.appendChild(outer);

  return outer;
} // end buildCategoryFrame

