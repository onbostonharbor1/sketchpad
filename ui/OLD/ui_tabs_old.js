/* ui/ui_tabs.js
   ------------------------------------------------------------
   Handles main tab switching (Draw, Patterns, Figures, Gallery, Utilities)
   and subtab logic for Gallery and Utilities.
   Integrates CanvasManager to maintain a shared canvas instance.
   ------------------------------------------------------------ */

document.addEventListener("DOMContentLoaded", () => {
  const mainTabs = document.querySelectorAll("#mainTabs .nav-link");

  mainTabs.forEach((tab) => {
    tab.addEventListener("shown.bs.tab", (e) => {
      const activeId = e.target.getAttribute("id");

      switch (activeId) {
        case "draw-tab":
          console.log("Draw tab activated");
          initDrawTab();
          break;

        case "patterns-tab":
          console.log("Patterns tab activated");
          break;

        case "figures-tab":
          console.log("Figures tab activated");
          break;

        case "gallery-tab":
          console.log("Gallery tab activated");
          setupGallerySubtabs();
          break;

        case "utilities-tab":
          console.log("Utilities tab activated");
          setupUtilitiesSubtabs();
          break;
      }
    }); // end addEventListener
  }); // end forEach
}); // end DOMContentLoaded


// ------------------------------------------------------------
// Draw tab initialization
// ------------------------------------------------------------
function initDrawTab() {
  if (window.drawShell && typeof drawShell.populateCategories === "function") {
    drawShell.populateCategories();
    console.log("Draw categories populated");
  } else {
    console.warn("drawShell.populateCategories not found");
  }
} // end initDrawTab


// ------------------------------------------------------------
// Gallery subtabs
// ------------------------------------------------------------
function setupGallerySubtabs() {
  const galleryBar = document.getElementById("gallerySubtabBar");
  const galleryContent = document.getElementById("gallerySubtabContent");

  if (!galleryBar || !galleryContent) {
    console.warn("Gallery subtab containers not found");
    return;
  }

  if (galleryBar.dataset.initialized === "true") return;

  galleryBar.innerHTML = `
    <li class="nav-item" role="presentation">
      <button class="nav-link active" id="ideaBook-tab" data-bs-toggle="tab" data-bs-target="#ideaBook" type="button" role="tab">Idea Book</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="savedPatterns-tab" data-bs-toggle="tab" data-bs-target="#savedPatterns" type="button" role="tab">Saved Patterns</button>
    </li>
  `;

  galleryContent.innerHTML = `
    <div class="tab-pane fade show active" id="ideaBook" role="tabpanel" aria-labelledby="ideaBook-tab">Idea Book content here</div>
    <div class="tab-pane fade" id="savedPatterns" role="tabpanel" aria-labelledby="savedPatterns-tab">Saved Patterns content here</div>
  `;

  galleryBar.dataset.initialized = "true";
  console.log("Gallery subtabs initialized");
} // end setupGallerySubtabs


// ------------------------------------------------------------
// Utilities subtabs
// ------------------------------------------------------------
function setupUtilitiesSubtabs() {
  const utilBar = document.getElementById("utilitiesSubtabBar");
  const utilContent = document.getElementById("utilitiesSubtabContent");

  if (!utilBar || !utilContent) {
    console.warn("Utilities subtab containers not found");
    return;
  }

  if (utilBar.dataset.initialized === "true") return;

  utilBar.innerHTML = `
    <li class="nav-item" role="presentation">
      <button class="nav-link active" id="dbTools-tab" data-bs-toggle="tab" data-bs-target="#dbTools" type="button" role="tab">Database Tools</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="colorTools-tab" data-bs-toggle="tab" data-bs-target="#colorTools" type="button" role="tab">Color Tools</button>
    </li>
  `;

  utilContent.innerHTML = `
    <div class="tab-pane fade show active" id="dbTools" role="tabpanel" aria-labelledby="dbTools-tab">Database tools area</div>
    <div class="tab-pane fade" id="colorTools" role="tabpanel" aria-labelledby="colorTools-tab">Color tools area</div>
  `;

  utilBar.dataset.initialized = "true";
  console.log("Utilities subtabs initialized");
} // end setupUtilitiesSubtabs

document.addEventListener("DOMContentLoaded", () => {
  const mainTabs = document.querySelectorAll("#mainTabs .nav-link");

  mainTabs.forEach((tab) => {
    tab.addEventListener("shown.bs.tab", (e) => {
      const activeId = e.target.getAttribute("id");
      switch (activeId) {
        case "draw-tab":       initDrawTab(); break;
        case "gallery-tab":    setupGallerySubtabs(); break;
        case "utilities-tab":  setupUtilitiesSubtabs(); break;
        case "patterns-tab":   console.log("Patterns tab active"); break;
        case "figures-tab":    console.log("Figures tab active"); break;
      }
    });
  });

  // ensure Draw tab initializes first on load
  const defaultTab = document.querySelector("#draw-tab");
  if (defaultTab) {
    const bsTab = new bootstrap.Tab(defaultTab);
    bsTab.show();
    initDrawTab();
  }
}); // end DOMContentLoaded
